package com.airella.hrm.controller;

import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.dto.CandidateApplicationDTO;
import com.airella.hrm.model.CandidateApplicationDocument;
import com.airella.hrm.service.CandidateApplicationService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Controller for Candidate Applications and secure resume access.
 * Protected with Recruitment Roles & Permissions evaluator (@perm).
 */
@RestController
@RequestMapping("/api/recruitment/applications")
public class CandidateApplicationController {

    private final CandidateApplicationService applicationService;
    private final com.airella.hrm.service.CandidateScreeningService screeningService;

    public CandidateApplicationController(CandidateApplicationService applicationService,
                                        com.airella.hrm.service.CandidateScreeningService screeningService) {
        this.applicationService = applicationService;
        this.screeningService = screeningService;
    }

    /**
     * List all candidate applications for authorized HR users.
     * Supports filtering by vacancyId, status, and search query.
     */
    @GetMapping
    @PreAuthorize("@perm.has('APPLICATION_VIEW')")
    public ResponseEntity<ApiResponse<List<CandidateApplicationDTO>>> getApplications(
            @RequestParam(required = false) Long vacancyId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        List<CandidateApplicationDTO> result = applicationService.getApplications(vacancyId, status, search);
        return ResponseEntity.ok(ApiResponse.success(result, "Candidate applications retrieved successfully"));
    }

    /**
     * Get a single candidate application profile by ID.
     */
    @GetMapping("/{id}")
    @PreAuthorize("@perm.has('APPLICATION_VIEW')")
    public ResponseEntity<ApiResponse<CandidateApplicationDTO>> getApplicationById(@PathVariable Long id) {
        CandidateApplicationDTO result = applicationService.getApplicationById(id);
        return ResponseEntity.ok(ApiResponse.success(result, "Candidate application retrieved successfully"));
    }

    /**
     * Manual shortlist candidate with notes.
     */
    @PostMapping("/{id}/shortlist")
    @PreAuthorize("@perm.has('APPLICATION_SHORTLIST')")
    public ResponseEntity<ApiResponse<CandidateApplicationDTO>> shortlistCandidate(
            @PathVariable Long id,
            @RequestBody(required = false) com.airella.hrm.dto.ShortlistActionRequest request) {
        String notes = request != null ? request.getNotes() : null;
        CandidateApplicationDTO result = screeningService.shortlistCandidateManual(id, notes);
        return ResponseEntity.ok(ApiResponse.success(result, "Candidate application shortlisted successfully"));
    }

    /**
     * Manual reject candidate with structured reason.
     */
    @PostMapping("/{id}/reject")
    @PreAuthorize("@perm.has('APPLICATION_SHORTLIST')")
    public ResponseEntity<ApiResponse<CandidateApplicationDTO>> rejectCandidate(
            @PathVariable Long id,
            @RequestBody com.airella.hrm.dto.RejectActionRequest request) {
        String reason = request != null ? request.getReason() : "Application rejected";
        CandidateApplicationDTO result = screeningService.rejectCandidateManual(id, reason);
        return ResponseEntity.ok(ApiResponse.success(result, "Candidate application rejected"));
    }

    /**
     * Secure PDF viewing / downloading for authorized HR users.
     * Follows the Employee_Backend AllowanceRequestController pattern.
     */
    @GetMapping("/{id}/resume")
    @PreAuthorize("@perm.has('APPLICATION_VIEW')")
    public ResponseEntity<byte[]> getResume(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "false") boolean download) {
        CandidateApplicationDocument doc = applicationService.getDocumentForApplication(id);

        ContentDisposition disposition = download
                ? ContentDisposition.attachment().filename(doc.getFileName(), StandardCharsets.UTF_8).build()
                : ContentDisposition.inline().filename(doc.getFileName(), StandardCharsets.UTF_8).build();

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(doc.getData());
    }
}
