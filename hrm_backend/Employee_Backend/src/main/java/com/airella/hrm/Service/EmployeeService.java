package com.airella.hrm.service;

import com.airella.hrm.dto.CompanyDTO;
import com.airella.hrm.dto.EmployeeDTO;
import com.airella.hrm.dto.EmployeeProfileDTO;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.Company;
import com.airella.hrm.model.Employee;
import com.airella.hrm.repository.CompanyRepository;
import org.modelmapper.ModelMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Read-only access to employees, plus company status changes. People are created,
 * edited and removed only in User_Backend (hrm_db_user); this service reads them from there.
 */
@Service
@Transactional
public class EmployeeService {

    private static final Logger log = LoggerFactory.getLogger(EmployeeService.class);

    private final EmployeeDirectory employeeDirectory;
    private final CompanyRepository companyRepository;
    private final ModelMapper modelMapper;

    public EmployeeService(EmployeeDirectory employeeDirectory,
                           CompanyRepository companyRepository,
                           ModelMapper modelMapper) {
        this.employeeDirectory = employeeDirectory;
        this.companyRepository = companyRepository;
        this.modelMapper = modelMapper;
    }

    @Transactional(readOnly = true)
    public List<EmployeeDTO> getAllEmployeesByCompany(Long companyId) {
        return employeeDirectory.findByCompanyId(companyId).stream()
                .map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<EmployeeDTO> getActiveEmployeesByCompany(Long companyId) {
        return employeeDirectory.findByCompanyIdAndStatus(companyId, Employee.EmployeeStatus.ACTIVE).stream()
                .map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public EmployeeDTO getEmployeeById(Long id) {
        return getEmployeeById(id, null);
    }

    /** The logged-in employee's profile page: their User_Backend record plus their department's manager. */
    @Transactional(readOnly = true)
    public EmployeeProfileDTO getProfile(Employee employee) {
        EmployeeProfileDTO profile = employeeDirectory.findProfile(employee.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", employee.getId()));
        return withReportingManager(profile, employee);
    }

    public EmployeeProfileDTO updateProfile(Employee employee, EmployeeProfileDTO.UpdateRequest request) {
        EmployeeProfileDTO profile = employeeDirectory.updateProfile(employee.getId(), request)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", employee.getId()));
        log.info("Employee {} updated their profile", employee.getId());
        return withReportingManager(profile, employee);
    }

    private EmployeeProfileDTO withReportingManager(EmployeeProfileDTO profile, Employee employee) {
        Long managerId = employee.getDepartment() != null ? employee.getDepartment().getManagerUserId() : null;
        if (managerId != null && !managerId.equals(employee.getId())) {
            employeeDirectory.findById(managerId).ifPresent(m -> profile.setReportingManagerName(m.getFullName()));
        }
        return profile;
    }

    /** The employee, if they belong to the given company (null = any); otherwise not found. */
    @Transactional(readOnly = true)
    public EmployeeDTO getEmployeeById(Long id, Long companyId) {
        Employee employee = employeeDirectory.findById(id)
                .filter(e -> companyId == null || (e.getCompany() != null && companyId.equals(e.getCompany().getId())))
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", id));
        return convertToDTO(employee);
    }

    @Transactional(readOnly = true)
    public List<EmployeeDTO> getEmployeesByDepartment(Long departmentId) {
        return employeeDirectory.findByDepartmentId(departmentId).stream()
                .map(this::convertToDTO).collect(Collectors.toList());
    }

    /**
     * Marks a company approved in this database. The HR Manager login is provisioned
     * only in User_Backend (by Admin_Backend's approval flow).
     */
    public CompanyDTO approveCompany(Long companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        company.setStatus(Company.CompanyStatus.APPROVED);
        Company savedCompany = companyRepository.save(company);

        log.info("Approved company '{}' (ID: {})", savedCompany.getCompanyName(), savedCompany.getId());

        CompanyDTO dto = modelMapper.map(savedCompany, CompanyDTO.class);
        dto.setStatus(savedCompany.getStatus().name());
        return dto;
    }

    /**
     * Reject a pending company request.
     */
    public CompanyDTO rejectCompany(Long companyId, String reason) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        company.setStatus(Company.CompanyStatus.REJECTED);
        company.setRejectionReason(reason);
        Company savedCompany = companyRepository.save(company);

        // Rejection email is handled centrally by Admin_Backend EmailService

        log.info("Rejected company '{}' (ID: {}). Reason: {}", savedCompany.getCompanyName(), savedCompany.getId(), reason);

        CompanyDTO dto = modelMapper.map(savedCompany, CompanyDTO.class);
        dto.setStatus(savedCompany.getStatus().name());
        dto.setRejectionReason(reason);
        return dto;
    }

    public EmployeeDTO convertToDTO(Employee employee) {
        EmployeeDTO dto = new EmployeeDTO();
        dto.setId(employee.getId());
        dto.setEmployeeId(employee.getEmployeeId());
        dto.setFullName(employee.getFullName());
        dto.setEmail(employee.getEmail());
        dto.setDesignation(employee.getDesignation());
        dto.setJoiningDate(employee.getJoiningDate());
        dto.setTerminationDate(employee.getTerminationDate());
        if (employee.getCompany() != null) {
            dto.setCompanyId(employee.getCompany().getId());
            dto.setCompanyName(employee.getCompany().getCompanyName());
        }
        if (employee.getDepartment() != null) {
            dto.setDepartmentId(employee.getDepartment().getId());
        }
        dto.setDepartmentName(employee.getDepartment() != null ? employee.getDepartment().getName() : employee.getDepartmentName());
        if (employee.getRole() != null) dto.setRole(employee.getRole().name());
        if (employee.getStatus() != null) dto.setStatus(employee.getStatus().name());
        return dto;
    }
}
