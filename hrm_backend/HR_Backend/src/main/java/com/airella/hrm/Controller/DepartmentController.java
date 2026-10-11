package com.airella.hrm.controller;

import com.airella.hrm.dto.*;
import com.airella.hrm.model.*;
import com.airella.hrm.repository.*;
import com.airella.hrm.service.AuthService;
import com.airella.hrm.service.EmployeeDirectory;
import com.airella.hrm.service.AuditService;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/hr/departments")
@PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
public class DepartmentController {

    private static final Logger log = LoggerFactory.getLogger(DepartmentController.class);

    private final DepartmentRepository departmentRepository;
    private final EmployeeDirectory employeeDirectory;
    private final CompanyRepository companyRepository;
    private final AuthService authService;
    private final AuditService auditService;
    private final RestTemplate restTemplate;

    @Value("${service.employee-url:http://localhost:5006}")
    private String employeeServiceUrl;

    public DepartmentController(DepartmentRepository departmentRepository,
                                EmployeeDirectory employeeDirectory,
                                CompanyRepository companyRepository,
                                AuthService authService,
                                AuditService auditService,
                                RestTemplate restTemplate) {
        this.departmentRepository = departmentRepository;
        this.employeeDirectory = employeeDirectory;
        this.companyRepository = companyRepository;
        this.authService = authService;
        this.auditService = auditService;
        this.restTemplate = restTemplate;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<DepartmentDTO>>> getCompanyDepartments() {
        Employee hr = authService.getCurrentEmployee();
        Long companyId = hr.getCompany().getId();
        List<Employee> people = employeeDirectory.findByCompanyId(companyId);
        List<DepartmentDTO> dtos = departmentRepository.findByCompanyId(companyId).stream()
                .map(d -> convertToDTO(d, people))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<DepartmentDTO>> createDepartment(@RequestBody DepartmentDTO dto) {
        Employee hr = authService.getCurrentEmployee();
        Company company = hr.getCompany();

        String newName = dto.getName() != null ? dto.getName().trim() : "";
        if (newName.isEmpty()) {
            throw new BusinessException("Department name is required");
        }
        assertDepartmentNameAvailable(company.getId(), newName, null);

        Department department = new Department();
        department.setName(newName);
        department.setShortCode(dto.getShortCode() != null ? dto.getShortCode().trim().toUpperCase() : null);
        department.setDescription(dto.getDescription() != null ? dto.getDescription().trim() : null);
        department.setCompany(company);
        department.setActive(true);

        if (dto.getManagerId() != null) {
            department.setManagerUserId(companyEmployee(dto.getManagerId(), company.getId()).getId());
        }

        // Job roles are saved together with the department (cascade) so they
        // always end up in the job_roles table linked to this department.
        applyJobRoles(department, dto.getJobRoles());

        Department saved = departmentRepository.saveAndFlush(department);

        try {
            auditService.logAction("CREATE", "Department", saved.getId(), "Created department: " + saved.getName(), company.getId());
        } catch (Exception ignored) {}

        syncDepartmentToEmployeeService(saved);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(convertToDTO(saved), "Department created successfully"));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<DepartmentDTO>> updateDepartment(@PathVariable Long id, @RequestBody DepartmentDTO dto) {
        Employee hr = authService.getCurrentEmployee();
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", id));

        if (!department.getCompany().getId().equals(hr.getCompany().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (dto.getName() != null) {
            String updatedName = dto.getName().trim();
            if (updatedName.isEmpty()) {
                throw new BusinessException("Department name is required");
            }
            assertDepartmentNameAvailable(hr.getCompany().getId(), updatedName, department.getId());
            department.setName(updatedName);
        }
        if (dto.getShortCode() != null) department.setShortCode(dto.getShortCode().trim().toUpperCase());
        if (dto.getDescription() != null) department.setDescription(dto.getDescription().trim());
        if (dto.getActive() != null) department.setActive(dto.getActive());

        if (dto.getManagerId() != null) {
            department.setManagerUserId(companyEmployee(dto.getManagerId(), hr.getCompany().getId()).getId());
        } else if (dto.getManagerId() == null && dto.getManagerName() == null) {
            department.setManagerUserId(null);
        }

        // Sync the department's job roles with the submitted list: existing
        // roles are updated in place, new ones added, removed ones deleted.
        if (dto.getJobRoles() != null) {
            applyJobRoles(department, dto.getJobRoles());
        }

        Department saved = departmentRepository.saveAndFlush(department);

        try {
            auditService.logAction("UPDATE", "Department", saved.getId(), "Updated department: " + saved.getName(), hr.getCompany().getId());
        } catch (Exception ignored) {}

        syncDepartmentToEmployeeService(saved);

        return ResponseEntity.ok(ApiResponse.success(convertToDTO(saved), "Department updated successfully"));
    }

    // ===== DELETE DEPARTMENT (permanent) =====
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteDepartment(@PathVariable Long id) {
        Employee hr = authService.getCurrentEmployee();
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", id));

        if (!department.getCompany().getId().equals(hr.getCompany().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        long employeeCount = employeeDirectory.countByDepartmentId(id);
        if (employeeCount > 0) {
            return ResponseEntity.badRequest().body(ApiResponse.error(
                    "Cannot delete '" + department.getName() + "': " + employeeCount
                            + " employee(s) are still assigned to it. Reassign or remove them first, or deactivate the department instead."));
        }

        String departmentName = department.getName();
        departmentRepository.delete(department);

        try {
            auditService.logAction("DELETE", "Department", id, "Deleted department: " + departmentName, hr.getCompany().getId());
        } catch (Exception ignored) {}

        return ResponseEntity.ok(ApiResponse.success(null, "Department deleted successfully"));
    }

    // ===== DEACTIVATE DEPARTMENT (soft — keeps the record) =====
    @PutMapping("/{id}/deactivate")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deactivateDepartment(@PathVariable Long id) {
        Employee hr = authService.getCurrentEmployee();
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", id));

        if (!department.getCompany().getId().equals(hr.getCompany().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        department.setActive(false);
        Department saved = departmentRepository.save(department);

        try {
            auditService.logAction("DEACTIVATE", "Department", department.getId(), "Deactivated department: " + department.getName(), hr.getCompany().getId());
        } catch (Exception ignored) {}

        syncDepartmentToEmployeeService(saved);

        return ResponseEntity.ok(ApiResponse.success(null, "Department deactivated successfully"));
    }

    @PutMapping("/{id}/manager")
    @Transactional
    public ResponseEntity<ApiResponse<DepartmentDTO>> assignManager(@PathVariable Long id, @RequestParam Long managerId) {
        Employee hr = authService.getCurrentEmployee();
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", id));

        if (!department.getCompany().getId().equals(hr.getCompany().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Employee manager = companyEmployee(managerId, hr.getCompany().getId());

        department.setManagerUserId(manager.getId());
        Department saved = departmentRepository.save(department);
        syncDepartmentToEmployeeService(saved);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(saved), "Manager assigned successfully"));
    }

    // ===== helpers =====

    /** An employee of the given company; anyone else reads as not found. */
    private Employee companyEmployee(Long employeeId, Long companyId) {
        return employeeDirectory.findById(employeeId)
                .filter(e -> e.getCompany() != null && companyId.equals(e.getCompany().getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", employeeId));
    }

    /** Rejects a department name that another department in the same company already uses (case-insensitive). */
    private void assertDepartmentNameAvailable(Long companyId, String name, Long excludeId) {
        boolean taken = departmentRepository.findByCompanyIdAndNameIgnoreCase(companyId, name).stream()
                .anyMatch(d -> excludeId == null || !d.getId().equals(excludeId));
        if (taken) {
            throw new BusinessException("A department named '" + name
                    + "' already exists. Edit that department to add or change its job roles.");
        }
    }

    private static String roleTitle(JobRole role) {
        String t = role.getJobTitle() != null ? role.getJobTitle() : role.getTitle();
        return t == null ? "" : t.trim();
    }

    /**
     * Makes the department's job roles match the submitted list.
     * Blank titles are ignored and duplicate titles (case-insensitive) are collapsed.
     * Salary is managed separately and is only changed when explicitly supplied.
     */
    private void applyJobRoles(Department department, List<JobRoleDTO> submitted) {
        Map<String, JobRoleDTO> wanted = new LinkedHashMap<>();
        if (submitted != null) {
            for (JobRoleDTO roleDto : submitted) {
                if (roleDto == null || roleDto.getJobTitle() == null) continue;
                String title = roleDto.getJobTitle().trim();
                if (title.isEmpty()) continue;
                wanted.putIfAbsent(title.toLowerCase(), roleDto);
            }
        }

        if (department.getJobRoles() == null) {
            department.setJobRoles(new ArrayList<>());
        }

        // delete roles that are no longer in the list (orphanRemoval removes the rows)
        department.getJobRoles().removeIf(existing -> !wanted.containsKey(roleTitle(existing).toLowerCase()));

        for (Map.Entry<String, JobRoleDTO> entry : wanted.entrySet()) {
            String key = entry.getKey();
            JobRoleDTO roleDto = entry.getValue();
            String title = roleDto.getJobTitle().trim();
            JobRole role = null;
            for (JobRole existing : department.getJobRoles()) {
                if (roleTitle(existing).toLowerCase().equals(key)) {
                    role = existing;
                    break;
                }
            }

            if (role == null) {
                role = new JobRole();
                department.addJobRole(role);
            }
            role.setJobTitle(title);
            role.setTitle(title);
            if (roleDto.getBasicSalary() != null) {
                role.setBasicSalary(roleDto.getBasicSalary());
            }
            role.setActive(true);
        }
    }

    private void syncDepartmentToEmployeeService(Department department) {
        try {
            String url = employeeServiceUrl + "/api/sync/department";
            DepartmentDTO syncDto = convertToDTO(department);
            String regNum = department.getCompany() != null ? department.getCompany().getRegistrationNumber() : null;
            String compName = department.getCompany() != null ? department.getCompany().getCompanyName() : null;

            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(url);
            if (regNum != null) builder.queryParam("companyRegNumber", regNum);
            if (compName != null) builder.queryParam("companyName", compName);

            restTemplate.postForObject(builder.toUriString(), syncDto, Object.class);
            log.info("Successfully synced department '{}' to Employee service", department.getName());
        } catch (Exception e) {
            log.warn("Failed to sync department '{}' to Employee service: {}", department.getName(), e.getMessage());
        }
    }

    private DepartmentDTO convertToDTO(Department dept) {
        return convertToDTO(dept, dept.getCompany() != null
                ? employeeDirectory.findByCompanyId(dept.getCompany().getId()) : List.of());
    }

    /** {@code people}: everyone in the department's company, read once from User_Backend. */
    private DepartmentDTO convertToDTO(Department dept, List<Employee> people) {
        DepartmentDTO dto = new DepartmentDTO();
        dto.setId(dept.getId());
        dto.setName(dept.getName());
        dto.setShortCode(dept.getShortCode());
        dto.setDescription(dept.getDescription());
        dto.setCompanyId(dept.getCompany() != null ? dept.getCompany().getId() : null);
        dto.setActive(dept.getActive());
        if (dept.getManagerUserId() != null) {
            dto.setManagerId(dept.getManagerUserId());
            people.stream().filter(p -> dept.getManagerUserId().equals(p.getId())).findFirst()
                    .ifPresent(m -> dto.setManagerName(m.getFullName()));
        }

        long count = people.stream()
                .filter(p -> p.getDepartment() != null && dept.getId().equals(p.getDepartment().getId()))
                .count();
        dto.setEmployeeCount((int) count);

        if (dept.getJobRoles() != null) {
            dto.setJobRoleCount(dept.getJobRoles().size());
            dto.setJobRoles(dept.getJobRoles().stream().map(r -> {
                JobRoleDTO roleDto = new JobRoleDTO();
                roleDto.setId(r.getId());
                roleDto.setJobTitle(r.getJobTitle());
                roleDto.setBasicSalary(r.getBasicSalary());
                return roleDto;
            }).collect(Collectors.toList()));
        } else {
            dto.setJobRoleCount(0);
            dto.setJobRoles(new ArrayList<>());
        }
        return dto;
    }
}
