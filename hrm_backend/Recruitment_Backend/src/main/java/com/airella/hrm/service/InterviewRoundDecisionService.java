
package com.airella.hrm.service;

import com.airella.hrm.dto.InterviewRoundDecisionDTO;
import com.airella.hrm.dto.InterviewRoundDecisionRequestDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.*;
import com.airella.hrm.repository.*;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class InterviewRoundDecisionService {

    private final InterviewRoundDecisionRepository decisionRepository;
    private final InterviewRepository interviewRepository;
    private final InterviewEvaluatorAssignmentRepository assignmentRepository;
    private final InterviewEvaluationRepository evaluationRepository;
    private final CandidateApplicationRepository applicationRepository;
    private final AuthService authService;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final RecruitmentNotificationService notificationService;

    private static final Set<String> VALID_DECISIONS =
            Set.of("APPROVED", "REJECTED");

    public InterviewRoundDecisionService(
            InterviewRoundDecisionRepository decisionRepository,
            InterviewRepository interviewRepository,
            InterviewEvaluatorAssignmentRepository assignmentRepository,
            InterviewEvaluationRepository evaluationRepository,
            CandidateApplicationRepository applicationRepository,
            AuthService authService,
            PermissionService permissionService,
            AuditService auditService,
            RecruitmentNotificationService notificationService) {

        this.decisionRepository = decisionRepository;
        this.interviewRepository = interviewRepository;
        this.assignmentRepository = assignmentRepository;
        this.evaluationRepository = evaluationRepository;
        this.applicationRepository = applicationRepository;
        this.authService = authService;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    // ------------------------------------------------------------
    // SUBMIT MANAGER DECISION
    // ------------------------------------------------------------

    public InterviewRoundDecisionDTO makeDecision(
            Long interviewId,
            InterviewRoundDecisionRequestDTO request) {

        permissionService.require("INTERVIEW_DECIDE");

        Long companyId = authService.getCurrentCompanyId();
        String companyRef = authService.getCurrentCompanyRef();
        Long managerId = permissionService.currentUserId();

        if (managerId == null) {
            throw new AccessDeniedException(
                    "Unable to identify the logged-in manager.");
        }

        if (request == null || request.decision() == null) {
            throw new BusinessException("A decision is required.");
        }

        String decisionValue = request.decision()
                .trim()
                .toUpperCase(Locale.ROOT);

        if (!VALID_DECISIONS.contains(decisionValue)) {
            throw new BusinessException(
                    "Decision must be APPROVED or REJECTED.");
        }

        String comments = request.comments() == null
                ? null
                : request.comments().trim();

        if ("REJECTED".equals(decisionValue)
                && (comments == null || comments.isBlank())) {
            throw new BusinessException(
                    "A reason is required when rejecting a candidate.");
        }

        // Find the interview within the manager's company.
        Interview interview = interviewRepository
                .findByIdAndCompanyId(interviewId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Interview", "id", interviewId));

        if (!"Completed".equalsIgnoreCase(interview.getStatus())) {
            throw new BusinessException(
                    "The interview must be completed before a manager decision.");
        }

        if (interview.getApplicationId() == null) {
            throw new BusinessException(
                    "This interview is not linked to a candidate application.");
        }

        // Prevent a second decision for the same interview.
        if (decisionRepository.findByCompanyIdAndInterviewId(
                companyId, interviewId).isPresent()) {

            throw new BusinessException(
                    "A manager decision has already been recorded for this interview.");
        }

        // Get all interviewers assigned to this interview.
        List<InterviewEvaluatorAssignment> assignments =
                assignmentRepository.findByCompanyIdAndInterviewId(
                        companyId, interviewId);

        if (assignments.isEmpty()) {
            throw new BusinessException(
                    "At least one interviewer must be assigned before a decision.");
        }

        // Get all evaluations for this interview.
        List<InterviewEvaluation> evaluations =
                evaluationRepository
                        .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                                companyId, interviewId);

        // Collect only properly submitted evaluations.
        Set<Long> submittedEvaluatorIds = evaluations.stream()
                .filter(e -> "SUBMITTED".equalsIgnoreCase(e.getStatus()))
                .filter(e -> e.getSubmittedAt() != null)
                .map(InterviewEvaluation::getEvaluatorId)
                .collect(Collectors.toSet());

        // Every assigned interviewer must submit an evaluation.
        List<Long> missingEvaluators = assignments.stream()
                .map(InterviewEvaluatorAssignment::getEmployeeId)
                .filter(id -> !submittedEvaluatorIds.contains(id))
                .toList();

        if (!missingEvaluators.isEmpty()) {
            throw new BusinessException(
                    "A manager decision cannot be made yet. "
                            + missingEvaluators.size()
                            + " assigned interviewer(s) have not submitted their evaluations.");
        }

        // Find the candidate application using both company identifiers.
        CandidateApplication application = applicationRepository
                .findByIdAndCompany(
                        interview.getApplicationId(),
                        companyRef,
                        companyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Candidate application",
                        "id",
                        interview.getApplicationId()));

        // Save the manager decision.
        InterviewRoundDecision decision = new InterviewRoundDecision();

        decision.setCompanyId(companyId);
        decision.setApplicationId(interview.getApplicationId());
        decision.setInterviewId(interviewId);
        decision.setInterviewRound(interview.getInterviewRound());
        decision.setManagerId(managerId);
        decision.setDecision(
                InterviewRoundDecision.Decision.valueOf(decisionValue));
        decision.setComments(comments);

        InterviewRoundDecision saved =
                decisionRepository.save(decision);

        // Update the candidate application.
        if ("REJECTED".equals(decisionValue)) {

            application.setStatus(ApplicationStatus.REJECTED);
            application.setEligibilityStatus(EligibilityStatus.INELIGIBLE);
            application.setRejectionReason(comments);
            application.setReviewedBy(managerId);
            application.setReviewedAt(LocalDateTime.now());

        } else {

            // Keep the candidate in the interview process.
            application.setStatus(ApplicationStatus.INTERVIEW_SCHEDULED);
        }

        applicationRepository.save(application);

        // Notify assigned interviewers about the manager's decision.
        notificationService.roundDecisionMade(
                interview,
                decisionValue,
                comments
        );

        // Record audit information.
        auditService.logAction(
                "INTERVIEW_ROUND_" + decisionValue,
                "InterviewRoundDecision",
                saved.getId(),
                "Manager " + decisionValue
                        + " candidate application "
                        + interview.getApplicationId()
                        + " after "
                        + interview.getInterviewRound(),
                companyRef
        );

        return toDto(saved);
    }

    // ------------------------------------------------------------
    // GET MANAGER DECISION
    // ------------------------------------------------------------

    @Transactional(readOnly = true)
    public InterviewRoundDecisionDTO getDecision(Long interviewId) {

        Long companyId = authService.getCurrentCompanyId();

        permissionService.require("INTERVIEW_DECIDE");

        // Return the saved decision if it exists.
        // Return null if no manager decision has been submitted yet.
        return decisionRepository
                .findByCompanyIdAndInterviewId(companyId, interviewId)
                .map(this::toDto)
                .orElse(null);
    }

    // ------------------------------------------------------------
    // CONVERT ENTITY TO DTO
    // ------------------------------------------------------------

    private InterviewRoundDecisionDTO toDto(
            InterviewRoundDecision decision) {

        return new InterviewRoundDecisionDTO(
                decision.getId(),
                decision.getCompanyId(),
                decision.getApplicationId(),
                decision.getInterviewId(),
                decision.getInterviewRound(),
                decision.getManagerId(),
                decision.getDecision().name(),
                decision.getComments(),
                decision.getDecidedAt()
        );
    }
}
