package com.airella.hrm.controller;

import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.dto.CandidateEvaluationResponseDTO;
import com.airella.hrm.dto.CandidateScreeningResultDTO;
import com.airella.hrm.dto.VacancyScreeningConfigDTO;
import com.airella.hrm.service.CandidateScreeningService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller for Vacancy-Specific Screening Configurations and Automated Shortlisting.
 * Multi-company safe and secured with Recruitment Role Permissions evaluator (@perm).
 */
@RestController
@RequestMapping("/api/recruitment/screening")
public class CandidateScreeningController {

    private final CandidateScreeningService screeningService;

    public CandidateScreeningController(CandidateScreeningService screeningService) {
        this.screeningService = screeningService;
    }

    /**
     * Get the active or default screening configuration for a specific vacancy.
     */
    @GetMapping("/config/{vacancyId}")
    @PreAuthorize("@perm.hasAny('APPLICATION_VIEW', 'APPLICATION_SCREEN', 'VACANCY_CREATE')")
    public ResponseEntity<ApiResponse<VacancyScreeningConfigDTO>> getConfig(@PathVariable Long vacancyId) {
        VacancyScreeningConfigDTO config = screeningService.getConfigForVacancy(vacancyId);
        return ResponseEntity.ok(ApiResponse.success(config, "Vacancy screening configuration retrieved"));
    }

    /**
     * Save or update vacancy-specific screening rules and category weights.
     */
    @PutMapping("/config/{vacancyId}")
    @PreAuthorize("@perm.hasAny('APPLICATION_SCREEN', 'VACANCY_CREATE')")
    public ResponseEntity<ApiResponse<VacancyScreeningConfigDTO>> saveConfig(
            @PathVariable Long vacancyId,
            @RequestBody VacancyScreeningConfigDTO dto) {
        VacancyScreeningConfigDTO updated = screeningService.saveConfigForVacancy(vacancyId, dto);
        return ResponseEntity.ok(ApiResponse.success(updated, "Screening configuration saved successfully"));
    }

    /**
     * Run candidate screening evaluation on a single application.
     */
    @PostMapping("/evaluate/{applicationId}")
    @PreAuthorize("@perm.hasAny('APPLICATION_SCREEN', 'APPLICATION_SHORTLIST')")
    public ResponseEntity<ApiResponse<CandidateScreeningResultDTO>> evaluateCandidate(@PathVariable Long applicationId) {
        CandidateScreeningResultDTO result = screeningService.evaluateCandidate(applicationId);
        return ResponseEntity.ok(ApiResponse.success(result, "Candidate evaluated successfully"));
    }

    /**
     * Run screening and automatic shortlisting evaluation on all applicants for a vacancy.
     */
    @PostMapping("/evaluate-vacancy/{vacancyId}")
    @PreAuthorize("@perm.hasAny('APPLICATION_SCREEN', 'APPLICATION_SHORTLIST')")
    public ResponseEntity<ApiResponse<CandidateEvaluationResponseDTO>> evaluateVacancy(@PathVariable Long vacancyId) {
        CandidateEvaluationResponseDTO response = screeningService.evaluateVacancyCandidates(vacancyId);
        return ResponseEntity.ok(ApiResponse.success(response, "Vacancy candidate evaluation complete"));
    }

    /**
     * Force rescreening of all applicants for a vacancy against the latest active configuration revision.
     */
    @PostMapping("/rescreen-vacancy/{vacancyId}")
    @PreAuthorize("@perm.hasAny('APPLICATION_SCREEN', 'APPLICATION_SHORTLIST')")
    public ResponseEntity<ApiResponse<CandidateEvaluationResponseDTO>> rescreenVacancy(@PathVariable Long vacancyId) {
        CandidateEvaluationResponseDTO response = screeningService.rescreenVacancy(vacancyId);
        return ResponseEntity.ok(ApiResponse.success(response, "Applications rescreened successfully"));
    }

    /**
     * Retrieve the latest detailed screening result for a candidate application.
     */
    @GetMapping("/results/{applicationId}")
    @PreAuthorize("@perm.has('APPLICATION_VIEW')")
    public ResponseEntity<ApiResponse<CandidateScreeningResultDTO>> getResultForApplication(@PathVariable Long applicationId) {
        CandidateScreeningResultDTO result = screeningService.getLatestResultForApplication(applicationId);
        return ResponseEntity.ok(ApiResponse.success(result, "Screening result retrieved successfully"));
    }

    /**
     * Retrieve latest screening results for all candidates of a vacancy.
     */
    @GetMapping("/vacancy/{vacancyId}/results")
    @PreAuthorize("@perm.has('APPLICATION_VIEW')")
    public ResponseEntity<ApiResponse<List<CandidateScreeningResultDTO>>> getResultsForVacancy(@PathVariable Long vacancyId) {
        List<CandidateScreeningResultDTO> results = screeningService.getResultsForVacancy(vacancyId);
        return ResponseEntity.ok(ApiResponse.success(results, "Screening results retrieved for vacancy"));
    }
}
