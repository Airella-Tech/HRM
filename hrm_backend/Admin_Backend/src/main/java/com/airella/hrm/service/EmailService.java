package com.airella.hrm.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Email service in Admin_Backend for sending automated system notifications.
 * Supports JavaMailSender with console logger fallback.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@hrm.com}")
    private String fromEmail;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    /**
     * Send confirmation email when a public company registration request is submitted.
     */
    public boolean sendRequestReceivedEmail(String recipientEmail, String contactPersonName, String companyName) {
        String subject = "HRM Company Application Received — " + companyName;
        String body = String.format("""
                Dear %s,

                Thank you for submitting a registration request for '%s' to the HRM platform!

                We have received your application and our system administration team is currently reviewing your details.

                What happens next?
                - Our team will review your application.
                - Upon approval, you will receive another email containing your HR Manager account login credentials.

                Application Details:
                - Company Name: %s
                - Contact Person: %s
                - Email: %s

                Best regards,
                HRM System Administration Team
                """,
                contactPersonName != null ? contactPersonName : "Client Representative",
                companyName,
                companyName,
                contactPersonName != null ? contactPersonName : "N/A",
                recipientEmail);

        return sendEmailOrLogFallback(recipientEmail, subject, body, "Request Received Email");
    }

    /**
     * Send company application approval email containing HR Account credentials.
     */
    public boolean sendApprovalEmail(String recipientEmail, String contactPersonName, String companyName, String tempPassword) {
        String subject = "Welcome to HRM — Company Application Approved & HR Account Created 🎉";
        String body = String.format("""
                Dear %s,

                We are pleased to inform you that your registration application for '%s' has been APPROVED!

                Your company's HR Manager Account has been provisioned. You can now access your company HR portal using the credentials below:

                =======================================================
                Portal Login URL: %s/login
                HR Account Email: %s
                Temporary Password: %s
                Account Role: HR Manager (HR_MANAGER)
                Company Name: %s
                =======================================================

                For security reasons, please log in and update your password immediately after your first sign-in.

                Best regards,
                HRM System Administration Team
                """,
                contactPersonName != null ? contactPersonName : "Client Representative",
                companyName,
                frontendUrl,
                recipientEmail,
                tempPassword != null ? tempPassword : "[Provided during setup]",
                companyName);

        return sendEmailOrLogFallback(recipientEmail, subject, body, "Approval Email");
    }

    /**
     * Send company application rejection email with stated reason.
     */
    public boolean sendRejectionEmail(String recipientEmail, String contactPersonName, String companyName, String rejectionReason) {
        String subject = "HRM Company Application Status — " + companyName;
        String body = String.format("""
                Dear %s,

                Thank you for your interest in the HRM platform.

                After reviewing your registration request for '%s', we regret to inform you that we are unable to approve your application at this time.

                Reason for Decision:
                %s

                If you have any questions or require further details, please contact our support team.

                Best regards,
                HRM System Administration Team
                """,
                contactPersonName != null ? contactPersonName : "Client Representative",
                companyName,
                rejectionReason != null ? rejectionReason : "Application did not meet requirements.");

        return sendEmailOrLogFallback(recipientEmail, subject, body, "Rejection Email");
    }

    private boolean sendEmailOrLogFallback(String to, String subject, String body, String emailType) {
        log.info("Admin Service: Preparing to send {} to {}", emailType, to);

        if (mailSender != null && fromEmail != null && !fromEmail.isEmpty()) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(fromEmail);
                message.setTo(to);
                message.setSubject(subject);
                message.setText(body);
                mailSender.send(message);
                log.info("Admin Service: Successfully sent {} via SMTP to {}", emailType, to);
                return true;
            } catch (Exception e) {
                log.warn("Admin Service: Failed to send {} via SMTP to {}. Falling back to console logger: {}", emailType, to, e.getMessage());
            }
        } else {
            log.info("Admin Service: No JavaMailSender configured or fromEmail empty. Using console logger fallback for {}.", emailType);
        }

        // Print clean logger banner in console
        System.out.println("================================================================================");
        System.out.println("📧 [ADMIN SERVICE AUTOMATED EMAIL - " + emailType.toUpperCase() + "]");
        System.out.println("To: " + to);
        System.out.println("Subject: " + subject);
        System.out.println("--------------------------------------------------------------------------------");
        System.out.println(body);
        System.out.println("================================================================================");
        return true;
    }
}
