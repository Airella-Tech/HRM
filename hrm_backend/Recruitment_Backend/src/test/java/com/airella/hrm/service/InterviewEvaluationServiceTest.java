
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
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
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
        interview.setInterviewRound("Technical");
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
                        INTERVIEW_ID, COMPANY_ID))
                .thenReturn(Optional.of(interview));
    }

    private InterviewEvaluationRequestDTO validRequest() {
        return new InterviewEvaluationRequestDTO(
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

    private InterviewEvaluation submittedEvaluation(String recommendation) {
        InterviewEvaluation evaluation = new InterviewEvaluation();

        evaluation.setId(1L);
        evaluation.setCompanyId(COMPANY_ID);
        evaluation.setInterviewId(INTERVIEW_ID);
        evaluation.setCandidateId(100L);
        evaluation.setEvaluatorId(EVALUATOR_ID);
        evaluation.setTechnicalKnowledge(5);
        evaluation.setProblemSolving(4);
        evaluation.setCommunication(5);
        evaluation.setRoleSpecificSkills(4);
        evaluation.setProfessionalism(5);
        evaluation.setStrengths("Good technical knowledge");
        evaluation.setRecommendation(recommendation);
        evaluation.setStatus("SUBMITTED");
        evaluation.setSubmittedAt(java.time.LocalDateTime.now());

        return evaluation;
    }

    private void mockSave() {
        when(evaluationRepository.save(any(InterviewEvaluation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void saveDraft_shouldSaveEvaluationSuccessfully() {
        mockSave();

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdAndEvaluatorId(
                        COMPANY_ID, INTERVIEW_ID, EVALUATOR_ID))
                .thenReturn(Optional.empty());

        InterviewEvaluationDTO result =
                evaluationService.saveDraft(INTERVIEW_ID, validRequest());

        assertNotNull(result);
        assertEquals(INTERVIEW_ID, result.interviewId());
        assertEquals("DRAFT", result.status());
        assertEquals("HIRE", result.recommendation());
        assertEquals("Sanduni Sewwandi", result.candidateName());

        verify(evaluationRepository).save(any(InterviewEvaluation.class));
    }

    @Test
    void saveDraft_shouldUpdateExistingDraft() {
        InterviewEvaluation existing = new InterviewEvaluation();
        existing.setId(2L);
        existing.setCompanyId(COMPANY_ID);
        existing.setInterviewId(INTERVIEW_ID);
        existing.setEvaluatorId(EVALUATOR_ID);
        existing.setStatus("DRAFT");

        mockSave();

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdAndEvaluatorId(
                        COMPANY_ID, INTERVIEW_ID, EVALUATOR_ID))
                .thenReturn(Optional.of(existing));

        InterviewEvaluationDTO result =
                evaluationService.saveDraft(INTERVIEW_ID, validRequest());

        assertNotNull(result);
        assertEquals("DRAFT", result.status());
        assertEquals("HIRE", result.recommendation());

        verify(evaluationRepository).save(existing);
    }

    @Test
    void submit_shouldSubmitEvaluationSuccessfully() {
        mockSave();

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdAndEvaluatorId(
                        COMPANY_ID, INTERVIEW_ID, EVALUATOR_ID))
                .thenReturn(Optional.empty());

        InterviewEvaluationDTO result =
                evaluationService.submit(INTERVIEW_ID, validRequest());

        assertNotNull(result);
        assertEquals("SUBMITTED", result.status());
        assertEquals("HIRE", result.recommendation());
        assertNotNull(result.submittedAt());

        verify(evaluationRepository).save(any(InterviewEvaluation.class));
    }

    @Test
    void submit_shouldRejectMissingRequiredFields() {
        InterviewEvaluationRequestDTO invalidRequest =
                new InterviewEvaluationRequestDTO(
                        5, 4, null, 4, 5,
                        null, null, null, null
                );

        assertThrows(
                BusinessException.class,
                () -> evaluationService.submit(INTERVIEW_ID, invalidRequest)
        );

        verify(evaluationRepository, never()).save(any());
    }

    @Test
    void saveDraft_shouldRejectInvalidScore() {
        InterviewEvaluationRequestDTO invalidRequest =
                new InterviewEvaluationRequestDTO(
                        6, 4, 5, 4, 5,
                        "Good knowledge", null, null, "HIRE"
                );

        assertThrows(
                BusinessException.class,
                () -> evaluationService.saveDraft(INTERVIEW_ID, invalidRequest)
        );

        verify(evaluationRepository, never()).save(any());
    }

    @Test
    void submit_shouldRejectInterviewThatIsNotCompleted() {
        interview.setStatus("Scheduled");

        assertThrows(
                BusinessException.class,
                () -> evaluationService.submit(INTERVIEW_ID, validRequest())
        );

        verify(evaluationRepository, never()).save(any());
    }

    @Test
    void saveDraft_shouldRejectCancelledInterview() {
        interview.setStatus("Cancelled");

        assertThrows(
                BusinessException.class,
                () -> evaluationService.saveDraft(INTERVIEW_ID, validRequest())
        );

        verify(evaluationRepository, never()).save(any());
    }

    @Test
    void saveDraft_shouldRejectUnassignedEvaluator() {
        when(permissionService.isAssignedToInterview(INTERVIEW_ID))
                .thenReturn(false);

        assertThrows(
                AccessDeniedException.class,
                () -> evaluationService.saveDraft(INTERVIEW_ID, validRequest())
        );

        verify(evaluationRepository, never()).save(any());
    }

    @Test
    void saveDraft_shouldRejectAlreadySubmittedEvaluation() {
        InterviewEvaluation existing = submittedEvaluation("HIRE");

        when(evaluationRepository
                .findByCompanyIdAndInterviewIdAndEvaluatorId(
                        COMPANY_ID, INTERVIEW_ID, EVALUATOR_ID))
                .thenReturn(Optional.of(existing));

        assertThrows(
                BusinessException.class,
                () -> evaluationService.saveDraft(INTERVIEW_ID, validRequest())
        );

        verify(evaluationRepository, never()).save(any());
    }

    @Test
    void hasPassingSubmittedEvaluation_shouldReturnTrueForHireRecommendation() {
        when(evaluationRepository
                .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                        COMPANY_ID, INTERVIEW_ID))
                .thenReturn(List.of(submittedEvaluation("HIRE")));

        assertTrue(
                evaluationService.hasPassingSubmittedEvaluation(INTERVIEW_ID)
        );
    }

    @Test
    void hasPassingSubmittedEvaluation_shouldReturnFalseForNoHireRecommendation() {
        when(evaluationRepository
                .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                        COMPANY_ID, INTERVIEW_ID))
                .thenReturn(List.of(submittedEvaluation("NO_HIRE")));

        assertFalse(
                evaluationService.hasPassingSubmittedEvaluation(INTERVIEW_ID)
        );
    }

    @Test
    void hasPassingSubmittedEvaluation_shouldReturnFalseWhenInterviewIsNotCompleted() {
        interview.setStatus("Scheduled");

        assertFalse(
                evaluationService.hasPassingSubmittedEvaluation(INTERVIEW_ID)
        );

        verify(evaluationRepository, never())
                .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                        COMPANY_ID, INTERVIEW_ID);
    }

    @Test
    void saveDraft_shouldThrowExceptionWhenInterviewDoesNotExist() {
        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> evaluationService.saveDraft(INTERVIEW_ID, validRequest())
        );

        verify(evaluationRepository, never()).save(any());
    }
}
