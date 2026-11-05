
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
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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

    // Six evaluation criteria for each interview round.
    // These keys must match the frontend request payload.

    private static final Map<String, Set<String>> ROUND_CRITERIA = Map.of(

            "TECHNICAL INTERVIEW", Set.of(
                    "programmingKnowledge",
                    "technicalSkills",
                    "problemSolvingAbility",
                    "codingAndLogicalThinking",
                    "practicalExperience",
                    "technicalAssessment"
            ),

            "HR INTERVIEW", Set.of(
                    "communicationSkills",
                    "confidence",
                    "teamwork",
                    "adaptability",
                    "salaryExpectationsAndCulturalFit",
                    "behaviouralAssessment"
            ),

            "HIRING MANAGER INTERVIEW", Set.of(
                    "roleSpecificKnowledge",
                    "decisionMaking",
                    "leadershipOwnership",
                    "relevantWorkExperience",
                    "jobRoleSuitability",
                    "strategicThinking"
            ),

            "FINAL INTERVIEW", Set.of(
                    "overallSuitability",
                    "careerGoals",
                    "longTermCommitment",
                    "professionalAttitude",
                    "finalHiringRecommendation",
                    "finalAssessment"
            )
    );

    private final InterviewEvaluationRepository evaluationRepository;
    private final InterviewRepository interviewRepository;
    private final AuthService authService;
    private final PermissionService permissionService;
    private final RecruitmentNotificationService notificationService;

    public InterviewEvaluationService(
            InterviewEvaluationRepository evaluationRepository,
            InterviewRepository interviewRepository,
            AuthService authService,
            PermissionService permissionService,
            RecruitmentNotificationService notificationService) {

        this.evaluationRepository = evaluationRepository;
        this.interviewRepository = interviewRepository;
        this.authService = authService;
        this.permissionService = permissionService;
        this.notificationService = notificationService;
    }

    // ------------------------------------------------------------
    // SAVE EVALUATION DRAFT
    // ------------------------------------------------------------

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
                    "An evaluation cannot be saved for a cancelled interview."
            );
        }

        InterviewEvaluation evaluation = evaluationRepository
                .findByCompanyIdAndInterviewIdAndEvaluatorId(
                        companyId,
                        interviewId,
                        evaluatorId
                )
                .orElseGet(() -> newEvaluation(
                        companyId,
                        interview,
                        evaluatorId
                ));

        if ("SUBMITTED".equalsIgnoreCase(evaluation.getStatus())) {
            throw new BusinessException(
                    "This evaluation has already been submitted and cannot be edited."
            );
        }

        validateRequest(request, interview, false);
        applyRequest(evaluation, request);

        evaluation.setStatus("DRAFT");
        evaluation.setSubmittedAt(null);

        InterviewEvaluation savedEvaluation =
                evaluationRepository.save(evaluation);

        // No notification is sent for draft evaluations.

        return toDto(savedEvaluation, interview);
    }

    // ------------------------------------------------------------
    // SUBMIT EVALUATION
    // ------------------------------------------------------------

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
                    "An evaluation cannot be submitted for a cancelled interview."
            );
        }

        if (!"Completed".equalsIgnoreCase(interview.getStatus())) {
            throw new BusinessException(
                    "The interview must be completed before its evaluation can be submitted."
            );
        }

        InterviewEvaluation evaluation = evaluationRepository
                .findByCompanyIdAndInterviewIdAndEvaluatorId(
                        companyId,
                        interviewId,
                        evaluatorId
                )
                .orElseGet(() -> newEvaluation(
                        companyId,
                        interview,
                        evaluatorId
                ));

        if ("SUBMITTED".equalsIgnoreCase(evaluation.getStatus())) {
            throw new BusinessException(
                    "This evaluation has already been submitted."
            );
        }

        validateRequest(request, interview, true);
        applyRequest(evaluation, request);

        evaluation.setStatus("SUBMITTED");
        evaluation.setSubmittedAt(LocalDateTime.now());

        // Save the submitted evaluation first.
        InterviewEvaluation savedEvaluation =
                evaluationRepository.save(evaluation);

        // Notify relevant recruitment users after successful submission.
        notificationService.evaluationSubmitted(interview);

        return toDto(savedEvaluation, interview);
    }

    // ------------------------------------------------------------
    // CHECK PASSING SUBMITTED EVALUATION
    // ------------------------------------------------------------

    @Transactional(readOnly = true)
    public boolean hasPassingSubmittedEvaluation(Long interviewId) {

        Long companyId = authService.getCurrentCompanyId();

        Interview interview = findInterview(interviewId, companyId);

        if (!"Completed".equalsIgnoreCase(interview.getStatus())) {
            return false;
        }

        List<InterviewEvaluation> evaluations = evaluationRepository
                .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                        companyId,
                        interviewId
                );

        return evaluations.stream().anyMatch(evaluation ->
                "SUBMITTED".equalsIgnoreCase(evaluation.getStatus())
                        && evaluation.getSubmittedAt() != null
                        && evaluation.getRecommendation() != null
                        && PASSING_RECOMMENDATIONS.contains(
                        normalizeRecommendation(
                                evaluation.getRecommendation()
                        )
                )
        );
    }

    // ------------------------------------------------------------
    // GET CURRENT EVALUATOR'S EVALUATION
    // ------------------------------------------------------------

    @Transactional(readOnly = true)
    public InterviewEvaluationDTO getMyEvaluation(Long interviewId) {

        Long companyId = authService.getCurrentCompanyId();
        Long evaluatorId = requireCurrentUserId();

        permissionService.require("INTERVIEW_EVALUATE");

        Interview interview = findInterview(interviewId, companyId);
        requireAssigned(interviewId, evaluatorId);

        InterviewEvaluation evaluation = evaluationRepository
                .findByCompanyIdAndInterviewIdAndEvaluatorId(
                        companyId,
                        interviewId,
                        evaluatorId
                )
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Interview evaluation",
                        "interviewId",
                        interviewId
                ));

        return toDto(evaluation, interview);
    }

    // ------------------------------------------------------------
    // LIST CURRENT EVALUATOR'S EVALUATIONS
    // ------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<InterviewEvaluationDTO> listMine(String status) {

        Long companyId = authService.getCurrentCompanyId();
        Long evaluatorId = requireCurrentUserId();

        permissionService.require("INTERVIEW_EVALUATE");

        if (status != null && !status.isBlank()
                && !STATUSES.contains(status.trim().toUpperCase(Locale.ROOT))) {

            throw new BusinessException(
                    "Status must be DRAFT or SUBMITTED."
            );
        }

        List<InterviewEvaluation> evaluations =
                evaluationRepository
                        .findByCompanyIdAndEvaluatorIdOrderByUpdatedAtDesc(
                                companyId,
                                evaluatorId
                        );

        return evaluations.stream()
                .filter(e -> status == null || status.isBlank()
                        || e.getStatus().equalsIgnoreCase(status.trim()))
                .map(e -> {
                    Interview interview = findInterview(
                            e.getInterviewId(),
                            companyId
                    );

                    return toDto(e, interview);
                })
                .toList();
    }

    // ------------------------------------------------------------
    // LIST ALL EVALUATIONS FOR AN INTERVIEW
    // ------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<InterviewEvaluationDTO> listForInterview(Long interviewId) {

        Long companyId = authService.getCurrentCompanyId();

        Interview interview = findInterview(interviewId, companyId);

        if (permissionService.hasAny(
                "INTERVIEW_SCHEDULE",
                "INTERVIEW_DECIDE") || permissionService.has("INTERVIEW_PROGRESS_VIEW")) {

            return evaluationRepository
                    .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                            companyId,
                            interviewId
                    )
                    .stream()
                    .map(e -> toDto(e, interview))
                    .toList();
        }

        permissionService.require("INTERVIEW_EVALUATE");

        requireAssigned(interviewId, requireCurrentUserId());

        return evaluationRepository
                .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                        companyId,
                        interviewId
                )
                .stream()
                .map(e -> toDto(e, interview))
                .toList();
    }

    // ------------------------------------------------------------
    // CREATE NEW EVALUATION
    // ------------------------------------------------------------

    private InterviewEvaluation newEvaluation(
            Long companyId,
            Interview interview,
            Long evaluatorId) {

        InterviewEvaluation evaluation = new InterviewEvaluation();

        evaluation.setCompanyId(companyId);
        evaluation.setInterviewId(interview.getId());

        // Store the application ID, not a separate candidate account ID.
        evaluation.setCandidateId(interview.getApplicationId());

        evaluation.setEvaluatorId(evaluatorId);
        evaluation.setStatus("DRAFT");

        return evaluation;
    }

    // ------------------------------------------------------------
    // VALIDATE EVALUATION REQUEST
    // ------------------------------------------------------------

    private void validateRequest(
            InterviewEvaluationRequestDTO request,
            Interview interview,
            boolean submitting) {

        if (request == null) {
            throw new BusinessException(
                    "Evaluation details are required."
            );
        }

        String interviewRound = interview.getInterviewRound();

        if (interviewRound == null || interviewRound.isBlank()) {
            throw new BusinessException(
                    "Interview round is required for evaluation."
            );
        }

        String round = interviewRound
                .trim()
                .toUpperCase(Locale.ROOT)
                .replace('_', ' ')
                .replace('-', ' ');

        Set<String> requiredCriteria = ROUND_CRITERIA.get(round);

        if (requiredCriteria == null) {
            throw new BusinessException(
                    "Unsupported interview round: " + interviewRound
            );
        }

        Map<String, Integer> scores = request.criteriaScores() == null
                ? Collections.emptyMap()
                : request.criteriaScores();

        // Reject criteria that do not belong to this interview round.
        for (String key : scores.keySet()) {

            if (!requiredCriteria.contains(key)) {
                throw new BusinessException(
                        "Invalid evaluation criterion for "
                                + interviewRound + ": " + key
                );
            }
        }

        // Validate supplied scores.
        for (Map.Entry<String, Integer> entry : scores.entrySet()) {
            validateScore(entry.getValue(), entry.getKey(), false);
        }

        // All six criteria are required when submitting.
        if (submitting) {

            for (String criterion : requiredCriteria) {

                if (!scores.containsKey(criterion)
                        || scores.get(criterion) == null) {

                    throw new BusinessException(
                            "A score for " + criterion
                                    + " is required before submission."
                    );
                }
            }
        }

        // Validate legacy fields if supplied.
        // They are not mandatory for new round-specific evaluations.
        validateScore(
                request.technicalKnowledge(),
                "Technical knowledge",
                false
        );

        validateScore(
                request.problemSolving(),
                "Problem solving",
                false
        );

        validateScore(
                request.communication(),
                "Communication",
                false
        );

        validateScore(
                request.roleSpecificSkills(),
                "Role-specific skills",
                false
        );

        validateScore(
                request.professionalism(),
                "Professionalism",
                false
        );

        if (request.recommendation() != null
                && !request.recommendation().isBlank()) {

            String recommendation =
                    normalizeRecommendation(request.recommendation());

            if (!RECOMMENDATIONS.contains(recommendation)) {
                throw new BusinessException(
                        "Recommendation must be STRONG_HIRE, HIRE, HOLD, "
                                + "NO_HIRE, or STRONG_NO_HIRE."
                );
            }
        }

        if (submitting) {

            if (request.recommendation() == null
                    || request.recommendation().isBlank()) {

                throw new BusinessException(
                        "A recommendation is required before submission."
                );
            }

            if (request.strengths() == null
                    || request.strengths().isBlank()) {

                throw new BusinessException(
                        "Please describe the candidate's strengths before submission."
                );
            }
        }
    }

    // ------------------------------------------------------------
    // VALIDATE INDIVIDUAL SCORE
    // ------------------------------------------------------------

    private void validateScore(
            Integer score,
            String label,
            boolean submitting) {

        if (score == null) {

            if (submitting) {
                throw new BusinessException(
                        label + " score is required before submission."
                );
            }

            return;
        }

        if (score < 1 || score > 5) {
            throw new BusinessException(
                    label + " score must be between 1 and 5."
            );
        }
    }

    // ------------------------------------------------------------
    // APPLY REQUEST DATA
    // ------------------------------------------------------------

    private void applyRequest(
            InterviewEvaluation evaluation,
            InterviewEvaluationRequestDTO request) {

        evaluation.setCriteriaScores(
                request.criteriaScores() == null
                        ? new HashMap<>()
                        : new HashMap<>(request.criteriaScores())
        );

        // Retain legacy fields for backward compatibility.
        evaluation.setTechnicalKnowledge(request.technicalKnowledge());
        evaluation.setProblemSolving(request.problemSolving());
        evaluation.setCommunication(request.communication());
        evaluation.setRoleSpecificSkills(request.roleSpecificSkills());
        evaluation.setProfessionalism(request.professionalism());

        evaluation.setStrengths(blankToNull(request.strengths()));

        evaluation.setAreasForImprovement(
                blankToNull(request.areasForImprovement())
        );

        evaluation.setComments(blankToNull(request.comments()));

        evaluation.setRecommendation(
                request.recommendation() == null
                        || request.recommendation().isBlank()
                        ? null
                        : normalizeRecommendation(request.recommendation())
        );
    }

    // ------------------------------------------------------------
    // FIND INTERVIEW WITH COMPANY ISOLATION
    // ------------------------------------------------------------

    private Interview findInterview(Long interviewId, Long companyId) {

        return interviewRepository
                .findByIdAndCompanyId(interviewId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Interview",
                        "id",
                        interviewId
                ));
    }

    // ------------------------------------------------------------
    // GET CURRENT USER ID
    // ------------------------------------------------------------

    private Long requireCurrentUserId() {

        Long userId = permissionService.currentUserId();

        if (userId == null) {
            throw new AccessDeniedException(
                    "Unable to identify the logged-in user."
            );
        }

        return userId;
    }

    // ------------------------------------------------------------
    // CHECK INTERVIEWER ASSIGNMENT
    // ------------------------------------------------------------

    private void requireAssigned(Long interviewId, Long evaluatorId) {

        if (!permissionService.isFullAccess()
                && !permissionService.isAssignedToInterview(interviewId)) {

            throw new AccessDeniedException(
                    "You are not assigned to this interview."
            );
        }
    }

    // ------------------------------------------------------------
    // NORMALIZE RECOMMENDATION
    // ------------------------------------------------------------

    private String normalizeRecommendation(String recommendation) {

        return recommendation.trim()
                .replace(' ', '_')
                .replace('-', '_')
                .toUpperCase(Locale.ROOT);
    }

    // ------------------------------------------------------------
    // CONVERT BLANK TEXT TO NULL
    // ------------------------------------------------------------

    private String blankToNull(String value) {

        return value == null || value.isBlank()
                ? null
                : value.trim();
    }

    // ------------------------------------------------------------
    // CONVERT ENTITY TO DTO
    // ------------------------------------------------------------

    private InterviewEvaluationDTO toDto(
            InterviewEvaluation evaluation,
            Interview interview) {

        Map<String, Integer> criteriaScores =
                evaluation.getCriteriaScores() == null
                        ? Collections.emptyMap()
                        : evaluation.getCriteriaScores();

        int total = 0;
        int count = 0;

        // Calculate average using the new round-specific criteria.
        for (Integer score : criteriaScores.values()) {

            if (score != null) {
                total += score;
                count++;
            }
        }

        // Fallback for older evaluations without criteriaScores.
        if (count == 0) {

            Integer[] legacyScores = {
                    evaluation.getTechnicalKnowledge(),
                    evaluation.getProblemSolving(),
                    evaluation.getCommunication(),
                    evaluation.getRoleSpecificSkills(),
                    evaluation.getProfessionalism()
            };

            for (Integer score : legacyScores) {

                if (score != null) {
                    total += score;
                    count++;
                }
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

                criteriaScores,

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
