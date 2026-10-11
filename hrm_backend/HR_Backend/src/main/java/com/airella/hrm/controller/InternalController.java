package com.airella.hrm.controller;

import com.airella.hrm.dto.LeaveEntitlementDTO;
import com.airella.hrm.dto.PaySheetDTO;
import com.airella.hrm.service.EmployeeDirectory;
import com.airella.hrm.service.LeaveConfigService;
import com.airella.hrm.service.SalaryConfigService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Internal API controller — for inter-service communication ONLY.
 * These endpoints are NOT protected by JWT (service-to-service calls).
 * Should NOT be exposed to the public internet in production.
 */
@RestController
@RequestMapping("/api/internal")
public class InternalController {

    private static final Logger log = LoggerFactory.getLogger(InternalController.class);

    private final EmployeeDirectory employeeDirectory;
    private final LeaveConfigService leaveConfigService;
    private final SalaryConfigService salaryConfigService;

    public InternalController(EmployeeDirectory employeeDirectory, LeaveConfigService leaveConfigService,
                              SalaryConfigService salaryConfigService) {
        this.employeeDirectory = employeeDirectory;
        this.leaveConfigService = leaveConfigService;
        this.salaryConfigService = salaryConfigService;
    }

    /**
     * An employee's pay sheet (job role basic payment + individual allowances / deductions), used by
     * Employee_Backend for the employee's own payslip page. Looked up by email like leave entitlements.
     */
    @GetMapping("/pay-sheet")
    @Transactional(readOnly = true)
    public ResponseEntity<PaySheetDTO> getPaySheet(@RequestParam String email) {
        return employeeDirectory.findByEmailIgnoreCase(email.trim())
                .map(e -> ResponseEntity.ok(salaryConfigService.getPaySheet(e)))
                .orElseGet(() -> {
                    log.warn("Internal: pay sheet requested for unknown employee {}", email);
                    return ResponseEntity.notFound().build();
                });
    }

    /**
     * Leave an employee is entitled to from their job role, used by Employee_Backend for leave
     * balances and applications. Employee ids differ between databases, so it is looked up by email.
     */
    @GetMapping("/leave-entitlements")
    @Transactional(readOnly = true)
    public ResponseEntity<List<LeaveEntitlementDTO>> getLeaveEntitlements(@RequestParam String email) {
        return employeeDirectory.findByEmailIgnoreCase(email.trim())
                .map(e -> ResponseEntity.ok(leaveConfigService.getEntitlements(e)))
                .orElseGet(() -> {
                    log.warn("Internal: leave entitlements requested for unknown employee {}", email);
                    return ResponseEntity.ok(List.of());
                });
    }
}
