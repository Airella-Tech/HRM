package com.airella.hrm.service;

import com.airella.hrm.DTO.DepartmentDTO;
import com.airella.hrm.DTO.JobRoleDTO;
import com.airella.hrm.Model.Company;
import com.airella.hrm.Model.Department;
import com.airella.hrm.Model.Employee;
import com.airella.hrm.Model.JobRole;
import com.airella.hrm.Repo.DepartmentRepo;
import com.airella.hrm.Repo.EmployeeRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Handles HR department management (add / update / deactivate / assign manager)
 * directly against the User_Backend database (hrm_db_user) — the same database
 * used for login, employee records and authentication. This keeps HR department
 * data as part of the single source of truth instead of the separate HR service.
 */
@Service
@Transactional
public class DepartmentService {

    @Autowired
    private DepartmentRepo departmentRepo;

    @Autowired
    private EmployeeRepo employeeRepo;

    @Autowired
    private AuthService authService;

    @Autowired
    private AuditService auditService;

    private static final String HR_EMPLOYEE_ID_PREFIX = "HR-";

    /**
     * Confirms the currently logged-in user is allowed to perform HR department
     * actions: either an ADMIN, or an HR_MANAGER whose employee ID follows the
     * "HR-" numbering scheme (e.g. HR-001). This is enforced here in addition to
     * the role-based @PreAuthorize check on the controller, since the person's
     * requirement was specifically tied to the HR- employee ID prefix.
     */
    private Employee requireHrOrAdmin() {
        Employee current = authService.getCurrentEmployee();

        boolean isAdmin = current.getRole() == Employee.Role.ADMIN;
        boolean isHr = current.getRole() == Employee.Role.HR_MANAGER
                && current.getEmployeeId() != null
                && current.getEmployeeId().toUpperCase().startsWith(HR_EMPLOYEE_ID_PREFIX);

        if (!isAdmin && !isHr) {
            throw new RuntimeException("Only HR staff (employee ID starting with 'HR-') or an Admin can manage departments");
        }
        return current;
    }

    public List<DepartmentDTO> getDepartmentsByCompany(Long companyId) {
        return departmentRepo.findByCompanyId(companyId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public DepartmentDTO getDepartmentById(Long id, Long companyId) {
        Department department = departmentRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Department not found with id: " + id));
        if (!department.getCompany().getId().equals(companyId)) {
            throw new RuntimeException("Department does not belong to your company");
        }
        return convertToDTO(department);
    }

    public DepartmentDTO createDepartment(DepartmentDTO dto) {
        Employee hr = requireHrOrAdmin();
        Company company = hr.getCompany();

        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new RuntimeException("Department name is required");
        }

        departmentRepo.findByCompanyIdAndName(company.getId(), dto.getName().trim())
                .ifPresent(existing -> {
                    throw new RuntimeException("A department named '" + dto.getName().trim() + "' already exists");
                });

        Department department = new Department();
        department.setName(dto.getName().trim());
        department.setShortCode(dto.getShortCode() != null ? dto.getShortCode().trim().toUpperCase() : null);
        department.setDescription(dto.getDescription() != null ? dto.getDescription().trim() : null);
        department.setCompany(company);
        department.setActive(true);

        if (dto.getManagerId() != null) {
            Employee manager = employeeRepo.findById(dto.getManagerId())
                    .orElseThrow(() -> new RuntimeException("Employee not found with id: " + dto.getManagerId()));
            department.setManager(manager);
        }

        applyJobRoles(department, dto.getJobRoles());

        Department saved = departmentRepo.save(department);

        auditService.logAction("CREATE_DEPARTMENT", "Department", saved.getId(),
                "Created department: " + saved.getName(), company.getId());

        return convertToDTO(saved);
    }

    public DepartmentDTO updateDepartment(Long id, DepartmentDTO dto) {
        Employee hr = requireHrOrAdmin();
        Department department = departmentRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Department not found with id: " + id));

        if (!department.getCompany().getId().equals(hr.getCompany().getId())) {
            throw new RuntimeException("Department does not belong to your company");
        }

        if (dto.getName() != null && !dto.getName().trim().isEmpty()) {
            department.setName(dto.getName().trim());
        }
        if (dto.getShortCode() != null) {
            department.setShortCode(dto.getShortCode().trim().toUpperCase());
        }
        if (dto.getDescription() != null) {
            department.setDescription(dto.getDescription().trim());
        }
        if (dto.getActive() != null) {
            department.setActive(dto.getActive());
        }

        if (dto.getManagerId() != null) {
            Employee manager = employeeRepo.findById(dto.getManagerId())
                    .orElseThrow(() -> new RuntimeException("Employee not found with id: " + dto.getManagerId()));
            department.setManager(manager);
        }

        if (dto.getJobRoles() != null) {
            department.clearJobRoles();
            applyJobRoles(department, dto.getJobRoles());
        }

        Department saved = departmentRepo.save(department);

        auditService.logAction("UPDATE_DEPARTMENT", "Department", saved.getId(),
                "Updated department: " + saved.getName(), hr.getCompany().getId());

        return convertToDTO(saved);
    }

    public void deactivateDepartment(Long id) {
        Employee hr = requireHrOrAdmin();
        Department department = departmentRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Department not found with id: " + id));

        if (!department.getCompany().getId().equals(hr.getCompany().getId())) {
            throw new RuntimeException("Department does not belong to your company");
        }

        department.setActive(false);
        departmentRepo.save(department);

        auditService.logAction("DEACTIVATE_DEPARTMENT", "Department", department.getId(),
                "Deactivated department: " + department.getName(), hr.getCompany().getId());
    }

    /**
     * Permanently deletes a department (a "hard" delete, as opposed to
     * deactivateDepartment() above which just flips the active flag).
     * Only an HR Manager (employee ID starting "HR-") or an Admin can do
     * this, and only for a department in their own company. Job roles under
     * the department are removed automatically (cascade). If employees are
     * still assigned to the department, the delete is rejected so records
     * aren't left pointing at a department that no longer exists — the
     * caller should reassign/remove those employees first, or use
     * deactivateDepartment() instead if the history should be kept.
     */
    public void deleteDepartment(Long id) {
        Employee hr = requireHrOrAdmin();
        Department department = departmentRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Department not found with id: " + id));

        if (!department.getCompany().getId().equals(hr.getCompany().getId())) {
            throw new RuntimeException("Department does not belong to your company");
        }

        long employeeCount = employeeRepo.countByDepartmentId(id);
        if (employeeCount > 0) {
            throw new RuntimeException("Cannot delete '" + department.getName() + "': " + employeeCount
                    + " employee(s) are still assigned to it. Reassign or remove them first, or deactivate the department instead.");
        }

        String departmentName = department.getName();
        Long companyId = hr.getCompany().getId();

        departmentRepo.delete(department);

        auditService.logAction("DELETE_DEPARTMENT", "Department", id,
                "Deleted department: " + departmentName, companyId);
    }

    public DepartmentDTO assignManager(Long id, Long managerId) {
        Employee hr = requireHrOrAdmin();
        Department department = departmentRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Department not found with id: " + id));

        if (!department.getCompany().getId().equals(hr.getCompany().getId())) {
            throw new RuntimeException("Department does not belong to your company");
        }

        Employee manager = employeeRepo.findById(managerId)
                .orElseThrow(() -> new RuntimeException("Employee not found with id: " + managerId));

        department.setManager(manager);
        Department saved = departmentRepo.save(department);

        auditService.logAction("ASSIGN_DEPARTMENT_MANAGER", "Department", saved.getId(),
                "Assigned manager " + manager.getFullName() + " to department: " + saved.getName(),
                hr.getCompany().getId());

        return convertToDTO(saved);
    }

    private void applyJobRoles(Department department, List<JobRoleDTO> jobRoleDTOs) {
        if (jobRoleDTOs == null) {
            return;
        }
        for (JobRoleDTO roleDto : jobRoleDTOs) {
            if (roleDto.getJobTitle() != null && !roleDto.getJobTitle().trim().isEmpty()) {
                JobRole role = new JobRole();
                role.setJobTitle(roleDto.getJobTitle().trim());
                role.setBasicSalary(roleDto.getBasicSalary() != null ? roleDto.getBasicSalary() : 0.0);
                department.addJobRole(role);
            }
        }
    }

    private DepartmentDTO convertToDTO(Department dept) {
        DepartmentDTO dto = new DepartmentDTO();
        dto.setId(dept.getId());
        dto.setName(dept.getName());
        dto.setShortCode(dept.getShortCode());
        dto.setDescription(dept.getDescription());
        dto.setCompanyId(dept.getCompany() != null ? dept.getCompany().getId() : null);
        dto.setActive(dept.getActive());

        if (dept.getManager() != null) {
            dto.setManagerId(dept.getManager().getId());
            dto.setManagerName(dept.getManager().getFullName());
        }

        dto.setEmployeeCount((int) employeeRepo.countByDepartmentId(dept.getId()));

        if (dept.getJobRoles() != null) {
            dto.setJobRoleCount(dept.getJobRoles().size());
            List<JobRoleDTO> jobRoleDTOs = new ArrayList<>();
            for (JobRole role : dept.getJobRoles()) {
                JobRoleDTO roleDto = new JobRoleDTO();
                roleDto.setId(role.getId());
                roleDto.setJobTitle(role.getJobTitle());
                roleDto.setBasicSalary(role.getBasicSalary());
                jobRoleDTOs.add(roleDto);
            }
            dto.setJobRoles(jobRoleDTOs);
        } else {
            dto.setJobRoleCount(0);
            dto.setJobRoles(new ArrayList<>());
        }

        return dto;
    }
}
