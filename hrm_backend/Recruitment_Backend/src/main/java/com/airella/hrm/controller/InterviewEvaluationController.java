
package com.airella.hrm.controller;

import com.airella.hrm.dto.InterviewEvaluationDTO;
import com.airella.hrm.dto.InterviewEvaluationRequestDTO;
import com.airella.hrm.service.InterviewEvaluationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recruitment")
public class InterviewEvaluationController {

    private final InterviewEvaluationService evaluationService;

    public InterviewEvaluationController(
            InterviewEvaluationService evaluationService) {
        this.evaluationService = evaluationService;
    }

    /**
     * Save or update the logged-in evaluator's draft.
     *
     * PUT /api/recruitment/interviews/{interviewId}/evaluations/draft
     */
    @PutMapping("/interviews/{interviewId}/evaluations/draft")
    public ResponseEntity<InterviewEvaluationDTO> saveDraft(
            @PathVariable Long interviewId,
            @Valid @RequestBody InterviewEvaluationRequestDTO request) {

        return ResponseEntity.ok(
                evaluationService.saveDraft(interviewId, request));
    }

    /**
     * Submit a completed evaluation.
     *
     * POST /api/recruitment/interviews/{interviewId}/evaluations/submit
     */
    @PostMapping("/interviews/{interviewId}/evaluations/submit")
    public ResponseEntity<InterviewEvaluationDTO> submit(
            @PathVariable Long interviewId,
            @Valid @RequestBody InterviewEvaluationRequestDTO request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(evaluationService.submit(interviewId, request));
    }

    /**
     * Get the logged-in evaluator's evaluation for an interview.
     *
     * GET /api/recruitment/interviews/{interviewId}/evaluations/mine
     */
    @GetMapping("/interviews/{interviewId}/evaluations/mine")
    public ResponseEntity<InterviewEvaluationDTO> getMyEvaluation(
            @PathVariable Long interviewId) {

        return ResponseEntity.ok(
                evaluationService.getMyEvaluation(interviewId));
    }

    /**
     * Get evaluations for the logged-in evaluator.
     *
     * GET /api/recruitment/evaluations/mine
     * GET /api/recruitment/evaluations/mine?status=DRAFT
     * GET /api/recruitment/evaluations/mine?status=SUBMITTED
     */
    @GetMapping("/evaluations/mine")
    public ResponseEntity<List<InterviewEvaluationDTO>> listMine(
            @RequestParam(required = false) String status) {

        return ResponseEntity.ok(
                evaluationService.listMine(status));
    }

    /**
     * Get all evaluations for a particular interview.
     *
     * GET /api/recruitment/interviews/{interviewId}/evaluations
     */
    @GetMapping("/interviews/{interviewId}/evaluations")
    public ResponseEntity<List<InterviewEvaluationDTO>> listForInterview(
            @PathVariable Long interviewId) {

        return ResponseEntity.ok(
                evaluationService.listForInterview(interviewId));
    }
}
