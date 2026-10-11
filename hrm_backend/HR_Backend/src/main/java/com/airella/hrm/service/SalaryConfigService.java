package com.airella.hrm.service;

import com.airella.hrm.dto.AdditionalPaymentDTO;
import com.airella.hrm.dto.AllowanceRequestDTO;
import com.airella.hrm.dto.BasicPaymentDTO;
import com.airella.hrm.dto.PaySheetDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.*;
import com.airella.hrm.repository.AdditionalPaymentRepository;
import com.airella.hrm.repository.BasicPaymentRepository;
import com.airella.hrm.service.EmployeeDirectory;
import com.airella.hrm.repository.EmploymentTypeRepository;
import com.airella.hrm.repository.JobRoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

/**
 * HR salary configuration — what each job role is paid per employment type (basic_payments) and
 * individual allowances / deductions per employee (additional_payments), and the pay sheet that
 * combines them.
 * <p>
 * Like leave entitlements, an employee's basic payment is not copied onto the employee: it is the
 * row of the job role in their department whose title matches their designation, for their
 * employment type, worked out on every call. Saving a job role's salary therefore updates every
 * employee of that job role straight away.
 */
@Service
@Transactional
public class SalaryConfigService {

    private static final Logger log = LoggerFactory.getLogger(SalaryConfigService.class);
    private static final BigDecimal MAX_AMOUNT = new BigDecimal("999999999");
    private static final int MAX_NAME_LENGTH = 100;

    private final BasicPaymentRepository basicPaymentRepository;
    private final AdditionalPaymentRepository additionalPaymentRepository;
    private final JobRoleRepository jobRoleRepository;
    private final EmploymentTypeRepository employmentTypeRepository;
    private final EmployeeDirectory employeeDirectory;
    private final AuditService auditService;

    public SalaryConfigService(BasicPaymentRepository basicPaymentRepository,
                               AdditionalPaymentRepository additionalPaymentRepository,
                               JobRoleRepository jobRoleRepository,
                               EmploymentTypeRepository employmentTypeRepository,
                               EmployeeDirectory employeeDirectory,
                               AuditService auditService) {
        this.basicPaymentRepository = basicPaymentRepository;
        this.additionalPaymentRepository = additionalPaymentRepository;
        this.jobRoleRepository = jobRoleRepository;
        this.employmentTypeRepository = employmentTypeRepository;
        this.employeeDirectory = employeeDirectory;
        this.auditService = auditService;
    }

    // ── Job role salaries (basic_payments) ───────────────────────

    @Transactional(readOnly = true)
    public List<BasicPaymentDTO> getBasicPayments(Long companyId, Long departmentId) {
        List<BasicPayment> rows = departmentId == null
                ? basicPaymentRepository.findByCompanyIdOrderByUpdatedAtDesc(companyId)
                : basicPaymentRepository.findByCompanyIdAndDepartmentIdOrderByUpdatedAtDesc(companyId, departmentId);

        // How many employees each row currently pays
        List<BasicPayment> all = departmentId == null ? rows : basicPaymentRepository.findByCompanyIdOrderByUpdatedAtDesc(companyId);
        Map<Long, Integer> counts = new HashMap<>();
        for (Employee e : employeeDirectory.findByCompanyId(companyId)) {
            if (e.getStatus() == Employee.EmployeeStatus.TERMINATED) continue;
            BasicPayment match = findBasicPayment(all, departmentName(e), e.getDesignation(), e.getEmploymentType());
            if (match != null) counts.merge(match.getId(), 1, Integer::sum);
        }
        return rows.stream().map(p -> toDTO(p, counts.getOrDefault(p.getId(), 0))).collect(Collectors.toList());
    }

    /**
     * Saves salary rows for one job role. A row for a job role + employment type that already
     * exists is updated rather than duplicated.
     */
    public List<BasicPaymentDTO> saveBasicPayments(BasicPaymentDTO.SaveRequest request, Employee hr) {
        Long companyId = hr.getCompany().getId();
        if (request.getJobRoleId() == null) {
            throw new BusinessException("Job role is required");
        }
        JobRole jobRole = jobRoleRepository.findById(request.getJobRoleId())
                .filter(r -> r.getDepartment().getCompany().getId().equals(companyId))
                .orElseThrow(() -> new ResourceNotFoundException("JobRole", "id", request.getJobRoleId()));
        if (request.getPayments() == null || request.getPayments().isEmpty()) {
            throw new BusinessException("Add at least one salary row");
        }

        Map<Long, EmploymentType> employmentTypes = employmentTypeRepository.findByCompanyIdAndActive(companyId, true).stream()
                .collect(Collectors.toMap(EmploymentType::getId, t -> t));
        Set<Long> seen = new HashSet<>();
        List<BasicPaymentDTO> saved = new ArrayList<>();

        int rowNo = 0;
        for (BasicPaymentDTO row : request.getPayments()) {
            rowNo++;
            String where = "Row " + rowNo + ": ";
            EmploymentType employmentType = Optional.ofNullable(row.getEmploymentTypeId()).map(employmentTypes::get)
                    .orElseThrow(() -> new BusinessException(where + "select an employment type"));
            if (!seen.add(employmentType.getId())) {
                throw new BusinessException(where + employmentType.getName() + " is listed twice");
            }
            BasicPayment.Period period = parsePeriod(row.getPeriod(), where);
            BigDecimal basic = amount(row.getBasicSalary(), where + "basic salary", true);
            BigDecimal allowance = amount(row.getAllowance(), where + "allowance", false);
            BigDecimal deduction = amount(row.getDeduction(), where + "deduction", false);
            BigDecimal total = basic.add(allowance).subtract(deduction);
            if (total.signum() < 0) {
                throw new BusinessException(where + "deduction cannot be more than basic salary + allowance");
            }

            BasicPayment payment = basicPaymentRepository
                    .findByJobRoleIdAndEmploymentTypeId(jobRole.getId(), employmentType.getId())
                    .orElseGet(BasicPayment::new);
            payment.setCompany(hr.getCompany());
            payment.setDepartment(jobRole.getDepartment());
            payment.setJobRole(jobRole);
            payment.setEmploymentType(employmentType);
            payment.setPeriod(period);
            payment.setBasicSalary(basic);
            payment.setAllowance(allowance);
            payment.setDeduction(deduction);
            payment.setTotalSalary(total);
            payment.setCreatedById(hr.getId());
            payment.setCreatedByName(hr.getFullName());
            saved.add(toDTO(basicPaymentRepository.save(payment), null));
        }

        audit("ASSIGN_SALARY", "JobRole", jobRole.getId(),
                "Set " + saved.size() + " salary row(s) for " + title(jobRole), companyId);
        log.info("{} set {} salary row(s) for job role {} in company {}", hr.getEmail(), saved.size(), jobRole.getId(), companyId);
        return saved;
    }

    /** Removes a single job role salary row (one employment type's basic/allowance/deduction). */
    public void deleteBasicPayment(Long id, Employee hr) {
        Long companyId = hr.getCompany().getId();
        BasicPayment payment = basicPaymentRepository.findById(id)
                .filter(p -> p.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new ResourceNotFoundException("BasicPayment", "id", id));

        String jobRoleTitle = title(payment.getJobRole());
        String employmentTypeName = payment.getEmploymentType().getName();
        basicPaymentRepository.delete(payment);
        basicPaymentRepository.flush();
        audit("DELETE", "BasicPayment", id,
                "Deleted salary row for " + jobRoleTitle + " (" + employmentTypeName + ")", companyId);
        log.info("{} deleted basic payment {} for company {}", hr.getEmail(), id, companyId);
    }

    // ── Individual allowances / deductions (additional_payments) ─

    @Transactional(readOnly = true)
    public List<AdditionalPaymentDTO> getAdditionalPayments(Long companyId, String employeeEmail) {
        List<AdditionalPayment> rows = employeeEmail == null || employeeEmail.isBlank()
                ? additionalPaymentRepository.findByCompanyIdOrderByIdAsc(companyId)
                : additionalPaymentRepository.findByCompanyIdAndEmployeeEmailIgnoreCaseOrderByIdAsc(companyId, employeeEmail.trim());
        return rows.stream().map(this::toDTO).collect(Collectors.toList());
    }

    /**
     * Saves an employee's individual allowances / deductions from the submitted list. Rows that
     * carry an id are updated in place (so their link to an approved allowance request survives),
     * rows without an id are added, and saved rows missing from the list are removed.
     */
    public List<AdditionalPaymentDTO> saveAdditionalPayments(AdditionalPaymentDTO.SaveRequest request, Employee hr) {
        Long companyId = hr.getCompany().getId();
        String email = request.getEmployeeEmail() == null ? "" : request.getEmployeeEmail().trim().toLowerCase();
        if (email.isEmpty()) {
            throw new BusinessException("Select an employee");
        }
        List<AdditionalPaymentDTO> items = request.getItems() == null ? List.of() : request.getItems();

        Map<Long, AdditionalPayment> existing = additionalPaymentRepository
                .findByCompanyIdAndEmployeeEmailIgnoreCaseOrderByIdAsc(companyId, email).stream()
                .collect(Collectors.toMap(AdditionalPayment::getId, p -> p, (x, y) -> x, LinkedHashMap::new));

        Set<Long> keptIds = new HashSet<>();
        List<AdditionalPayment> toSave = new ArrayList<>();
        int rowNo = 0;
        for (AdditionalPaymentDTO item : items) {
            rowNo++;
            String where = "Row " + rowNo + ": ";
            String name = item.getName() == null ? "" : item.getName().trim().replaceAll("\\s+", " ");
            if (name.isEmpty()) {
                throw new BusinessException(where + "enter a name");
            }
            if (name.length() > MAX_NAME_LENGTH) {
                throw new BusinessException(where + "name must be at most " + MAX_NAME_LENGTH + " characters");
            }
            AdditionalPayment.Type type;
            try {
                type = AdditionalPayment.Type.valueOf(item.getType() == null ? "" : item.getType().trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BusinessException(where + "select Allowance or Deduction");
            }
            BigDecimal amount = amount(item.getAmount(), where + "amount", true);

            AdditionalPayment p = item.getId() != null ? existing.get(item.getId()) : null;
            if (p == null) {
                p = new AdditionalPayment();
                p.setCompany(hr.getCompany());
                p.setEmployeeEmail(email);
                p.setCreatedById(hr.getId());
                p.setCreatedByName(hr.getFullName());
            } else {
                keptIds.add(p.getId());
            }
            p.setEmployeeCode(request.getEmployeeCode());
            p.setEmployeeName(request.getEmployeeName());
            p.setName(name);
            p.setType(type);
            p.setAmount(amount);
            toSave.add(p);
        }

        List<AdditionalPayment> removed = existing.values().stream()
                .filter(p -> !keptIds.contains(p.getId())).collect(Collectors.toList());
        if (!removed.isEmpty()) {
            additionalPaymentRepository.deleteAll(removed);
            additionalPaymentRepository.flush();
        }
        List<AdditionalPaymentDTO> saved = additionalPaymentRepository.saveAll(toSave).stream()
                .map(this::toDTO).collect(Collectors.toList());

        audit("SET_ADDITIONAL_PAYMENTS", "Employee", null,
                "Set " + saved.size() + " individual allowance/deduction(s) for " + email, companyId);
        log.info("{} set {} additional payment(s) for {} in company {}", hr.getEmail(), saved.size(), email, companyId);
        return saved;
    }

    /**
     * Adds an approved allowance request to the employee's individual allowances. Safe to call
     * more than once: a request is added a single time (matched by its id).
     */
    public AdditionalPaymentDTO addApprovedRequest(AllowanceRequestDTO request, Employee hr) {
        if (request == null || request.getId() == null) {
            throw new BusinessException("Allowance request not found");
        }
        if (!"APPROVED".equalsIgnoreCase(request.getStatus())) {
            throw new BusinessException("Only an approved request can be added to the employee's pay");
        }
        Optional<AdditionalPayment> already = additionalPaymentRepository.findBySourceRequestId(request.getId());
        if (already.isPresent()) {
            return toDTO(already.get());
        }
        String email = request.getEmployeeEmail() == null ? "" : request.getEmployeeEmail().trim().toLowerCase();
        if (email.isEmpty()) {
            throw new BusinessException("The request has no employee email");
        }
        AdditionalPayment p = new AdditionalPayment();
        p.setCompany(hr.getCompany());
        p.setEmployeeEmail(email);
        p.setEmployeeCode(request.getEmployeeCode());
        p.setEmployeeName(request.getEmployeeName());
        p.setSourceRequestId(request.getId());
        String name = request.getName() == null ? "Allowance" : request.getName().trim().replaceAll("\\s+", " ");
        p.setName(name.length() > MAX_NAME_LENGTH ? name.substring(0, MAX_NAME_LENGTH) : name);
        p.setType(AdditionalPayment.Type.ALLOWANCE);
        p.setAmount(amount(request.getAmount(), "amount", true));
        p.setCreatedById(hr.getId());
        p.setCreatedByName(hr.getFullName());
        AdditionalPayment saved = additionalPaymentRepository.save(p);
        audit("ADD_APPROVED_ALLOWANCE", "AllowanceRequest", request.getId(),
                "Added approved allowance '" + saved.getName() + "' to " + email, hr.getCompany().getId());
        log.info("{} added approved allowance request {} to {}", hr.getEmail(), request.getId(), email);
        return toDTO(saved);
    }

    /** Ids of the allowance requests already added to someone's individual allowances. */
    @Transactional(readOnly = true)
    public Set<Long> getAddedRequestIds(Long companyId) {
        return additionalPaymentRepository.findByCompanyIdOrderByIdAsc(companyId).stream()
                .map(AdditionalPayment::getSourceRequestId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    // ── Pay sheet ────────────────────────────────────────────────

    /** Pay sheets for the given employees (details as held in the user database). */
    @Transactional(readOnly = true)
    public List<PaySheetDTO> getPaySheets(Long companyId, List<PaySheetDTO.EmployeeRef> employees) {
        List<BasicPayment> payments = basicPaymentRepository.findByCompanyIdOrderByUpdatedAtDesc(companyId);
        Map<String, List<AdditionalPayment>> additional = additionalPaymentRepository.findByCompanyIdOrderByIdAsc(companyId).stream()
                .collect(Collectors.groupingBy(a -> a.getEmployeeEmail().toLowerCase()));
        List<PaySheetDTO> sheets = new ArrayList<>();
        for (PaySheetDTO.EmployeeRef ref : employees == null ? List.<PaySheetDTO.EmployeeRef>of() : employees) {
            if (ref.getEmail() == null || ref.getEmail().isBlank()) continue;
            sheets.add(buildSheet(ref, payments, additional.getOrDefault(ref.getEmail().trim().toLowerCase(), List.of())));
        }
        return sheets;
    }

    /** Pay sheet of one employee, from their record in hrm_db_hr. Used by Employee_Backend. */
    @Transactional(readOnly = true)
    public PaySheetDTO getPaySheet(Employee employee) {
        PaySheetDTO.EmployeeRef ref = new PaySheetDTO.EmployeeRef();
        ref.setEmail(employee.getEmail());
        ref.setEmployeeCode(employee.getEmployeeId());
        ref.setFullName(employee.getFullName());
        ref.setDepartmentName(departmentName(employee));
        ref.setDesignation(employee.getDesignation());
        ref.setEmploymentType(employee.getEmploymentType());
        Long companyId = employee.getCompany().getId();
        return buildSheet(ref,
                basicPaymentRepository.findByCompanyIdOrderByUpdatedAtDesc(companyId),
                additionalPaymentRepository.findByCompanyIdAndEmployeeEmailIgnoreCaseOrderByIdAsc(companyId, employee.getEmail()));
    }

    private PaySheetDTO buildSheet(PaySheetDTO.EmployeeRef ref, List<BasicPayment> payments, List<AdditionalPayment> additional) {
        PaySheetDTO sheet = new PaySheetDTO();
        sheet.setEmployeeEmail(ref.getEmail().trim());
        sheet.setEmployeeCode(ref.getEmployeeCode());
        sheet.setEmployeeName(ref.getFullName());
        sheet.setDepartmentName(ref.getDepartmentName());
        sheet.setDesignation(ref.getDesignation());
        sheet.setEmploymentType(ref.getEmploymentType());

        BasicPayment match = findBasicPayment(payments, ref.getDepartmentName(), ref.getDesignation(), ref.getEmploymentType());
        if (match != null) {
            sheet.setConfigured(true);
            sheet.setBasicPaymentId(match.getId());
            sheet.setPeriod(match.getPeriod().name());
            sheet.setBasicSalary(match.getBasicSalary());
            sheet.setRoleAllowance(match.getAllowance());
            sheet.setRoleDeduction(match.getDeduction());
        } else {
            log.info("No basic payment for {} (dept='{}', designation='{}', type='{}'). Salary rows in company: {}",
                    ref.getEmail(), ref.getDepartmentName(), ref.getDesignation(), ref.getEmploymentType(),
                    payments.stream().map(p -> title(p.getJobRole()) + " / " + p.getEmploymentType().getName()).collect(Collectors.toList()));
            // Tell the UI whether the job role has salary rows for other employment types
            sheet.setConfiguredEmploymentTypes(paymentsForRole(payments, ref.getDepartmentName(), ref.getDesignation()).stream()
                    .map(p -> p.getEmploymentType().getName()).distinct().collect(Collectors.toList()));
        }

        BigDecimal extraAllowance = BigDecimal.ZERO;
        BigDecimal extraDeduction = BigDecimal.ZERO;
        for (AdditionalPayment a : additional) {
            if (a.getType() == AdditionalPayment.Type.ALLOWANCE) extraAllowance = extraAllowance.add(a.getAmount());
            else extraDeduction = extraDeduction.add(a.getAmount());
        }
        sheet.setAdditionalAllowance(extraAllowance);
        sheet.setAdditionalDeduction(extraDeduction);
        sheet.setAdditionalItems(additional.stream().map(this::toDTO).collect(Collectors.toList()));

        sheet.setTotalAllowance(sheet.getRoleAllowance().add(extraAllowance));
        sheet.setTotalDeduction(sheet.getRoleDeduction().add(extraDeduction));
        sheet.setNetTotal(sheet.getBasicSalary().add(sheet.getTotalAllowance()).subtract(sheet.getTotalDeduction()));
        return sheet;
    }

    /**
     * The basic payment for an employee: the job role whose title matches the designation, for
     * the employee's employment type.
     * <ul>
     *   <li>Job role: matched by title, preferring the employee's own department. If the
     *       department names differ (or the employee has none) any department's job role with that
     *       title is used, so a salary HR added is never missed because of a department spelling.</li>
     *   <li>Employment type: matched by name ignoring case, spaces, punctuation and "month(s)"
     *       plurals. With no employment type on the employee, a job role with a single salary row uses it.</li>
     * </ul>
     */
    private static BasicPayment findBasicPayment(List<BasicPayment> payments, String departmentName,
                                                 String designation, String employmentType) {
        List<BasicPayment> forRole = paymentsForRole(payments, departmentName, designation);
        String type = typeKey(employmentType);
        if (type.isEmpty()) {
            return forRole.size() == 1 ? forRole.get(0) : null;
        }
        return forRole.stream()
                .filter(p -> typeKey(p.getEmploymentType().getName()).equals(type))
                .findFirst()
                .orElse(null);
    }

    /** All salary rows of the job role matching the designation (own department first, else any). */
    private static List<BasicPayment> paymentsForRole(List<BasicPayment> payments, String departmentName, String designation) {
        String title = normalize(designation);
        if (title.isEmpty()) return List.of();
        String dept = normalize(departmentName);
        List<BasicPayment> sameTitle = payments.stream()
                .filter(p -> !Boolean.FALSE.equals(p.getJobRole().getActive()))
                .filter(p -> normalize(title(p.getJobRole())).equals(title))
                .collect(Collectors.toList());
        if (dept.isEmpty()) return sameTitle;
        List<BasicPayment> sameDept = sameTitle.stream()
                .filter(p -> normalize(p.getDepartment().getName()).equals(dept))
                .collect(Collectors.toList());
        return sameDept.isEmpty() ? sameTitle : sameDept;
    }

    /** "6 Month Internship", "6 Months  Internship" and "6-month internship" share one key. */
    private static String typeKey(String value) {
        return normalize(value).replaceAll("months", "month").replaceAll("[^a-z0-9]", "");
    }

    // ── helpers ──────────────────────────────────────────────────

    private static String departmentName(Employee e) {
        return e.getDepartment() != null ? e.getDepartment().getName() : e.getDepartmentName();
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ").toLowerCase();
    }

    private static String title(JobRole role) {
        return role.getJobTitle() != null ? role.getJobTitle() : role.getTitle();
    }

    private static BasicPayment.Period parsePeriod(String value, String where) {
        try {
            return BasicPayment.Period.valueOf(value == null ? "" : value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(where + "select Monthly, Weekly or Annual");
        }
    }

    /** Validates a money amount; blank optional amounts become 0. */
    private static BigDecimal amount(BigDecimal value, String what, boolean required) {
        if (value == null) {
            if (required) throw new BusinessException(what + " is required");
            return BigDecimal.ZERO.setScale(2);
        }
        if (value.signum() < 0) {
            throw new BusinessException(what + " cannot be negative");
        }
        if (required && value.signum() == 0) {
            throw new BusinessException(what + " must be more than 0");
        }
        if (value.compareTo(MAX_AMOUNT) > 0) {
            throw new BusinessException(what + " is too large");
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private void audit(String action, String entity, Long id, String description, Long companyId) {
        try {
            auditService.logAction(action, entity, id, description, companyId);
        } catch (Exception ignored) {
            // auditing must never block the actual change
        }
    }

    private BasicPaymentDTO toDTO(BasicPayment p, Integer employeeCount) {
        BasicPaymentDTO dto = new BasicPaymentDTO();
        dto.setId(p.getId());
        dto.setDepartmentId(p.getDepartment().getId());
        dto.setDepartmentName(p.getDepartment().getName());
        dto.setJobRoleId(p.getJobRole().getId());
        dto.setJobRoleTitle(title(p.getJobRole()));
        dto.setEmploymentTypeId(p.getEmploymentType().getId());
        dto.setEmploymentTypeName(p.getEmploymentType().getName());
        dto.setPeriod(p.getPeriod().name());
        dto.setBasicSalary(p.getBasicSalary());
        dto.setAllowance(p.getAllowance());
        dto.setDeduction(p.getDeduction());
        dto.setTotalSalary(p.getTotalSalary());
        dto.setEmployeeCount(employeeCount);
        dto.setCreatedByName(p.getCreatedByName());
        dto.setCreatedAt(p.getCreatedAt());
        dto.setUpdatedAt(p.getUpdatedAt());
        return dto;
    }

    private AdditionalPaymentDTO toDTO(AdditionalPayment a) {
        AdditionalPaymentDTO dto = new AdditionalPaymentDTO();
        dto.setId(a.getId());
        dto.setEmployeeEmail(a.getEmployeeEmail());
        dto.setEmployeeCode(a.getEmployeeCode());
        dto.setEmployeeName(a.getEmployeeName());
        dto.setSourceRequestId(a.getSourceRequestId());
        dto.setName(a.getName());
        dto.setType(a.getType().name());
        dto.setAmount(a.getAmount());
        dto.setCreatedByName(a.getCreatedByName());
        dto.setUpdatedAt(a.getUpdatedAt());
        return dto;
    }
}
