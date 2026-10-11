package com.airella.hrm.controller;

import com.airella.hrm.dto.*;
import com.airella.hrm.model.Employee;
import com.airella.hrm.service.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Employee self-service controller — profile, leave, payslip.
 */
@RestController
@RequestMapping("/api/employee")
@PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'EMPLOYEE')")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final LeaveService leaveService;
    private final AuthService authService;

    public EmployeeController(EmployeeService employeeService,
                              LeaveService leaveService,
                              AuthService authService) {
        this.employeeService = employeeService;
        this.leaveService = leaveService;
        this.authService = authService;
    }

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<EmployeeDTO>> getMyProfile() {
        Employee employee = authService.getCurrentEmployee();
        EmployeeDTO dto = employeeService.getEmployeeById(employee.getId());
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    // ── Leave Endpoints ───────────────────────────────────────────

    @PostMapping("/leave/apply")
    public ResponseEntity<ApiResponse<LeaveApplicationDTO>> applyLeave(@Valid @RequestBody LeaveApplicationDTO dto) {
        Employee employee = authService.getCurrentEmployee();
        LeaveApplicationDTO result = leaveService.applyLeave(dto, employee.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(result, "Leave application submitted"));
    }

    @GetMapping("/leave")
    public ResponseEntity<ApiResponse<List<LeaveApplicationDTO>>> getMyLeaves() {
        Employee employee = authService.getCurrentEmployee();
        List<LeaveApplicationDTO> leaves = leaveService.getEmployeeLeaves(employee.getId());
        return ResponseEntity.ok(ApiResponse.success(leaves));
    }

    @PostMapping("/leave/{leaveId}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelLeave(@PathVariable Long leaveId) {
        Employee employee = authService.getCurrentEmployee();
        leaveService.cancelLeave(leaveId, employee.getId());
        return ResponseEntity.ok(ApiResponse.success(null, "Leave cancelled successfully"));
    }

    @GetMapping("/leave/balance")
    public ResponseEntity<ApiResponse<List<LeaveBalanceDTO>>> getMyLeaveBalance() {
        Employee employee = authService.getCurrentEmployee();
        List<LeaveBalanceDTO> balances = leaveService.getEmployeeLeaveBalances(employee.getId());
        return ResponseEntity.ok(ApiResponse.success(balances));
    }
}
