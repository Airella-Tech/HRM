package com.airella.hrm.controller;

import com.airella.hrm.dto.*;
import com.airella.hrm.model.*;
import com.airella.hrm.service.*;
import com.airella.hrm.repository.NotificationRepository;
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

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(EmployeeController.class);

    private final EmployeeService employeeService;
    private final LeaveService leaveService;
    private final AuthService authService;
    private final PayrollService payrollService;
    private final NotificationRepository notificationRepository;
    private final HrServiceClient hrServiceClient;
    private final NotificationService notificationService;
    private final HrNotificationSync hrNotificationSync;
    private final EmployeeDirectory employeeDirectory;
    private final com.airella.hrm.repository.LeaveApplicationRepository leaveRepository;
    private final com.airella.hrm.repository.AllowanceRequestRepository allowanceRequestRepository;

    public EmployeeController(EmployeeService employeeService,
                              LeaveService leaveService,
                              AuthService authService,
                              PayrollService payrollService,
                              NotificationRepository notificationRepository,
                              HrServiceClient hrServiceClient,
                              NotificationService notificationService,
                              HrNotificationSync hrNotificationSync,
                              EmployeeDirectory employeeDirectory,
                              com.airella.hrm.repository.LeaveApplicationRepository leaveRepository,
                              com.airella.hrm.repository.AllowanceRequestRepository allowanceRequestRepository) {
        this.employeeDirectory = employeeDirectory;
        this.leaveRepository = leaveRepository;
        this.allowanceRequestRepository = allowanceRequestRepository;
        this.notificationService = notificationService;
        this.hrNotificationSync = hrNotificationSync;
        this.employeeService = employeeService;
        this.leaveService = leaveService;
        this.authService = authService;
        this.payrollService = payrollService;
        this.notificationRepository = notificationRepository;
        this.hrServiceClient = hrServiceClient;
    }

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<EmployeeProfileDTO>> getMyProfile() {
        Employee employee = authService.getCurrentEmployee();
        return ResponseEntity.ok(ApiResponse.success(employeeService.getProfile(employee)));
    }

    /** Employees change their own personal details; employment details stay with HR. */
    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<EmployeeProfileDTO>> updateMyProfile(
            @Valid @RequestBody EmployeeProfileDTO.UpdateRequest request) {
        Employee employee = authService.getCurrentEmployee();
        return ResponseEntity.ok(ApiResponse.success(employeeService.updateProfile(employee, request), "Profile updated"));
    }

    // ── Leave Endpoints ───────────────────────────────────────────

    @GetMapping("/leave/types")
    public ResponseEntity<ApiResponse<List<LeaveTypeDTO>>> getLeaveTypes() {
        Employee employee = authService.getCurrentEmployee();
        return ResponseEntity.ok(ApiResponse.success(leaveService.getLeaveTypes(employee.getId())));
    }

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

    // ── Payslip / Payroll Endpoints ──────────────────────────────

    /**
     * The logged-in employee's current salary as HR has set it: job role basic payment
     * (hrm_db_hr basic_payments) plus individual allowances / deductions (additional_payments).
     */
    @GetMapping("/pay-sheet")
    public ResponseEntity<ApiResponse<PaySheetDTO>> getMyPaySheet() {
        Employee employee = authService.getCurrentEmployee();
        return ResponseEntity.ok(ApiResponse.success(hrServiceClient.getPaySheet(employee.getEmail())));
    }

    @GetMapping("/payslips")
    public ResponseEntity<ApiResponse<List<PayslipDTO>>> getMyPayslips() {
        Employee employee = authService.getCurrentEmployee();
        List<PayslipDTO> payslips = payrollService.getEmployeePayslipDTOs(employee.getId());
        return ResponseEntity.ok(ApiResponse.success(payslips));
    }

    @GetMapping("/payslips/{id}")
    public ResponseEntity<ApiResponse<PayslipDTO>> getPayslipDetails(@PathVariable Long id) {
        Employee employee = authService.getCurrentEmployee();
        try {
            PayslipDTO actual = payrollService.getEmployeePayslipDTOs(employee.getId()).stream()
                    .filter(p -> p.getId().equals(id))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Payslip not found: " + id));
            return ResponseEntity.ok(ApiResponse.success(actual));
        } catch (Exception e) {
            // fallback
            PayslipDTO payslip = payrollService.getOrCreatePayslipDTO(employee.getId(), java.time.LocalDate.now().getMonthValue(), java.time.LocalDate.now().getYear());
            return ResponseEntity.ok(ApiResponse.success(payslip));
        }
    }

    // ── Notifications Endpoints ──────────────────────────────────
    // Used by every role: the header bell, the HR notifications page and the employee dashboard.

    @GetMapping("/notifications")
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getMyNotifications() {
        Employee employee = authService.getCurrentEmployee();
        // Make sure today's birthday notifications exist (runs in the background, once a day per company)
        if (employee.getCompany() != null) {
            notificationService.ensureBirthdaysAsync(employee.getCompany().getId());
        }
        List<Notification> all = notificationRepository.findByUserIdOrderByCreatedAtDesc(employee.getId());
        // HR: add any pending leave / allowance request that has no notification yet
        try {
            if (hrNotificationSync.sync(employee, all)) {
                all = notificationRepository.findByUserIdOrderByCreatedAtDesc(employee.getId());
            }
        } catch (Exception e) {
            log.error("HR notification sync failed for user {}: {}", employee.getId(), e.toString(), e);
        }
        List<NotificationDTO> notifications = all.stream()
                .filter(n -> !Boolean.TRUE.equals(n.getDeleted()))
                .map(NotificationService::toDTO).toList();
        return ResponseEntity.ok(ApiResponse.success(notifications));
    }

    /**
     * Self-check for "HR does not see notifications": reports who you are, which HR managers the
     * system finds for your company, how many requests are pending, and whether creating the missing
     * notifications works (including the exact database / service error if it does not).
     */
    @GetMapping("/notifications/diagnostics")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> notificationDiagnostics() {
        java.util.Map<String, Object> r = new java.util.LinkedHashMap<>();
        Employee me = authService.getCurrentEmployee();
        r.put("me", java.util.Map.of(
                "userId", me.getId(), "email", String.valueOf(me.getEmail()),
                "role", String.valueOf(me.getRole()), "status", String.valueOf(me.getStatus())));
        Long companyId = me.getCompany() != null ? me.getCompany().getId() : null;
        r.put("companyIdInEmployeeDb", companyId);
        r.put("companyName", me.getCompany() != null ? me.getCompany().getCompanyName() : null);
        try {
            r.put("hrManagersFoundForCompany", employeeDirectory.findByCompanyIdAndRole(companyId, Employee.Role.HR_MANAGER).stream()
                    .map(e -> e.getId() + " | " + e.getEmail() + " | " + e.getStatus()).toList());
        } catch (Exception e) { r.put("hrManagersFoundForCompany_ERROR", e.toString()); }
        try {
            r.put("pendingLeavesInCompany", leaveRepository.findByCompanyIdAndStatus(companyId, LeaveApplication.LeaveStatus.PENDING).size());
            r.put("pendingAllowancesInCompany", allowanceRequestRepository.findByCompanyIdAndStatus(companyId, AllowanceRequest.Status.PENDING).size());
        } catch (Exception e) { r.put("pendingCounts_ERROR", e.toString()); }
        try {
            List<Notification> mine = notificationRepository.findByUserIdOrderByCreatedAtDesc(me.getId());
            r.put("myNotificationRows", mine.size());
            r.put("myUnread", mine.stream().filter(n -> !Boolean.TRUE.equals(n.getIsRead())).count());
            r.put("myHiddenByDelete", mine.stream().filter(n -> Boolean.TRUE.equals(n.getDeleted())).count());
            r.put("syncCreatedNewNotifications", hrNotificationSync.sync(me, mine));
        } catch (Exception e) { r.put("notifications_ERROR", e.toString()); }
        return ResponseEntity.ok(ApiResponse.success(r));
    }

    @PutMapping("/notifications/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markNotificationAsRead(@PathVariable Long id) {
        Employee employee = authService.getCurrentEmployee();
        notificationRepository.findById(id)
                .filter(n -> employee.getId().equals(n.getUserId()))   // only your own notifications
                .ifPresent(n -> {
                    n.setIsRead(true);
                    notificationRepository.save(n);
                });
        return ResponseEntity.ok(ApiResponse.success(null, "Notification marked as read"));
    }

    @PutMapping("/notifications/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllNotificationsAsRead() {
        Employee employee = authService.getCurrentEmployee();
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalse(employee.getId());
        unread.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unread);
        return ResponseEntity.ok(ApiResponse.success(null, "All notifications marked as read"));
    }

    @DeleteMapping("/notifications/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(@PathVariable Long id) {
        Employee employee = authService.getCurrentEmployee();
        notificationRepository.findById(id)
                .filter(n -> employee.getId().equals(n.getUserId()))
                .ifPresent(n -> {            // soft delete, so it is never re-created
                    n.setDeleted(true);
                    notificationRepository.save(n);
                });
        return ResponseEntity.ok(ApiResponse.success(null, "Notification deleted"));
    }
}
