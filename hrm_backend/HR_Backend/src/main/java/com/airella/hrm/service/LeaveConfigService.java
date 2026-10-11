package com.airella.hrm.service;

import com.airella.hrm.dto.EmploymentTypeDTO;
import com.airella.hrm.dto.LeaveAllocationDTO;
import com.airella.hrm.dto.LeaveEntitlementDTO;
import com.airella.hrm.dto.LeaveTypeDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.*;
import com.airella.hrm.repository.BasicPaymentRepository;
import com.airella.hrm.repository.EmploymentTypeRepository;
import com.airella.hrm.repository.JobRoleLeaveAllocationRepository;
import com.airella.hrm.repository.JobRoleRepository;
import com.airella.hrm.repository.LeaveApplicationRepository;
import com.airella.hrm.repository.LeaveTypeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * HR leave configuration — the company's leave types and employment types, and how much
 * of each leave type a job role gets per employment type.
 */
@Service
@Transactional
public class LeaveConfigService {

    private static final Logger log = LoggerFactory.getLogger(LeaveConfigService.class);
    private static final double MAX_DAYS_PER_PERIOD = 366;

    private final LeaveTypeRepository leaveTypeRepository;
    private final EmploymentTypeRepository employmentTypeRepository;
    private final JobRoleRepository jobRoleRepository;
    private final JobRoleLeaveAllocationRepository allocationRepository;
    private final BasicPaymentRepository basicPaymentRepository;
    private final LeaveApplicationRepository leaveApplicationRepository;
    private final AuditService auditService;

    private static final int MAX_NAME_LENGTH = 100;

    public LeaveConfigService(LeaveTypeRepository leaveTypeRepository,
                              EmploymentTypeRepository employmentTypeRepository,
                              JobRoleRepository jobRoleRepository,
                              JobRoleLeaveAllocationRepository allocationRepository,
                              BasicPaymentRepository basicPaymentRepository,
                              LeaveApplicationRepository leaveApplicationRepository,
                              AuditService auditService) {
        this.leaveTypeRepository = leaveTypeRepository;
        this.employmentTypeRepository = employmentTypeRepository;
        this.jobRoleRepository = jobRoleRepository;
        this.allocationRepository = allocationRepository;
        this.basicPaymentRepository = basicPaymentRepository;
        this.leaveApplicationRepository = leaveApplicationRepository;
        this.auditService = auditService;
    }

    // ── Leave types ──────────────────────────────────────────────

    /** The company's own leave types plus any global (company-less) ones, by name. */
    @Transactional(readOnly = true)
    public List<LeaveTypeDTO> getLeaveTypes(Long companyId) {
        return activeLeaveTypes(companyId).stream()
                .sorted(Comparator.comparing(t -> t.getName().toLowerCase()))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<LeaveTypeDTO> createLeaveTypes(List<String> names, Employee hr) {
        Long companyId = hr.getCompany().getId();
        Collection<String> toAdd = newNames(names, activeLeaveTypes(companyId), LeaveType::getName, "leave type");

        List<LeaveTypeDTO> created = new ArrayList<>();
        for (String name : toAdd) {
            LeaveType type = new LeaveType();
            type.setName(name);
            type.setCompany(hr.getCompany());
            type.setActive(true);
            type.setRequiresApproval(true);
            // Entitlements are defined per job role (job_role_leave_allocations), not per type
            type.setDefaultDaysPerYear(0);
            type.setCreatedById(hr.getId());
            type.setCreatedByName(hr.getFullName());
            LeaveType saved = leaveTypeRepository.save(type);
            audit("CREATE", "LeaveType", saved.getId(), "Added leave type: " + name, companyId);
            created.add(toDTO(saved));
        }
        log.info("{} added {} leave type(s) for company {}", hr.getEmail(), created.size(), companyId);
        return created;
    }

    /** Renames a leave type. The new name must not already be used by another active type. */
    public LeaveTypeDTO updateLeaveType(Long id, String name, Employee hr) {
        Long companyId = hr.getCompany().getId();
        LeaveType type = leaveTypeRepository.findById(id)
                .filter(t -> t.getCompany() != null && t.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new ResourceNotFoundException("LeaveType", "id", id));

        String newName = name == null ? "" : name.trim().replaceAll("\\s+", " ");
        if (newName.isEmpty()) {
            throw new BusinessException("Leave type name is required");
        }
        if (newName.length() > MAX_NAME_LENGTH) {
            throw new BusinessException("Leave type name must be at most " + MAX_NAME_LENGTH + " characters");
        }
        boolean taken = activeLeaveTypes(companyId).stream()
                .anyMatch(t -> !t.getId().equals(id) && t.getName().trim().equalsIgnoreCase(newName));
        if (taken) {
            throw new BusinessException("A leave type named '" + newName + "' already exists");
        }

        String oldName = type.getName();
        type.setName(newName);
        LeaveType saved = leaveTypeRepository.save(type);
        audit("UPDATE", "LeaveType", saved.getId(), "Renamed leave type '" + oldName + "' to '" + newName + "'", companyId);
        log.info("{} renamed leave type {} to '{}' for company {}", hr.getEmail(), id, newName, companyId);
        return toDTO(saved);
    }

    /**
     * Removes a leave type permanently from the database. Blocked while it is still used by a
     * job role's leave entitlements, or referenced by any employee's leave applications.
     */
    public void deleteLeaveType(Long id, Employee hr) {
        Long companyId = hr.getCompany().getId();
        LeaveType type = leaveTypeRepository.findById(id)
                .filter(t -> t.getCompany() != null && t.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new ResourceNotFoundException("LeaveType", "id", id));

        long inUse = allocationRepository.countByLeaveTypeId(id);
        if (inUse > 0) {
            throw new BusinessException("Cannot delete '" + type.getName() + "': it has " + inUse
                    + " leave entitlement(s) assigned. Remove those first.");
        }
        long applications = leaveApplicationRepository.countByLeaveTypeId(id);
        if (applications > 0) {
            throw new BusinessException("Cannot delete '" + type.getName() + "': it has " + applications
                    + " leave application(s) recorded against it.");
        }

        String name = type.getName();
        leaveTypeRepository.delete(type);
        leaveTypeRepository.flush();
        audit("DELETE", "LeaveType", id, "Deleted leave type: " + name, companyId);
        log.info("{} deleted leave type {} ('{}') for company {}", hr.getEmail(), id, name, companyId);
    }

    // ── Employment types ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EmploymentTypeDTO> getEmploymentTypes(Long companyId) {
        return employmentTypeRepository.findByCompanyIdAndActive(companyId, true).stream()
                .sorted(Comparator.comparing(EmploymentType::getId))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<EmploymentTypeDTO> createEmploymentTypes(List<String> names, Employee hr) {
        Long companyId = hr.getCompany().getId();
        Collection<String> toAdd = newNames(names, employmentTypeRepository.findByCompanyIdAndActive(companyId, true),
                EmploymentType::getName, "employment type");

        List<EmploymentTypeDTO> created = new ArrayList<>();
        for (String name : toAdd) {
            EmploymentType type = new EmploymentType();
            type.setName(name);
            type.setCompany(hr.getCompany());
            type.setActive(true);
            type.setCreatedById(hr.getId());
            type.setCreatedByName(hr.getFullName());
            EmploymentType saved = employmentTypeRepository.save(type);
            audit("CREATE", "EmploymentType", saved.getId(), "Added employment type: " + name, companyId);
            created.add(toDTO(saved));
        }
        log.info("{} added {} employment type(s) for company {}", hr.getEmail(), created.size(), companyId);
        return created;
    }

    /** Renames an employment type. The new name must not already be used by another active type. */
    public EmploymentTypeDTO updateEmploymentType(Long id, String name, Employee hr) {
        Long companyId = hr.getCompany().getId();
        EmploymentType type = employmentTypeRepository.findById(id)
                .filter(t -> t.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new ResourceNotFoundException("EmploymentType", "id", id));

        String newName = name == null ? "" : name.trim().replaceAll("\\s+", " ");
        if (newName.isEmpty()) {
            throw new BusinessException("Employment type name is required");
        }
        if (newName.length() > MAX_NAME_LENGTH) {
            throw new BusinessException("Employment type name must be at most " + MAX_NAME_LENGTH + " characters");
        }
        boolean taken = employmentTypeRepository.findByCompanyIdAndActive(companyId, true).stream()
                .anyMatch(t -> !t.getId().equals(id) && t.getName().trim().equalsIgnoreCase(newName));
        if (taken) {
            throw new BusinessException("An employment type named '" + newName + "' already exists");
        }

        String oldName = type.getName();
        type.setName(newName);
        EmploymentType saved = employmentTypeRepository.save(type);
        audit("UPDATE", "EmploymentType", saved.getId(), "Renamed employment type '" + oldName + "' to '" + newName + "'", companyId);
        log.info("{} renamed employment type {} to '{}' for company {}", hr.getEmail(), id, newName, companyId);
        return toDTO(saved);
    }

    /**
     * Removes an employment type permanently from the database. Blocked while it is still
     * used by a job role's leave entitlements, since deleting it would leave those
     * allocations pointing at nothing.
     */
    public void deleteEmploymentType(Long id, Employee hr) {
        Long companyId = hr.getCompany().getId();
        EmploymentType type = employmentTypeRepository.findById(id)
                .filter(t -> t.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new ResourceNotFoundException("EmploymentType", "id", id));

        long inUse = allocationRepository.countByEmploymentTypeId(id);
        if (inUse > 0) {
            throw new BusinessException("Cannot delete '" + type.getName() + "': it has " + inUse
                    + " leave entitlement(s) assigned. Remove those first.");
        }
        long salaryRows = basicPaymentRepository.countByEmploymentTypeId(id);
        if (salaryRows > 0) {
            throw new BusinessException("Cannot delete '" + type.getName() + "': it has " + salaryRows
                    + " job role salary row(s) assigned. Remove those first.");
        }

        String name = type.getName();
        employmentTypeRepository.delete(type);
        employmentTypeRepository.flush();
        audit("DELETE", "EmploymentType", id, "Deleted employment type: " + name, companyId);
        log.info("{} deleted employment type {} ('{}') for company {}", hr.getEmail(), id, name, companyId);
    }

    // ── Job role allocations ─────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LeaveAllocationDTO> getAllocations(Long companyId, Long departmentId) {
        List<JobRoleLeaveAllocation> rows = departmentId == null
                ? allocationRepository.findByCompanyIdOrderByUpdatedAtDesc(companyId)
                : allocationRepository.findByCompanyIdAndDepartmentIdOrderByUpdatedAtDesc(companyId, departmentId);
        return rows.stream().map(this::toDTO).collect(Collectors.toList());
    }

    /**
     * Saves leave entitlements for one job role. A row for a job role + employment type +
     * leave type that already exists is updated rather than duplicated.
     */
    public List<LeaveAllocationDTO> saveAllocations(LeaveAllocationDTO.SaveRequest request, Employee hr) {
        Long companyId = hr.getCompany().getId();
        if (request.getJobRoleId() == null) {
            throw new BusinessException("Job role is required");
        }
        JobRole jobRole = jobRoleRepository.findById(request.getJobRoleId())
                .filter(r -> r.getDepartment().getCompany().getId().equals(companyId))
                .orElseThrow(() -> new ResourceNotFoundException("JobRole", "id", request.getJobRoleId()));
        if (request.getAllocations() == null || request.getAllocations().isEmpty()) {
            throw new BusinessException("Add at least one leave to assign");
        }

        Map<Long, LeaveType> leaveTypes = activeLeaveTypes(companyId).stream()
                .collect(Collectors.toMap(LeaveType::getId, t -> t));
        Map<Long, EmploymentType> employmentTypes = employmentTypeRepository.findByCompanyIdAndActive(companyId, true).stream()
                .collect(Collectors.toMap(EmploymentType::getId, t -> t));
        Set<String> seen = new HashSet<>();
        List<LeaveAllocationDTO> saved = new ArrayList<>();

        int rowNo = 0;
        for (LeaveAllocationDTO row : request.getAllocations()) {
            rowNo++;
            String where = "Row " + rowNo + ": ";
            EmploymentType employmentType = Optional.ofNullable(row.getEmploymentTypeId()).map(employmentTypes::get)
                    .orElseThrow(() -> new BusinessException(where + "select an employment type"));
            LeaveType leaveType = Optional.ofNullable(row.getLeaveTypeId()).map(leaveTypes::get)
                    .orElseThrow(() -> new BusinessException(where + "select a leave type"));
            JobRoleLeaveAllocation.Period period = parsePeriod(row.getPeriod(), where);
            Double days = row.getDays();
            if (days == null || days <= 0 || days > MAX_DAYS_PER_PERIOD) {
                throw new BusinessException(where + "number of leaves must be more than 0 and at most " + (int) MAX_DAYS_PER_PERIOD);
            }
            if (!seen.add(employmentType.getId() + "|" + leaveType.getId())) {
                throw new BusinessException(where + leaveType.getName() + " for " + employmentType.getName() + " is listed twice");
            }

            JobRoleLeaveAllocation allocation = allocationRepository
                    .findByJobRoleIdAndEmploymentTypeIdAndLeaveTypeId(jobRole.getId(), employmentType.getId(), leaveType.getId())
                    .orElseGet(JobRoleLeaveAllocation::new);
            allocation.setCompany(hr.getCompany());
            allocation.setDepartment(jobRole.getDepartment());
            allocation.setJobRole(jobRole);
            allocation.setEmploymentType(employmentType);
            allocation.setLeaveType(leaveType);
            allocation.setPeriod(period);
            allocation.setDays(days);
            allocation.setCreatedById(hr.getId());
            allocation.setCreatedByName(hr.getFullName());
            saved.add(toDTO(allocationRepository.save(allocation)));
        }

        audit("ASSIGN_LEAVE", "JobRole", jobRole.getId(),
                "Assigned " + saved.size() + " leave entitlement(s) to " + title(jobRole), companyId);
        return saved;
    }

    /**
     * Removes a single leave entitlement row (one job role + employment type + leave type).
     */
    public void deleteAllocation(Long id, Employee hr) {
        Long companyId = hr.getCompany().getId();
        JobRoleLeaveAllocation allocation = allocationRepository.findById(id)
                .filter(a -> a.getCompany() != null && a.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new ResourceNotFoundException("LeaveAllocation", "id", id));

        String description = "Removed " + allocation.getLeaveType().getName() + " ("
                + allocation.getEmploymentType().getName() + ") from " + title(allocation.getJobRole());
        allocationRepository.delete(allocation);
        allocationRepository.flush();
        audit("DELETE", "JobRoleLeaveAllocation", id, description, companyId);
        log.info("{} deleted leave allocation {} for company {}", hr.getEmail(), id, companyId);
    }

    // ── Employee entitlements ────────────────────────────────────

    /**
     * Leave an employee gets: the allocations of the job role in their department whose title matches
     * their designation, for their employment type. Worked out from the current allocations on every
     * call, so assigning or changing leave for a job role reaches all of its employees straight away.
     */
    @Transactional(readOnly = true)
    public List<LeaveEntitlementDTO> getEntitlements(Employee employee) {
        String jobTitle = normalize(employee.getDesignation());
        String employmentType = normalize(employee.getEmploymentType());
        if (jobTitle.isEmpty() || employmentType.isEmpty()
                || employee.getCompany() == null || employee.getDepartment() == null) {
            return List.of();
        }
        return allocationRepository
                .findByCompanyIdAndDepartmentIdOrderByUpdatedAtDesc(employee.getCompany().getId(), employee.getDepartment().getId())
                .stream()
                .filter(a -> !Boolean.FALSE.equals(a.getJobRole().getActive()))
                .filter(a -> normalize(title(a.getJobRole())).equals(jobTitle))
                .filter(a -> normalize(a.getEmploymentType().getName()).equals(employmentType))
                .filter(a -> Boolean.TRUE.equals(a.getLeaveType().getActive()))
                .sorted(Comparator.comparing(a -> a.getLeaveType().getId()))
                .map(a -> new LeaveEntitlementDTO(a.getLeaveType().getId(), a.getLeaveType().getName(),
                        a.getPeriod().name(), a.getDays(), daysPerYear(a)))
                .collect(Collectors.toList());
    }

    // ── helpers ──────────────────────────────────────────────────

    private static String normalize(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ").toLowerCase();
    }

    private static int daysPerYear(JobRoleLeaveAllocation a) {
        int periodsPerYear = switch (a.getPeriod()) {
            case ANNUAL -> 1;
            case MONTHLY -> 12;
            case WEEKLY -> 52;
        };
        return (int) Math.floor(a.getDays() * periodsPerYear);
    }

    private List<LeaveType> activeLeaveTypes(Long companyId) {
        List<LeaveType> types = new ArrayList<>(leaveTypeRepository.findByCompanyIdAndActive(companyId, true));
        types.addAll(leaveTypeRepository.findByCompanyIdIsNullAndActive(true));
        return types;
    }

    /**
     * Cleans submitted names (trims, collapses spaces, drops blanks, merges case-insensitive repeats)
     * and rejects the whole request if any of them already exists.
     */
    private <T> Collection<String> newNames(List<String> names, List<T> existing, Function<T, String> nameOf, String what) {
        Map<String, String> wanted = new LinkedHashMap<>();
        if (names != null) {
            for (String n : names) {
                String name = n == null ? "" : n.trim().replaceAll("\\s+", " ");
                if (!name.isEmpty()) wanted.putIfAbsent(name.toLowerCase(), name);
            }
        }
        if (wanted.isEmpty()) {
            throw new BusinessException("Enter at least one " + what);
        }
        Set<String> taken = existing.stream()
                .map(e -> nameOf.apply(e).trim().toLowerCase())
                .collect(Collectors.toSet());
        List<String> duplicates = wanted.entrySet().stream()
                .filter(e -> taken.contains(e.getKey()))
                .map(Map.Entry::getValue)
                .collect(Collectors.toList());
        if (!duplicates.isEmpty()) {
            throw new BusinessException("Already added: " + String.join(", ", duplicates));
        }
        return wanted.values();
    }

    private static JobRoleLeaveAllocation.Period parsePeriod(String value, String where) {
        try {
            return JobRoleLeaveAllocation.Period.valueOf(value == null ? "" : value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(where + "select Annual, Monthly or Weekly");
        }
    }

    private static String title(JobRole role) {
        return role.getJobTitle() != null ? role.getJobTitle() : role.getTitle();
    }

    private void audit(String action, String entity, Long id, String description, Long companyId) {
        try {
            auditService.logAction(action, entity, id, description, companyId);
        } catch (Exception ignored) {
            // auditing must never block the actual change
        }
    }

    private LeaveTypeDTO toDTO(LeaveType t) {
        LeaveTypeDTO dto = new LeaveTypeDTO();
        dto.setId(t.getId());
        dto.setName(t.getName());
        dto.setDescription(t.getDescription());
        dto.setDefaultDaysPerYear(t.getDefaultDaysPerYear());
        dto.setCarryForward(t.getCarryForward());
        dto.setMaxCarryForwardDays(t.getMaxCarryForwardDays());
        dto.setActive(t.getActive());
        dto.setCreatedByName(t.getCreatedByName());
        dto.setCreatedAt(t.getCreatedAt());
        return dto;
    }

    private EmploymentTypeDTO toDTO(EmploymentType t) {
        return new EmploymentTypeDTO(t.getId(), t.getName(), t.getCreatedByName(), t.getCreatedAt());
    }

    private LeaveAllocationDTO toDTO(JobRoleLeaveAllocation a) {
        LeaveAllocationDTO dto = new LeaveAllocationDTO();
        dto.setId(a.getId());
        dto.setDepartmentId(a.getDepartment().getId());
        dto.setDepartmentName(a.getDepartment().getName());
        dto.setJobRoleId(a.getJobRole().getId());
        dto.setJobRoleTitle(title(a.getJobRole()));
        dto.setEmploymentTypeId(a.getEmploymentType().getId());
        dto.setEmploymentTypeName(a.getEmploymentType().getName());
        dto.setLeaveTypeId(a.getLeaveType().getId());
        dto.setLeaveTypeName(a.getLeaveType().getName());
        dto.setPeriod(a.getPeriod().name());
        dto.setDays(a.getDays());
        dto.setCreatedByName(a.getCreatedByName());
        dto.setCreatedAt(a.getCreatedAt());
        dto.setUpdatedAt(a.getUpdatedAt());
        return dto;
    }
}
