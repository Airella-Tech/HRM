package com.airella.hrm.controller;

import com.airella.hrm.model.CandidateApplicationDocument;
import com.airella.hrm.service.CandidateApplicationService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;

/**
 * Controller for Candidate Application resume access.
 * Protected with Recruitment Roles & Permissions evaluator (@perm).
 */
@RestController
@RequestMapping("/api/recruitment/applications")
public class CandidateApplicationController {

    private final CandidateApplicationService applicationService;

    public CandidateApplicationController(CandidateApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    /**
     * Secure PDF viewing / downloading for authorized HR users.
     * Follows the Employee_Backend AllowanceRequestController pattern.
     */
    @GetMapping("/{id}/resume")
    @PreAuthorize("@perm.has('RESUME_DOWNLOAD')")
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
