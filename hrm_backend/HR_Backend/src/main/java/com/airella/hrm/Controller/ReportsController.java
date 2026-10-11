package com.airella.hrm.controller;

import com.airella.hrm.dto.*;
import com.airella.hrm.model.*;
import com.airella.hrm.service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/hr")
@PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
public class ReportsController {

    private static final Logger log = LoggerFactory.getLogger(ReportsController.class);

    private final RestTemplate restTemplate;
    private final AuthService authService;

    @Value("${service.employee-url:http://localhost:5006}")
    private String employeeServiceUrl;

    public ReportsController(RestTemplate restTemplate, AuthService authService) {
        this.restTemplate = restTemplate;
        this.authService = authService;
    }

    @GetMapping("/dashboard/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getHRDashboardStats() {
        Employee hr = authService.getCurrentEmployee();
        Long companyId = hr.getCompany().getId();
        try {
            String url = employeeServiceUrl + "/api/internal/stats/company/" + companyId;
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.GET, null,
                    new ParameterizedTypeReference<Map<String, Object>>() {});
            return ResponseEntity.ok(ApiResponse.success(response.getBody()));
        } catch (Exception e) {
            log.error("Failed to fetch HR dashboard stats from Employee backend: {}", e.getMessage());
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("totalEmployees", 0L);
            fallback.put("presentToday", 0L);
            fallback.put("pendingLeaves", 0L);
            return ResponseEntity.ok(ApiResponse.success(fallback));
        }
    }

    @GetMapping("/reports/workforce")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getWorkforceReport() {
        Employee hr = authService.getCurrentEmployee();
        Long companyId = hr.getCompany().getId();
        Map<String, Object> report = new HashMap<>();
        report.put("companyId", companyId);
        report.put("reportType", "Workforce Headcount");
        return ResponseEntity.ok(ApiResponse.success(report));
    }

    @GetMapping("/reports/attendance-summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAttendanceReport() {
        Employee hr = authService.getCurrentEmployee();
        Long companyId = hr.getCompany().getId();
        Map<String, Object> report = new HashMap<>();
        report.put("companyId", companyId);
        report.put("reportType", "Attendance Summary");
        return ResponseEntity.ok(ApiResponse.success(report));
    }

    @GetMapping("/reports/leave-summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLeaveReport() {
        Employee hr = authService.getCurrentEmployee();
        Long companyId = hr.getCompany().getId();
        Map<String, Object> report = new HashMap<>();
        report.put("companyId", companyId);
        report.put("reportType", "Leave Summary");
        return ResponseEntity.ok(ApiResponse.success(report));
    }

    @GetMapping("/reports/payroll-summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPayrollReport() {
        Employee hr = authService.getCurrentEmployee();
        Long companyId = hr.getCompany().getId();
        Map<String, Object> report = new HashMap<>();
        report.put("companyId", companyId);
        report.put("reportType", "Payroll Register");
        return ResponseEntity.ok(ApiResponse.success(report));
    }
}
