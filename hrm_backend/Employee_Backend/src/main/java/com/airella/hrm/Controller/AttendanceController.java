package com.airella.hrm.controller;

import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.dto.AttendanceDTO;
import com.airella.hrm.model.Employee;
import com.airella.hrm.service.AttendanceService;
import com.airella.hrm.service.AuthService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Employee attendance controller — clock-in/out, history, adjustments.
 */
@RestController
@RequestMapping("/api/employee/attendance")
@PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'EMPLOYEE')")
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final AuthService authService;

    public AttendanceController(AttendanceService attendanceService, AuthService authService) {
        this.attendanceService = attendanceService;
        this.authService = authService;
    }

    @PostMapping("/clock-in")
    public ResponseEntity<ApiResponse<AttendanceDTO>> clockIn() {
        Employee employee = authService.getCurrentEmployee();
        AttendanceDTO dto = attendanceService.clockIn(employee.getId(), null);
        return ResponseEntity.ok(ApiResponse.success(dto, "Clocked in successfully"));
    }

    @PostMapping("/clock-out")
    public ResponseEntity<ApiResponse<AttendanceDTO>> clockOut() {
        Employee employee = authService.getCurrentEmployee();
        AttendanceDTO dto = attendanceService.clockOut(employee.getId(), null);
        return ResponseEntity.ok(ApiResponse.success(dto, "Clocked out successfully"));
    }

    @PostMapping("/clock-in-gps")
    public ResponseEntity<ApiResponse<AttendanceDTO>> clockInGPS(
            @RequestParam Double latitude,
            @RequestParam Double longitude) {
        Employee employee = authService.getCurrentEmployee();
        String location = latitude + "," + longitude;
        AttendanceDTO dto = attendanceService.clockInGPS(employee.getId(), location);
        return ResponseEntity.ok(ApiResponse.success(dto, "Clocked in via GPS successfully"));
    }

    @PostMapping("/clock-out-gps")
    public ResponseEntity<ApiResponse<AttendanceDTO>> clockOutGPS(
            @RequestParam Double latitude,
            @RequestParam Double longitude) {
        Employee employee = authService.getCurrentEmployee();
        String location = latitude + "," + longitude;
        AttendanceDTO dto = attendanceService.clockOutGPS(employee.getId(), location);
        return ResponseEntity.ok(ApiResponse.success(dto, "Clocked out via GPS successfully"));
    }

    @GetMapping("/today")
    public ResponseEntity<ApiResponse<List<AttendanceDTO>>> getTodayAttendance() {
        Employee employee = authService.getCurrentEmployee();
        List<AttendanceDTO> sessions = attendanceService.getTodayAttendance(employee.getId());
        return ResponseEntity.ok(ApiResponse.success(sessions));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<AttendanceDTO>>> getAttendanceHistory(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        Employee employee = authService.getCurrentEmployee();
        if (startDate == null) startDate = LocalDate.now().withDayOfMonth(1);
        if (endDate == null) endDate = LocalDate.now();
        List<AttendanceDTO> history = attendanceService.getEmployeeAttendance(employee.getId(), startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    @PostMapping("/adjustment-request")
    public ResponseEntity<ApiResponse<AttendanceDTO>> requestAdjustment(
            @RequestParam Long attendanceId,
            @RequestParam String reason) {
        AttendanceDTO dto = attendanceService.requestAdjustment(attendanceId, reason);
        return ResponseEntity.ok(ApiResponse.success(dto, "Adjustment request submitted"));
    }
}
