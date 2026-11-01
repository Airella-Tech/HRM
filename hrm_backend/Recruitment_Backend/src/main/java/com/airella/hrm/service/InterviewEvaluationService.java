
package com.airella.hrm.service;

import com.airella.hrm.dto.InterviewEvaluationDTO;
import com.airella.hrm.dto.InterviewEvaluationRequestDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.Interview;
import com.airella.hrm.model.InterviewEvaluation;
import com.airella.hrm.repository.InterviewEvaluationRepository;
import com.airella.hrm.repository.InterviewRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@Transactional
public class InterviewEvaluationService {

    private static final Set<String> RECOMMENDATIONS = Set.of(
            "STRONG_HIRE",
            "HIRE",
            "HOLD",
            "NO_HIRE",
            "STRONG_NO_HIRE"
    );

    private static final Set<String> PASSING_RECOMMENDATIONS = Set.of(
            "STRONG_HIRE",
            "HIRE"
    );

    private static final Set<String> STATUSES = Set.of(
            "DRAFT",
            "SUBMITTED"
    );

    private final InterviewEvaluationRepository evaluationRepository;
    private final InterviewRepository interviewRepository;
    private final AuthService authService;
    private final PermissionService permissionService;

    public InterviewEvaluationService(
            InterviewEvaluationRepository evaluationRepository,
            InterviewRepository interviewRepository,
            AuthService authService,
            PermissionService permissionService) {

        this.evaluationRepository = evaluationRepository;
        this.interviewRepository = interviewRepository;
        this.authService = authService;
        this.permissionService = permissionService;
    }

    /**
     * Save an evaluation draft.
     * A submitted evaluation cannot be changed back into a draft.
     */
    public InterviewEvaluationDTO saveDraft(
            Long interviewId,
            InterviewEvaluationRequestDTO request) {

        Long companyId = authService.getCurrentCompanyId();
        Long evaluatorId = requireCurrentUserId();

        permissionService.require("INTERVIEW_EVALUATE");

        Interview interview = findInterview(interviewId, companyId);
        requireAssigned(interviewId, evaluatorId);

        if ("Cancelled".equalsIgnoreCase(interview.getStatus())) {
            throw new BusinessException(
                    "An evaluation cannot be saved for a cancelled interview.");
        }

        InterviewEvaluation evaluation = evaluationRepository
                .findByCompanyIdAndInterviewIdAndEvaluatorId(
                        companyId, interviewId, evaluatorId)
                .orElseGet(() -> newEvaluation(
                        companyId, interview, evaluatorId));

        if ("SUBMITTED".equalsIgnoreCase(evaluation.getStatus())) {
            throw new BusinessException(
                    "This evaluation has already been submitted and cannot be edited.");
        }

        validateRequest(request, false);
        applyRequest(evaluation, request);

        evaluation.setStatus("DRAFT");
        evaluation.setSubmittedAt(null);

        return toDto(evaluationRepository.save(evaluation), interview);
    }

    /**
     * Submit an evaluation.
     * The interview must be completed and all required scores,
     * strengths, and a valid recommendation must be provided.
     */
    public InterviewEvaluationDTO submit(
            Long interviewId,
            InterviewEvaluationRequestDTO request) {

        Long companyId = authService.getCurrentCompanyId();
        Long evaluatorId = requireCurrentUserId();

        permissionService.require("INTERVIEW_EVALUATE");

        Interview interview = findInterview(interviewId, companyId);
        requireAssigned(interviewId, evaluatorId);

        if ("Cancelled".equalsIgnoreCase(interview.getStatus())) {
            throw new BusinessException(
                    "An evaluation cannot be submitted for a cancelled interview.");
        }

        if (!"Completed".equalsIgnoreCase(interview.getStatus())) {
            throw new BusinessException(
                    "The interview must be completed before its evaluation can be submitted.");
        }

        InterviewEvaluation evaluation = evaluationRepository
                .findByCompanyIdAndInterviewIdAndEvaluatorId(
                        companyId, interviewId, evaluatorId)
                .orElseGet(() -> newEvaluation(
                        companyId, interview, evaluatorId));

        if ("SUBMITTED".equalsIgnoreCase(evaluation.getStatus())) {
            throw new BusinessException(
                    "This evaluation has already been submitted.");
        }

        validateRequest(request, true);
        applyRequest(evaluation, request);

        evaluation.setStatus("SUBMITTED");
        evaluation.setSubmittedAt(LocalDateTime.now());

        return toDto(evaluationRepository.save(evaluation), interview);
    }

    /**
     * Check whether a completed interview has at least one submitted
     * evaluation recommending HIRE or STRONG_HIRE.
     */
    @Transactional(readOnly = true)
    public boolean hasPassingSubmittedEvaluation(Long interviewId) {

        Long companyId = authService.getCurrentCompanyId();

        Interview interview = findInterview(interviewId, companyId);

        if (!"Completed".equalsIgnoreCase(interview.getStatus())) {
            return false;
        }

        List<InterviewEvaluation> evaluations = evaluationRepository
                .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                        companyId, interviewId);

        return evaluations.stream().anyMatch(evaluation ->
                "SUBMITTED".equalsIgnoreCase(evaluation.getStatus())
                        && evaluation.getSubmittedAt() != null
                        && evaluation.getRecommendation() != null
                        && PASSING_RECOMMENDATIONS.contains(
                        normalizeRecommendation(
                                evaluation.getRecommendation()))
        );
    }

    /**
     * Get the current evaluator's evaluation for an interview.
     */
    @Transactional(readOnly = true)
    public InterviewEvaluationDTO getMyEvaluation(Long interviewId) {

        Long companyId = authService.getCurrentCompanyId();
        Long evaluatorId = requireCurrentUserId();

        permissionService.require("INTERVIEW_EVALUATE");

        Interview interview = findInterview(interviewId, companyId);
        requireAssigned(interviewId, evaluatorId);

        InterviewEvaluation evaluation = evaluationRepository
                .findByCompanyIdAndInterviewIdAndEvaluatorId(
                        companyId, interviewId, evaluatorId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Interview evaluation", "interviewId", interviewId));

        return toDto(evaluation, interview);
    }

    /**
     * List evaluations belonging to the current evaluator.
     * Optional status: DRAFT or SUBMITTED.
     */
    @Transactional(readOnly = true)
    public List<InterviewEvaluationDTO> listMine(String status) {

        Long companyId = authService.getCurrentCompanyId();
        Long evaluatorId = requireCurrentUserId();

        permissionService.require("INTERVIEW_EVALUATE");

        if (status != null && !status.isBlank()
                && !STATUSES.contains(status.trim().toUpperCase(Locale.ROOT))) {
            throw new BusinessException(
                    "Status must be DRAFT or SUBMITTED.");
        }

        List<InterviewEvaluation> evaluations =
                evaluationRepository
                        .findByCompanyIdAndEvaluatorIdOrderByUpdatedAtDesc(
                                companyId, evaluatorId);

        return evaluations.stream()
                .filter(e -> status == null || status.isBlank()
                        || e.getStatus().equalsIgnoreCase(status.trim()))
                .map(e -> {
                    Interview interview = findInterview(
                            e.getInterviewId(), companyId);
                    return toDto(e, interview);
                })
                .toList();
    }

    /**
     * List every evaluation for an interview.
     * Requires evaluation or interview-scheduling permission.
     */
    @Transactional(readOnly = true)
    public List<InterviewEvaluationDTO> listForInterview(Long interviewId) {

        Long companyId = authService.getCurrentCompanyId();

        permissionService.requireAny(
                "INTERVIEW_EVALUATE",
                "INTERVIEW_SCHEDULE"
        );

        Interview interview = findInterview(interviewId, companyId);

        if (!permissionService.isFullAccess()) {
            requireAssigned(interviewId, requireCurrentUserId());
        }

        return evaluationRepository
                .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                        companyId, interviewId)
                .stream()
                .map(e -> toDto(e, interview))
                .toList();
    }

    private InterviewEvaluation newEvaluation(
            Long companyId,
            Interview interview,
            Long evaluatorId) {

        InterviewEvaluation evaluation = new InterviewEvaluation();

        evaluation.setCompanyId(companyId);
        evaluation.setInterviewId(interview.getId());

        // Store the application ID, not a separate candidate account ID.
        // Interview.getApplicationId() refers to CandidateApplication.id.
        evaluation.setCandidateId(interview.getApplicationId());

        evaluation.setEvaluatorId(evaluatorId);
        evaluation.setStatus("DRAFT");

        return evaluation;
    }

    private void validateRequest(
            InterviewEvaluationRequestDTO request,
            boolean submitting) {

        if (request == null) {
            throw new BusinessException(
                    "Evaluation details are required.");
        }

        validateScore(
                request.technicalKnowledge(),
                "Technical knowledge",
                submitting);

        validateScore(
                request.problemSolving(),
                "Problem solving",
                submitting);

        validateScore(
                request.communication(),
                "Communication",
                submitting);

        validateScore(
                request.roleSpecificSkills(),
                "Role-specific skills",
                submitting);

        validateScore(
                request.professionalism(),
                "Professionalism",
                submitting);

        if (request.recommendation() != null
                && !request.recommendation().isBlank()) {

            String recommendation =
                    normalizeRecommendation(request.recommendation());

            if (!RECOMMENDATIONS.contains(recommendation)) {
                throw new BusinessException(
                        "Recommendation must be STRONG_HIRE, HIRE, HOLD, "
                                + "NO_HIRE, or STRONG_NO_HIRE.");
            }
        }

        if (submitting) {

            if (request.recommendation() == null
                    || request.recommendation().isBlank()) {
                throw new BusinessException(
                        "A recommendation is required before submission.");
            }

            if (request.strengths() == null
                    || request.strengths().isBlank()) {
                throw new BusinessException(
                        "Please describe the candidate's strengths before submission.");
            }
        }
    }

    private void validateScore(
            Integer score,
            String label,
            boolean submitting) {

        if (score == null) {
            if (submitting) {
                throw new BusinessException(
                        label + " score is required before submission.");
            }
            return;
        }

        if (score < 1 || score > 5) {
            throw new BusinessException(
                    label + " score must be between 1 and 5.");
        }
    }

    private void applyRequest(
            InterviewEvaluation evaluation,
            InterviewEvaluationRequestDTO request) {

        evaluation.setTechnicalKnowledge(request.technicalKnowledge());
        evaluation.setProblemSolving(request.problemSolving());
        evaluation.setCommunication(request.communication());
        evaluation.setRoleSpecificSkills(request.roleSpecificSkills());
        evaluation.setProfessionalism(request.professionalism());

        evaluation.setStrengths(blankToNull(request.strengths()));
        evaluation.setAreasForImprovement(
                blankToNull(request.areasForImprovement()));
        evaluation.setComments(blankToNull(request.comments()));

        evaluation.setRecommendation(
                request.recommendation() == null
                        || request.recommendation().isBlank()
                        ? null
                        : normalizeRecommendation(request.recommendation()));
    }

    private Interview findInterview(Long interviewId, Long companyId) {

        return interviewRepository
                .findByIdAndCompanyId(interviewId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Interview", "id", interviewId));
    }

    private Long requireCurrentUserId() {

        Long userId = permissionService.currentUserId();

        if (userId == null) {
            throw new AccessDeniedException(
                    "Unable to identify the logged-in user.");
        }

        return userId;
    }

    private void requireAssigned(Long interviewId, Long evaluatorId) {

        if (!permissionService.isFullAccess()
                && !permissionService.isAssignedToInterview(interviewId)) {
            throw new AccessDeniedException(
                    "You are not assigned to this interview.");
        }
    }

    private String normalizeRecommendation(String recommendation) {

        return recommendation.trim()
                .replace(' ', '_')
                .replace('-', '_')
                .toUpperCase(Locale.ROOT);
    }

    private String blankToNull(String value) {

        return value == null || value.isBlank()
                ? null
                : value.trim();
    }

    private InterviewEvaluationDTO toDto(
            InterviewEvaluation evaluation,
            Interview interview) {

        Integer[] scores = {
                evaluation.getTechnicalKnowledge(),
                evaluation.getProblemSolving(),
                evaluation.getCommunication(),
                evaluation.getRoleSpecificSkills(),
                evaluation.getProfessionalism()
        };

        int total = 0;
        int count = 0;

        for (Integer score : scores) {
            if (score != null) {
                total += score;
                count++;
            }
        }

        Double average = count == 0
                ? null
                : Math.round((total * 1.0 / count) * 100.0) / 100.0;

        return new InterviewEvaluationDTO(
                evaluation.getId(),
                evaluation.getInterviewId(),
                evaluation.getCandidateId(),
                interview.getCandidateName(),
                interview.getCandidateEmail(),
                interview.getVacancyTitle(),
                interview.getInterviewRound(),
                evaluation.getEvaluatorId(),
                evaluation.getTechnicalKnowledge(),
                evaluation.getProblemSolving(),
                evaluation.getCommunication(),
                evaluation.getRoleSpecificSkills(),
                evaluation.getProfessionalism(),
                average,
                evaluation.getStrengths(),
                evaluation.getAreasForImprovement(),
                evaluation.getComments(),
                evaluation.getRecommendation(),
                evaluation.getStatus(),
                evaluation.getSubmittedAt(),
                evaluation.getCreatedAt(),
                evaluation.getUpdatedAt()
        );
    }
}
