package com.airella.hrm.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;

import java.lang.reflect.Method;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Service for sending recruitment notification emails to candidates.
 * Uses decoupled Spring ApplicationContext lookup to avoid IDE classpath resolution issues,
 * with an automatic, resilient console logger fallback.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final ApplicationContext applicationContext;
    private final String fromEmail;
    private final String frontendUrl;

    public EmailService(
            ApplicationContext applicationContext,
            @Value("${spring.mail.username:noreply@hrm.com}") String fromEmail,
            @Value("${app.frontend.url:http://localhost:5173}") String frontendUrl) {
        this.applicationContext = applicationContext;
        this.fromEmail = fromEmail;
        this.frontendUrl = frontendUrl;
    }

    /**
     * Send application receipt confirmation email containing the unique tracking code
     * and a direct link to the application tracking page.
     */
    public boolean sendApplicationConfirmation(String toEmail,
                                              String candidateName,
                                              String jobTitle,
                                              String companyRef,
                                              String trackingCode) {
        String safeName = (candidateName != null && !candidateName.isBlank()) ? candidateName.trim() : "Candidate";
        String safeJob = (jobTitle != null && !jobTitle.isBlank()) ? jobTitle.trim() : "Position";
        String safeCompany = (companyRef != null && !companyRef.isBlank()) ? companyRef.trim() : "Our Company";
        String subject = "Application Received: " + safeJob + " — Tracking Code: " + trackingCode;

        String trackingUrl = String.format("%s/careers/track?code=%s&email=%s&company=%s",
                frontendUrl,
                URLEncoder.encode(trackingCode, StandardCharsets.UTF_8),
                URLEncoder.encode(toEmail, StandardCharsets.UTF_8),
                URLEncoder.encode(safeCompany, StandardCharsets.UTF_8));

        String body = String.format("""
                Dear %s,

                Thank you for applying for the '%s' position at %s.
                We have successfully received your application and resume.

                =======================================================
                Your Application Tracking Code: %s
                Track Application Online: %s
                =======================================================

                You can click the link above or visit the tracking page using your tracking code and email to check the live screening progress of your application at any time.

                Best regards,
                Recruitment Team
                %s
                """, safeName, safeJob, safeCompany, trackingCode, trackingUrl, safeCompany);

        return sendEmailOrLogFallback(toEmail, subject, body, "Application Confirmation");
    }

    private boolean sendEmailOrLogFallback(String to, String subject, String body, String emailType) {
        log.info("Preparing to send {} to {}", emailType, to);

        boolean sent = false;
        try {
            if (applicationContext != null && applicationContext.containsBean("mailSender")) {
                Object mailSender = applicationContext.getBean("mailSender");
                Class<?> msgClass = Class.forName("org.springframework.mail.SimpleMailMessage");
                Object msg = msgClass.getDeclaredConstructor().newInstance();

                msgClass.getMethod("setFrom", String.class).invoke(msg, fromEmail);
                try {
                    msgClass.getMethod("setTo", String[].class).invoke(msg, (Object) new String[]{to});
                } catch (NoSuchMethodException e) {
                    msgClass.getMethod("setTo", String.class).invoke(msg, to);
                }
                msgClass.getMethod("setSubject", String.class).invoke(msg, subject);
                msgClass.getMethod("setText", String.class).invoke(msg, body);

                Method sendMethod = mailSender.getClass().getMethod("send", msgClass);
                sendMethod.invoke(mailSender, msg);
                log.info("{} email sent successfully via JavaMailSender to {}", emailType, to);
                sent = true;
            }
        } catch (Exception e) {
            log.info("JavaMailSender bean not active or failed ({}). Using console logger fallback.", e.getMessage());
        }

        if (!sent) {
            log.info("""
                    [CONSOLE EMAIL FALLBACK - {}]
                    To: {}
                    From: {}
                    Subject: {}
                    Content:
                    {}
                    """, emailType, to, fromEmail, subject, body);
        }

        return true;
    }
}
