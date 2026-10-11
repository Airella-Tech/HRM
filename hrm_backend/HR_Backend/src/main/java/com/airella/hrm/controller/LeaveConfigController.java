package com.airella.hrm.controller;

import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.dto.EmploymentTypeDTO;
import com.airella.hrm.dto.LeaveAllocationDTO;
import com.airella.hrm.dto.LeaveTypeDTO;
import com.airella.hrm.model.Employee;
import com.airella.hrm.service.AuthService;
import com.airella.hrm.service.LeaveConfigService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * HR leave configuration: leave types, employment types and leave entitlements per job role.
 */
@RestController
@RequestMapping("/api/hr")
@PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
public class LeaveConfigController {

    private final LeaveConfigService leaveConfigService;
    private final AuthService authService;

    public LeaveConfigController(LeaveConfigService leaveConfigService, AuthService authService) {
        this.leaveConfigService = leaveConfigService;
        this.authService = authService;
    }

    @GetMapping("/leave-types")
    public ResponseEntity<ApiResponse<List<LeaveTypeDTO>>> getLeaveTypes() {
        Employee hr = authService.getCurrentEmployee();
        return ResponseEntity.ok(ApiResponse.success(leaveConfigService.getLeaveTypes(hr.getCompany().getId())));
    }

    /** Body: { "names": ["Sick Leave", "Annual Leave", ...] } */
    @PostMapping("/leave-types")
    public ResponseEntity<ApiResponse<List<LeaveTypeDTO>>> createLeaveTypes(@RequestBody Map<String, List<String>> body) {
        Employee hr = authService.getCurrentEmployee();
        List<LeaveTypeDTO> created = leaveConfigService.createLeaveTypes(body.get("names"), hr);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, created.size() + " leave type(s) added"));
    }

    /** Body: { "name": "Sick Leave" } */
    @PutMapping("/leave-types/{id}")
    public ResponseEntity<ApiResponse<LeaveTypeDTO>> updateLeaveType(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        Employee hr = authService.getCurrentEmployee();
        LeaveTypeDTO updated = leaveConfigService.updateLeaveType(id, body.get("name"), hr);
        return ResponseEntity.ok(ApiResponse.success(updated, "Leave type updated successfully"));
    }

    @DeleteMapping("/leave-types/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteLeaveType(@PathVariable Long id) {
        Employee hr = authService.getCurrentEmployee();
        leaveConfigService.deleteLeaveType(id, hr);
        return ResponseEntity.ok(ApiResponse.success(null, "Leave type deleted successfully"));
    }

    @GetMapping("/employment-types")
    public ResponseEntity<ApiResponse<List<EmploymentTypeDTO>>> getEmploymentTypes() {
        Employee hr = authService.getCurrentEmployee();
        return ResponseEntity.ok(ApiResponse.success(leaveConfigService.getEmploymentTypes(hr.getCompany().getId())));
    }

    /** Body: { "names": ["Full-Time", "Internship", ...] } */
    @PostMapping("/employment-types")
    public ResponseEntity<ApiResponse<List<EmploymentTypeDTO>>> createEmploymentTypes(@RequestBody Map<String, List<String>> body) {
        Employee hr = authService.getCurrentEmployee();
        List<EmploymentTypeDTO> created = leaveConfigService.createEmploymentTypes(body.get("names"), hr);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, created.size() + " employment type(s) added"));
    }

    /** Body: { "name": "Full-Time" } */
    @PutMapping("/employment-types/{id}")
    public ResponseEntity<ApiResponse<EmploymentTypeDTO>> updateEmploymentType(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        Employee hr = authService.getCurrentEmployee();
        EmploymentTypeDTO updated = leaveConfigService.updateEmploymentType(id, body.get("name"), hr);
        return ResponseEntity.ok(ApiResponse.success(updated, "Employment type updated successfully"));
    }

    @DeleteMapping("/employment-types/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteEmploymentType(@PathVariable Long id) {
        Employee hr = authService.getCurrentEmployee();
        leaveConfigService.deleteEmploymentType(id, hr);
        return ResponseEntity.ok(ApiResponse.success(null, "Employment type deleted successfully"));
    }

    @GetMapping("/leave-allocations")
    public ResponseEntity<ApiResponse<List<LeaveAllocationDTO>>> getAllocations(
            @RequestParam(required = false) Long departmentId) {
        Employee hr = authService.getCurrentEmployee();
        return ResponseEntity.ok(ApiResponse.success(
                leaveConfigService.getAllocations(hr.getCompany().getId(), departmentId)));
    }

    @PostMapping("/leave-allocations")
    public ResponseEntity<ApiResponse<List<LeaveAllocationDTO>>> saveAllocations(
            @RequestBody LeaveAllocationDTO.SaveRequest request) {
        Employee hr = authService.getCurrentEmployee();
        List<LeaveAllocationDTO> saved = leaveConfigService.saveAllocations(request, hr);
        return ResponseEntity.ok(ApiResponse.success(saved, saved.size() + " leave(s) assigned"));
    }

    @DeleteMapping("/leave-allocations/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAllocation(@PathVariable Long id) {
        Employee hr = authService.getCurrentEmployee();
        leaveConfigService.deleteAllocation(id, hr);
        return ResponseEntity.ok(ApiResponse.success(null, "Leave entitlement removed successfully"));
    }
}
