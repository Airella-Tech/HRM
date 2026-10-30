package com.airella.hrm.controller;

import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.dto.CandidateApplicationTrackDTO;
import com.airella.hrm.dto.TrackApplicationRequest;
import com.airella.hrm.service.CandidateApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Public endpoint for candidates to track application status using their
 * tracking code and email address. No authentication required.
 */
@RestController
@RequestMapping("/api/careers/applications")
public class CareersApplicationController {

    private final CandidateApplicationService applicationService;

    public CareersApplicationController(CandidateApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    /**
     * Look up application status by trackingCode and email.
     */
    @PostMapping("/track")
    public ResponseEntity<ApiResponse<CandidateApplicationTrackDTO>> trackApplication(
            @Valid @RequestBody TrackApplicationRequest request) {
        CandidateApplicationTrackDTO result = applicationService.trackApplication(
                request.getTrackingCode(), request.getEmail());
        return ResponseEntity.ok(ApiResponse.success(result, "Application status retrieved successfully"));
    }

    /**
     * Optional GET query support for direct browser/email query links:
     * /api/careers/applications/track?code=APP-XXXXX&email=candidate@example.com
     */
    @GetMapping("/track")
    public ResponseEntity<ApiResponse<CandidateApplicationTrackDTO>> trackApplicationGet(
            @RequestParam String code,
            @RequestParam String email) {
        CandidateApplicationTrackDTO result = applicationService.trackApplication(code, email);
        return ResponseEntity.ok(ApiResponse.success(result, "Application status retrieved successfully"));
    }
}
