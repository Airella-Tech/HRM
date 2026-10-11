package com.airella.hrm.Controller;

import com.airella.hrm.DTO.*;
import com.airella.hrm.Model.Employee;
import com.airella.hrm.service.AuthService;
import com.airella.hrm.service.EmployeeService;
import com.airella.hrm.service.LeaveService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/hr")
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('HR_MANAGER', 'ADMIN')")
public class HRManagerController {

    @Autowired
    private EmployeeService employeeService;

    @Autowired
    private LeaveService leaveService;

    @Autowired
    private AuthService authService;


    // ===== HR MANAGER'S OWN PROFILE =====
    // Personal + employment details come straight from hrm_db_user.employees.
    // Read-only: HR managers cannot edit their own profile.

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfileDTO>> getMyProfile() {
        try {
            return ResponseEntity.ok(ApiResponse.success(
                    toProfile(authService.getCurrentEmployee()), "Profile retrieved"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve profile: " + e.getMessage()));
        }
    }

    private UserProfileDTO toProfile(Employee e) {
        UserProfileDTO dto = new UserProfileDTO();
        dto.setId(e.getId());
        dto.setEmployeeId(e.getEmployeeId());
        dto.setFullName(e.getFullName());
        dto.setEmail(e.getEmail());
        dto.setStatus(e.getStatus() != null ? e.getStatus().name() : null);
        dto.setDesignation(e.getDesignation());
        dto.setEmploymentType(e.getEmploymentType());
        dto.setJoiningDate(e.getJoiningDate());
        if (e.getDepartment() != null) dto.setDepartmentName(e.getDepartment().getName());
        if (e.getCompany() != null) {
            dto.setCompanyName(e.getCompany().getCompanyName());
            dto.setCompanyRegistrationNumber(e.getCompany().getRegistrationNumber());
        }
        dto.setDob(e.getDob());
        dto.setGender(e.getGender() != null ? e.getGender().name() : null);
        dto.setPhone(e.getPhone());
        return dto;
    }

    // ===== EMPLOYEE MANAGEMENT =====

    @GetMapping("/employees")
    public ResponseEntity<ApiResponse<List<EmployeeDTO>>> getAllEmployees() {
        try {
            var currentUser = authService.getCurrentEmployee();
            List<EmployeeDTO> employees = employeeService.getAllEmployeesByCompany(
                    currentUser.getCompany().getId());
            return ResponseEntity.ok(ApiResponse.success(employees, "Employees retrieved successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve employees: " + e.getMessage()));
        }
    }

    @GetMapping("/employees/{id}")
    public ResponseEntity<ApiResponse<EmployeeDTO>> getEmployee(@PathVariable Long id) {
        try {
            employeeService.assertSameCompany(id, authService.getCurrentEmployee());
            EmployeeDTO employee = employeeService.getEmployeeById(id);
            return ResponseEntity.ok(ApiResponse.success(employee, "Employee retrieved successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve employee: " + e.getMessage()));
        }
    }

    @PostMapping("/employees")
    public ResponseEntity<ApiResponse<EmployeeDTO>> createEmployee(
            @Valid @RequestBody EmployeeDTO employeeDTO) {
        try {
            var currentUser = authService.getCurrentEmployee();
            EmployeeDTO created = employeeService.createEmployee(employeeDTO, 
                    currentUser.getCompany().getId());
            return ResponseEntity.ok(ApiResponse.success(created, "Employee created successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to create employee: " + e.getMessage()));
        }
    }

    @PutMapping("/employees/{id}")
    public ResponseEntity<ApiResponse<EmployeeDTO>> updateEmployee(
            @PathVariable Long id,
            @Valid @RequestBody EmployeeDTO employeeDTO) {
        try {
            employeeService.assertSameCompany(id, authService.getCurrentEmployee());
            EmployeeDTO updated = employeeService.updateEmployee(id, employeeDTO);
            return ResponseEntity.ok(ApiResponse.success(updated, "Employee updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to update employee: " + e.getMessage()));
        }
    }

    @DeleteMapping("/employees/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteEmployee(@PathVariable Long id) {
        try {
            var currentUser = authService.getCurrentEmployee();
            employeeService.assertSameCompany(id, currentUser);
            employeeService.deleteEmployee(id, currentUser);
            return ResponseEntity.ok(ApiResponse.success(null, "Employee deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to delete employee: " + e.getMessage()));
        }
    }

    @PutMapping("/employees/{id}/deactivate")
    public ResponseEntity<ApiResponse<Void>> deactivateEmployee(@PathVariable Long id) {
        try {
            employeeService.assertSameCompany(id, authService.getCurrentEmployee());
            employeeService.deactivateEmployee(id);
            return ResponseEntity.ok(ApiResponse.success(null, "Employee deactivated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to deactivate employee: " + e.getMessage()));
        }
    }

    @PutMapping("/employees/{id}/terminate")
    public ResponseEntity<ApiResponse<Void>> terminateEmployee(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate terminationDate) {
        try {
            employeeService.assertSameCompany(id, authService.getCurrentEmployee());
            employeeService.terminateEmployee(id, terminationDate);
            return ResponseEntity.ok(ApiResponse.success(null, "Employee terminated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to terminate employee: " + e.getMessage()));
        }
    }

    // ===== LEAVE MANAGEMENT =====

    @GetMapping("/leaves/pending")
    public ResponseEntity<ApiResponse<List<LeaveApplicationDTO>>> getPendingLeaves() {
        try {
            var currentUser = authService.getCurrentEmployee();
            List<LeaveApplicationDTO> leaves = leaveService.getPendingLeaves(
                    currentUser.getCompany().getId());
            return ResponseEntity.ok(ApiResponse.success(leaves, "Pending leaves retrieved"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve leaves: " + e.getMessage()));
        }
    }

    @PutMapping("/leaves/{id}/approve")
    public ResponseEntity<ApiResponse<LeaveApplicationDTO>> approveLeave(@PathVariable Long id) {
        try {
            var currentUser = authService.getCurrentEmployee();
            LeaveApplicationDTO leave = leaveService.approveLeave(id, currentUser.getId());
            return ResponseEntity.ok(ApiResponse.success(leave, "Leave approved successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to approve leave: " + e.getMessage()));
        }
    }

    @PutMapping("/leaves/{id}/reject")
    public ResponseEntity<ApiResponse<LeaveApplicationDTO>> rejectLeave(
            @PathVariable Long id,
            @RequestParam String reason) {
        try {
            var currentUser = authService.getCurrentEmployee();
            LeaveApplicationDTO leave = leaveService.rejectLeave(id, reason, currentUser.getId());
            return ResponseEntity.ok(ApiResponse.success(leave, "Leave rejected"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to reject leave: " + e.getMessage()));
        }
    }

    @GetMapping("/leaves/employee/{id}")
    public ResponseEntity<ApiResponse<List<LeaveApplicationDTO>>> getEmployeeLeaves(@PathVariable Long id) {
        try {
            employeeService.assertSameCompany(id, authService.getCurrentEmployee());
            List<LeaveApplicationDTO> leaves = leaveService.getEmployeeLeaves(id);
            return ResponseEntity.ok(ApiResponse.success(leaves, "Employee leaves retrieved"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve leaves: " + e.getMessage()));
        }
    }

    @GetMapping("/leaves/balances")
    public ResponseEntity<ApiResponse<List<LeaveBalanceDTO>>> getAllLeaveBalances() {
        try {
            return ResponseEntity.ok(ApiResponse.success(null, "Leave balances retrieved"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve balances: " + e.getMessage()));
        }
    }

    // ===== DASHBOARD =====

    @GetMapping("/dashboard/stats")
    public ResponseEntity<ApiResponse<DashboardStatsDTO>> getDashboardStats() {
        try {
            DashboardStatsDTO stats = new DashboardStatsDTO();
            return ResponseEntity.ok(ApiResponse.success(stats, "Dashboard stats retrieved"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve stats: " + e.getMessage()));
        }
    }
}
