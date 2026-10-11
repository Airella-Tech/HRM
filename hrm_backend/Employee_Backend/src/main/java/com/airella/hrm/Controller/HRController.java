package com.airella.hrm.controller;

import com.airella.hrm.dto.*;
import com.airella.hrm.model.Employee;
import com.airella.hrm.service.*;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * HR Manager controller — employee management, attendance oversight, leave approvals.
 */
@RestController
@RequestMapping("/api/hr")
@PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
public class HRController {

    private final EmployeeService employeeService;
    private final AttendanceService attendanceService;
    private final LeaveService leaveService;
    private final AuthService authService;

    public HRController(EmployeeService employeeService,
                        AttendanceService attendanceService,
                        LeaveService leaveService,
                        AuthService authService) {
        this.employeeService = employeeService;
        this.attendanceService = attendanceService;
        this.leaveService = leaveService;
        this.authService = authService;
    }

    // ── Employee Management ──────────────────────────────────────

    @GetMapping("/employees")
    public ResponseEntity<ApiResponse<List<EmployeeDTO>>> getEmployees() {
        Employee hr = authService.getCurrentEmployee();
        List<EmployeeDTO> employees = employeeService.getAllEmployeesByCompany(hr.getCompany().getId());
        return ResponseEntity.ok(ApiResponse.success(employees));
    }

    @GetMapping("/employees/{id}")
    public ResponseEntity<ApiResponse<EmployeeDTO>> getEmployee(@PathVariable Long id) {
        Employee hr = authService.getCurrentEmployee();
        EmployeeDTO employee = employeeService.getEmployeeById(id, scopeCompanyId(hr));
        return ResponseEntity.ok(ApiResponse.success(employee));
    }

    // Creating, editing and removing employees is done in User_Backend (/api/hr/employees there).

    // ── Attendance Oversight ─────────────────────────────────────

    @GetMapping("/attendance/daily")
    public ResponseEntity<ApiResponse<List<AttendanceDTO>>> getDailyAttendance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        Employee hr = authService.getCurrentEmployee();
        if (date == null) date = LocalDate.now();
        List<AttendanceDTO> attendance = attendanceService.getDailyAttendance(hr.getCompany().getId(), date);
        return ResponseEntity.ok(ApiResponse.success(attendance));
    }

    @GetMapping("/attendance/range")
    public ResponseEntity<ApiResponse<List<AttendanceDTO>>> getAttendanceRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        Employee hr = authService.getCurrentEmployee();
        List<AttendanceDTO> attendance = attendanceService.getAttendanceRange(hr.getCompany().getId(), startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(attendance));
    }

    @GetMapping("/attendance/adjustments")
    public ResponseEntity<ApiResponse<List<AttendanceDTO>>> getPendingAdjustments() {
        Employee hr = authService.getCurrentEmployee();
        List<AttendanceDTO> adjustments = attendanceService.getPendingAdjustments(hr.getCompany().getId());
        return ResponseEntity.ok(ApiResponse.success(adjustments));
    }

    @PostMapping("/attendance/adjustments/{id}/approve")
    public ResponseEntity<ApiResponse<AttendanceDTO>> approveAdjustment(@PathVariable Long id) {
        AttendanceDTO result = attendanceService.approveAdjustment(id, scopeCompanyId(authService.getCurrentEmployee()));
        return ResponseEntity.ok(ApiResponse.success(result, "Adjustment approved"));
    }

    @PostMapping("/attendance/adjustments/{id}/reject")
    public ResponseEntity<ApiResponse<AttendanceDTO>> rejectAdjustment(@PathVariable Long id) {
        AttendanceDTO result = attendanceService.rejectAdjustment(id, scopeCompanyId(authService.getCurrentEmployee()));
        return ResponseEntity.ok(ApiResponse.success(result, "Adjustment rejected"));
    }

    // ── Leave Approvals ──────────────────────────────────────────

    @GetMapping("/leave")
    public ResponseEntity<ApiResponse<List<LeaveApplicationDTO>>> getCompanyLeaves() {
        Employee hr = authService.getCurrentEmployee();
        List<LeaveApplicationDTO> leaves = leaveService.getCompanyLeaves(hr.getCompany().getId());
        return ResponseEntity.ok(ApiResponse.success(leaves));
    }

    @GetMapping("/leave/pending")
    public ResponseEntity<ApiResponse<List<LeaveApplicationDTO>>> getPendingLeaves() {
        Employee hr = authService.getCurrentEmployee();
        List<LeaveApplicationDTO> leaves = leaveService.getPendingLeaves(hr.getCompany().getId());
        return ResponseEntity.ok(ApiResponse.success(leaves));
    }

    // Powers the "On Leave Today" stat card on the HR Attendance page —
    // counts employees whose APPROVED leave range covers the given date
    // (defaults to today).
    @GetMapping("/leave/on-leave-count")
    public ResponseEntity<ApiResponse<Long>> getOnLeaveCount(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        Employee hr = authService.getCurrentEmployee();
        if (date == null) date = LocalDate.now();
        long count = leaveService.getOnLeaveCount(hr.getCompany().getId(), date);
        return ResponseEntity.ok(ApiResponse.success(count));
    }

    @PostMapping("/leave/{leaveId}/approve")
    public ResponseEntity<ApiResponse<LeaveApplicationDTO>> approveLeave(@PathVariable Long leaveId) {
        Employee hr = authService.getCurrentEmployee();
        LeaveApplicationDTO result = leaveService.approveLeave(leaveId, hr.getId());
        return ResponseEntity.ok(ApiResponse.success(result, "Leave approved"));
    }

    @PostMapping("/leave/{leaveId}/reject")
    public ResponseEntity<ApiResponse<LeaveApplicationDTO>> rejectLeave(
            @PathVariable Long leaveId,
            @RequestParam String reason) {
        Employee hr = authService.getCurrentEmployee();
        LeaveApplicationDTO result = leaveService.rejectLeave(leaveId, reason, hr.getId());
        return ResponseEntity.ok(ApiResponse.success(result, "Leave rejected"));
    }

    /** The company an HR user is limited to; null for an admin, who may see every company. */
    private static Long scopeCompanyId(Employee hr) {
        return hr.getRole() == Employee.Role.ADMIN ? null : hr.getCompany().getId();
    }
}
