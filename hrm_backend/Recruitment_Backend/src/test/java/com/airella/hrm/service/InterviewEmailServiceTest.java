
package com.airella.hrm.service;

import com.airella.hrm.dto.InterviewEmailDTO;
import com.airella.hrm.dto.UserSummaryDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
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

import org.springframework.mail.MailSendException;
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

    private static final Long COMPANY_ID = 10L;
    private static final Long INTERVIEW_ID = 20L;
    private static final Long EMAIL_LOG_ID = 100L;

    private static final String COMPANY_REF = "COMP-001";

    private static final String CANDIDATE_EMAIL =
            "sanduni@example.com";

    private static final String INTERVIEWER_EMAIL =
            "john@example.com";

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

    @BeforeEach
    void setUp() {

        interview = new Interview();

        interview.setId(INTERVIEW_ID);
        interview.setCompanyId(COMPANY_ID);
        interview.setApplicationId(100L);

        interview.setCandidateName("Sanduni Sewwandi");
        interview.setCandidateEmail(CANDIDATE_EMAIL);

        interview.setVacancyId(5L);
        interview.setVacancyTitle("Software Engineer");

        interview.setInterviewRound("Technical Interview");

        interview.setInterviewDate(LocalDate.of(2026, 11, 5));
        interview.setInterviewTime(LocalTime.of(10, 30));

        interview.setDurationMinutes(60);
        interview.setInterviewerName("Technical Team");

        interview.setInterviewType("Online");
        interview.setMeetingLink(
                "https://meet.example.com/interview"
        );

        interview.setStatus("Scheduled");
        interview.setCreatedBy(1L);

        lenient().when(authService.getCurrentCompanyId())
                .thenReturn(COMPANY_ID);

        lenient().when(authService.getCurrentCompanyRef())
                .thenReturn(COMPANY_REF);

        lenient().when(
                assignmentRepository.findByCompanyIdAndInterviewId(
                        COMPANY_ID,
                        INTERVIEW_ID
                )
        ).thenReturn(List.of());

        lenient().when(
                employeeDirectory.findByCompanyRef(COMPANY_REF)
        ).thenReturn(List.of());

        lenient().when(
                emailLogRepository.countByInterviewIdAndCompanyId(
                        INTERVIEW_ID,
                        COMPANY_ID
                )
        ).thenReturn(0L);

        lenient().when(
                emailLogRepository.save(any(InterviewEmailLog.class))
        ).thenAnswer(invocation -> {

            InterviewEmailLog log = invocation.getArgument(0);

            if (log.getId() == null) {
                log.setId(EMAIL_LOG_ID);
            }

            return log;
        });

        lenient().when(
                interviewRepository.findByIdAndCompanyId(
                        INTERVIEW_ID,
                        COMPANY_ID
                )
        ).thenReturn(Optional.of(interview));
    }

    // ------------------------------------------------------------
    // SMTP CONFIGURATION HELPERS
    // ------------------------------------------------------------

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

    private void configureMissingSmtpCredentials() {

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
    }

    private void configureMailSender() throws Exception {

        MimeMessage mimeMessage = new MimeMessage(
                Session.getInstance(new Properties())
        );

        when(mailSender.createMimeMessage())
                .thenReturn(mimeMessage);
    }

    // ------------------------------------------------------------
    // EMAIL LOG TEST DATA
    // ------------------------------------------------------------

    private InterviewEmailLog createEmailLog(String status) {

        InterviewEmailLog emailLog = new InterviewEmailLog();

        emailLog.setId(EMAIL_LOG_ID);
        emailLog.setCompanyId(COMPANY_ID);
        emailLog.setInterviewId(INTERVIEW_ID);

        emailLog.setCandidateName("Sanduni Sewwandi");
        emailLog.setRecipient(CANDIDATE_EMAIL);

        emailLog.setSubject("Interview Invitation");
        emailLog.setEmailBody("Interview details");

        emailLog.setStatus(status);
        emailLog.setAttemptNumber(1);

        return emailLog;
    }

    // ------------------------------------------------------------
    // SEND INVITATION TESTS
    // ------------------------------------------------------------

    @Test
    void sendInvitation_shouldSendCandidateEmailSuccessfully()
            throws Exception {

        configureSmtpCredentials();
        configureMailSender();

        InterviewEmailDTO result =
                interviewEmailService.sendInvitation(
                        interview,
                        false
                );

        assertNotNull(result);

        assertEquals("Sent", result.status());
        assertEquals(CANDIDATE_EMAIL, result.recipient());
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

        configureMissingSmtpCredentials();

        InterviewEmailDTO result =
                interviewEmailService.sendInvitation(
                        interview,
                        false
                );

        assertNotNull(result);

        assertEquals("Failed", result.status());

        assertNotNull(result.errorMessage());

        assertTrue(
                result.errorMessage().contains("SMTP credentials")
        );

        assertEquals("Failed", interview.getInvitationStatus());

        verify(mailSender, never())
                .createMimeMessage();

        verify(mailSender, never())
                .send(any(MimeMessage.class));

        verify(emailLogRepository, times(1))
                .save(any(InterviewEmailLog.class));
    }

    @Test
    void sendInvitation_shouldRecordFailureWhenCandidateEmailIsMissing() {

        configureSmtpCredentials();

        interview.setCandidateEmail(null);

        InterviewEmailDTO result =
                interviewEmailService.sendInvitation(
                        interview,
                        false
                );

        assertNotNull(result);

        assertEquals("Failed", result.status());

        assertEquals("unknown", result.recipient());

        assertNotNull(result.errorMessage());

        assertEquals("Failed", interview.getInvitationStatus());

        verify(mailSender, never())
                .send(any(MimeMessage.class));

        verify(emailLogRepository).save(
                any(InterviewEmailLog.class)
        );
    }

    @Test
    void sendInvitation_shouldHandleSmtpSendingFailure()
            throws Exception {

        configureSmtpCredentials();
        configureMailSender();

        doThrow(new MailSendException("SMTP unavailable"))
                .when(mailSender)
                .send(any(MimeMessage.class));

        InterviewEmailDTO result =
                interviewEmailService.sendInvitation(
                        interview,
                        false
                );

        assertNotNull(result);

        assertEquals("Failed", result.status());

        assertNotNull(result.errorMessage());

        assertTrue(
                result.errorMessage().contains("SMTP unavailable")
        );

        assertEquals("Failed", interview.getInvitationStatus());

        verify(emailLogRepository).save(
                any(InterviewEmailLog.class)
        );
    }

    @Test
    void sendInvitation_shouldSendRescheduledEmail()
            throws Exception {

        configureSmtpCredentials();
        configureMailSender();

        InterviewEmailDTO result =
                interviewEmailService.sendInvitation(
                        interview,
                        true
                );

        assertNotNull(result);

        assertEquals("Sent", result.status());

        assertEquals(
                "Updated Interview Schedule - Software Engineer",
                result.subject()
        );

        assertTrue(
                result.emailBody().contains(
                        "Your interview schedule has been updated."
                )
        );

        verify(mailSender).send(any(MimeMessage.class));
    }

    // ------------------------------------------------------------
    // INTERVIEWER NOTIFICATION TESTS
    // ------------------------------------------------------------

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

        when(
                assignmentRepository.findByCompanyIdAndInterviewId(
                        COMPANY_ID,
                        INTERVIEW_ID
                )
        ).thenReturn(List.of(assignment));

        UserSummaryDTO interviewer = new UserSummaryDTO();

        interviewer.setId(30L);
        interviewer.setFullName("John Perera");
        interviewer.setEmail(INTERVIEWER_EMAIL);

        when(employeeDirectory.findByCompanyRef(COMPANY_REF))
                .thenReturn(List.of(interviewer));

        when(
                emailLogRepository.countByInterviewIdAndCompanyId(
                        INTERVIEW_ID,
                        COMPANY_ID
                )
        ).thenReturn(0L, 1L);

        InterviewEmailDTO result =
                interviewEmailService.sendInvitation(
                        interview,
                        false
                );

        assertNotNull(result);

        assertEquals("Sent", result.status());

        // Candidate + one assigned interviewer.
        verify(mailSender, times(2))
                .send(any(MimeMessage.class));

        verify(emailLogRepository, times(2))
                .save(any(InterviewEmailLog.class));
    }

    @Test
    void sendInvitation_shouldSkipInterviewerWithoutEmail()
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

        when(
                assignmentRepository.findByCompanyIdAndInterviewId(
                        COMPANY_ID,
                        INTERVIEW_ID
                )
        ).thenReturn(List.of(assignment));

        UserSummaryDTO interviewer = new UserSummaryDTO();

        interviewer.setId(30L);
        interviewer.setFullName("John Perera");
        interviewer.setEmail(null);

        when(employeeDirectory.findByCompanyRef(COMPANY_REF))
                .thenReturn(List.of(interviewer));

        InterviewEmailDTO result =
                interviewEmailService.sendInvitation(
                        interview,
                        false
                );

        assertNotNull(result);

        assertEquals("Sent", result.status());

        // Only the candidate receives an email.
        verify(mailSender, times(1))
                .send(any(MimeMessage.class));

        verify(emailLogRepository, times(1))
                .save(any(InterviewEmailLog.class));
    }

    @Test
    void sendInvitation_shouldSkipInterviewerNotFoundInEmployeeDirectory()
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

        when(
                assignmentRepository.findByCompanyIdAndInterviewId(
                        COMPANY_ID,
                        INTERVIEW_ID
                )
        ).thenReturn(List.of(assignment));

        when(employeeDirectory.findByCompanyRef(COMPANY_REF))
                .thenReturn(List.of());

        InterviewEmailDTO result =
                interviewEmailService.sendInvitation(
                        interview,
                        false
                );

        assertEquals("Sent", result.status());

        verify(mailSender, times(1))
                .send(any(MimeMessage.class));

        verify(emailLogRepository, times(1))
                .save(any(InterviewEmailLog.class));
    }

    @Test
    void sendInvitation_shouldReturnCandidateResultWhenEmployeeDirectoryFails()
            throws Exception {

        configureSmtpCredentials();
        configureMailSender();

        when(employeeDirectory.findByCompanyRef(COMPANY_REF))
                .thenThrow(new RuntimeException("Employee service unavailable"));

        InterviewEmailDTO result =
                interviewEmailService.sendInvitation(
                        interview,
                        false
                );

        assertNotNull(result);

        assertEquals("Sent", result.status());

        verify(mailSender, times(1))
                .send(any(MimeMessage.class));

        verify(emailLogRepository, times(1))
                .save(any(InterviewEmailLog.class));
    }

    // ------------------------------------------------------------
    // RETRY EMAIL TESTS
    // ------------------------------------------------------------

    @Test
    void retry_shouldRejectEmailThatWasAlreadySent() {

        InterviewEmailLog previousLog = createEmailLog("Sent");

        when(
                emailLogRepository.findByIdAndCompanyId(
                        EMAIL_LOG_ID,
                        COMPANY_ID
                )
        ).thenReturn(Optional.of(previousLog));

        assertThrows(
                BusinessException.class,
                () -> interviewEmailService.retry(EMAIL_LOG_ID)
        );

        verify(mailSender, never())
                .send(any(MimeMessage.class));

        verify(emailLogRepository, never())
                .save(any(InterviewEmailLog.class));
    }

    @Test
    void retry_shouldRetryFailedCandidateEmailSuccessfully()
            throws Exception {

        configureSmtpCredentials();
        configureMailSender();

        InterviewEmailLog previousLog = createEmailLog("Failed");

        when(
                emailLogRepository.findByIdAndCompanyId(
                        EMAIL_LOG_ID,
                        COMPANY_ID
                )
        ).thenReturn(Optional.of(previousLog));

        InterviewEmailDTO result =
                interviewEmailService.retry(EMAIL_LOG_ID);

        assertNotNull(result);

        assertEquals("Sent", result.status());

        assertEquals(CANDIDATE_EMAIL, result.recipient());

        verify(mailSender).send(any(MimeMessage.class));

        verify(emailLogRepository).save(
                any(InterviewEmailLog.class)
        );
    }

    @Test
    void retry_shouldRejectWhenEmailLogDoesNotExist() {

        when(
                emailLogRepository.findByIdAndCompanyId(
                        EMAIL_LOG_ID,
                        COMPANY_ID
                )
        ).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> interviewEmailService.retry(EMAIL_LOG_ID)
        );

        verify(mailSender, never())
                .send(any(MimeMessage.class));
    }

    @Test
    void retry_shouldRejectWhenInterviewDoesNotExist() {

        InterviewEmailLog previousLog = createEmailLog("Failed");

        when(
                emailLogRepository.findByIdAndCompanyId(
                        EMAIL_LOG_ID,
                        COMPANY_ID
                )
        ).thenReturn(Optional.of(previousLog));

        when(
                interviewRepository.findByIdAndCompanyId(
                        INTERVIEW_ID,
                        COMPANY_ID
                )
        ).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> interviewEmailService.retry(EMAIL_LOG_ID)
        );

        verify(mailSender, never())
                .send(any(MimeMessage.class));
    }

    // ------------------------------------------------------------
    // GET EMAIL LOG TESTS
    // ------------------------------------------------------------

    @Test
    void get_shouldReturnEmailLogSuccessfully() {

        InterviewEmailLog emailLog = createEmailLog("Sent");

        when(
                emailLogRepository.findByIdAndCompanyId(
                        EMAIL_LOG_ID,
                        COMPANY_ID
                )
        ).thenReturn(Optional.of(emailLog));

        InterviewEmailDTO result =
                interviewEmailService.get(EMAIL_LOG_ID);

        assertNotNull(result);

        assertEquals(EMAIL_LOG_ID, result.id());

        assertEquals(INTERVIEW_ID, result.interviewId());

        assertEquals(CANDIDATE_EMAIL, result.recipient());

        assertEquals("Candidate", result.recipientType());

        assertEquals("Sent", result.status());

        assertEquals(
                "Software Engineer",
                result.vacancyTitle()
        );
    }

    @Test
    void get_shouldThrowWhenEmailLogDoesNotExist() {

        when(
                emailLogRepository.findByIdAndCompanyId(
                        EMAIL_LOG_ID,
                        COMPANY_ID
                )
        ).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> interviewEmailService.get(EMAIL_LOG_ID)
        );
    }

    // ------------------------------------------------------------
    // LIST EMAIL LOG TESTS
    // ------------------------------------------------------------

    @Test
    void list_shouldReturnEmailLogsSuccessfully() {

        InterviewEmailLog emailLog = createEmailLog("Sent");

        when(
                emailLogRepository.findByCompanyIdOrderByCreatedAtDesc(
                        COMPANY_ID
                )
        ).thenReturn(List.of(emailLog));

        List<InterviewEmailDTO> result =
                interviewEmailService.list();

        assertNotNull(result);

        assertEquals(1, result.size());

        assertEquals("Sent", result.get(0).status());

        assertEquals(
                CANDIDATE_EMAIL,
                result.get(0).recipient()
        );

        verify(emailLogRepository)
                .findByCompanyIdOrderByCreatedAtDesc(COMPANY_ID);
    }

    @Test
    void list_shouldReturnEmptyListWhenNoEmailLogsExist() {

        when(
                emailLogRepository.findByCompanyIdOrderByCreatedAtDesc(
                        COMPANY_ID
                )
        ).thenReturn(List.of());

        List<InterviewEmailDTO> result =
                interviewEmailService.list();

        assertNotNull(result);

        assertTrue(result.isEmpty());
    }
}
