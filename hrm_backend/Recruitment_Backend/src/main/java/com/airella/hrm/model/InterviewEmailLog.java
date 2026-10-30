
package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "interview_email_logs",
        indexes = {
                @Index(name = "idx_interview_email_company", columnList = "company_id"),
                @Index(name = "idx_interview_email_interview", columnList = "interview_id"),
                @Index(name = "idx_interview_email_status", columnList = "status")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class InterviewEmailLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(name = "interview_id", nullable = false)
    private Long interviewId;

    @Column(name = "candidate_name", nullable = false, length = 200)
    private String candidateName;

    @Column(name = "recipient", nullable = false, length = 254)
    private String recipient;

    @Column(name = "subject", nullable = false, length = 500)
    private String subject;

    @Column(name = "email_body", nullable = false, columnDefinition = "TEXT")
    private String emailBody;

    // Sent means the SMTP server accepted the message.
    @Column(name = "status", nullable = false, length = 30)
    private String status = "Failed";

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "attempt_number", nullable = false)
    private Integer attemptNumber = 1;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
