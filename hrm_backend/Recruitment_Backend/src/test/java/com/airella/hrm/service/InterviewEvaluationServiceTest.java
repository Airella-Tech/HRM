
package com.airella.hrm.service;

import com.airella.hrm.dto.InterviewEvaluationDTO;
import com.airella.hrm.dto.InterviewEvaluationRequestDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.Interview;
import com.airella.hrm.model.InterviewEvaluation;
import com.airella.hrm.repository.InterviewEvaluationRepository;
import com.airella.hrm.repository.InterviewRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InterviewEvaluationServiceTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long INTERVIEW_ID = 10L;
    private static final Long EVALUATOR_ID = 20L;

    @Mock
    private InterviewEvaluationRepository evaluationRepository;

    @Mock
    private InterviewRepository interviewRepository;

    @Mock
    private AuthService authService;

    @Mock
    private PermissionService permissionService;

    @Mock
    private RecruitmentNotificationService notificationService;

    @InjectMocks
    private InterviewEvaluationService evaluationService;

    private Interview interview;

    @BeforeEach
    void setUp() {

        interview = new Interview();

        interview.setId(INTERVIEW_ID);
        interview.setCompanyId(COMPANY_ID);
        interview.setApplicationId(100L);

        interview.setCandidateName("Sanduni Sewwandi");
        interview.setCandidateEmail("sanduni@example.com");

        interview.setVacancyId(5L);
        interview.setVacancyTitle("Software Engineer");

        interview.setInterviewRound("Technical Interview");

        interview.setInterviewDate(LocalDate.now());
        interview.setInterviewTime(LocalTime.of(10, 0));

        interview.setDurationMinutes(60);
        interview.setInterviewType("Online");
        interview.setStatus("Completed");
        interview.setCreatedBy(1L);

        lenient().when(authService.getCurrentCompanyId())
                .thenReturn(COMPANY_ID);

        lenient().when(permissionService.currentUserId())
                .thenReturn(EVALUATOR_ID);

        lenient().when(permissionService.isFullAccess())
                .thenReturn(false);

        lenient().when(permissionService.isAssignedToInterview(INTERVIEW_ID))
                .thenReturn(true);

        lenient().when(interviewRepository.findByIdAndCompanyId(
                        INTERVIEW_ID,
                        COMPANY_ID
                ))
                .thenReturn(Optional.of(interview));
    }

    // ------------------------------------------------------------
    // VALID REQUEST
    // ------------------------------------------------------------

    private Map<String, Integer> validTechnicalCriteria() {

        Map<String, Integer> scores = new HashMap<>();

        scores.put("programmingKnowledge", 5);
        scores.put("technicalSkills", 4);
        scores.put("problemSolvingAbility", 5);
        scores.put("codingAndLogicalThinking", 4);
        scores.put("practicalExperience", 5);
        scores.put("technicalAssessment", 4);

        return scores;
    }

    private InterviewEvaluationRequestDTO validDraftRequest() {

        return new InterviewEvaluationRequestDTO(
                validTechnicalCriteria(),
                5,
                4,
                5,
                4,
                5,
                "Good technical knowledge",
                "Needs more practical experience",
                "Good overall performance",
                "HIRE"
        );
    }

    private InterviewEvaluationRequestDTO validSubmitRequest() {

        return new InterviewEvaluationRequestDTO(
                validTechnicalCriteria(),
                5,
                4,
                5,
                4,
                5,
                "Good technical knowledge",
                "Needs more practical experience",
                "Good overall performance",
                "HIRE"
        );
    }

    // ------------------------------------------------------------
    // TEST DATA
    // ------------------------------------------------------------

    private InterviewEvaluation submittedEvaluation(String recommendation) {

        InterviewEvaluation evaluation = new InterviewEvaluation();

        evaluation.setId(1L);
        evaluation.setCompanyId(COMPANY_ID);
        evaluation.setInterviewId(INTERVIEW_ID);
        evaluation.setCandidateId(100L);
        evaluation.setEvaluatorId(EVALUATOR_ID);

        evaluation.setCriteriaScores(validTechnicalCriteria());

        evaluation.setTechnicalKnowledge(5);
        evaluation.setProblemSolving(4);
        evaluation.setCommunication(5);
        evaluation.setRoleSpecificSkills(4);
        evaluation.setProfessionalism(5);

        evaluation.setStrengths("Good technical knowledge");
        evaluation.setRecommendation(recommendation);

        evaluation.setStatus("SUBMITTED");
        evaluation.setSubmittedAt(LocalDateTime.now());

        return evaluation;
    }

    private void mockSave() {

        when(evaluationRepository.save(any(InterviewEvaluation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private void mockNoExistingEvaluation() {

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdAndEvaluatorId(
                        COMPANY_ID,
                        INTERVIEW_ID,
                        EVALUATOR_ID
                ))
                .thenReturn(Optional.empty());
    }

    // ------------------------------------------------------------
    // SAVE DRAFT TESTS
    // ------------------------------------------------------------

    @Test
    void saveDraft_shouldSaveEvaluationSuccessfully() {

        mockSave();
        mockNoExistingEvaluation();

        InterviewEvaluationDTO result =
                evaluationService.saveDraft(
                        INTERVIEW_ID,
                        validDraftRequest()
                );

        assertNotNull(result);

        assertEquals(INTERVIEW_ID, result.interviewId());
        assertEquals(100L, result.candidateId());

        assertEquals("DRAFT", result.status());
        assertEquals("HIRE", result.recommendation());

        assertEquals("Sanduni Sewwandi", result.candidateName());
        assertEquals("Technical Interview", result.interviewRound());

        assertEquals(6, result.criteriaScores().size());

        verify(evaluationRepository).save(any(InterviewEvaluation.class));

        verify(notificationService, never())
                .evaluationSubmitted(any(Interview.class));
    }

    @Test
    void saveDraft_shouldUpdateExistingDraft() {

        InterviewEvaluation existing = new InterviewEvaluation();

        existing.setId(2L);
        existing.setCompanyId(COMPANY_ID);
        existing.setInterviewId(INTERVIEW_ID);
        existing.setCandidateId(100L);
        existing.setEvaluatorId(EVALUATOR_ID);
        existing.setStatus("DRAFT");

        mockSave();

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdAndEvaluatorId(
                        COMPANY_ID,
                        INTERVIEW_ID,
                        EVALUATOR_ID
                ))
                .thenReturn(Optional.of(existing));

        InterviewEvaluationDTO result =
                evaluationService.saveDraft(
                        INTERVIEW_ID,
                        validDraftRequest()
                );

        assertNotNull(result);

        assertEquals("DRAFT", result.status());
        assertEquals("HIRE", result.recommendation());

        verify(evaluationRepository).save(existing);
    }

    @Test
    void saveDraft_shouldSetSubmittedAtToNull() {

        InterviewEvaluation existing = submittedEvaluation("HIRE");
        existing.setStatus("DRAFT");

        existing.setSubmittedAt(LocalDateTime.now());

        mockSave();

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdAndEvaluatorId(
                        COMPANY_ID,
                        INTERVIEW_ID,
                        EVALUATOR_ID
                ))
                .thenReturn(Optional.of(existing));

        InterviewEvaluationDTO result =
                evaluationService.saveDraft(
                        INTERVIEW_ID,
                        validDraftRequest()
                );

        assertNull(result.submittedAt());
    }

    @Test
    void saveDraft_shouldRejectInvalidScore() {

        Map<String, Integer> scores = validTechnicalCriteria();
        scores.put("programmingKnowledge", 6);

        InterviewEvaluationRequestDTO invalidRequest =
                new InterviewEvaluationRequestDTO(
                        scores,
                        null,
                        null,
                        null,
                        null,
                        null,
                        "Good knowledge",
                        null,
                        null,
                        "HIRE"
                );

        assertThrows(
                BusinessException.class,
                () -> evaluationService.saveDraft(
                        INTERVIEW_ID,
                        invalidRequest
                )
        );

        verify(evaluationRepository, never()).save(any());
    }

    @Test
    void saveDraft_shouldRejectCriterionFromAnotherRound() {

        Map<String, Integer> scores = validTechnicalCriteria();

        scores.put("communicationSkills", 5);

        InterviewEvaluationRequestDTO invalidRequest =
                new InterviewEvaluationRequestDTO(
                        scores,
                        null,
                        null,
                        null,
                        null,
                        null,
                        "Good knowledge",
                        null,
                        null,
                        "HIRE"
                );

        assertThrows(
                BusinessException.class,
                () -> evaluationService.saveDraft(
                        INTERVIEW_ID,
                        invalidRequest
                )
        );

        verify(evaluationRepository, never()).save(any());
    }

    @Test
    void saveDraft_shouldRejectInvalidRecommendation() {

        InterviewEvaluationRequestDTO invalidRequest =
                new InterviewEvaluationRequestDTO(
                        validTechnicalCriteria(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        "Good knowledge",
                        null,
                        null,
                        "MAYBE"
                );

        assertThrows(
                BusinessException.class,
                () -> evaluationService.saveDraft(
                        INTERVIEW_ID,
                        invalidRequest
                )
        );

        verify(evaluationRepository, never()).save(any());
    }

    @Test
    void saveDraft_shouldRejectNullRequest() {

        assertThrows(
                BusinessException.class,
                () -> evaluationService.saveDraft(INTERVIEW_ID, null)
        );

        verify(evaluationRepository, never()).save(any());
    }

    @Test
    void saveDraft_shouldRejectCancelledInterview() {

        interview.setStatus("Cancelled");

        assertThrows(
                BusinessException.class,
                () -> evaluationService.saveDraft(
                        INTERVIEW_ID,
                        validDraftRequest()
                )
        );

        verify(evaluationRepository, never()).save(any());
    }

    @Test
    void saveDraft_shouldRejectAlreadySubmittedEvaluation() {

        InterviewEvaluation existing = submittedEvaluation("HIRE");

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdAndEvaluatorId(
                        COMPANY_ID,
                        INTERVIEW_ID,
                        EVALUATOR_ID
                ))
                .thenReturn(Optional.of(existing));

        assertThrows(
                BusinessException.class,
                () -> evaluationService.saveDraft(
                        INTERVIEW_ID,
                        validDraftRequest()
                )
        );

        verify(evaluationRepository, never()).save(any());
    }

    // ------------------------------------------------------------
    // SUBMIT TESTS
    // ------------------------------------------------------------

    @Test
    void submit_shouldSubmitEvaluationSuccessfully() {

        mockSave();
        mockNoExistingEvaluation();

        InterviewEvaluationDTO result =
                evaluationService.submit(
                        INTERVIEW_ID,
                        validSubmitRequest()
                );

        assertNotNull(result);

        assertEquals("SUBMITTED", result.status());
        assertEquals("HIRE", result.recommendation());

        assertNotNull(result.submittedAt());

        assertEquals(6, result.criteriaScores().size());

        verify(evaluationRepository).save(any(InterviewEvaluation.class));

        verify(notificationService).evaluationSubmitted(interview);
    }

    @Test
    void submit_shouldUpdateExistingDraftAndSubmitIt() {

        InterviewEvaluation existing = new InterviewEvaluation();

        existing.setId(2L);
        existing.setCompanyId(COMPANY_ID);
        existing.setInterviewId(INTERVIEW_ID);
        existing.setCandidateId(100L);
        existing.setEvaluatorId(EVALUATOR_ID);
        existing.setStatus("DRAFT");

        mockSave();

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdAndEvaluatorId(
                        COMPANY_ID,
                        INTERVIEW_ID,
                        EVALUATOR_ID
                ))
                .thenReturn(Optional.of(existing));

        InterviewEvaluationDTO result =
                evaluationService.submit(
                        INTERVIEW_ID,
                        validSubmitRequest()
                );

        assertEquals("SUBMITTED", result.status());
        assertNotNull(result.submittedAt());

        verify(evaluationRepository).save(existing);
        verify(notificationService).evaluationSubmitted(interview);
    }

    @Test
    void submit_shouldRejectMissingCriteriaScore() {

        Map<String, Integer> scores = validTechnicalCriteria();

        scores.remove("technicalAssessment");

        InterviewEvaluationRequestDTO invalidRequest =
                new InterviewEvaluationRequestDTO(
                        scores,
                        null,
                        null,
                        null,
                        null,
                        null,
                        "Good technical knowledge",
                        null,
                        null,
                        "HIRE"
                );

        assertThrows(
                BusinessException.class,
                () -> evaluationService.submit(
                        INTERVIEW_ID,
                        invalidRequest
                )
        );

        verify(evaluationRepository, never()).save(any());

        verify(notificationService, never())
                .evaluationSubmitted(any(Interview.class));
    }

    @Test
    void submit_shouldRejectMissingRecommendation() {

        InterviewEvaluationRequestDTO invalidRequest =
                new InterviewEvaluationRequestDTO(
                        validTechnicalCriteria(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        "Good technical knowledge",
                        null,
                        null,
                        null
                );

        assertThrows(
                BusinessException.class,
                () -> evaluationService.submit(
                        INTERVIEW_ID,
                        invalidRequest
                )
        );

        verify(evaluationRepository, never()).save(any());
    }

    @Test
    void submit_shouldRejectMissingStrengths() {

        InterviewEvaluationRequestDTO invalidRequest =
                new InterviewEvaluationRequestDTO(
                        validTechnicalCriteria(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        "Needs improvement",
                        null,
                        "HIRE"
                );

        assertThrows(
                BusinessException.class,
                () -> evaluationService.submit(
                        INTERVIEW_ID,
                        invalidRequest
                )
        );

        verify(evaluationRepository, never()).save(any());
    }

    @Test
    void submit_shouldRejectInterviewThatIsNotCompleted() {

        interview.setStatus("Scheduled");

        assertThrows(
                BusinessException.class,
                () -> evaluationService.submit(
                        INTERVIEW_ID,
                        validSubmitRequest()
                )
        );

        verify(evaluationRepository, never()).save(any());

        verify(notificationService, never())
                .evaluationSubmitted(any(Interview.class));
    }

    @Test
    void submit_shouldRejectCancelledInterview() {

        interview.setStatus("Cancelled");

        assertThrows(
                BusinessException.class,
                () -> evaluationService.submit(
                        INTERVIEW_ID,
                        validSubmitRequest()
                )
        );

        verify(evaluationRepository, never()).save(any());
    }

    @Test
    void submit_shouldRejectAlreadySubmittedEvaluation() {

        InterviewEvaluation existing = submittedEvaluation("HIRE");

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdAndEvaluatorId(
                        COMPANY_ID,
                        INTERVIEW_ID,
                        EVALUATOR_ID
                ))
                .thenReturn(Optional.of(existing));

        assertThrows(
                BusinessException.class,
                () -> evaluationService.submit(
                        INTERVIEW_ID,
                        validSubmitRequest()
                )
        );

        verify(evaluationRepository, never()).save(any());

        verify(notificationService, never())
                .evaluationSubmitted(any(Interview.class));
    }

    // ------------------------------------------------------------
    // PASSING SUBMITTED EVALUATION TESTS
    // ------------------------------------------------------------

    @Test
    void hasPassingSubmittedEvaluation_shouldReturnTrueForHire() {

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                        COMPANY_ID,
                        INTERVIEW_ID
                ))
                .thenReturn(List.of(submittedEvaluation("HIRE")));

        assertTrue(
                evaluationService.hasPassingSubmittedEvaluation(
                        INTERVIEW_ID
                )
        );
    }

    @Test
    void hasPassingSubmittedEvaluation_shouldReturnTrueForStrongHire() {

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                        COMPANY_ID,
                        INTERVIEW_ID
                ))
                .thenReturn(List.of(submittedEvaluation("STRONG_HIRE")));

        assertTrue(
                evaluationService.hasPassingSubmittedEvaluation(
                        INTERVIEW_ID
                )
        );
    }

    @Test
    void hasPassingSubmittedEvaluation_shouldReturnFalseForNoHire() {

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                        COMPANY_ID,
                        INTERVIEW_ID
                ))
                .thenReturn(List.of(submittedEvaluation("NO_HIRE")));

        assertFalse(
                evaluationService.hasPassingSubmittedEvaluation(
                        INTERVIEW_ID
                )
        );
    }

    @Test
    void hasPassingSubmittedEvaluation_shouldReturnFalseForHold() {

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                        COMPANY_ID,
                        INTERVIEW_ID
                ))
                .thenReturn(List.of(submittedEvaluation("HOLD")));

        assertFalse(
                evaluationService.hasPassingSubmittedEvaluation(
                        INTERVIEW_ID
                )
        );
    }

    @Test
    void hasPassingSubmittedEvaluation_shouldReturnFalseForDraftEvaluation() {

        InterviewEvaluation draft = submittedEvaluation("HIRE");

        draft.setStatus("DRAFT");

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                        COMPANY_ID,
                        INTERVIEW_ID
                ))
                .thenReturn(List.of(draft));

        assertFalse(
                evaluationService.hasPassingSubmittedEvaluation(
                        INTERVIEW_ID
                )
        );
    }

    @Test
    void hasPassingSubmittedEvaluation_shouldReturnFalseWithoutSubmittedAt() {

        InterviewEvaluation evaluation = submittedEvaluation("HIRE");

        evaluation.setSubmittedAt(null);

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                        COMPANY_ID,
                        INTERVIEW_ID
                ))
                .thenReturn(List.of(evaluation));

        assertFalse(
                evaluationService.hasPassingSubmittedEvaluation(
                        INTERVIEW_ID
                )
        );
    }

    @Test
    void hasPassingSubmittedEvaluation_shouldReturnFalseWhenInterviewIsNotCompleted() {

        interview.setStatus("Scheduled");

        assertFalse(
                evaluationService.hasPassingSubmittedEvaluation(
                        INTERVIEW_ID
                )
        );

        verify(evaluationRepository, never())
                .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                        COMPANY_ID,
                        INTERVIEW_ID
                );
    }

    // ------------------------------------------------------------
    // ACCESS AND PERMISSION TESTS
    // ------------------------------------------------------------

    @Test
    void saveDraft_shouldRejectUnassignedEvaluator() {

        when(permissionService.isAssignedToInterview(INTERVIEW_ID))
                .thenReturn(false);

        assertThrows(
                AccessDeniedException.class,
                () -> evaluationService.saveDraft(
                        INTERVIEW_ID,
                        validDraftRequest()
                )
        );

        verify(evaluationRepository, never()).save(any());
    }

    @Test
    void saveDraft_shouldAllowFullAccessWithoutInterviewerAssignment() {

        when(permissionService.isFullAccess()).thenReturn(true);

        mockSave();
        mockNoExistingEvaluation();

        InterviewEvaluationDTO result =
                evaluationService.saveDraft(
                        INTERVIEW_ID,
                        validDraftRequest()
                );

        assertNotNull(result);

        verify(evaluationRepository).save(any(InterviewEvaluation.class));
    }

    @Test
    void saveDraft_shouldRejectMissingCurrentUser() {

        when(permissionService.currentUserId()).thenReturn(null);

        assertThrows(
                AccessDeniedException.class,
                () -> evaluationService.saveDraft(
                        INTERVIEW_ID,
                        validDraftRequest()
                )
        );

        verify(evaluationRepository, never()).save(any());
    }

    @Test
    void saveDraft_shouldRequireInterviewEvaluationPermission() {

        doThrow(new AccessDeniedException("Permission denied"))
                .when(permissionService)
                .require("INTERVIEW_EVALUATE");

        assertThrows(
                AccessDeniedException.class,
                () -> evaluationService.saveDraft(
                        INTERVIEW_ID,
                        validDraftRequest()
                )
        );

        verify(evaluationRepository, never()).save(any());
    }

    // ------------------------------------------------------------
    // INTERVIEW NOT FOUND TESTS
    // ------------------------------------------------------------

    @Test
    void saveDraft_shouldThrowExceptionWhenInterviewDoesNotExist() {

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID,
                COMPANY_ID
        ))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> evaluationService.saveDraft(
                        INTERVIEW_ID,
                        validDraftRequest()
                )
        );

        verify(evaluationRepository, never()).save(any());
    }

    @Test
    void hasPassingSubmittedEvaluation_shouldThrowWhenInterviewDoesNotExist() {

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID,
                COMPANY_ID
        ))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> evaluationService.hasPassingSubmittedEvaluation(
                        INTERVIEW_ID
                )
        );

        verify(evaluationRepository, never())
                .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                        any(),
                        any()
                );
    }

    // ------------------------------------------------------------
    // GET MY EVALUATION TESTS
    // ------------------------------------------------------------

    @Test
    void getMyEvaluation_shouldReturnCurrentEvaluatorsEvaluation() {

        InterviewEvaluation existing = submittedEvaluation("HIRE");

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdAndEvaluatorId(
                        COMPANY_ID,
                        INTERVIEW_ID,
                        EVALUATOR_ID
                ))
                .thenReturn(Optional.of(existing));

        InterviewEvaluationDTO result =
                evaluationService.getMyEvaluation(INTERVIEW_ID);

        assertNotNull(result);

        assertEquals(INTERVIEW_ID, result.interviewId());
        assertEquals(EVALUATOR_ID, result.evaluatorId());
        assertEquals("SUBMITTED", result.status());
        assertEquals("HIRE", result.recommendation());
    }

    @Test
    void getMyEvaluation_shouldThrowWhenEvaluationDoesNotExist() {

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdAndEvaluatorId(
                        COMPANY_ID,
                        INTERVIEW_ID,
                        EVALUATOR_ID
                ))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> evaluationService.getMyEvaluation(INTERVIEW_ID)
        );
    }

    // ------------------------------------------------------------
    // LIST MY EVALUATIONS TESTS
    // ------------------------------------------------------------

    @Test
    void listMine_shouldReturnAllEvaluationsWhenStatusIsNull() {

        InterviewEvaluation evaluation = submittedEvaluation("HIRE");

        when(evaluationRepository
                .findByCompanyIdAndEvaluatorIdOrderByUpdatedAtDesc(
                        COMPANY_ID,
                        EVALUATOR_ID
                ))
                .thenReturn(List.of(evaluation));

        List<InterviewEvaluationDTO> result =
                evaluationService.listMine(null);

        assertEquals(1, result.size());
        assertEquals("SUBMITTED", result.get(0).status());
    }

    @Test
    void listMine_shouldFilterByStatus() {

        InterviewEvaluation draft = submittedEvaluation("HIRE");
        draft.setStatus("DRAFT");

        InterviewEvaluation submitted = submittedEvaluation("STRONG_HIRE");

        when(evaluationRepository
                .findByCompanyIdAndEvaluatorIdOrderByUpdatedAtDesc(
                        COMPANY_ID,
                        EVALUATOR_ID
                ))
                .thenReturn(List.of(draft, submitted));

        List<InterviewEvaluationDTO> result =
                evaluationService.listMine("DRAFT");

        assertEquals(1, result.size());
        assertEquals("DRAFT", result.get(0).status());
    }

    @Test
    void listMine_shouldRejectInvalidStatus() {

        assertThrows(
                BusinessException.class,
                () -> evaluationService.listMine("APPROVED")
        );

        verify(evaluationRepository, never())
                .findByCompanyIdAndEvaluatorIdOrderByUpdatedAtDesc(
                        any(),
                        any()
                );
    }

    // ------------------------------------------------------------
    // LIST EVALUATIONS FOR INTERVIEW TESTS
    // ------------------------------------------------------------

    @Test
    void listForInterview_shouldAllowSchedulingPermission() {

        when(permissionService.hasAny(
                "INTERVIEW_SCHEDULE",
                "INTERVIEW_DECIDE"
        )).thenReturn(true);

        InterviewEvaluation evaluation = submittedEvaluation("HIRE");

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                        COMPANY_ID,
                        INTERVIEW_ID
                ))
                .thenReturn(List.of(evaluation));

        List<InterviewEvaluationDTO> result =
                evaluationService.listForInterview(INTERVIEW_ID);

        assertEquals(1, result.size());

        verify(permissionService, never())
                .require("INTERVIEW_EVALUATE");
    }

    @Test
    void listForInterview_shouldAllowAssignedEvaluator() {

        when(permissionService.hasAny(
                "INTERVIEW_SCHEDULE",
                "INTERVIEW_DECIDE"
        )).thenReturn(false);

        InterviewEvaluation evaluation = submittedEvaluation("HIRE");

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                        COMPANY_ID,
                        INTERVIEW_ID
                ))
                .thenReturn(List.of(evaluation));

        List<InterviewEvaluationDTO> result =
                evaluationService.listForInterview(INTERVIEW_ID);

        assertEquals(1, result.size());

        verify(permissionService).require("INTERVIEW_EVALUATE");
    }

    @Test
    void listForInterview_shouldRejectUnassignedEvaluator() {

        when(permissionService.hasAny(
                "INTERVIEW_SCHEDULE",
                "INTERVIEW_DECIDE"
        )).thenReturn(false);

        when(permissionService.isAssignedToInterview(INTERVIEW_ID))
                .thenReturn(false);

        assertThrows(
                AccessDeniedException.class,
                () -> evaluationService.listForInterview(INTERVIEW_ID)
        );

        verify(evaluationRepository, never())
                .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                        any(),
                        any()
                );
    }

    @Test
    void listForInterview_shouldAllowNonEvaluatorRecruitmentPermission() {

        when(permissionService.hasAny(
                "INTERVIEW_SCHEDULE",
                "INTERVIEW_DECIDE"
        )).thenReturn(false);

        when(permissionService.currentPermissions())
                .thenReturn(Set.of("APPLICATION_SHORTLIST"));

        when(evaluationRepository.findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                COMPANY_ID,
                INTERVIEW_ID
        )).thenReturn(List.of());

        List<InterviewEvaluationDTO> result =
                evaluationService.listForInterview(INTERVIEW_ID);

        assertTrue(result.isEmpty());

        verify(evaluationRepository)
                .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                        COMPANY_ID,
                        INTERVIEW_ID
                );
    }
}
