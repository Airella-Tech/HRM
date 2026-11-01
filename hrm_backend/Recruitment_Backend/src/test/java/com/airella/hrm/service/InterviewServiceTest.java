
package com.airella.hrm.service;

import com.airella.hrm.dto.InterviewDTO;
import com.airella.hrm.dto.InterviewRequestDTO;
import com.airella.hrm.dto.UserSummaryDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.Interview;
import com.airella.hrm.model.InterviewEvaluatorAssignment;
import com.airella.hrm.repository.InterviewRepository;
import com.airella.hrm.repository.InterviewEvaluatorAssignmentRepository;

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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InterviewServiceTest {

    @Mock
    private InterviewRepository interviewRepository;

    @Mock
    private InterviewEvaluatorAssignmentRepository assignmentRepository;

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

    @InjectMocks
    private InterviewService interviewService;

    private InterviewRequestDTO validRequest;

    private static final Long COMPANY_ID = 1L;
    private static final String COMPANY_REF = "TEST-COMPANY";
    private static final Long USER_ID = 100L;

    @BeforeEach
    void setUp() {

        validRequest = new InterviewRequestDTO(
                10L,
                "Test Candidate",
                "candidate@example.com",
                20L,
                "Software Engineer",
                "Technical Interview",
                LocalDate.of(2026, 11, 5),
                LocalTime.of(10, 0),
                60,
                "Test Interviewer",
                "Online",
                "https://meet.google.com/test",
                null,
                "Technical interview"
        );

        lenient().when(
                assignmentRepository.findByCompanyIdAndInterviewId(
                        anyLong(),
                        anyLong()
                )
        ).thenReturn(List.of());

        lenient().when(
                interviewRepository.save(any(Interview.class))
        ).thenAnswer(invocation -> invocation.getArgument(0));
    }

    // ------------------------------------------------------------
    // CREATE INTERVIEW TESTS
    // ------------------------------------------------------------

    @Test
    void createShouldSaveInterviewAndReturnDto() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);
        when(authService.getCurrentCompanyRef()).thenReturn(COMPANY_REF);
        when(permissionService.currentUserId()).thenReturn(USER_ID);

        when(interviewRepository.save(any(Interview.class)))
                .thenAnswer(invocation -> {
                    Interview interview = invocation.getArgument(0);
                    interview.setId(1L);
                    return interview;
                });

        InterviewDTO result = interviewService.create(validRequest);

        assertNotNull(result);
        assertEquals(1L, result.id());
        assertEquals(10L, result.applicationId());
        assertEquals("Test Candidate", result.candidateName());
        assertEquals("candidate@example.com", result.candidateEmail());
        assertEquals(20L, result.vacancyId());
        assertEquals("Software Engineer", result.vacancyTitle());
        assertEquals("Technical Interview", result.interviewRound());
        assertEquals(LocalDate.of(2026, 11, 5), result.interviewDate());
        assertEquals(LocalTime.of(10, 0), result.interviewTime());
        assertEquals("Online", result.interviewType());
        assertEquals("Scheduled", result.status());
        assertEquals(60, result.durationMinutes());
        assertEquals(USER_ID, result.createdBy());

        verify(interviewRepository, times(2))
                .save(any(Interview.class));

        verify(interviewEmailService)
                .sendInvitation(any(Interview.class), eq(false));

        verify(auditService).logAction(
                eq("INTERVIEW_CREATED"),
                eq("Interview"),
                eq(1L),
                anyString(),
                eq(COMPANY_REF)
        );
    }

    @Test
    void createShouldRejectMissingRequest() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        assertThrows(
                BusinessException.class,
                () -> interviewService.create(null)
        );

        verify(interviewRepository, never()).save(any());
    }

    @Test
    void createShouldRejectInvalidEmail() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        InterviewRequestDTO request = new InterviewRequestDTO(
                10L,
                "Test Candidate",
                "invalid-email",
                20L,
                "Software Engineer",
                "Technical Interview",
                LocalDate.of(2026, 11, 5),
                LocalTime.of(10, 0),
                60,
                "Test Interviewer",
                "Online",
                "https://meet.google.com/test",
                null,
                "Technical interview"
        );

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> interviewService.create(request)
        );

        assertEquals(
                "Enter a valid candidate email address.",
                exception.getMessage()
        );

        verify(interviewRepository, never()).save(any());
    }

    @Test
    void createShouldRejectInvalidDuration() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        InterviewRequestDTO request = new InterviewRequestDTO(
                10L,
                "Test Candidate",
                "candidate@example.com",
                20L,
                "Software Engineer",
                "Technical Interview",
                LocalDate.of(2026, 11, 5),
                LocalTime.of(10, 0),
                0,
                "Test Interviewer",
                "Online",
                "https://meet.google.com/test",
                null,
                "Technical interview"
        );

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> interviewService.create(request)
        );

        assertEquals(
                "Interview duration must be between 1 and 480 minutes.",
                exception.getMessage()
        );

        verify(interviewRepository, never()).save(any());
    }

    @Test
    void createShouldRejectInvalidInterviewType() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        InterviewRequestDTO request = new InterviewRequestDTO(
                10L,
                "Test Candidate",
                "candidate@example.com",
                20L,
                "Software Engineer",
                "Technical Interview",
                LocalDate.of(2026, 11, 5),
                LocalTime.of(10, 0),
                60,
                "Test Interviewer",
                "Hybrid",
                "https://meet.google.com/test",
                null,
                "Technical interview"
        );

        assertThrows(
                BusinessException.class,
                () -> interviewService.create(request)
        );

        verify(interviewRepository, never()).save(any());
    }

    @Test
    void createShouldRejectInvalidInterviewRound() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        InterviewRequestDTO request = new InterviewRequestDTO(
                10L,
                "Test Candidate",
                "candidate@example.com",
                20L,
                "Software Engineer",
                "Manager Discussion",
                LocalDate.of(2026, 11, 5),
                LocalTime.of(10, 0),
                60,
                "Test Interviewer",
                "Online",
                "https://meet.google.com/test",
                null,
                "Interview notes"
        );

        assertThrows(
                BusinessException.class,
                () -> interviewService.create(request)
        );

        verify(interviewRepository, never()).save(any());
    }

    @Test
    void createShouldSetInvitationStatusToFailedWhenEmailSendingFails() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);
        when(permissionService.currentUserId()).thenReturn(USER_ID);
        when(authService.getCurrentCompanyRef()).thenReturn(COMPANY_REF);

        doThrow(new RuntimeException("Email sending failed"))
                .when(interviewEmailService)
                .sendInvitation(any(Interview.class), eq(false));

        when(interviewRepository.save(any(Interview.class)))
                .thenAnswer(invocation -> {
                    Interview interview = invocation.getArgument(0);
                    interview.setId(1L);
                    return interview;
                });

        InterviewDTO result = interviewService.create(validRequest);

        assertEquals("Failed", result.invitationStatus());

        verify(interviewRepository, times(2))
                .save(any(Interview.class));
    }

    // ------------------------------------------------------------
    // INTERVIEW ROUND PROGRESSION TESTS
    // ------------------------------------------------------------

    @Test
    void createShouldRejectNextRoundWhenPreviousRoundDoesNotExist() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        when(
                interviewRepository
                        .findByCompanyIdAndApplicationIdAndVacancyIdOrderByInterviewDateAscInterviewTimeAsc(
                                COMPANY_ID,
                                10L,
                                20L
                        )
        ).thenReturn(List.of());

        InterviewRequestDTO request = createRequestForRound("HR Interview");

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> interviewService.create(request)
        );

        assertTrue(exception.getMessage().contains("Technical Interview"));

        verify(interviewRepository, never()).save(any());
    }

    @Test
    void createShouldRejectNextRoundWhenPreviousRoundIsNotCompleted() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        Interview previousInterview = createInterview(
                5L,
                "Scheduled",
                LocalDate.of(2026, 11, 4)
        );

        when(
                interviewRepository
                        .findByCompanyIdAndApplicationIdAndVacancyIdOrderByInterviewDateAscInterviewTimeAsc(
                                COMPANY_ID,
                                10L,
                                20L
                        )
        ).thenReturn(List.of(previousInterview));

        InterviewRequestDTO request = createRequestForRound("HR Interview");

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> interviewService.create(request)
        );

        assertTrue(exception.getMessage().contains("must be completed"));

        verify(interviewEvaluationService, never())
                .hasPassingSubmittedEvaluation(anyLong());

        verify(interviewRepository, never()).save(any());
    }

    @Test
    void createShouldRejectNextRoundWhenPreviousEvaluationIsNotPassing() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        Interview previousInterview = createInterview(
                5L,
                "Completed",
                LocalDate.of(2026, 11, 4)
        );

        when(
                interviewRepository
                        .findByCompanyIdAndApplicationIdAndVacancyIdOrderByInterviewDateAscInterviewTimeAsc(
                                COMPANY_ID,
                                10L,
                                20L
                        )
        ).thenReturn(List.of(previousInterview));

        when(interviewEvaluationService.hasPassingSubmittedEvaluation(5L))
                .thenReturn(false);

        InterviewRequestDTO request = createRequestForRound("HR Interview");

        assertThrows(
                BusinessException.class,
                () -> interviewService.create(request)
        );

        verify(interviewRepository, never()).save(any());
    }

    @Test
    void createShouldAllowNextRoundWhenPreviousRoundHasPassingEvaluation() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);
        when(permissionService.currentUserId()).thenReturn(USER_ID);
        when(authService.getCurrentCompanyRef()).thenReturn(COMPANY_REF);

        Interview previousInterview = createInterview(
                5L,
                "Completed",
                LocalDate.of(2026, 11, 4)
        );

        when(
                interviewRepository
                        .findByCompanyIdAndApplicationIdAndVacancyIdOrderByInterviewDateAscInterviewTimeAsc(
                                COMPANY_ID,
                                10L,
                                20L
                        )
        ).thenReturn(List.of(previousInterview));

        when(interviewEvaluationService.hasPassingSubmittedEvaluation(5L))
                .thenReturn(true);

        when(interviewRepository.save(any(Interview.class)))
                .thenAnswer(invocation -> {
                    Interview interview = invocation.getArgument(0);
                    interview.setId(6L);
                    return interview;
                });

        InterviewDTO result = interviewService.create(
                createRequestForRound("HR Interview")
        );

        assertNotNull(result);
        assertEquals("HR Interview", result.interviewRound());

        verify(interviewEvaluationService)
                .hasPassingSubmittedEvaluation(5L);

        verify(interviewRepository, times(2))
                .save(any(Interview.class));
    }

    // ------------------------------------------------------------
    // GET INTERVIEW TESTS
    // ------------------------------------------------------------

    @Test
    void getShouldReturnInterviewWhenItExists() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        Interview interview = createInterview(
                1L,
                "Scheduled",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        InterviewDTO result = interviewService.get(1L);

        assertNotNull(result);
        assertEquals(1L, result.id());
        assertEquals("Test Candidate", result.candidateName());
    }

    @Test
    void getShouldThrowWhenInterviewDoesNotExist() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        when(interviewRepository.findByIdAndCompanyId(99L, COMPANY_ID))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> interviewService.get(99L)
        );
    }

    @Test
    void getShouldNotReturnInterviewFromAnotherCompany() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        when(interviewRepository.findByIdAndCompanyId(50L, COMPANY_ID))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> interviewService.get(50L)
        );
    }

    // ------------------------------------------------------------
    // LIST INTERVIEW TESTS
    // ------------------------------------------------------------

    @Test
    void listShouldReturnOnlyMatchingStatusAndDate() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        Interview matchingInterview = createInterview(
                1L,
                "Scheduled",
                LocalDate.of(2026, 11, 5)
        );

        Interview wrongStatus = createInterview(
                2L,
                "Completed",
                LocalDate.of(2026, 11, 5)
        );

        Interview wrongDate = createInterview(
                3L,
                "Scheduled",
                LocalDate.of(2026, 11, 6)
        );

        when(
                interviewRepository.findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID
                )
        ).thenReturn(List.of(
                matchingInterview,
                wrongStatus,
                wrongDate
        ));

        List<InterviewDTO> result = interviewService.list(
                "Scheduled",
                LocalDate.of(2026, 11, 5)
        );

        assertEquals(1, result.size());
        assertEquals(1L, result.get(0).id());
    }

    // ------------------------------------------------------------
    // UPDATE INTERVIEW STATUS TESTS
    // ------------------------------------------------------------

    @Test
    void updateStatusShouldUpdateScheduledToCompleted() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);
        when(authService.getCurrentCompanyRef()).thenReturn(COMPANY_REF);

        Interview interview = createInterview(
                1L,
                "Scheduled",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        InterviewDTO result = interviewService.updateStatus(1L, "Completed");

        assertNotNull(result);
        assertEquals("Completed", result.status());
        assertEquals("Completed", interview.getStatus());

        verify(interviewRepository).save(interview);

        verify(auditService).logAction(
                eq("INTERVIEW_STATUS_UPDATED"),
                eq("Interview"),
                eq(1L),
                anyString(),
                eq(COMPANY_REF)
        );
    }

    @Test
    void updateStatusShouldSupportInProgressAlias() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        Interview interview = createInterview(
                1L,
                "Scheduled",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        InterviewDTO result = interviewService.updateStatus(1L, "in_progress");

        assertEquals("In Progress", result.status());
    }

    @Test
    void updateStatusShouldSupportCancelledAlias() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        Interview interview = createInterview(
                1L,
                "Scheduled",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        InterviewDTO result = interviewService.updateStatus(1L, "canceled");

        assertEquals("Cancelled", result.status());
    }

    @Test
    void updateStatusShouldRejectBlankStatus() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        Interview interview = createInterview(
                1L,
                "Scheduled",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.updateStatus(1L, " ")
        );

        verify(interviewRepository, never()).save(any());
    }

    @Test
    void updateStatusShouldRejectInvalidStatus() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        Interview interview = createInterview(
                1L,
                "Scheduled",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.updateStatus(1L, "Rejected")
        );

        verify(interviewRepository, never()).save(any());
    }

    @Test
    void updateStatusShouldNotReopenCompletedInterview() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        Interview interview = createInterview(
                1L,
                "Completed",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.updateStatus(1L, "Scheduled")
        );

        verify(interviewRepository, never()).save(any());
    }

    @Test
    void updateStatusShouldNotReopenCancelledInterview() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        Interview interview = createInterview(
                1L,
                "Cancelled",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.updateStatus(1L, "Scheduled")
        );

        verify(interviewRepository, never()).save(any());
    }

    @Test
    void updateStatusShouldNotSaveWhenStatusIsUnchanged() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        Interview interview = createInterview(
                1L,
                "Scheduled",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        InterviewDTO result = interviewService.updateStatus(1L, "Scheduled");

        assertEquals("Scheduled", result.status());

        verify(interviewRepository, never()).save(any());
    }

    // ------------------------------------------------------------
    // UPDATE / RESCHEDULE TESTS
    // ------------------------------------------------------------

    @Test
    void updateShouldRejectCompletedInterview() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        Interview interview = createInterview(
                1L,
                "Completed",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.update(1L, validRequest)
        );

        verify(interviewRepository, never()).save(any());
    }

    @Test
    void updateShouldRejectCancelledInterview() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        Interview interview = createInterview(
                1L,
                "Cancelled",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.update(1L, validRequest)
        );

        verify(interviewRepository, never()).save(any());
    }

    @Test
    void updateShouldRejectChangingInterviewRound() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        Interview interview = createInterview(
                1L,
                "Scheduled",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        InterviewRequestDTO changedRoundRequest =
                createRequestForRound("HR Interview");

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> interviewService.update(1L, changedRoundRequest)
        );

        assertTrue(exception.getMessage().contains("round cannot be changed"));

        verify(interviewRepository, never()).save(any());
    }

    // ------------------------------------------------------------
    // ASSIGN INTERVIEWERS TESTS
    // ------------------------------------------------------------

    @Test
    void assignInterviewersShouldAssignEmployeesSuccessfully() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);
        when(authService.getCurrentCompanyRef()).thenReturn(COMPANY_REF);
        when(permissionService.currentUserId()).thenReturn(USER_ID);

        Interview interview = createInterview(
                1L,
                "Scheduled",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        UserSummaryDTO firstUser = mock(UserSummaryDTO.class);
        when(firstUser.getId()).thenReturn(101L);
        when(firstUser.getFullName()).thenReturn("Interviewer One");

        UserSummaryDTO secondUser = mock(UserSummaryDTO.class);
        when(secondUser.getId()).thenReturn(102L);
        when(secondUser.getFullName()).thenReturn("Interviewer Two");

        when(employeeDirectory.findByCompanyRef(COMPANY_REF))
                .thenReturn(List.of(firstUser, secondUser));

        InterviewDTO result = interviewService.assignInterviewers(
                1L,
                List.of(101L, 102L)
        );

        assertNotNull(result);
        assertEquals(
                "Interviewer One, Interviewer Two",
                interview.getInterviewerName()
        );

        verify(assignmentRepository, times(2))
                .save(any(InterviewEvaluatorAssignment.class));

        verify(interviewRepository).save(interview);
    }

    @Test
    void assignInterviewersShouldRejectNullEmployeeIds() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        Interview interview = createInterview(
                1L,
                "Scheduled",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.assignInterviewers(1L, null)
        );

        verify(assignmentRepository, never())
                .save(any(InterviewEvaluatorAssignment.class));
    }

    @Test
    void assignInterviewersShouldRejectDuplicateEmployeeIds() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        Interview interview = createInterview(
                1L,
                "Scheduled",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.assignInterviewers(
                        1L,
                        List.of(101L, 101L)
                )
        );

        verify(employeeDirectory, never()).findByCompanyRef(anyString());
    }

    @Test
    void assignInterviewersShouldRejectEmployeeFromAnotherCompany() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);
        when(authService.getCurrentCompanyRef()).thenReturn(COMPANY_REF);

        Interview interview = createInterview(
                1L,
                "Scheduled",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        when(employeeDirectory.findByCompanyRef(COMPANY_REF))
                .thenReturn(List.of());

        assertThrows(
                BusinessException.class,
                () -> interviewService.assignInterviewers(1L, List.of(999L))
        );

        verify(assignmentRepository, never())
                .save(any(InterviewEvaluatorAssignment.class));
    }

    @Test
    void assignInterviewersShouldRejectCompletedInterview() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        Interview interview = createInterview(
                1L,
                "Completed",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.assignInterviewers(1L, List.of(101L))
        );

        verify(employeeDirectory, never()).findByCompanyRef(anyString());
    }

    @Test
    void assignInterviewersShouldRejectCancelledInterview() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        Interview interview = createInterview(
                1L,
                "Cancelled",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.assignInterviewers(1L, List.of(101L))
        );

        verify(employeeDirectory, never()).findByCompanyRef(anyString());
    }

    // ------------------------------------------------------------
    // ASSIGNED INTERVIEWS TESTS
    // ------------------------------------------------------------

    @Test
    void getMyAssignedInterviewsShouldReturnAssignedInterviews() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);
        when(permissionService.currentUserId()).thenReturn(USER_ID);

        InterviewEvaluatorAssignment assignment =
                new InterviewEvaluatorAssignment(
                        COMPANY_ID,
                        1L,
                        USER_ID,
                        200L
                );

        Interview interview = createInterview(
                1L,
                "Scheduled",
                LocalDate.of(2026, 11, 5)
        );

        when(assignmentRepository.findByCompanyIdAndEmployeeId(
                COMPANY_ID,
                USER_ID
        )).thenReturn(List.of(assignment));

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        List<InterviewDTO> result =
                interviewService.getMyAssignedInterviews();

        assertEquals(1, result.size());
        assertEquals(1L, result.get(0).id());
    }

    @Test
    void getMyAssignedInterviewsShouldReturnEmptyWhenNoAssignmentsExist() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);
        when(permissionService.currentUserId()).thenReturn(USER_ID);

        when(assignmentRepository.findByCompanyIdAndEmployeeId(
                COMPANY_ID,
                USER_ID
        )).thenReturn(List.of());

        List<InterviewDTO> result =
                interviewService.getMyAssignedInterviews();

        assertTrue(result.isEmpty());

        verify(interviewRepository, never())
                .findByIdAndCompanyId(anyLong(), anyLong());
    }

    @Test
    void getMyAssignedInterviewsShouldRejectMissingCurrentUser() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);
        when(permissionService.currentUserId()).thenReturn(null);

        assertThrows(
                BusinessException.class,
                () -> interviewService.getMyAssignedInterviews()
        );

        verify(assignmentRepository, never())
                .findByCompanyIdAndEmployeeId(anyLong(), anyLong());
    }

    // ------------------------------------------------------------
    // DELETE INTERVIEW TESTS
    // ------------------------------------------------------------

    @Test
    void deleteShouldRejectCompletedInterview() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);

        Interview interview = createInterview(
                1L,
                "Completed",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        assertThrows(
                BusinessException.class,
                () -> interviewService.delete(1L)
        );

        verify(interviewRepository, never()).delete(any());
    }

    @Test
    void deleteShouldDeleteScheduledInterviewAndAssignments() {

        when(authService.getCurrentCompanyId()).thenReturn(COMPANY_ID);
        when(authService.getCurrentCompanyRef()).thenReturn(COMPANY_REF);

        Interview interview = createInterview(
                1L,
                "Scheduled",
                LocalDate.of(2026, 11, 5)
        );

        when(interviewRepository.findByIdAndCompanyId(1L, COMPANY_ID))
                .thenReturn(Optional.of(interview));

        interviewService.delete(1L);

        verify(assignmentRepository)
                .deleteByCompanyIdAndInterviewId(COMPANY_ID, 1L);

        verify(interviewRepository).delete(interview);

        verify(auditService).logAction(
                eq("INTERVIEW_DELETED"),
                eq("Interview"),
                eq(1L),
                anyString(),
                eq(COMPANY_REF)
        );
    }

    // ------------------------------------------------------------
    // HELPER METHODS
    // ------------------------------------------------------------

    private Interview createInterview(
            Long id,
            String status,
            LocalDate date) {

        Interview interview = new Interview();

        interview.setId(id);
        interview.setCompanyId(COMPANY_ID);
        interview.setApplicationId(10L);

        interview.setCandidateName("Test Candidate");
        interview.setCandidateEmail("candidate@example.com");

        interview.setVacancyId(20L);
        interview.setVacancyTitle("Software Engineer");

        interview.setInterviewRound("Technical Interview");
        interview.setInterviewDate(date);
        interview.setInterviewTime(LocalTime.of(10, 0));

        interview.setDurationMinutes(60);
        interview.setInterviewerName("Test Interviewer");
        interview.setInterviewType("Online");

        interview.setMeetingLink("https://meet.google.com/test");
        interview.setStatus(status);
        interview.setInvitationStatus("Not sent");
        interview.setCreatedBy(USER_ID);

        return interview;
    }

    private InterviewRequestDTO createRequestForRound(String round) {

        return new InterviewRequestDTO(
                10L,
                "Test Candidate",
                "candidate@example.com",
                20L,
                "Software Engineer",
                round,
                LocalDate.of(2026, 11, 5),
                LocalTime.of(10, 0),
                60,
                "Test Interviewer",
                "Online",
                "https://meet.google.com/test",
                null,
                "Interview notes"
        );
    }
}
