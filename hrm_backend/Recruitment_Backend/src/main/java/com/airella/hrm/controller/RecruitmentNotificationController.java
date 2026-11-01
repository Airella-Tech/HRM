package com.airella.hrm.controller;

import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.dto.RecruitmentNotificationDTO;
import com.airella.hrm.service.RecruitmentNotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** The logged-in user's own recruitment notifications. Any signed-in user may read their own. */
@RestController
@RequestMapping("/api/recruitment/notifications")
public class RecruitmentNotificationController {

    private final RecruitmentNotificationService notificationService;

    public RecruitmentNotificationController(RecruitmentNotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RecruitmentNotificationDTO>>> list() {
        return ResponseEntity.ok(ApiResponse.success(notificationService.listForCurrentUser()));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(@PathVariable Long id) {
        notificationService.markRead(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Marked as read"));
    }

    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllRead() {
        notificationService.markAllRead();
        return ResponseEntity.ok(ApiResponse.success(null, "All marked as read"));
    }
}