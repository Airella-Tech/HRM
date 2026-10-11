package com.airella.hrm.controller;

import com.airella.hrm.dto.*;
import com.airella.hrm.model.AuditLog;
import com.airella.hrm.model.SystemConfiguration;
import com.airella.hrm.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Admin controller — system-wide operations.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // ── Dashboard ────────────────────────────────────────────────

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<DashboardStatsDTO>> getDashboardStats() {
        DashboardStatsDTO stats = adminService.getDashboardStats();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/stats/company/{companyId}")
    public ResponseEntity<ApiResponse<DashboardStatsDTO>> getCompanyStats(@PathVariable Long companyId) {
        DashboardStatsDTO stats = adminService.getCompanyDashboardStats(companyId);
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    // ── Company Management ───────────────────────────────────────

    @GetMapping("/companies")
    public ResponseEntity<ApiResponse<List<CompanyDTO>>> getAllCompanies() {
        List<CompanyDTO> companies = adminService.getAllCompanies();
        return ResponseEntity.ok(ApiResponse.success(companies));
    }

    @GetMapping("/companies/{id}")
    public ResponseEntity<ApiResponse<CompanyDTO>> getCompany(@PathVariable Long id) {
        CompanyDTO company = adminService.getCompanyById(id);
        return ResponseEntity.ok(ApiResponse.success(company));
    }

    @PostMapping("/companies")
    public ResponseEntity<ApiResponse<CompanyDTO>> createCompany(@Valid @RequestBody CompanyDTO dto) {
        CompanyDTO created = adminService.createCompany(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "Company created"));
    }

    @PutMapping("/companies/{id}")
    public ResponseEntity<ApiResponse<CompanyDTO>> updateCompany(@PathVariable Long id, @Valid @RequestBody CompanyDTO dto) {
        CompanyDTO updated = adminService.updateCompany(id, dto);
        return ResponseEntity.ok(ApiResponse.success(updated, "Company updated"));
    }

    @PostMapping("/companies/{id}/approve")
    public ResponseEntity<ApiResponse<CompanyDTO>> approveCompany(@PathVariable Long id) {
        CompanyDTO result = adminService.approveCompany(id);
        return ResponseEntity.ok(ApiResponse.success(result, "Company approved"));
    }

    @PostMapping("/companies/{id}/resend-credentials")
    public ResponseEntity<ApiResponse<CompanyDTO>> resendCredentials(@PathVariable Long id) {
        CompanyDTO result = adminService.resendHrCredentials(id);
        return ResponseEntity.ok(ApiResponse.success(result, "HR credentials re-issued"));
    }

    @PostMapping("/companies/{id}/reject")
    public ResponseEntity<ApiResponse<CompanyDTO>> rejectCompany(@PathVariable Long id, @RequestParam(required = false) String reason) {
        CompanyDTO result = adminService.rejectCompany(id, reason);
        return ResponseEntity.ok(ApiResponse.success(result, "Company rejected"));
    }

    @PostMapping("/companies/{id}/suspend")
    public ResponseEntity<ApiResponse<CompanyDTO>> suspendCompany(@PathVariable Long id, @RequestParam String reason) {
        CompanyDTO result = adminService.suspendCompany(id, reason);
        return ResponseEntity.ok(ApiResponse.success(result, "Company suspended"));
    }

    // ── System Users ─────────────────────────────────────────────

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<EmployeeDTO>>> getAllUsers() {
        List<EmployeeDTO> users = adminService.getAllSystemUsers();
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @GetMapping("/users/company/{companyId}")
    public ResponseEntity<ApiResponse<List<EmployeeDTO>>> getUsersByCompany(@PathVariable Long companyId) {
        List<EmployeeDTO> users = adminService.getUsersByCompany(companyId);
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @GetMapping("/users/admins")
    public ResponseEntity<ApiResponse<List<EmployeeDTO>>> getAdminUsers() {
        List<EmployeeDTO> admins = adminService.getAdminUsers();
        return ResponseEntity.ok(ApiResponse.success(admins));
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<EmployeeDTO>> updateUserRole(
            @PathVariable Long id, @RequestParam String role) {
        EmployeeDTO updated = adminService.updateUserRole(id, role);
        return ResponseEntity.ok(ApiResponse.success(updated, "User role updated"));
    }

    @PutMapping("/users/{id}/status")
    public ResponseEntity<ApiResponse<EmployeeDTO>> updateUserStatus(
            @PathVariable Long id, @RequestParam String status) {
        EmployeeDTO updated = adminService.updateUserStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success(updated, "User status updated"));
    }

    // Note: Password reset removed — requires direct DB access
    // Use Employee_Backend directly for password management

    // ── Audit Logs ───────────────────────────────────────────────

    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getAuditLogs() {
        List<AuditLog> logs = adminService.getAuditLogs();
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    @GetMapping("/audit-logs/range")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getAuditLogsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        List<AuditLog> logs = adminService.getAuditLogsByDateRange(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    // ── System Configuration ─────────────────────────────────────

    @GetMapping("/config")
    public ResponseEntity<ApiResponse<List<SystemConfiguration>>> getAllConfigurations() {
        List<SystemConfiguration> configs = adminService.getAllConfigurations();
        return ResponseEntity.ok(ApiResponse.success(configs));
    }

    @GetMapping("/config/{key}")
    public ResponseEntity<ApiResponse<SystemConfiguration>> getConfiguration(@PathVariable String key) {
        SystemConfiguration config = adminService.getConfiguration(key);
        return ResponseEntity.ok(ApiResponse.success(config));
    }

    @PutMapping("/config/{key}")
    public ResponseEntity<ApiResponse<SystemConfiguration>> updateConfiguration(
            @PathVariable String key, @RequestBody Map<String, String> body) {
        SystemConfiguration updated = adminService.updateConfiguration(key, body.get("value"));
        return ResponseEntity.ok(ApiResponse.success(updated, "Configuration updated"));
    }
}
