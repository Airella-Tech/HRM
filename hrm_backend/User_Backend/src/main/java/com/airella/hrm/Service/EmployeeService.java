package com.airella.hrm.service;

import com.airella.hrm.DTO.EmployeeDTO;
import com.airella.hrm.Model.Company;
import com.airella.hrm.Model.Department;
import com.airella.hrm.Model.Employee;
import com.airella.hrm.Repo.CompanyRepo;
import com.airella.hrm.Repo.DepartmentRepo;
import com.airella.hrm.Repo.EmployeeRepo;
import com.airella.hrm.Repo.LeaveApplicationRepo;
import com.airella.hrm.Repo.LeaveBalanceRepo;
import com.airella.hrm.Repo.PayslipRepo;
import com.airella.hrm.Repo.SalaryRepo;
import com.airella.hrm.Repo.NotificationRepo;
import com.airella.hrm.Repo.AuditLogRepo;
import com.airella.hrm.Repo.SessionLogRepo;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class EmployeeService {

    @Autowired
    private EmployeeRepo employeeRepo;

    @Autowired
    private CompanyRepo companyRepo;

    @Autowired
    private DepartmentRepo departmentRepo;

    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuditService auditService;

    @Autowired
    private EmploymentTypeService employmentTypeService;

    @Autowired
    private LeaveApplicationRepo leaveApplicationRepo;

    @Autowired
    private LeaveBalanceRepo leaveBalanceRepo;

    @Autowired
    private PayslipRepo payslipRepo;

    @Autowired
    private SalaryRepo salaryRepo;

    @Autowired
    private NotificationRepo notificationRepo;

    @Autowired
    private AuditLogRepo auditLogRepo;

    @Autowired
    private SessionLogRepo sessionLogRepo;

    @Autowired
    private AuthService authService;

    @Autowired
    private com.airella.hrm.Repo.UserRepo userRepo;

    /** Only the given company's people — each company's data is kept separate. */
    public List<EmployeeDTO> getAllEmployeesByCompany(Long companyId) {
        List<Employee> employees = employeeRepo.findByCompanyId(companyId);
        return employees.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<EmployeeDTO> getActiveEmployeesByCompany(Long companyId) {
        List<Employee> employees = employeeRepo.findByCompanyIdAndStatus(companyId, Employee.EmployeeStatus.ACTIVE);
        return employees.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public EmployeeDTO getEmployeeById(Long id) {
        Employee employee = employeeRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found with id: " + id));
        return convertToDTO(employee);
    }

    /**
     * Throws "not found" unless {@code employeeId} belongs to {@code actor}'s company,
     * so an HR manager can only see and change their own company's people.
     * System administrators may act on any company.
     */
    public void assertSameCompany(Long employeeId, Employee actor) {
        if (actor.getRole() == Employee.Role.ADMIN) return;
        Employee target = employeeRepo.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found with id: " + employeeId));
        if (actor.getCompany() == null || target.getCompany() == null
                || !actor.getCompany().getId().equals(target.getCompany().getId())) {
            throw new RuntimeException("Employee not found with id: " + employeeId);
        }
    }

    public EmployeeDTO createEmployee(EmployeeDTO employeeDTO, Long companyId) {
        // Check if email already exists
        String normalizedEmail = employeeDTO.getEmail() == null ? "" : employeeDTO.getEmail().trim().toLowerCase();
        if (employeeRepo.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
            throw new RuntimeException("Employee with email " + normalizedEmail + " already exists");
        }

        // Check if employee ID already exists
        if (employeeRepo.findByEmployeeId(employeeDTO.getEmployeeId()).isPresent()) {
            throw new RuntimeException("Employee ID " + employeeDTO.getEmployeeId() + " already exists");
        }

        Employee employee = new Employee();
        employee.setEmployeeId(employeeDTO.getEmployeeId());
        employee.setFullName(employeeDTO.getFullName());
        employee.setEmail(normalizedEmail);
        employee.setPassword(passwordEncoder.encode(employeeDTO.getPassword()));
        employee.setNic(employeeDTO.getNic());
        employee.setDob(employeeDTO.getDob());
        employee.setAddress(employeeDTO.getAddress());
        employee.setPhone(employeeDTO.getPhone());
        
        if (employeeDTO.getGender() != null) {
            employee.setGender(Employee.Gender.valueOf(employeeDTO.getGender()));
        }
        
        if (employeeDTO.getRole() != null) {
            employee.setRole(Employee.Role.valueOf(employeeDTO.getRole()));
        } else {
            employee.setRole(Employee.Role.EMPLOYEE);
        }

        employee.setDesignation(employeeDTO.getDesignation());
        employee.setEmploymentType(employmentTypeService.resolve(employeeDTO.getEmploymentType(), null));
        employee.setJoiningDate(employeeDTO.getJoiningDate() != null ? employeeDTO.getJoiningDate() : LocalDate.now());
        employee.setStatus(Employee.EmployeeStatus.ACTIVE);

        // Set company
        Company company = companyRepo.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Company not found with id: " + companyId));
        employee.setCompany(company);

        // Set department if provided
        if (employeeDTO.getDepartmentId() != null) {
            Department department = departmentRepo.findById(employeeDTO.getDepartmentId())
                    .orElseThrow(() -> new RuntimeException("Department not found with id: " + employeeDTO.getDepartmentId()));
            employee.setDepartment(department);
        }

        Employee savedEmployee = employeeRepo.save(employee);
        
        // Audit log
        auditService.logAction("CREATE_EMPLOYEE", "Employee", savedEmployee.getId(), 
                "Created employee: " + savedEmployee.getFullName(), companyId);

        // Keep the legacy users table in step
        authService.syncUserTable(savedEmployee);

        return convertToDTO(savedEmployee);
    }

    public EmployeeDTO updateEmployee(Long id, EmployeeDTO employeeDTO) {
        Employee employee = employeeRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found with id: " + id));

        employee.setFullName(employeeDTO.getFullName());
        employee.setNic(employeeDTO.getNic());
        employee.setDob(employeeDTO.getDob());
        employee.setAddress(employeeDTO.getAddress());
        employee.setPhone(employeeDTO.getPhone());
        
        if (employeeDTO.getGender() != null) {
            employee.setGender(Employee.Gender.valueOf(employeeDTO.getGender()));
        }

        employee.setDesignation(employeeDTO.getDesignation());
        employee.setEmploymentType(employmentTypeService.resolve(employeeDTO.getEmploymentType(), employee.getEmploymentType()));
        if (employeeDTO.getJoiningDate() != null) {
            employee.setJoiningDate(employeeDTO.getJoiningDate());
        }

        // Update department: by id when given, otherwise by name (the HR screen sends the name)
        if (employeeDTO.getDepartmentId() != null) {
            Department department = departmentRepo.findById(employeeDTO.getDepartmentId())
                    .filter(d -> d.getCompany() != null && d.getCompany().getId().equals(employee.getCompany().getId()))
                    .orElseThrow(() -> new RuntimeException("Department not found with id: " + employeeDTO.getDepartmentId()));
            employee.setDepartment(department);
        } else if (employeeDTO.getDepartmentName() != null && !employeeDTO.getDepartmentName().isBlank()) {
            String deptName = employeeDTO.getDepartmentName().trim();
            Company company = employee.getCompany();
            Department department = departmentRepo.findByCompanyIdAndName(company.getId(), deptName)
                    .orElseGet(() -> {
                        Department d = new Department();
                        d.setName(deptName);
                        d.setDescription(deptName + " Department");
                        d.setCompany(company);
                        return departmentRepo.save(d);
                    });
            employee.setDepartment(department);
        }

        Employee updatedEmployee = employeeRepo.save(employee);
        
        // Audit log
        auditService.logAction("UPDATE_EMPLOYEE", "Employee", updatedEmployee.getId(), 
                "Updated employee: " + updatedEmployee.getFullName(), employee.getCompany().getId());

        // Keep the legacy users table in step
        authService.syncUserTable(updatedEmployee);

        return convertToDTO(updatedEmployee);
    }

    public void deactivateEmployee(Long id) {
        Employee employee = employeeRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found with id: " + id));

        employee.setStatus(Employee.EmployeeStatus.INACTIVE);
        employeeRepo.save(employee);
        
        // Audit log
        auditService.logAction("DEACTIVATE_EMPLOYEE", "Employee", employee.getId(), 
                "Deactivated employee: " + employee.getFullName(), employee.getCompany().getId());
    }

    /**
     * Permanently deletes an employee and everything that points at them.
     * HR managers may delete employees and other HR managers, but never an
     * administrator, and nobody may delete their own account.
     */
    public void deleteEmployee(Long id, Employee actor) {
        Employee employee = employeeRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found with id: " + id));

        if (actor != null && actor.getId().equals(employee.getId())) {
            throw new RuntimeException("You cannot delete your own account");
        }
        if (actor != null && actor.getRole() == Employee.Role.HR_MANAGER
                && employee.getRole() == Employee.Role.ADMIN) {
            throw new RuntimeException("HR managers cannot delete a system administrator");
        }

        Long companyId = employee.getCompany() != null ? employee.getCompany().getId() : null;
        String label = employee.getFullName() + " (" + employee.getEmployeeId() + ")";

        // Remove / detach rows that reference this employee so the FK constraints don't block the delete
        leaveApplicationRepo.clearApprover(id);
        leaveApplicationRepo.deleteByEmployeeId(id);
        leaveBalanceRepo.deleteByEmployeeId(id);
        payslipRepo.deleteByEmployeeId(id);
        salaryRepo.deleteByEmployeeId(id);
        notificationRepo.deleteByEmployeeId(id);
        auditLogRepo.detachEmployee(id);
        departmentRepo.clearManager(id);
        sessionLogRepo.deleteByUserId(id);

        if (employee.getEmail() != null) {
            userRepo.findByEmailIgnoreCase(employee.getEmail().trim().toLowerCase())
                    .ifPresent(u -> userRepo.delete(u));
        }

        employeeRepo.delete(employee);
        employeeRepo.flush();

        auditService.logAction("DELETE_EMPLOYEE", "Employee", id, "Deleted employee: " + label, companyId);
    }

    public void terminateEmployee(Long id, LocalDate terminationDate) {
        Employee employee = employeeRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found with id: " + id));

        employee.setStatus(Employee.EmployeeStatus.TERMINATED);
        employee.setTerminationDate(terminationDate);
        employeeRepo.save(employee);
        
        // Audit log
        auditService.logAction("TERMINATE_EMPLOYEE", "Employee", employee.getId(),
                "Terminated employee: " + employee.getFullName(), employee.getCompany().getId());
    }

    public List<EmployeeDTO> getEmployeesByDepartment(Long departmentId) {
        List<Employee> employees = employeeRepo.findByDepartmentId(departmentId);
        return employees.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    private EmployeeDTO convertToDTO(Employee employee) {
        EmployeeDTO dto = modelMapper.map(employee, EmployeeDTO.class);
        dto.setPassword(null); // Never send password in response
        
        if (employee.getCompany() != null) {
            dto.setCompanyId(employee.getCompany().getId());
            dto.setCompanyName(employee.getCompany().getCompanyName());
        }
        
        if (employee.getDepartment() != null) {
            dto.setDepartmentId(employee.getDepartment().getId());
            dto.setDepartmentName(employee.getDepartment().getName());
        }
        
        if (employee.getGender() != null) {
            dto.setGender(employee.getGender().name());
        }
        
        if (employee.getRole() != null) {
            dto.setRole(employee.getRole().name());
        }
        
        if (employee.getStatus() != null) {
            dto.setStatus(employee.getStatus().name());
        }
        
        return dto;
    }
}
