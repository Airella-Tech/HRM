
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
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@Transactional
public class InterviewEmailService {

    private static final Logger log =
            LoggerFactory.getLogger(InterviewEmailService.class);

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern(
                    "EEEE, dd MMMM yyyy", Locale.ENGLISH);

    private static final DateTimeFormatter TIME_FORMAT =
            DateTimeFormatter.ofPattern("hh:mm a", Locale.ENGLISH);

    private final JavaMailSender mailSender;
    private final InterviewEmailLogRepository emailLogRepository;
    private final InterviewRepository interviewRepository;
    private final InterviewEvaluatorAssignmentRepository assignmentRepository;
    private final EmployeeDirectory employeeDirectory;
    private final AuthService authService;
    private final AuditService auditService;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    public InterviewEmailService(
            JavaMailSender mailSender,
            InterviewEmailLogRepository emailLogRepository,
            InterviewRepository interviewRepository,
            InterviewEvaluatorAssignmentRepository assignmentRepository,
            EmployeeDirectory employeeDirectory,
            AuthService authService,
            AuditService auditService) {

        this.mailSender = mailSender;
        this.emailLogRepository = emailLogRepository;
        this.interviewRepository = interviewRepository;
        this.assignmentRepository = assignmentRepository;
        this.employeeDirectory = employeeDirectory;
        this.authService = authService;
        this.auditService = auditService;
    }

    /**
     * Sends an invitation to the candidate and notifications
     * to every assigned interviewer.
     *
     * Returns the candidate's email result for compatibility
     * with the existing InterviewService.
     */
    public InterviewEmailDTO sendInvitation(
            Interview interview,
            boolean rescheduled) {

        Long companyId = interview.getCompanyId();

        String candidateSubject = rescheduled
                ? "Updated Interview Schedule - "
                + interview.getVacancyTitle()
                : "Interview Invitation - "
                + interview.getVacancyTitle();

        // Send the candidate email first.
        InterviewEmailDTO candidateResult = sendToRecipient(
                interview,
                interview.getCandidateEmail(),
                candidateSubject,
                buildCandidateEmailBody(interview, rescheduled));

        // The invitation status reflects the candidate's email result.
        interview.setInvitationStatus(candidateResult.status());

        // Find interviewers assigned to this interview.
        List<InterviewEvaluatorAssignment> assignments =
                assignmentRepository.findByCompanyIdAndInterviewId(
                        companyId, interview.getId());

        if (assignments.isEmpty()) {
            log.info(
                    "No interviewers are assigned to interview ID {}",
                    interview.getId());
        }

        // Resolve employee IDs to employee details.
        Map<Long, UserSummaryDTO> usersById = new LinkedHashMap<>();

        try {
            List<UserSummaryDTO> users =
                    employeeDirectory.findByCompanyRef(
                            authService.getCurrentCompanyRef());

            if (users != null) {
                for (UserSummaryDTO user : users) {
                    if (user != null && user.getId() != null) {
                        usersById.put(user.getId(), user);
                    }
                }
            }
        } catch (Exception exception) {
            log.error(
                    "Could not retrieve interviewers for interview ID {}: {}",
                    interview.getId(),
                    exception.getMessage(),
                    exception);

            // The candidate email has already been attempted.
            return candidateResult;
        }

        String interviewerSubject = rescheduled
                ? "Interview Schedule Updated - "
                + interview.getVacancyTitle()
                : "Interview Scheduled - "
                + interview.getVacancyTitle();

        for (InterviewEvaluatorAssignment assignment : assignments) {
            UserSummaryDTO user =
                    usersById.get(assignment.getEmployeeId());

            if (user == null) {
                log.warn(
                        "Assigned interviewer ID {} was not found "
                                + "for interview ID {}",
                        assignment.getEmployeeId(),
                        interview.getId());
                continue;
            }

            String interviewerEmail = user.getEmail();

            if (interviewerEmail == null
                    || interviewerEmail.isBlank()) {
                log.warn(
                        "Assigned interviewer {} has no email address "
                                + "for interview ID {}",
                        user.getFullName(),
                        interview.getId());
                continue;
            }

            String interviewerName =
                    user.getFullName() == null
                            || user.getFullName().isBlank()
                            ? "Interviewer"
                            : user.getFullName();

            sendToRecipient(
                    interview,
                    interviewerEmail,
                    interviewerSubject,
                    buildInterviewerEmailBody(
                            interview, interviewerName, rescheduled));
        }

        return candidateResult;
    }

    /**
     * Sends an email to one recipient and saves the result.
     */
    private InterviewEmailDTO sendToRecipient(
            Interview interview,
            String recipient,
            String subject,
            String body) {

        Long companyId = interview.getCompanyId();

        long previousAttempts =
                emailLogRepository.countByInterviewIdAndCompanyId(
                        interview.getId(), companyId);

        InterviewEmailLog emailLog = new InterviewEmailLog();

        emailLog.setCompanyId(companyId);
        emailLog.setInterviewId(interview.getId());
        emailLog.setCandidateName(interview.getCandidateName());

        emailLog.setRecipient(
                recipient == null || recipient.isBlank()
                        ? "unknown"
                        : recipient.trim());

        emailLog.setSubject(subject);
        emailLog.setEmailBody(body);
        emailLog.setAttemptNumber((int) previousAttempts + 1);
        emailLog.setStatus("Failed");

        try {
            if (recipient == null || recipient.isBlank()) {
                throw new IllegalStateException(
                        "Recipient email address is missing.");
            }

            if (mailUsername == null || mailUsername.isBlank()
                    || mailPassword == null || mailPassword.isBlank()) {
                throw new IllegalStateException(
                        "SMTP credentials are not configured. "
                                + "Configure MAIL_USERNAME and MAIL_PASSWORD.");
            }

            MimeMessage message = mailSender.createMimeMessage();

            MimeMessageHelper helper =
                    new MimeMessageHelper(message, false, "UTF-8");

            helper.setFrom(mailUsername);
            helper.setTo(recipient.trim());
            helper.setSubject(subject);
            helper.setText(body, false);

            mailSender.send(message);

            emailLog.setStatus("Sent");
            emailLog.setSentAt(LocalDateTime.now());
            emailLog.setErrorMessage(null);

            log.info(
                    "Interview email accepted by SMTP for interview ID {} to {}",
                    interview.getId(),
                    recipient);

        } catch (MailException | MessagingException
                 | IllegalStateException exception) {

            emailLog.setStatus("Failed");

            // FIX: truncate() is defined at the bottom of this class.
            emailLog.setErrorMessage(truncate(
                    exception.getMessage() == null
                            ? "Email sending failed."
                            : exception.getMessage(),
                    4000));

            log.warn(
                    "Interview email failed for interview ID {} to {}: {}",
                    interview.getId(),
                    recipient,
                    exception.getMessage());
        }

        InterviewEmailLog saved = emailLogRepository.save(emailLog);

        try {
            auditService.logAction(
                    "Sent".equals(saved.getStatus())
                            ? "INTERVIEW_EMAIL_SENT"
                            : "INTERVIEW_EMAIL_FAILED",
                    "InterviewEmailLog",
                    saved.getId(),
                    "Interview email attempt "
                            + saved.getAttemptNumber()
                            + " for " + saved.getRecipient()
                            + " finished with status " + saved.getStatus(),
                    authService.getCurrentCompanyRef());

        } catch (Exception exception) {
            log.error(
                    "Could not audit interview email log ID {}: {}",
                    saved.getId(),
                    exception.getMessage(),
                    exception);
        }

        return toDto(saved);
    }

    private String buildCandidateEmailBody(
            Interview interview,
            boolean rescheduled) {

        StringBuilder body = new StringBuilder();

        body.append("Dear ")
                .append(interview.getCandidateName())
                .append(",\n\n");

        if (rescheduled) {
            body.append(
                    "Your interview schedule has been updated. "
                            + "Please review the latest details below.\n\n");
        } else {
            body.append(
                    "We are pleased to invite you to an interview. "
                            + "Please find the details below.\n\n");
        }

        appendInterviewDetails(body, interview);

        body.append(
                        "\nPlease contact the recruitment team if you have questions.")
                .append("\n\nKind regards,\nRecruitment Team");

        return body.toString();
    }

    private String buildInterviewerEmailBody(
            Interview interview,
            String interviewerName,
            boolean rescheduled) {

        StringBuilder body = new StringBuilder();

        body.append("Dear ")
                .append(interviewerName)
                .append(",\n\n");

        if (rescheduled) {
            body.append(
                    "The schedule for an interview assigned to you has been updated. "
                            + "Please review the latest details below.\n\n");
        } else {
            body.append(
                    "You have been assigned to an interview. "
                            + "Please review the schedule below.\n\n");
        }

        body.append("Candidate: ")
                .append(interview.getCandidateName())
                .append("\n\n");

        appendInterviewDetails(body, interview);

        body.append(
                        "\nPlease contact the recruitment team if you need assistance.")
                .append("\n\nKind regards,\nRecruitment Team");

        return body.toString();
    }

    private void appendInterviewDetails(
            StringBuilder body,
            Interview interview) {

        body.append("Position: ")
                .append(interview.getVacancyTitle())
                .append("\n");

        body.append("Interview round: ")
                .append(interview.getInterviewRound())
                .append("\n");

        body.append("Date: ")
                .append(interview.getInterviewDate().format(DATE_FORMAT))
                .append("\n");

        body.append("Time: ")
                .append(interview.getInterviewTime().format(TIME_FORMAT))
                .append("\n");

        body.append("Duration: ")
                .append(interview.getDurationMinutes())
                .append(" minutes\n");

        body.append("Interview type: ")
                .append(interview.getInterviewType())
                .append("\n");

        if (interview.getInterviewerName() != null
                && !interview.getInterviewerName().isBlank()) {
            body.append("Interviewers: ")
                    .append(interview.getInterviewerName())
                    .append("\n");
        }

        if ("Online".equalsIgnoreCase(interview.getInterviewType())) {
            body.append("Meeting link: ")
                    .append(interview.getMeetingLink() == null
                            || interview.getMeetingLink().isBlank()
                            ? "The meeting link will be provided separately."
                            : interview.getMeetingLink())
                    .append("\n");

        } else if (interview.getLocation() != null
                && !interview.getLocation().isBlank()) {
            body.append("Location: ")
                    .append(interview.getLocation())
                    .append("\n");
        }
    }

    @Transactional(readOnly = true)
    public List<InterviewEmailDTO> list() {
        Long companyId = authService.getCurrentCompanyId();

        return emailLogRepository
                .findByCompanyIdOrderByCreatedAtDesc(companyId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public InterviewEmailDTO get(Long id) {
        Long companyId = authService.getCurrentCompanyId();

        InterviewEmailLog emailLog = emailLogRepository
                .findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Interview email", "id", id));

        return toDto(emailLog);
    }

    /**
     * Retries only the failed recipient's email.
     */
    public InterviewEmailDTO retry(Long emailLogId) {
        Long companyId = authService.getCurrentCompanyId();

        InterviewEmailLog previousLog = emailLogRepository
                .findByIdAndCompanyId(emailLogId, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Interview email", "id", emailLogId));

        if (!"Failed".equalsIgnoreCase(previousLog.getStatus())) {
            throw new BusinessException(
                    "Only failed interview emails can be retried.");
        }

        Interview interview = interviewRepository
                .findByIdAndCompanyId(
                        previousLog.getInterviewId(), companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Interview", "id",
                                previousLog.getInterviewId()));

        String recipient = previousLog.getRecipient();

        boolean isCandidate = recipient != null
                && interview.getCandidateEmail() != null
                && recipient.equalsIgnoreCase(
                interview.getCandidateEmail());

        String subject = isCandidate
                ? "Updated Interview Schedule - "
                + interview.getVacancyTitle()
                : "Interview Schedule Updated - "
                + interview.getVacancyTitle();

        String body;

        if (isCandidate) {
            body = buildCandidateEmailBody(interview, true);
        } else {
            String interviewerName = findInterviewerName(recipient);

            body = buildInterviewerEmailBody(
                    interview, interviewerName, true);
        }

        return sendToRecipient(interview, recipient, subject, body);
    }

    private String findInterviewerName(String recipient) {
        try {
            List<UserSummaryDTO> users =
                    employeeDirectory.findByCompanyRef(
                            authService.getCurrentCompanyRef());

            if (users != null) {
                for (UserSummaryDTO user : users) {
                    if (user != null
                            && user.getEmail() != null
                            && user.getEmail().equalsIgnoreCase(recipient)) {

                        return user.getFullName() == null
                                || user.getFullName().isBlank()
                                ? "Interviewer"
                                : user.getFullName();
                    }
                }
            }
        } catch (Exception exception) {
            log.warn(
                    "Could not resolve interviewer name for retry: {}",
                    exception.getMessage());
        }

        return "Interviewer";
    }

    /**
     * Converts an email log into a DTO containing interview details.
     */
    private InterviewEmailDTO toDto(InterviewEmailLog emailLog) {
        Interview interview = null;

        if (emailLog.getInterviewId() != null) {
            interview = interviewRepository
                    .findByIdAndCompanyId(
                            emailLog.getInterviewId(),
                            emailLog.getCompanyId())
                    .orElse(null);
        }

        String recipientType = "Unknown";
        String vacancyTitle = null;
        LocalDate interviewDate = null;
        LocalTime interviewTime = null;

        if (interview != null) {
            vacancyTitle = interview.getVacancyTitle();
            interviewDate = interview.getInterviewDate();
            interviewTime = interview.getInterviewTime();

            String candidateEmail = interview.getCandidateEmail();
            String recipient = emailLog.getRecipient();

            if (candidateEmail != null
                    && recipient != null
                    && candidateEmail.equalsIgnoreCase(recipient)) {
                recipientType = "Candidate";
            } else {
                recipientType = "Interviewer";
            }
        }

        return new InterviewEmailDTO(
                emailLog.getId(),
                emailLog.getInterviewId(),
                emailLog.getCandidateName(),
                emailLog.getRecipient(),
                recipientType,
                vacancyTitle,
                interviewDate,
                interviewTime,
                emailLog.getSubject(),
                emailLog.getEmailBody(),
                emailLog.getStatus(),
                emailLog.getErrorMessage(),
                emailLog.getAttemptNumber(),
                emailLog.getSentAt(),
                emailLog.getCreatedAt()
        );
    }

    /**
     * Limits error-message length before storing it.
     */
    private String truncate(String message, int maxLength) {
        if (message == null) {
            return null;
        }

        if (maxLength <= 0) {
            return "";
        }

        if (message.length() <= maxLength) {
            return message;
        }

        return message.substring(0, maxLength);
    }
}
