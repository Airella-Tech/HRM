
package com.airella.hrm.service;

import com.airella.hrm.dto.InterviewDTO;
import com.airella.hrm.dto.InterviewRequestDTO;
import com.airella.hrm.dto.UserSummaryDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.Interview;
import com.airella.hrm.model.InterviewEvaluatorAssignment;
import com.airella.hrm.model.InterviewRoundDecision;
import com.airella.hrm.repository.InterviewEvaluatorAssignmentRepository;
import com.airella.hrm.repository.InterviewRepository;
import com.airella.hrm.repository.InterviewRoundDecisionRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InterviewServiceTest {

    private static final Long COMPANY_ID = 1L;
    private static final String COMPANY_REF = "COMPANY_001";
    private static final Long USER_ID = 100L;
    private static final Long INTERVIEW_ID = 10L;

    @Mock
    private InterviewRepository interviewRepository;

    @Mock
    private InterviewEvaluatorAssignmentRepository assignmentRepository;

    @Mock
    private InterviewRoundDecisionRepository decisionRepository;

    @Mock
    private EmployeeDirectory employeeDirectory;

    @Mock
    private AuthService authService;

    @Mock
    private PermissionService permissionService;

    @Mock
    private AuditService auditService;

    @Mock
    private InterviewEmailService interviewEmailService;

    @Mock
    private InterviewEvaluationService interviewEvaluationService;

    @Mock
    private RecruitmentNotificationService notificationService;

    @InjectMocks
    private InterviewService interviewService;

    private InterviewRequestDTO validRequest;

    @BeforeEach
    void setUp() {

        validRequest = createRequest(
                10L,
                "Test Candidate",
                "candidate@example.com",
                20L,
                "Software Engineer",
                "Technical Interview",
                LocalDate.now().plusDays(2),
                LocalTime.of(10, 0),
                60,
                "Interviewer One",
                "Online",
                "https://meet.example.com/test",
                null,
                "Interview notes",
                null
        );

        lenient().when(authService.getCurrentCompanyId())
                .thenReturn(COMPANY_ID);

        lenient().when(authService.getCurrentCompanyRef())
                .thenReturn(COMPANY_REF);

        lenient().when(permissionService.currentUserId())
                .thenReturn(USER_ID);

        lenient().when(assignmentRepository.findByCompanyIdAndInterviewId(
                anyLong(),
                anyLong()
        )).thenReturn(List.of());

        lenient().when(employeeDirectory.findByCompanyRef(anyString()))
                .thenReturn(List.of());

        lenient().when(interviewRepository.save(any(Interview.class)))
                .thenAnswer(invocation -> {
                    Interview interview = invocation.getArgument(0);

                    if (interview.getId() == null) {
                        interview.setId(INTERVIEW_ID);
                    }

                    return interview;
                });

        lenient().when(interviewRepository.findByIdAndCompanyId(
                anyLong(),
                anyLong()
        )).thenAnswer(invocation -> Optional.empty());

        lenient().when(interviewRepository
                .findByCompanyIdAndApplicationIdAndVacancyIdOrderByInterviewDateAscInterviewTimeAsc(
                        anyLong(),
                        anyLong(),
                        anyLong()
                )).thenReturn(List.of());

        lenient().when(interviewRepository
                .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                        anyLong()
                )).thenReturn(List.of());

        lenient().when(assignmentRepository.findByCompanyIdAndEmployeeId(
                anyLong(),
                anyLong()
        )).thenReturn(List.of());
    }

    // ------------------------------------------------------------
    // CREATE INTERVIEW
    // ------------------------------------------------------------

    @Test
    void createShouldCreateInterviewSuccessfully() {

        when(assignmentRepository.findByCompanyIdAndInterviewId(
                COMPANY_ID,
                INTERVIEW_ID
        )).thenReturn(List.of());

        InterviewDTO result = interviewService.create(validRequest);

        assertNotNull(result);
        assertEquals("Test Candidate", result.candidateName());
        assertEquals("candidate@example.com", result.candidateEmail());
        assertEquals("Technical Interview", result.interviewRound());
        assertEquals("Scheduled", result.status());

        verify(interviewRepository, atLeastOnce())
                .save(any(Interview.class));

        verify(notificationService)
                .interviewScheduled(any(Interview.class));

        verify(interviewEmailService)
                .sendInvitation(any(Interview.class), eq(false));
    }

    @Test
    void createShouldRejectNullRequest() {

        assertThrows(
                BusinessException.class,
                () -> interviewService.create(null)
        );

        verify(interviewRepository, never())
                .save(any(Interview.class));
    }

    @Test
    void createShouldRejectMissingCandidateName() {

        InterviewRequestDTO request = createRequest(
                10L, " ", "candidate@example.com", 20L,
                "Software Engineer", "Technical Interview",
                LocalDate.now().plusDays(2), LocalTime.of(10, 0),
                60, null, "Online", null, null, null, null
        );

        assertThrows(
                BusinessException.class,
                () -> interviewService.create(request)
        );
    }

    @Test
    void createShouldRejectMissingCandidateEmail() {

        InterviewRequestDTO request = createRequest(
                10L, "Test Candidate", " ", 20L,
                "Software Engineer", "Technical Interview",
                LocalDate.now().plusDays(2), LocalTime.of(10, 0),
                60, null, "Online", null, null, null, null
        );

        assertThrows(
                BusinessException.class,
                () -> interviewService.create(request)
        );
    }

    @Test
    void createShouldRejectInvalidEmail() {

        InterviewRequestDTO request = createRequest(
                10L, "Test Candidate", "invalid-email", 20L,
                "Software Engineer", "Technical Interview",
                LocalDate.now().plusDays(2), LocalTime.of(10, 0),
                60, null, "Online", null, null, null, null
        );

        assertThrows(
                BusinessException.class,
                () -> interviewService.create(request)
        );
    }

    @Test
    void createShouldRejectInvalidDuration() {

        InterviewRequestDTO request = createRequest(
                10L, "Test Candidate", "candidate@example.com", 20L,
                "Software Engineer", "Technical Interview",
                LocalDate.now().plusDays(2), LocalTime.of(10, 0),
                0, null, "Online", null, null, null, null
        );

        assertThrows(
                BusinessException.class,
                () -> interviewService.create(request)
        );
    }

    @Test
    void createShouldRejectDurationGreaterThan480Minutes() {

        InterviewRequestDTO request = createRequest(
                10L, "Test Candidate", "candidate@example.com", 20L,
                "Software Engineer", "Technical Interview",
                LocalDate.now().plusDays(2), LocalTime.of(10, 0),
                481, null, "Online", null, null, null, null
        );

        assertThrows(
                BusinessException.class,
                () -> interviewService.create(request)
        );
    }

    @Test
    void createShouldRejectInvalidInterviewType() {

        InterviewRequestDTO request = createRequest(
                10L, "Test Candidate", "candidate@example.com", 20L,
                "Software Engineer", "Technical Interview",
                LocalDate.now().plusDays(2), LocalTime.of(10, 0),
                60, null, "Telephone", null, null, null, null
        );

        assertThrows(
                BusinessException.class,
                () -> interviewService.create(request)
        );
    }

    @Test
    void createShouldRejectInvalidInterviewRound() {

        InterviewRequestDTO request = createRequest(
                10L, "Test Candidate", "candidate@example.com", 20L,
                "Software Engineer", "Manager Discussion",
                LocalDate.now().plusDays(2), LocalTime.of(10, 0),
                60, null, "Online", null, null, null, null
        );

        assertThrows(
                BusinessException.class,
                () -> interviewService.create(request)
        );
    }

    @Test
    void createShouldSetDefaultDurationWhenDurationIsNull() {

        InterviewRequestDTO request = createRequest(
                10L, "Test Candidate", "candidate@example.com", 20L,
                "Software Engineer", "Technical Interview",
                LocalDate.now().plusDays(2), LocalTime.of(10, 0),
                null, null, "Online", null, null, null, null
        );

        InterviewDTO result = interviewService.create(request);

        assertNotNull(result);
        assertEquals(60, result.durationMinutes());
    }

    @Test
    void createShouldMarkInvitationAsFailedWhenEmailSendingFails() {

        doThrow(new RuntimeException("Email service unavailable"))
                .when(interviewEmailService)
                .sendInvitation(any(Interview.class), eq(false));

        InterviewDTO result = interviewService.create(validRequest);

        assertNotNull(result);
        assertEquals("Failed", result.invitationStatus());

        verify(interviewRepository, atLeastOnce())
                .save(any(Interview.class));
    }

    // ------------------------------------------------------------
    // INTERVIEW ROUND PROGRESSION
    // ------------------------------------------------------------

    @Test
    void createShouldRejectHrRoundWhenTechnicalInterviewDoesNotExist() {

        InterviewRequestDTO request = createRequest(
                10L, "Test Candidate", "candidate@example.com", 20L,
                "Software Engineer", "HR Interview",
                LocalDate.now().plusDays(2), LocalTime.of(10, 0),
                60, null, "Online", null, null, null, null
        );

        when(interviewRepository
                .findByCompanyIdAndApplicationIdAndVacancyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID, 10L, 20L
                )).thenReturn(List.of());

        assertThrows(
                BusinessException.class,
                () -> interviewService.create(request)
        );
    }

    @Test
    void createShouldRejectNextRoundWhenPreviousRoundIsNotCompleted() {

        Interview previousInterview = createInterview(
                1L, "Technical Interview", "Scheduled"
        );

        when(interviewRepository
                .findByCompanyIdAndApplicationIdAndVacancyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID, 10L, 20L
                )).thenReturn(List.of(previousInterview));

        InterviewRequestDTO request = createRequest(
                10L, "Test Candidate", "candidate@example.com", 20L,
                "Software Engineer", "HR Interview",
                LocalDate.now().plusDays(2), LocalTime.of(10, 0),
                60, null, "Online", null, null, null, null
        );

        assertThrows(
                BusinessException.class,
                () -> interviewService.create(request)
        );

        verify(decisionRepository, never())
                .existsByCompanyIdAndInterviewIdAndDecision(
                        anyLong(), anyLong(), any()
                );
    }

    @Test
    void createShouldRejectNextRoundWhenPreviousRoundIsNotApproved() {

        Interview previousInterview = createInterview(
                1L, "Technical Interview", "Completed"
        );

        when(interviewRepository
                .findByCompanyIdAndApplicationIdAndVacancyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID, 10L, 20L
                )).thenReturn(List.of(previousInterview));

        when(decisionRepository
                .existsByCompanyIdAndInterviewIdAndDecision(
                        COMPANY_ID,
                        1L,
                        InterviewRoundDecision.Decision.APPROVED
                )).thenReturn(false);

        InterviewRequestDTO request = createRequest(
                10L, "Test Candidate", "candidate@example.com", 20L,
                "Software Engineer", "HR Interview",
                LocalDate.now().plusDays(2), LocalTime.of(10, 0),
                60, null, "Online", null, null, null, null
        );

        assertThrows(
                BusinessException.class,
                () -> interviewService.create(request)
        );
    }

    @Test
    void createShouldAllowNextRoundWhenPreviousRoundIsCompletedAndApproved() {

        Interview previousInterview = createInterview(
                1L, "Technical Interview", "Completed"
        );

        when(interviewRepository
                .findByCompanyIdAndApplicationIdAndVacancyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID, 10L, 20L
                )).thenReturn(List.of(previousInterview));

        when(decisionRepository
                .existsByCompanyIdAndInterviewIdAndDecision(
                        COMPANY_ID,
                        1L,
                        InterviewRoundDecision.Decision.APPROVED
                )).thenReturn(true);

        InterviewRequestDTO request = createRequest(
                10L, "Test Candidate", "candidate@example.com", 20L,
                "Software Engineer", "HR Interview",
                LocalDate.now().plusDays(2), LocalTime.of(10, 0),
                60, null, "Online", null, null, null, null
        );

        InterviewDTO result = interviewService.create(request);

        assertNotNull(result);
        assertEquals("HR Interview", result.interviewRound());
    }

    @Test
    void createShouldRejectNextRoundWithoutApplicationId() {

        InterviewRequestDTO request = createRequest(
                null, "Test Candidate", "candidate@example.com", 20L,
                "Software Engineer", "HR Interview",
                LocalDate.now().plusDays(2), LocalTime.of(10, 0),
                60, null, "Online", null, null, null, null
        );

        assertThrows(
                BusinessException.class,
                () -> interviewService.create(request)
        );
    }

    @Test
    void createShouldRejectNextRoundWithoutVacancyId() {

        InterviewRequestDTO request = createRequest(
                10L, "Test Candidate", "candidate@example.com", null,
                "Software Engineer", "HR Interview",
                LocalDate.now().plusDays(2), LocalTime.of(10, 0),
                60, null, "Online", null, null, null, null
        );

        assertThrows(
                BusinessException.class,
                () -> interviewService.create(request)
        );
    }

    // ------------------------------------------------------------
    // GET INTERVIEW
    // ------------------------------------------------------------

    @Test
    void getShouldReturnInterviewWhenItExists() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        InterviewDTO result = interviewService.get(INTERVIEW_ID);

        assertNotNull(result);
        assertEquals(INTERVIEW_ID, result.id());
        assertEquals("Test Candidate", result.candidateName());
    }

    @Test
    void getShouldThrowExceptionWhenInterviewDoesNotExist() {

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> interviewService.get(INTERVIEW_ID)
        );
    }

    @Test
    void getShouldNotReturnInterviewFromAnotherCompany() {

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> interviewService.get(INTERVIEW_ID)
        );

        verify(interviewRepository)
                .findByIdAndCompanyId(INTERVIEW_ID, COMPANY_ID);
    }

    // ------------------------------------------------------------
    // LIST INTERVIEWS
    // ------------------------------------------------------------

    @Test
    void listShouldReturnAllCompanyInterviews() {

        Interview first = createInterview(
                1L, "Technical Interview", "Scheduled"
        );

        Interview second = createInterview(
                2L, "HR Interview", "Completed"
        );

        when(interviewRepository
                .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID
                )).thenReturn(List.of(first, second));

        List<InterviewDTO> result = interviewService.list(null, null);

        assertEquals(2, result.size());
    }

    @Test
    void listShouldFilterByStatus() {

        Interview scheduled = createInterview(
                1L, "Technical Interview", "Scheduled"
        );

        Interview completed = createInterview(
                2L, "HR Interview", "Completed"
        );

        when(interviewRepository
                .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID
                )).thenReturn(List.of(scheduled, completed));

        List<InterviewDTO> result =
                interviewService.list("Scheduled", null);

        assertEquals(1, result.size());
        assertEquals("Scheduled", result.get(0).status());
    }

    @Test
    void listShouldFilterByDate() {

        LocalDate requestedDate = LocalDate.now().plusDays(2);

        Interview matching = createInterview(
                1L, "Technical Interview", "Scheduled"
        );

        matching.setInterviewDate(requestedDate);

        Interview notMatching = createInterview(
                2L, "HR Interview", "Scheduled"
        );

        notMatching.setInterviewDate(requestedDate.plusDays(1));

        when(interviewRepository
                .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID
                )).thenReturn(List.of(matching, notMatching));

        List<InterviewDTO> result =
                interviewService.list(null, requestedDate);

        assertEquals(1, result.size());
        assertEquals(requestedDate, result.get(0).interviewDate());
    }

    @Test
    void listShouldFilterByStatusAndDate() {

        LocalDate requestedDate = LocalDate.now().plusDays(2);

        Interview matching = createInterview(
                1L, "Technical Interview", "Scheduled"
        );

        matching.setInterviewDate(requestedDate);

        Interview wrongStatus = createInterview(
                2L, "HR Interview", "Completed"
        );

        wrongStatus.setInterviewDate(requestedDate);

        when(interviewRepository
                .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID
                )).thenReturn(List.of(matching, wrongStatus));

        List<InterviewDTO> result =
                interviewService.list("Scheduled", requestedDate);

        assertEquals(1, result.size());
        assertEquals("Scheduled", result.get(0).status());
    }

    // ------------------------------------------------------------
    // UPDATE INTERVIEW STATUS
    // ------------------------------------------------------------

    @Test
    void updateStatusShouldUpdateScheduledToPending() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        InterviewDTO result =
                interviewService.updateStatus(INTERVIEW_ID, "Pending");

        assertEquals("Pending", result.status());

        verify(interviewRepository).save(interview);

        verify(notificationService)
                .interviewStatusUpdated(interview, "Scheduled");

        verify(auditService).logAction(
                eq("INTERVIEW_STATUS_UPDATED"),
                eq("Interview"),
                eq(INTERVIEW_ID),
                contains("Scheduled"),
                eq(COMPANY_REF)
        );
    }

    @Test
    void updateStatusShouldSupportInProgressAlias() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        InterviewDTO result =
                interviewService.updateStatus(INTERVIEW_ID, "in_progress");

        assertEquals("In Progress", result.status());
    }

    @Test
    void updateStatusShouldSupportInProgressWithSpace() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        InterviewDTO result =
                interviewService.updateStatus(INTERVIEW_ID, "in progress");

        assertEquals("In Progress", result.status());
    }

    @Test
    void updateStatusShouldSupportCancelledAlias() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        InterviewDTO result =
                interviewService.updateStatus(INTERVIEW_ID, "canceled");

        assertEquals("Cancelled", result.status());
    }

    @Test
    void updateStatusShouldRejectNullStatus() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.updateStatus(INTERVIEW_ID, null)
        );
    }

    @Test
    void updateStatusShouldRejectBlankStatus() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.updateStatus(INTERVIEW_ID, " ")
        );
    }

    @Test
    void updateStatusShouldRejectInvalidStatus() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.updateStatus(INTERVIEW_ID, "Rejected")
        );
    }

    @Test
    void updateStatusShouldRejectReopeningCompletedInterview() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Completed"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.updateStatus(INTERVIEW_ID, "Scheduled")
        );
    }

    @Test
    void updateStatusShouldRejectChangingCancelledInterview() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Cancelled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.updateStatus(INTERVIEW_ID, "Pending")
        );
    }

    @Test
    void updateStatusShouldNotSaveWhenStatusDoesNotChange() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        InterviewDTO result =
                interviewService.updateStatus(INTERVIEW_ID, "Scheduled");

        assertEquals("Scheduled", result.status());

        verify(interviewRepository, never())
                .save(any(Interview.class));

        verify(notificationService, never())
                .interviewStatusUpdated(any(), anyString());
    }

    @Test
    void updateStatusShouldCompletePastInterview() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        interview.setInterviewDate(LocalDate.now().minusDays(1));
        interview.setInterviewTime(LocalTime.of(10, 0));

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        InterviewDTO result =
                interviewService.updateStatus(INTERVIEW_ID, "Completed");

        assertEquals("Completed", result.status());

        verify(interviewRepository).save(interview);
    }

    @Test
    void updateStatusShouldRejectCompletionBeforeScheduledDate() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        interview.setInterviewDate(LocalDate.now().plusDays(1));
        interview.setInterviewTime(LocalTime.of(10, 0));

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.updateStatus(
                        INTERVIEW_ID, "Completed"
                )
        );

        verify(interviewRepository, never())
                .save(any(Interview.class));
    }

    @Test
    void updateStatusShouldRejectCompletionWithoutInterviewDate() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        interview.setInterviewDate(null);

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.updateStatus(
                        INTERVIEW_ID, "Completed"
                )
        );
    }

    @Test
    void updateStatusShouldRejectCompletionWithoutInterviewTime() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        interview.setInterviewTime(null);

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.updateStatus(
                        INTERVIEW_ID, "Completed"
                )
        );
    }

    // ------------------------------------------------------------
    // UPDATE / RESCHEDULE INTERVIEW
    // ------------------------------------------------------------

    @Test
    void updateShouldRescheduleInterviewSuccessfully() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        InterviewRequestDTO request = createRequest(
                10L, "Test Candidate", "candidate@example.com", 20L,
                "Software Engineer", "Technical Interview",
                LocalDate.now().plusDays(5), LocalTime.of(14, 0),
                90, "Interviewer One", "Online",
                "https://meet.example.com/updated", null,
                "Updated notes", null
        );

        InterviewDTO result = interviewService.update(
                INTERVIEW_ID, request
        );

        assertNotNull(result);
        assertEquals(LocalDate.now().plusDays(5), result.interviewDate());
        assertEquals(LocalTime.of(14, 0), result.interviewTime());
        assertEquals(90, result.durationMinutes());

        verify(notificationService)
                .interviewRescheduled(interview);

        verify(interviewEmailService)
                .sendInvitation(interview, true);
    }

    @Test
    void updateShouldRejectReschedulingCompletedInterview() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Completed"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.update(INTERVIEW_ID, validRequest)
        );
    }

    @Test
    void updateShouldRejectReschedulingCancelledInterview() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Cancelled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.update(INTERVIEW_ID, validRequest)
        );
    }

    @Test
    void updateShouldRejectChangingInterviewRound() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        InterviewRequestDTO request = createRequest(
                10L, "Test Candidate", "candidate@example.com", 20L,
                "Software Engineer", "HR Interview",
                LocalDate.now().plusDays(5), LocalTime.of(14, 0),
                60, null, "Online", null, null, null, null
        );

        assertThrows(
                BusinessException.class,
                () -> interviewService.update(INTERVIEW_ID, request)
        );
    }

    @Test
    void updateShouldMarkInvitationFailedWhenUpdatedEmailFails() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        doThrow(new RuntimeException("Email service unavailable"))
                .when(interviewEmailService)
                .sendInvitation(any(Interview.class), eq(true));

        InterviewRequestDTO request = createRequest(
                10L, "Updated Candidate", "updated@example.com", 20L,
                "Software Engineer", "Technical Interview",
                LocalDate.now().plusDays(5), LocalTime.of(14, 0),
                60, null, "Online", null, null, null, null
        );

        InterviewDTO result = interviewService.update(
                INTERVIEW_ID, request
        );

        assertEquals("Failed", result.invitationStatus());
    }

    // ------------------------------------------------------------
    // ASSIGN / REPLACE INTERVIEWERS
    // ------------------------------------------------------------

    @Test
    void assignInterviewersShouldAssignEmployeesSuccessfully() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        UserSummaryDTO firstUser = createUser(101L, "Interviewer One");
        UserSummaryDTO secondUser = createUser(102L, "Interviewer Two");

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        when(employeeDirectory.findByCompanyRef(COMPANY_REF))
                .thenReturn(List.of(firstUser, secondUser));

        when(assignmentRepository.findByCompanyIdAndInterviewId(
                COMPANY_ID, INTERVIEW_ID
        )).thenReturn(List.of());

        InterviewDTO result = interviewService.assignInterviewers(
                INTERVIEW_ID, List.of(101L, 102L)
        );

        assertNotNull(result);

        verify(assignmentRepository, times(2))
                .save(any(InterviewEvaluatorAssignment.class));

        verify(notificationService)
                .interviewerAssigned(
                        any(Interview.class),
                        eq(Set.of(101L, 102L))
                );
    }

    @Test
    void assignInterviewersShouldRejectNullEmployeeIds() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.assignInterviewers(
                        INTERVIEW_ID, null
                )
        );

        verify(employeeDirectory, never())
                .findByCompanyRef(anyString());
    }

    @Test
    void assignInterviewersShouldRejectDuplicateEmployeeIds() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        // Duplicate IDs are rejected before employee lookup.
        // Therefore, do not add an employeeDirectory stub here.

        assertThrows(
                BusinessException.class,
                () -> interviewService.assignInterviewers(
                        INTERVIEW_ID,
                        List.of(101L, 101L)
                )
        );

        verify(employeeDirectory, never())
                .findByCompanyRef(anyString());

        verify(assignmentRepository, never())
                .save(any(InterviewEvaluatorAssignment.class));

        verify(notificationService, never())
                .interviewerAssigned(any(Interview.class), anySet());
    }

    @Test
    void assignInterviewersShouldRejectEmployeeFromAnotherCompany() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        when(employeeDirectory.findByCompanyRef(COMPANY_REF))
                .thenReturn(List.of());

        assertThrows(
                BusinessException.class,
                () -> interviewService.assignInterviewers(
                        INTERVIEW_ID, List.of(999L)
                )
        );
    }

    @Test
    void assignInterviewersShouldRejectCompletedInterview() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Completed"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.assignInterviewers(
                        INTERVIEW_ID, List.of(101L)
                )
        );
    }

    @Test
    void assignInterviewersShouldRejectCancelledInterview() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Cancelled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.assignInterviewers(
                        INTERVIEW_ID, List.of(101L)
                )
        );
    }

    @Test
    void assignInterviewersShouldReplaceExistingAssignments() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        InterviewEvaluatorAssignment oldAssignment =
                new InterviewEvaluatorAssignment(
                        COMPANY_ID, INTERVIEW_ID, 101L, USER_ID
                );

        UserSummaryDTO newUser = createUser(102L, "Interviewer Two");

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        when(employeeDirectory.findByCompanyRef(COMPANY_REF))
                .thenReturn(List.of(newUser));

        when(assignmentRepository.findByCompanyIdAndInterviewId(
                COMPANY_ID, INTERVIEW_ID
        )).thenReturn(List.of(oldAssignment));

        interviewService.assignInterviewers(
                INTERVIEW_ID, List.of(102L)
        );

        verify(assignmentRepository)
                .deleteAll(List.of(oldAssignment));

        verify(assignmentRepository).flush();

        verify(assignmentRepository)
                .save(any(InterviewEvaluatorAssignment.class));
    }

    @Test
    void assignInterviewersShouldNotNotifyAlreadyAssignedEmployees() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        InterviewEvaluatorAssignment existingAssignment =
                new InterviewEvaluatorAssignment(
                        COMPANY_ID, INTERVIEW_ID, 101L, USER_ID
                );

        UserSummaryDTO existingUser =
                createUser(101L, "Interviewer One");

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        when(employeeDirectory.findByCompanyRef(COMPANY_REF))
                .thenReturn(List.of(existingUser));

        when(assignmentRepository.findByCompanyIdAndInterviewId(
                COMPANY_ID, INTERVIEW_ID
        )).thenReturn(List.of(existingAssignment));

        interviewService.assignInterviewers(
                INTERVIEW_ID, List.of(101L)
        );

        verify(notificationService, never())
                .interviewerAssigned(any(), anySet());
    }

    // ------------------------------------------------------------
    // GET ASSIGNED INTERVIEWS
    // ------------------------------------------------------------

    @Test
    void getMyAssignedInterviewsShouldReturnAssignedInterviews() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        InterviewEvaluatorAssignment assignment =
                new InterviewEvaluatorAssignment(
                        COMPANY_ID, INTERVIEW_ID, USER_ID, USER_ID
                );

        when(assignmentRepository.findByCompanyIdAndEmployeeId(
                COMPANY_ID, USER_ID
        )).thenReturn(List.of(assignment));

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        List<InterviewDTO> result =
                interviewService.getMyAssignedInterviews();

        assertEquals(1, result.size());
        assertEquals(INTERVIEW_ID, result.get(0).id());
    }

    @Test
    void getMyAssignedInterviewsShouldReturnEmptyListWhenNoAssignmentsExist() {

        when(assignmentRepository.findByCompanyIdAndEmployeeId(
                COMPANY_ID, USER_ID
        )).thenReturn(List.of());

        List<InterviewDTO> result =
                interviewService.getMyAssignedInterviews();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void getMyAssignedInterviewsShouldRejectMissingCurrentUser() {

        when(permissionService.currentUserId()).thenReturn(null);

        assertThrows(
                BusinessException.class,
                () -> interviewService.getMyAssignedInterviews()
        );
    }

    @Test
    void getMyAssignedInterviewsShouldIgnoreInterviewsFromAnotherCompany() {

        InterviewEvaluatorAssignment assignment =
                new InterviewEvaluatorAssignment(
                        COMPANY_ID, INTERVIEW_ID, USER_ID, USER_ID
                );

        when(assignmentRepository.findByCompanyIdAndEmployeeId(
                COMPANY_ID, USER_ID
        )).thenReturn(List.of(assignment));

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.empty());

        List<InterviewDTO> result =
                interviewService.getMyAssignedInterviews();

        assertTrue(result.isEmpty());
    }

    // ------------------------------------------------------------
    // DELETE INTERVIEW
    // ------------------------------------------------------------

    @Test
    void deleteShouldDeleteScheduledInterviewAndAssignments() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Scheduled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        interviewService.delete(INTERVIEW_ID);

        verify(assignmentRepository)
                .deleteByCompanyIdAndInterviewId(
                        COMPANY_ID, INTERVIEW_ID
                );

        verify(interviewRepository).delete(interview);

        verify(auditService).logAction(
                eq("INTERVIEW_DELETED"),
                eq("Interview"),
                eq(INTERVIEW_ID),
                contains("Test Candidate"),
                eq(COMPANY_REF)
        );
    }

    @Test
    void deleteShouldRejectCompletedInterview() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Completed"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.delete(INTERVIEW_ID)
        );

        verify(interviewRepository, never())
                .delete(any(Interview.class));
    }

    @Test
    void deleteShouldAllowCancelledInterview() {

        Interview interview = createInterview(
                INTERVIEW_ID, "Technical Interview", "Cancelled"
        );

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.of(interview));

        assertDoesNotThrow(
                () -> interviewService.delete(INTERVIEW_ID)
        );

        verify(interviewRepository).delete(interview);

        verify(assignmentRepository)
                .deleteByCompanyIdAndInterviewId(
                        COMPANY_ID, INTERVIEW_ID
                );
    }

    @Test
    void deleteShouldThrowExceptionWhenInterviewDoesNotExist() {

        when(interviewRepository.findByIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID
        )).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> interviewService.delete(INTERVIEW_ID)
        );
    }

    // ------------------------------------------------------------
    // HELPER METHODS
    // ------------------------------------------------------------

    private Interview createInterview(
            Long id,
            String round,
            String status) {

        Interview interview = new Interview();

        interview.setId(id);
        interview.setCompanyId(COMPANY_ID);
        interview.setApplicationId(10L);
        interview.setCandidateName("Test Candidate");
        interview.setCandidateEmail("candidate@example.com");
        interview.setVacancyId(20L);
        interview.setVacancyTitle("Software Engineer");
        interview.setInterviewRound(round);
        interview.setInterviewDate(LocalDate.now().plusDays(2));
        interview.setInterviewTime(LocalTime.of(10, 0));
        interview.setDurationMinutes(60);
        interview.setInterviewerName("Interviewer One");
        interview.setInterviewType("Online");
        interview.setMeetingLink("https://meet.example.com/test");
        interview.setStatus(status);
        interview.setInvitationStatus("Sent");
        interview.setCreatedBy(USER_ID);

        return interview;
    }

    private UserSummaryDTO createUser(Long id, String fullName) {

        UserSummaryDTO user = new UserSummaryDTO();
        user.setId(id);
        user.setFullName(fullName);

        return user;
    }

    private InterviewRequestDTO createRequest(
            Long applicationId,
            String candidateName,
            String candidateEmail,
            Long vacancyId,
            String vacancyTitle,
            String interviewRound,
            LocalDate interviewDate,
            LocalTime interviewTime,
            Integer durationMinutes,
            String interviewerName,
            String interviewType,
            String meetingLink,
            String location,
            String notes,
            List<Long> interviewerIds) {

        return new InterviewRequestDTO(
                applicationId,
                candidateName,
                candidateEmail,
                vacancyId,
                vacancyTitle,
                interviewRound,
                interviewDate,
                interviewTime,
                durationMinutes,
                interviewerName,
                interviewType,
                meetingLink,
                location,
                notes,
                interviewerIds
        );
    }
}
