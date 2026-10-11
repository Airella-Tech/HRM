package com.airella.hrm.Controller;

import com.airella.hrm.DTO.*;
import com.airella.hrm.Model.Employee;
import com.airella.hrm.service.AuthService;
import com.airella.hrm.service.LeaveService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/employee")
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('EMPLOYEE', 'HR_MANAGER', 'ADMIN')")
public class EmployeeController {

    @Autowired
    private LeaveService leaveService;

    @Autowired
    private AuthService authService;

    // ===== LEAVE ENDPOINTS =====

    @PostMapping("/leaves/apply")
    public ResponseEntity<ApiResponse<LeaveApplicationDTO>> applyLeave(
            @RequestBody LeaveApplicationDTO leaveDTO) {
        try {
            var employee = authService.getCurrentEmployee();
            LeaveApplicationDTO leave = leaveService.applyLeave(leaveDTO, employee.getId());
            return ResponseEntity.ok(ApiResponse.success(leave, "Leave application submitted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to apply leave: " + e.getMessage()));
        }
    }

    @GetMapping("/leaves/my-leaves")
    public ResponseEntity<ApiResponse<List<LeaveApplicationDTO>>> getMyLeaves() {
        try {
            var employee = authService.getCurrentEmployee();
            List<LeaveApplicationDTO> leaves = leaveService.getEmployeeLeaves(employee.getId());
            return ResponseEntity.ok(ApiResponse.success(leaves, "Leave applications retrieved"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve leaves: " + e.getMessage()));
        }
    }

    @DeleteMapping("/leaves/{id}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelLeave(@PathVariable Long id) {
        try {
            var employee = authService.getCurrentEmployee();
            leaveService.cancelLeave(id, employee.getId());
            return ResponseEntity.ok(ApiResponse.success(null, "Leave cancelled successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to cancel leave: " + e.getMessage()));
        }
    }

    @GetMapping("/leaves/balance")
    public ResponseEntity<ApiResponse<List<LeaveBalanceDTO>>> getLeaveBalance() {
        try {
            var employee = authService.getCurrentEmployee();
            List<LeaveBalanceDTO> balances = leaveService.getEmployeeLeaveBalances(employee.getId());
            return ResponseEntity.ok(ApiResponse.success(balances, "Leave balances retrieved"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve leave balance: " + e.getMessage()));
        }
    }

    // ===== PROFILE ENDPOINTS =====

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<?>> getProfile() {
        try {
            var employee = authService.getCurrentEmployee();
            return ResponseEntity.ok(ApiResponse.success(employee, "Profile retrieved"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve profile: " + e.getMessage()));
        }
    }

    // Own profile (read-only) straight from hrm_db_user.employees — same data HR sees on their profile page
    @GetMapping("/my-profile")
    public ResponseEntity<ApiResponse<UserProfileDTO>> getMyProfile() {
        try {
            Employee e = authService.getCurrentEmployee();
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
            return ResponseEntity.ok(ApiResponse.success(dto, "Profile retrieved"));
        } catch (Exception ex) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve profile: " + ex.getMessage()));
        }
    }

    // ===== DASHBOARD ENDPOINTS =====

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
