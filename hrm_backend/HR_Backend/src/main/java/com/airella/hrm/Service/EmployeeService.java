package com.airella.hrm.service;

import com.airella.hrm.dto.EmployeeDTO;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.Employee;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Read-only access to employees. People are created, edited and removed only in
 * User_Backend (hrm_db_user); this service reads them from there.
 */
@Service
public class EmployeeService {

    private final EmployeeDirectory employeeDirectory;

    public EmployeeService(EmployeeDirectory employeeDirectory) {
        this.employeeDirectory = employeeDirectory;
    }

    public List<EmployeeDTO> getAllEmployeesByCompany(Long companyId) {
        return employeeDirectory.findByCompanyId(companyId).stream()
                .map(this::convertToDTO).collect(Collectors.toList());
    }

    public List<EmployeeDTO> getActiveEmployeesByCompany(Long companyId) {
        return employeeDirectory.findByCompanyIdAndStatus(companyId, Employee.EmployeeStatus.ACTIVE).stream()
                .map(this::convertToDTO).collect(Collectors.toList());
    }

    public EmployeeDTO getEmployeeById(Long id) {
        return getEmployeeById(id, null);
    }

    /** The employee, if they belong to the given company (null = any); otherwise not found. */
    public EmployeeDTO getEmployeeById(Long id, Long companyId) {
        Employee employee = employeeDirectory.findById(id)
                .filter(e -> companyId == null || (e.getCompany() != null && companyId.equals(e.getCompany().getId())))
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", id));
        return convertToDTO(employee);
    }

    public List<EmployeeDTO> getEmployeesByDepartment(Long departmentId) {
        return employeeDirectory.findByDepartmentId(departmentId).stream()
                .map(this::convertToDTO).collect(Collectors.toList());
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
