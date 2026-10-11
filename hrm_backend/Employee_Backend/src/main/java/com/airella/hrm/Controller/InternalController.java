package com.airella.hrm.controller;

import com.airella.hrm.dto.*;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.*;
import com.airella.hrm.repository.*;
import com.airella.hrm.service.EmployeeDirectory;
import com.airella.hrm.service.EmployeeService;
import com.airella.hrm.service.PayrollService;
import org.modelmapper.ModelMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Internal API controller — for inter-service communication ONLY.
 * These endpoints are NOT protected by JWT (service-to-service calls).
 * Should NOT be exposed to the public internet in production.
 */
@RestController
@RequestMapping("/api/internal")
public class InternalController {

    private static final Logger log = LoggerFactory.getLogger(InternalController.class);

    private final EmployeeDirectory employeeDirectory;
    private final CompanyRepository companyRepository;
    private final DepartmentRepository departmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final LeaveApplicationRepository leaveApplicationRepository;
    private final EmployeeService employeeService;
    private final PayrollService payrollService;
    private final SalaryRepository salaryRepository;
    private final ModelMapper modelMapper;

    public InternalController(EmployeeDirectory employeeDirectory,
                              CompanyRepository companyRepository,
                              DepartmentRepository departmentRepository,
                              AttendanceRepository attendanceRepository,
                              LeaveApplicationRepository leaveApplicationRepository,
                              EmployeeService employeeService,
                              PayrollService payrollService,
                              SalaryRepository salaryRepository,
                              ModelMapper modelMapper) {
        this.employeeDirectory = employeeDirectory;
        this.companyRepository = companyRepository;
        this.departmentRepository = departmentRepository;
        this.attendanceRepository = attendanceRepository;
        this.leaveApplicationRepository = leaveApplicationRepository;
        this.employeeService = employeeService;
        this.payrollService = payrollService;
        this.salaryRepository = salaryRepository;
        this.modelMapper = modelMapper;
    }

    // ── Dashboard Statistics ─────────────────────────────────────

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalEmployees", (long) employeeDirectory.findAll().size());
        stats.put("totalCompanies", companyRepository.count());
        stats.put("pendingCompanies", companyRepository.countByStatus(Company.CompanyStatus.PENDING));
        stats.put("totalDepartments", departmentRepository.count());
        stats.put("presentToday", attendanceRepository.countPresentByCompanyIdAndDate(null, LocalDate.now()));
        stats.put("pendingLeaves", leaveApplicationRepository.countByCompanyIdAndStatus(null, LeaveApplication.LeaveStatus.PENDING));
        log.debug("Internal stats requested");
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/stats/company/{companyId}")
    public ResponseEntity<Map<String, Object>> getCompanyStats(@PathVariable Long companyId) {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalEmployees", employeeDirectory.countByCompanyIdAndStatus(companyId, Employee.EmployeeStatus.ACTIVE));
        stats.put("presentToday", attendanceRepository.countPresentByCompanyIdAndDate(companyId, LocalDate.now()));
        stats.put("pendingLeaves", leaveApplicationRepository.countByCompanyIdAndStatus(companyId, LeaveApplication.LeaveStatus.PENDING));
        return ResponseEntity.ok(stats);
    }

    // ── Employees ────────────────────────────────────────────────

    @GetMapping("/employees")
    @Transactional(readOnly = true)
    public ResponseEntity<List<EmployeeDTO>> getAllEmployees() {
        List<EmployeeDTO> employees = employeeDirectory.findAll().stream()
                .map(this::convertToEmployeeDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(employees);
    }

    @GetMapping("/employees/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<EmployeeDTO> getEmployeeById(@PathVariable Long id) {
        Employee employee = employeeDirectory.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", id));
        return ResponseEntity.ok(convertToEmployeeDTO(employee));
    }

    @GetMapping("/employees/company/{companyId}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<EmployeeDTO>> getEmployeesByCompany(@PathVariable Long companyId) {
        List<EmployeeDTO> employees = employeeDirectory.findByCompanyId(companyId).stream()
                .map(this::convertToEmployeeDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(employees);
    }

    @GetMapping("/employees/admins")
    @Transactional(readOnly = true)
    public ResponseEntity<List<EmployeeDTO>> getAdminUsers() {
        List<EmployeeDTO> admins = employeeDirectory.findAll().stream()
                .filter(e -> e.getRole() == Employee.Role.ADMIN || e.getRole() == Employee.Role.HR_MANAGER)
                .map(this::convertToEmployeeDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(admins);
    }

    // Role and status changes are made in User_Backend (/api/internal/users/{id}/role|status), the owner of users.

    // ── Companies ────────────────────────────────────────────────

    @GetMapping("/companies")
    public ResponseEntity<List<CompanyDTO>> getAllCompanies() {
        List<CompanyDTO> companies = companyRepository.findAll().stream()
                .map(c -> {
                    CompanyDTO dto = modelMapper.map(c, CompanyDTO.class);
                    dto.setEmployeeCount(employeeDirectory.countByCompanyIdAndStatus(c.getId(), Employee.EmployeeStatus.ACTIVE));
                    return dto;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(companies);
    }

    @GetMapping("/companies/{id}")
    public ResponseEntity<CompanyDTO> getCompanyById(@PathVariable Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));
        CompanyDTO dto = modelMapper.map(company, CompanyDTO.class);
        dto.setEmployeeCount(employeeDirectory.countByCompanyIdAndStatus(id, Employee.EmployeeStatus.ACTIVE));
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/companies")
    public ResponseEntity<CompanyDTO> createCompany(@RequestBody CompanyDTO dto) {
        Company company = new Company();
        company.setCompanyName(dto.getCompanyName());
        company.setRegistrationNumber(dto.getRegistrationNumber());
        company.setEmail(dto.getEmail());
        company.setPhone(dto.getPhone());
        company.setAddress(dto.getAddress());
        company.setWebsite(dto.getWebsite());
        company.setStatus(Company.CompanyStatus.PENDING);
        Company saved = companyRepository.save(company);
        log.info("Internal: Created company {} ({})", saved.getCompanyName(), saved.getRegistrationNumber());
        return ResponseEntity.ok(modelMapper.map(saved, CompanyDTO.class));
    }

    @PutMapping("/companies/{id}")
    public ResponseEntity<CompanyDTO> updateCompany(@PathVariable Long id, @RequestBody CompanyDTO dto) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));
        if (dto.getCompanyName() != null) company.setCompanyName(dto.getCompanyName());
        if (dto.getEmail() != null) company.setEmail(dto.getEmail());
        if (dto.getPhone() != null) company.setPhone(dto.getPhone());
        if (dto.getAddress() != null) company.setAddress(dto.getAddress());
        if (dto.getWebsite() != null) company.setWebsite(dto.getWebsite());
        if (dto.getStatus() != null) company.setStatus(Company.CompanyStatus.valueOf(dto.getStatus()));
        Company saved = companyRepository.save(company);
        return ResponseEntity.ok(modelMapper.map(saved, CompanyDTO.class));
    }

    @PostMapping("/companies/{id}/approve")
    public ResponseEntity<CompanyDTO> approveCompanyInternal(@PathVariable Long id) {
        CompanyDTO approved = employeeService.approveCompany(id);
        return ResponseEntity.ok(approved);
    }

    @PostMapping("/companies/{id}/reject")
    public ResponseEntity<CompanyDTO> rejectCompanyInternal(@PathVariable Long id, @RequestParam(required = false) String reason) {
        CompanyDTO rejected = employeeService.rejectCompany(id, reason != null ? reason : "Application rejected by admin.");
        return ResponseEntity.ok(rejected);
    }

    // ── Departments ──────────────────────────────────────────────

    @GetMapping("/departments")
    public ResponseEntity<List<DepartmentDTO>> getAllDepartments() {
        List<DepartmentDTO> departments = departmentRepository.findAll().stream()
                .map(d -> modelMapper.map(d, DepartmentDTO.class))
                .collect(Collectors.toList());
        return ResponseEntity.ok(departments);
    }

    @GetMapping("/departments/company/{companyId}")
    public ResponseEntity<List<DepartmentDTO>> getDepartmentsByCompany(@PathVariable Long companyId) {
        List<DepartmentDTO> departments = departmentRepository.findByCompanyId(companyId).stream()
                .map(d -> modelMapper.map(d, DepartmentDTO.class))
                .collect(Collectors.toList());
        return ResponseEntity.ok(departments);
    }

    // ── Attendance ───────────────────────────────────────────────

    @GetMapping("/attendance/daily")
    public ResponseEntity<List<AttendanceDTO>> getDailyAttendance(@RequestParam(required = false) String date,
                                                                   @RequestParam(required = false) Long companyId) {
        LocalDate targetDate = (date != null) ? LocalDate.parse(date) : LocalDate.now();
        List<Attendance> attendances;
        if (companyId != null) {
            attendances = attendanceRepository.findByCompanyIdAndDate(companyId, targetDate);
        } else {
            attendances = attendanceRepository.findAll().stream()
                    .filter(a -> a.getDate().equals(targetDate))
                    .collect(Collectors.toList());
        }
        List<AttendanceDTO> dtos = attendances.stream()
                .map(a -> modelMapper.map(a, AttendanceDTO.class))
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    // ── Leave ────────────────────────────────────────────────────

    @GetMapping("/leave/pending")
    public ResponseEntity<List<LeaveApplicationDTO>> getPendingLeaves(@RequestParam(required = false) Long companyId) {
        List<LeaveApplication> leaves;
        if (companyId != null) {
            leaves = leaveApplicationRepository.findByCompanyIdAndStatus(companyId, LeaveApplication.LeaveStatus.PENDING);
        } else {
            leaves = leaveApplicationRepository.findAll().stream()
                    .filter(l -> l.getStatus() == LeaveApplication.LeaveStatus.PENDING)
                    .collect(Collectors.toList());
        }
        List<LeaveApplicationDTO> dtos = leaves.stream()
                .map(l -> modelMapper.map(l, LeaveApplicationDTO.class))
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    // ── Private Helpers ──────────────────────────────────────────

    private EmployeeDTO convertToEmployeeDTO(Employee employee) {
        if (employee == null) return null;
        EmployeeDTO dto = new EmployeeDTO();
        dto.setId(employee.getId());
        dto.setEmployeeId(employee.getEmployeeId());
        dto.setFullName(employee.getFullName());
        dto.setEmail(employee.getEmail());
        dto.setDesignation(employee.getDesignation());
        dto.setJoiningDate(employee.getJoiningDate());
        dto.setTerminationDate(employee.getTerminationDate());
        if (employee.getRole() != null) dto.setRole(employee.getRole().name());
        if (employee.getStatus() != null) dto.setStatus(employee.getStatus().name());

        try {
            if (employee.getCompany() != null) {
                dto.setCompanyId(employee.getCompany().getId());
                dto.setCompanyName(employee.getCompany().getCompanyName());
            }
        } catch (Exception e) {
            log.warn("Could not lazily fetch company for employee {}: {}", employee.getId(), e.getMessage());
        }

        try {
            if (employee.getDepartment() != null) {
                dto.setDepartmentId(employee.getDepartment().getId());
                dto.setDepartmentName(employee.getDepartment().getName());
            }
        } catch (Exception e) {
            log.warn("Could not lazily fetch department for employee {}: {}", employee.getId(), e.getMessage());
        }

        return dto;
    }

    // ── Internal Payroll & Salary Endpoints ────────────────────────

    /**
     * Generates the month's payslips. HR_Backend sends its company's employee emails in the body,
     * since company and employee ids differ between the databases; without a body the employees
     * of companyId in this database are used, as before.
     */
    @PostMapping("/payroll/generate")
    public ResponseEntity<Map<String, Object>> generateBulkPayroll(@RequestParam Long companyId,
                                                                   @RequestParam Integer month,
                                                                   @RequestParam Integer year,
                                                                   @RequestBody(required = false) List<String> emails) {
        log.info("Internal: Bulk payroll generation requested for company: {}, month: {}, year: {}, emails: {}",
                companyId, month, year, emails == null ? "none" : emails.size());
        PayrollService.BulkResult result;
        if (emails != null) {
            result = payrollService.generateBulkPayrollForEmails(emails, month, year);
        } else {
            result = new PayrollService.BulkResult();
            payrollService.generateBulkPayroll(companyId, month, year).stream()
                    .map(PayrollService::toDTO).forEach(result.getGenerated()::add);
        }
        Map<String, Object> body = new HashMap<>();
        body.put("generated", result.getGenerated());
        body.put("skipped", result.getSkipped());
        return ResponseEntity.ok(body);
    }

    /** Sends one employee's payslip for the month (body: { email, month, year }). */
    @PostMapping("/payroll/send")
    public ResponseEntity<PayslipDTO> sendPayslip(@RequestBody Map<String, Object> body) {
        String email = body.get("email") == null ? null : String.valueOf(body.get("email"));
        Integer month = body.get("month") == null ? null : Integer.valueOf(String.valueOf(body.get("month")));
        Integer year = body.get("year") == null ? null : Integer.valueOf(String.valueOf(body.get("year")));
        if (email == null || email.isBlank() || month == null || year == null || month < 1 || month > 12) {
            return ResponseEntity.badRequest().build();
        }
        log.info("Internal: payslip send requested for {} ({}/{})", email, month, year);
        return ResponseEntity.ok(payrollService.sendPayslipByEmail(email.trim(), month, year));
    }

    @GetMapping("/salaries")
    public ResponseEntity<List<Salary>> getAllSalaries(@RequestParam(required = false) List<Long> userIds) {
        List<Salary> salaries = salaryRepository.findAll();
        if (userIds != null) {
            salaries = salaries.stream().filter(s -> userIds.contains(s.getUserId())).collect(java.util.stream.Collectors.toList());
        }
        return ResponseEntity.ok(salaries);
    }

    @GetMapping("/salaries/employee/{id}")
    public ResponseEntity<Salary> getSalaryByUserId(@PathVariable Long id) {
        Salary salary = salaryRepository.findByUserId(id).orElse(null);
        return ResponseEntity.ok(salary);
    }

    @PostMapping("/salaries")
    public ResponseEntity<Salary> saveSalary(@RequestBody Salary salary) {
        if (salary.getUserId() != null) {
            Employee emp = employeeDirectory.findById(salary.getUserId()).orElse(null);
            if (emp != null) {
                salary.setCompanyId(emp.getCompany().getId());
                BigDecimal basic = salary.getBasicSalary() != null ? salary.getBasicSalary() : BigDecimal.ZERO;
                BigDecimal house = salary.getHouseAllowance() != null ? salary.getHouseAllowance() : BigDecimal.ZERO;
                BigDecimal transport = salary.getTransportAllowance() != null ? salary.getTransportAllowance() : BigDecimal.ZERO;
                BigDecimal medical = salary.getMedicalAllowance() != null ? salary.getMedicalAllowance() : BigDecimal.ZERO;
                BigDecimal other = salary.getOtherAllowances() != null ? salary.getOtherAllowances() : BigDecimal.ZERO;
                BigDecimal tax = salary.getTax() != null ? salary.getTax() : BigDecimal.ZERO;
                BigDecimal pf = salary.getProvidentFund() != null ? salary.getProvidentFund() : BigDecimal.ZERO;
                
                salary.setGrossSalary(basic.add(house).add(transport).add(medical).add(other));
                salary.setNetSalary(salary.getGrossSalary().subtract(tax).subtract(pf));

                // If already exists, update existing
                Salary existing = salaryRepository.findByUserId(emp.getId()).orElse(null);
                if (existing != null) {
                    existing.setBasicSalary(basic);
                    existing.setHouseAllowance(house);
                    existing.setTransportAllowance(transport);
                    existing.setMedicalAllowance(medical);
                    existing.setOtherAllowances(other);
                    existing.setTax(tax);
                    existing.setProvidentFund(pf);
                    existing.setGrossSalary(salary.getGrossSalary());
                    existing.setNetSalary(salary.getNetSalary());
                    return ResponseEntity.ok(salaryRepository.save(existing));
                }
                return ResponseEntity.ok(salaryRepository.save(salary));
            }
        }
        return ResponseEntity.badRequest().build();
    }
}
