package com.airella.hrm.Controller;

import com.airella.hrm.DTO.ApiResponse;
import com.airella.hrm.DTO.DepartmentDTO;
import com.airella.hrm.service.AuthService;
import com.airella.hrm.service.DepartmentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * HR Department management — reads and writes departments directly in the
 * User_Backend database (hrm_db_user), the same database used for login and
 * employee records. An HR Manager (employee ID prefixed "HR-") or an Admin
 * can add, update, deactivate a department and assign a department manager.
 */
@RestController
@RequestMapping("/api/hr/departments")
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('HR_MANAGER', 'ADMIN')")
public class DepartmentController {

    @Autowired
    private DepartmentService departmentService;

    @Autowired
    private AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<DepartmentDTO>>> getDepartments() {
        try {
            var currentUser = authService.getCurrentEmployee();
            List<DepartmentDTO> departments = departmentService.getDepartmentsByCompany(
                    currentUser.getCompany().getId());
            return ResponseEntity.ok(ApiResponse.success(departments, "Departments retrieved successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve departments: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DepartmentDTO>> getDepartment(@PathVariable Long id) {
        try {
            var currentUser = authService.getCurrentEmployee();
            DepartmentDTO department = departmentService.getDepartmentById(id, currentUser.getCompany().getId());
            return ResponseEntity.ok(ApiResponse.success(department, "Department retrieved successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve department: " + e.getMessage()));
        }
    }

    // ===== ADD DEPARTMENT (HR- prefixed HR Managers or Admins) =====
    @PostMapping
    public ResponseEntity<ApiResponse<DepartmentDTO>> createDepartment(@Valid @RequestBody DepartmentDTO departmentDTO) {
        try {
            DepartmentDTO created = departmentService.createDepartment(departmentDTO);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success(created, "Department created successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to create department: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DepartmentDTO>> updateDepartment(
            @PathVariable Long id,
            @RequestBody DepartmentDTO departmentDTO) {
        try {
            DepartmentDTO updated = departmentService.updateDepartment(id, departmentDTO);
            return ResponseEntity.ok(ApiResponse.success(updated, "Department updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to update department: " + e.getMessage()));
        }
    }

    // ===== DELETE DEPARTMENT (permanent — HR- prefixed HR Managers or Admins) =====
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDepartment(@PathVariable Long id) {
        try {
            departmentService.deleteDepartment(id);
            return ResponseEntity.ok(ApiResponse.success(null, "Department deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to delete department: " + e.getMessage()));
        }
    }

    // ===== DEACTIVATE DEPARTMENT (soft — keeps the record, hides it from active use) =====
    @PutMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<Void>> deactivateDepartment(@PathVariable Long id) {
        try {
            departmentService.deactivateDepartment(id);
            return ResponseEntity.ok(ApiResponse.success(null, "Department deactivated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to deactivate department: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}/manager")
    public ResponseEntity<ApiResponse<DepartmentDTO>> assignManager(
            @PathVariable Long id,
            @RequestParam Long managerId) {
        try {
            DepartmentDTO updated = departmentService.assignManager(id, managerId);
            return ResponseEntity.ok(ApiResponse.success(updated, "Manager assigned successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to assign manager: " + e.getMessage()));
        }
    }
}
