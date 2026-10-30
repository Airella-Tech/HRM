
package com.airella.hrm.controller;

import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.dto.EligibleCandidateDTO;
import com.airella.hrm.dto.JobOfferDTO;
import com.airella.hrm.dto.JobOfferRequestDTO;
import com.airella.hrm.model.JobOfferStatus;
import com.airella.hrm.service.JobOfferService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recruitment/job-offers")
@PreAuthorize("@perm.has('OFFER_MANAGE')")
public class JobOfferController {

    private final JobOfferService jobOfferService;

    public JobOfferController(JobOfferService jobOfferService) {
        this.jobOfferService = jobOfferService;
    }

    // Create a job offer
    @PostMapping
    public ResponseEntity<ApiResponse<JobOfferDTO>> create(
            @Valid @RequestBody JobOfferRequestDTO request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        jobOfferService.create(request),
                        "Job offer created"));
    }

    // Get all job offers, optionally filtered by status
    @GetMapping
    public ResponseEntity<ApiResponse<List<JobOfferDTO>>> list(
            @RequestParam(required = false) JobOfferStatus status) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        jobOfferService.list(status)));
    }

    // Get candidates eligible for job offers
    @GetMapping("/eligible-candidates")
    public ResponseEntity<ApiResponse<List<EligibleCandidateDTO>>>
    getEligibleCandidates() {

        return ResponseEntity.ok(
                ApiResponse.success(
                        jobOfferService.getEligibleCandidates(),
                        "Eligible candidates retrieved successfully"));
    }

    // Get a job offer by ID
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<JobOfferDTO>> get(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        jobOfferService.get(id)));
    }

    // Update a job offer
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<JobOfferDTO>> update(
            @PathVariable Long id,
            @Valid @RequestBody JobOfferRequestDTO request) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        jobOfferService.update(id, request),
                        "Job offer updated"));
    }

    // Update a job offer status
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<JobOfferDTO>> updateStatus(
            @PathVariable Long id,
            @RequestParam JobOfferStatus status) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        jobOfferService.updateStatus(id, status),
                        "Job offer status updated"));
    }

    // Send the job offer email to the candidate
    @PostMapping("/{id}/send-email")
    public ResponseEntity<ApiResponse<Void>> sendOfferEmail(
            @PathVariable Long id) {

        jobOfferService.sendOfferEmail(id);

        return ResponseEntity.ok(
                ApiResponse.success(
                        null,
                        "Job offer email sent successfully"));
    }

    // Delete a draft job offer
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDraft(
            @PathVariable Long id) {

        jobOfferService.deleteDraft(id);

        return ResponseEntity.ok(
                ApiResponse.success(
                        null,
                        "Job offer draft deleted"));
    }
}
