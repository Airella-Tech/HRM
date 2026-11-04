
package com.airella.hrm.controller;

import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.dto.InterviewEmailDTO;
import com.airella.hrm.service.InterviewEmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recruitment/interview-emails")
@PreAuthorize("@perm.has('INTERVIEW_SCHEDULE')")
public class InterviewEmailController {

    private final InterviewEmailService emailService;

    public InterviewEmailController(InterviewEmailService emailService) {
        this.emailService = emailService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<InterviewEmailDTO>>> list() {
        return ResponseEntity.ok(
                ApiResponse.success(emailService.list()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InterviewEmailDTO>> get(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                ApiResponse.success(emailService.get(id)));
    }

    @PostMapping("/{id}/retry")
    public ResponseEntity<ApiResponse<InterviewEmailDTO>> retry(
            @PathVariable Long id) {

        InterviewEmailDTO result = emailService.retry(id);

        String message = "Sent".equals(result.status())
                ? "Email accepted by the SMTP server."
                : "Email sending failed. Check the recorded error.";

        return ResponseEntity.ok(
                ApiResponse.success(result, message));
    }
}
