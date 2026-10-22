package com.airella.hrm.controller;

import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.dto.PublicVacancyDTO;
import com.airella.hrm.service.CareersService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Public endpoints (no login). Security allows /api/careers/** without a token. */
@RestController
@RequestMapping("/api/careers/jobs")
public class CareersController {

    private final CareersService careersService;
    private final com.airella.hrm.service.CandidateApplicationService applicationService;

    public CareersController(CareersService careersService,
                             com.airella.hrm.service.CandidateApplicationService applicationService) {
        this.careersService = careersService;
        this.applicationService = applicationService;
    }

    // "company" is checked in the service, so a missing value gives a clear 400 message.

    @GetMapping
    public ResponseEntity<ApiResponse<List<PublicVacancyDTO>>> list(
            @RequestParam(required = false) String company,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String jobType,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.success(careersService.listOpen(company, department, jobType, search)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PublicVacancyDTO>> get(@PathVariable Long id,
                                                             @RequestParam(required = false) String company) {
        return ResponseEntity.ok(ApiResponse.success(careersService.getOpen(id, company)));
    }

    /**
     * Public Quick Apply intake API (Multipart form with PDF resume).
     */
    @PostMapping(value = "/{id}/apply", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<com.airella.hrm.dto.CandidateApplicationDTO>> applyMultipart(
            @PathVariable Long id,
            @RequestParam(required = false) String company,
            @ModelAttribute com.airella.hrm.dto.ApplyJobRequest request,
            @RequestParam(value = "resume", required = false) org.springframework.web.multipart.MultipartFile resume) {
        com.airella.hrm.dto.CandidateApplicationDTO result = applicationService.submitApplication(id, company, request, resume);
        return ResponseEntity.ok(ApiResponse.success(result, "Application submitted successfully! Your tracking code is: " + result.getTrackingCode()));
    }
}