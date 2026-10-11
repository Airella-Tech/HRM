package com.airella.hrm.service;

import com.airella.hrm.dto.PaySheetDTO;
import com.airella.hrm.dto.PayslipDTO;
import com.airella.hrm.model.Employee;
import com.airella.hrm.model.Payslip;
import com.airella.hrm.model.Salary;
import com.airella.hrm.model.Attendance;
import com.airella.hrm.model.Notification;
import com.airella.hrm.repository.NotificationRepository;
import com.airella.hrm.repository.PayslipRepository;
import com.airella.hrm.repository.SalaryRepository;
import com.airella.hrm.repository.AttendanceRepository;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class PayrollService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(PayrollService.class);

    private final EmployeeDirectory employeeDirectory;
    private final PayslipRepository payslipRepository;
    private final SalaryRepository salaryRepository;
    private final AttendanceRepository attendanceRepository;
    private final HrServiceClient hrServiceClient;
    private final NotificationRepository notificationRepository;
    private final TransactionTemplate perEmployeeTx;

    public PayrollService(EmployeeDirectory employeeDirectory,
                          PayslipRepository payslipRepository,
                          SalaryRepository salaryRepository,
                          AttendanceRepository attendanceRepository,
                          HrServiceClient hrServiceClient,
                          NotificationRepository notificationRepository,
                          PlatformTransactionManager transactionManager) {
        this.employeeDirectory = employeeDirectory;
        this.payslipRepository = payslipRepository;
        this.salaryRepository = salaryRepository;
        this.attendanceRepository = attendanceRepository;
        this.hrServiceClient = hrServiceClient;
        this.notificationRepository = notificationRepository;
        // Each employee gets its own transaction so one failure can never roll back everyone else's payslip
        this.perEmployeeTx = new TransactionTemplate(transactionManager);
        this.perEmployeeTx.setPropagationBehavior(Propagation.REQUIRES_NEW.value());
    }

    /** Outcome of a bulk generation: what was delivered, and who was skipped and why. */
    @lombok.Data
    public static class BulkResult {
        private List<PayslipDTO> generated = new ArrayList<>();
        private List<Map<String, String>> skipped = new ArrayList<>();
        void skip(String who, String reason) {
            Map<String, String> m = new LinkedHashMap<>();
            m.put("employee", who);
            m.put("reason", reason);
            skipped.add(m);
        }
    }

    public Payslip getOrCreatePayslip(Long employeeId, Integer month, Integer year) {
        return payslipRepository.findByUserIdAndMonthAndYear(employeeId, month, year)
                .orElseGet(() -> generatePayslip(employeeId, month, year));
    }

    public List<Payslip> getEmployeePayslips(Long employeeId) {
        return payslipRepository.findByUserId(employeeId);
    }

    /** The employee's payslips as DTOs, newest month first. */
    @Transactional(readOnly = true)
    public List<PayslipDTO> getEmployeePayslipDTOs(Long employeeId) {
        return payslipRepository.findByUserId(employeeId).stream()
                .sorted(Comparator.comparing(Payslip::getYear).thenComparing(Payslip::getMonth).reversed())
                .map(PayrollService::toDTO)
                .collect(Collectors.toList());
    }

    public PayslipDTO getOrCreatePayslipDTO(Long employeeId, Integer month, Integer year) {
        return toDTO(getOrCreatePayslip(employeeId, month, year));
    }

    /**
     * Generates the month's payslips for the given employees, matched by email (employee ids and
     * company ids differ between the service databases). Payslips that already exist are kept.
     */
    public BulkResult generateBulkPayrollForEmails(List<String> emails, Integer month, Integer year) {
        BulkResult result = new BulkResult();
        Set<String> seen = new HashSet<>();
        for (String email : emails) {
            if (email == null || email.isBlank() || !seen.add(email.trim().toLowerCase())) continue;
            String who = email.trim();
            try {
                Optional<Employee> found = employeeDirectory.findByEmailIgnoreCase(who);
                if (found.isEmpty()) { result.skip(who, "Not found in the user service"); continue; }
                Employee emp = found.get();
                if (emp.getStatus() != Employee.EmployeeStatus.ACTIVE) { result.skip(who, "Employee is not active"); continue; }
                PayslipDTO dto = perEmployeeTx.execute(status -> toDTO(deliverPayslip(emp, month, year, false)));
                result.getGenerated().add(dto);
            } catch (BusinessException e) {
                result.skip(who, e.getMessage());
            } catch (Exception e) {
                log.error("Payslip generation failed for {} ({}/{})", who, month, year, e);
                result.skip(who, "Unexpected error: " + rootMessage(e));
            }
        }
        return result;
    }

    private static String rootMessage(Throwable t) {
        while (t.getCause() != null && t.getCause() != t) t = t.getCause();
        return t.getMessage() != null ? t.getMessage() : t.getClass().getSimpleName();
    }

    /**
     * "Send" from the HR payroll page: makes sure the employee has an up-to-date payslip for the
     * month (created, or refreshed from HR's current pay sheet) and always notifies them, so a
     * payslip can be re-sent to one person at any time.
     */
    public PayslipDTO sendPayslipByEmail(String email, Integer month, Integer year) {
        Employee employee = employeeDirectory.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "email", email));
        return perEmployeeTx.execute(status -> toDTO(deliverPayslip(employee, month, year, true)));
    }

    /**
     * Creates / refreshes the payslip, marks it available to the employee (PAID) and notifies them.
     * Bulk generation only notifies when the payslip is new; an explicit send always notifies.
     */
    private Payslip deliverPayslip(Employee employee, Integer month, Integer year, boolean alwaysNotify) {
        boolean isNew = payslipRepository.findByUserIdAndMonthAndYear(employee.getId(), month, year).isEmpty();
        if (isNew && hrServiceClient.findPaySheet(employee.getEmail()).filter(PaySheetDTO::isConfigured).isEmpty()) {
            // Never invent a salary: without HR's pay sheet there is nothing real to send
            throw new BusinessException("No salary is set up for " + employee.getFullName()
                    + ". Add a job role salary first, then send the payslip.");
        }
        Payslip payslip = regeneratePayslip(employee, month, year);
        if (payslip.getStatus() != Payslip.PayslipStatus.PAID) {
            payslip.setStatus(Payslip.PayslipStatus.PAID);
            payslip = payslipRepository.save(payslip);
        }
        if (isNew || alwaysNotify) notifyPayslip(employee, payslip);
        return payslip;
    }

    private void notifyPayslip(Employee employee, Payslip payslip) {
        try {
            String monthName = java.time.Month.of(payslip.getMonth())
                    .getDisplayName(java.time.format.TextStyle.FULL, Locale.ENGLISH);
            Notification n = new Notification();
            n.setUserId(employee.getId());
            n.setTitle("Payslip available");
            n.setMessage("Your payslip for " + monthName + " " + payslip.getYear()
                    + " is ready. Net salary: Rs. " + payslip.getNetSalary().setScale(2, RoundingMode.HALF_UP).toPlainString());
            n.setType(Notification.NotificationType.PAYROLL);
            n.setCategory(NotificationService.PAYSLIP);
            n.setLink("/employee/payslip");
            n.setIsRead(false);
            notificationRepository.save(n);
        } catch (Exception e) {
            // A failed notification must never block the payslip itself
        }
    }

    /**
     * Used by "Generate All": creates the month's payslip, or refreshes an existing one from HR's
     * current pay sheet so allowances approved (or salaries changed) after it was first generated
     * are not left out. Payslips of employees with no pay sheet are kept as they are.
     */
    private Payslip regeneratePayslip(Employee employee, Integer month, Integer year) {
        Optional<Payslip> existing = payslipRepository.findByUserIdAndMonthAndYear(employee.getId(), month, year);
        if (existing.isEmpty()) {
            return generatePayslip(employee.getId(), month, year);
        }
        Optional<PaySheetDTO> paySheet = hrServiceClient.findPaySheet(employee.getEmail())
                .filter(PaySheetDTO::isConfigured);
        if (paySheet.isEmpty()) {
            return existing.get();
        }
        Payslip fresh = fromPaySheet(employee, paySheet.get(), month, year);
        Payslip payslip = existing.get();
        payslip.setBasicSalary(fresh.getBasicSalary());
        payslip.setTotalAllowances(fresh.getTotalAllowances());
        payslip.setTotalDeductions(fresh.getTotalDeductions());
        payslip.setGrossSalary(fresh.getGrossSalary());
        payslip.setNetSalary(fresh.getNetSalary());
        payslip.setWorkingDays(fresh.getWorkingDays());
        payslip.setPresentDays(fresh.getPresentDays());
        payslip.setAbsentDays(fresh.getAbsentDays());
        return payslipRepository.save(payslip);
    }

    public Payslip generatePayslip(Long employeeId, Integer month, Integer year) {
        Employee employee = employeeDirectory.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", employeeId));

        // Salary HR set for the employee's job role plus their individual allowances / deductions
        Optional<PaySheetDTO> paySheet = hrServiceClient.findPaySheet(employee.getEmail())
                .filter(PaySheetDTO::isConfigured);
        if (paySheet.isPresent()) {
            return payslipRepository.save(fromPaySheet(employee, paySheet.get(), month, year));
        }

        // Get salary structure or create default
        Salary salary = salaryRepository.findByUserId(employeeId)
                .orElseGet(() -> createDefaultSalary(employee));

        // Calculate present days
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.plusMonths(1).minusDays(1);
        List<Attendance> attendances = attendanceRepository.findByUserIdAndDateBetween(employeeId, startDate, endDate);
        
        long presentDaysCount = attendances.stream()
                .filter(a -> a.getStatus() == Attendance.AttendanceStatus.PRESENT)
                .count();

        int totalWorkingDays = 22; // Assumption
        int presentDays = presentDaysCount > 0 ? (int) presentDaysCount : totalWorkingDays; // Fallback to full month if no attendance
        int absentDays = Math.max(0, totalWorkingDays - presentDays);

        BigDecimal basic = salary.getBasicSalary();
        BigDecimal allowances = salary.getHouseAllowance()
                .add(salary.getTransportAllowance())
                .add(salary.getMedicalAllowance())
                .add(salary.getOtherAllowances());

        BigDecimal standardDeductions = salary.getTax().add(salary.getProvidentFund()).add(salary.getOtherDeductions());
        
        // Unpaid leave deduction logic
        BigDecimal dailyRate = basic.divide(BigDecimal.valueOf(totalWorkingDays), 2, RoundingMode.HALF_UP);
        BigDecimal absentDeduction = dailyRate.multiply(BigDecimal.valueOf(absentDays));
        BigDecimal totalDeductions = standardDeductions.add(absentDeduction);

        BigDecimal gross = basic.add(allowances);
        BigDecimal net = gross.subtract(totalDeductions);

        Payslip payslip = new Payslip();
        payslip.setUserId(employee.getId());
        payslip.setCompanyId(employee.getCompany() != null ? employee.getCompany().getId() : null);
        payslip.setMonth(month);
        payslip.setYear(year);
        payslip.setBasicSalary(basic);
        payslip.setTotalAllowances(allowances);
        payslip.setTotalDeductions(totalDeductions);
        payslip.setGrossSalary(gross);
        payslip.setNetSalary(net);
        payslip.setWorkingDays(totalWorkingDays);
        payslip.setPresentDays(presentDays);
        payslip.setAbsentDays(absentDays);
        payslip.setStatus(Payslip.PayslipStatus.PAID);

        return payslipRepository.save(payslip);
    }

    public List<Payslip> generateBulkPayroll(Long companyId, Integer month, Integer year) {
        List<Employee> employees = employeeDirectory.findByCompanyId(companyId);
        List<Payslip> generated = new ArrayList<>();
        for (Employee emp : employees) {
            if (emp.getStatus() == Employee.EmployeeStatus.ACTIVE) {
                generated.add(getOrCreatePayslip(emp.getId(), month, year));
            }
        }
        return generated;
    }

    /**
     * Payslip from the HR pay sheet: amounts exactly as HR set them (net = basic + total allowance
     * - total deduction), so it matches the HR payroll page. Attendance days are recorded for reference.
     */
    private Payslip fromPaySheet(Employee employee, PaySheetDTO sheet, Integer month, Integer year) {
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.plusMonths(1).minusDays(1);
        int presentDays = (int) attendanceRepository.findByUserIdAndDateBetween(employee.getId(), startDate, endDate).stream()
                .filter(a -> a.getStatus() == Attendance.AttendanceStatus.PRESENT)
                .count();
        int totalWorkingDays = 22; // Assumption, same as the attendance-based payslips

        BigDecimal basic = zeroIfNull(sheet.getBasicSalary());
        BigDecimal allowances = zeroIfNull(sheet.getTotalAllowance());
        BigDecimal deductions = zeroIfNull(sheet.getTotalDeduction());

        Payslip payslip = new Payslip();
        payslip.setUserId(employee.getId());
        payslip.setCompanyId(employee.getCompany() != null ? employee.getCompany().getId() : null);
        payslip.setMonth(month);
        payslip.setYear(year);
        payslip.setBasicSalary(basic);
        payslip.setTotalAllowances(allowances);
        payslip.setTotalDeductions(deductions);
        payslip.setGrossSalary(basic.add(allowances));
        payslip.setNetSalary(zeroIfNull(sheet.getNetTotal()));
        payslip.setWorkingDays(totalWorkingDays);
        payslip.setPresentDays(presentDays);
        payslip.setAbsentDays(Math.max(0, totalWorkingDays - presentDays));
        payslip.setStatus(Payslip.PayslipStatus.PAID);
        return payslip;
    }

    private static BigDecimal zeroIfNull(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    public static PayslipDTO toDTO(Payslip p) {
        PayslipDTO dto = new PayslipDTO();
        dto.setId(p.getId());
        dto.setEmployeeId(p.getUserId());
        dto.setMonth(p.getMonth());
        dto.setYear(p.getYear());
        dto.setBasicSalary(p.getBasicSalary());
        dto.setTotalAllowances(p.getTotalAllowances());
        dto.setTotalDeductions(p.getTotalDeductions());
        dto.setGrossSalary(p.getGrossSalary());
        dto.setNetSalary(p.getNetSalary());
        dto.setWorkingDays(p.getWorkingDays());
        dto.setPresentDays(p.getPresentDays());
        dto.setAbsentDays(p.getAbsentDays());
        dto.setStatus(p.getStatus() != null ? p.getStatus().name() : null);
        return dto;
    }

    private Salary createDefaultSalary(Employee employee) {
        BigDecimal basic = BigDecimal.valueOf(50000.00);
        BigDecimal house = BigDecimal.valueOf(5000.00);
        BigDecimal transport = BigDecimal.valueOf(3000.00);
        BigDecimal medical = BigDecimal.valueOf(2000.00);
        BigDecimal other = BigDecimal.valueOf(0.00);
        BigDecimal tax = BigDecimal.valueOf(1000.00);
        BigDecimal pf = BigDecimal.valueOf(2000.00);

        Salary salary = new Salary();
        salary.setUserId(employee.getId());
        salary.setCompanyId(employee.getCompany() != null ? employee.getCompany().getId() : null);
        salary.setBasicSalary(basic);
        salary.setHouseAllowance(house);
        salary.setTransportAllowance(transport);
        salary.setMedicalAllowance(medical);
        salary.setOtherAllowances(other);
        salary.setTax(tax);
        salary.setProvidentFund(pf);
        salary.setOtherDeductions(BigDecimal.ZERO);
        salary.setGrossSalary(basic.add(house).add(transport).add(medical).add(other));
        salary.setNetSalary(salary.getGrossSalary().subtract(tax).subtract(pf));

        return salaryRepository.save(salary);
    }
}
