package com.airella.hrm.controller;

import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.dto.AuditLogDTO;
import com.airella.hrm.service.AuditService;
import com.airella.hrm.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Recruitment audit log. Read only, and only for HR Manager / Admin. */
@RestController
@RequestMapping("/api/recruitment/audit-logs")
public class AuditLogController {

    private final AuditService auditService;
    private final AuthService authService;

    public AuditLogController(AuditService auditService, AuthService authService) {
        this.auditService = auditService;
        this.authService = authService;
    }

    @GetMapping
    @PreAuthorize("@perm.isFullAccess()")
    public ResponseEntity<ApiResponse<List<AuditLogDTO>>> list() {
        String companyRef = authService.getCurrentCompanyRef();
        return ResponseEntity.ok(ApiResponse.success(auditService.getRecentLogs(companyRef)));
    }
}