
package com.airella.hrm.service;

import com.airella.hrm.dto.InterviewEmailDTO;
import com.airella.hrm.dto.UserSummaryDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.model.Interview;
import com.airella.hrm.model.InterviewEmailLog;
import com.airella.hrm.model.InterviewEvaluatorAssignment;
import com.airella.hrm.repository.InterviewEmailLogRepository;
import com.airella.hrm.repository.InterviewEvaluatorAssignmentRepository;
import com.airella.hrm.repository.InterviewRepository;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InterviewEmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private InterviewEmailLogRepository emailLogRepository;

    @Mock
    private InterviewRepository interviewRepository;

    @Mock
    private InterviewEvaluatorAssignmentRepository assignmentRepository;

    @Mock
    private EmployeeDirectory employeeDirectory;

    @Mock
    private AuthService authService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private InterviewEmailService interviewEmailService;

    private Interview interview;

    private static final Long COMPANY_ID = 10L;
    private static final Long INTERVIEW_ID = 20L;

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
        interview.setInterviewDate(LocalDate.of(2026, 11, 5));
        interview.setInterviewTime(LocalTime.of(10, 30));
        interview.setDurationMinutes(60);
        interview.setInterviewerName("Technical Team");
        interview.setInterviewType("Online");
        interview.setMeetingLink("https://meet.example.com/interview");
        interview.setStatus("Scheduled");
        interview.setCreatedBy(1L);

        // Common mock configurations.
        // Lenient avoids unnecessary-stubbing failures in tests
        // that do not use every common mock.

        lenient().when(authService.getCurrentCompanyRef())
                .thenReturn("COMP-001");

        lenient().when(assignmentRepository.findByCompanyIdAndInterviewId(
                        COMPANY_ID, INTERVIEW_ID))
                .thenReturn(List.of());

        lenient().when(employeeDirectory.findByCompanyRef("COMP-001"))
                .thenReturn(List.of());

        lenient().when(emailLogRepository.countByInterviewIdAndCompanyId(
                        INTERVIEW_ID, COMPANY_ID))
                .thenReturn(0L);

        lenient().when(emailLogRepository.save(any(InterviewEmailLog.class)))
                .thenAnswer(invocation -> {
                    InterviewEmailLog log = invocation.getArgument(0);
                    log.setId(100L);
                    return log;
                });

        lenient().when(interviewRepository.findByIdAndCompanyId(
                        INTERVIEW_ID, COMPANY_ID))
                .thenReturn(Optional.of(interview));
    }

    private void configureSmtpCredentials() {
        ReflectionTestUtils.setField(
                interviewEmailService,
                "mailUsername",
                "hr@example.com"
        );

        ReflectionTestUtils.setField(
                interviewEmailService,
                "mailPassword",
                "test-password"
        );
    }

    private void configureMailSender() throws Exception {
        MimeMessage mimeMessage = new MimeMessage(
                Session.getInstance(new Properties())
        );

        when(mailSender.createMimeMessage())
                .thenReturn(mimeMessage);
    }

    @Test
    void sendInvitation_shouldSendCandidateEmailSuccessfully()
            throws Exception {

        configureSmtpCredentials();
        configureMailSender();

        InterviewEmailDTO result =
                interviewEmailService.sendInvitation(interview, false);

        assertNotNull(result);
        assertEquals("Sent", result.status());
        assertEquals("sanduni@example.com", result.recipient());
        assertEquals("Candidate", result.recipientType());
        assertEquals(INTERVIEW_ID, result.interviewId());

        assertEquals("Sent", interview.getInvitationStatus());

        verify(mailSender, times(1))
                .send(any(MimeMessage.class));

        verify(emailLogRepository, times(1))
                .save(any(InterviewEmailLog.class));
    }

    @Test
    void sendInvitation_shouldRecordFailureWhenSmtpCredentialsAreMissing() {

        ReflectionTestUtils.setField(
                interviewEmailService,
                "mailUsername",
                ""
        );

        ReflectionTestUtils.setField(
                interviewEmailService,
                "mailPassword",
                ""
        );

        InterviewEmailDTO result =
                interviewEmailService.sendInvitation(interview, false);

        assertNotNull(result);
        assertEquals("Failed", result.status());

        assertNotNull(result.errorMessage());
        assertTrue(result.errorMessage().contains("SMTP credentials"));

        assertEquals("Failed", interview.getInvitationStatus());

        verify(mailSender, never())
                .send(any(MimeMessage.class));

        verify(emailLogRepository, times(1))
                .save(any(InterviewEmailLog.class));
    }

    @Test
    void sendInvitation_shouldNotifyAssignedInterviewers()
            throws Exception {

        configureSmtpCredentials();
        configureMailSender();

        InterviewEvaluatorAssignment assignment =
                new InterviewEvaluatorAssignment(
                        COMPANY_ID,
                        INTERVIEW_ID,
                        30L,
                        1L
                );

        when(assignmentRepository.findByCompanyIdAndInterviewId(
                COMPANY_ID, INTERVIEW_ID))
                .thenReturn(List.of(assignment));

        UserSummaryDTO interviewer = new UserSummaryDTO();
        interviewer.setId(30L);
        interviewer.setFullName("John Perera");
        interviewer.setEmail("john@example.com");

        when(employeeDirectory.findByCompanyRef("COMP-001"))
                .thenReturn(List.of(interviewer));

        when(emailLogRepository.countByInterviewIdAndCompanyId(
                INTERVIEW_ID, COMPANY_ID))
                .thenReturn(0L, 1L);

        InterviewEmailDTO result =
                interviewEmailService.sendInvitation(interview, false);

        assertNotNull(result);
        assertEquals("Sent", result.status());

        // One email for the candidate and one for the interviewer.
        verify(mailSender, times(2))
                .send(any(MimeMessage.class));

        verify(emailLogRepository, times(2))
                .save(any(InterviewEmailLog.class));
    }

    @Test
    void retry_shouldRejectEmailThatWasAlreadySent() {

        InterviewEmailLog previousLog = new InterviewEmailLog();

        previousLog.setId(100L);
        previousLog.setCompanyId(COMPANY_ID);
        previousLog.setInterviewId(INTERVIEW_ID);
        previousLog.setCandidateName("Sanduni Sewwandi");
        previousLog.setRecipient("sanduni@example.com");
        previousLog.setSubject("Interview Invitation");
        previousLog.setEmailBody("Interview details");
        previousLog.setStatus("Sent");
        previousLog.setAttemptNumber(1);

        when(authService.getCurrentCompanyId())
                .thenReturn(COMPANY_ID);

        when(emailLogRepository.findByIdAndCompanyId(
                100L, COMPANY_ID))
                .thenReturn(Optional.of(previousLog));

        assertThrows(
                BusinessException.class,
                () -> interviewEmailService.retry(100L)
        );

        verify(mailSender, never())
                .send(any(MimeMessage.class));

        verify(emailLogRepository, never())
                .save(any(InterviewEmailLog.class));
    }
}
