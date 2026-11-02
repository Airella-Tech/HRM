
package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(
        name = "interviews",
        indexes = {
                @Index(
                        name = "idx_interview_company",
                        columnList = "company_id"
                ),
                @Index(
                        name = "idx_interview_date",
                        columnList = "interview_date"
                ),
                @Index(
                        name = "idx_interview_application",
                        columnList = "application_id"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
public class Interview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    /*
     * References the candidate application ID.
     * Candidates apply through the public Careers form,
     * so a separate candidate account ID is not required.
     *
     * No foreign key is defined because application-module
     * integration is not yet established.
     */
    @Column(name = "application_id")
    private Long applicationId;

    @Column(name = "candidate_name", nullable = false, length = 200)
    private String candidateName;

    @Column(name = "candidate_email", nullable = false, length = 254)
    private String candidateEmail;

    /*
     * Stores the job vacancy ID until full module
     * integration is established.
     */
    @Column(name = "vacancy_id")
    private Long vacancyId;

    @Column(name = "vacancy_title", nullable = false, length = 200)
    private String vacancyTitle;

    @Column(name = "interview_round", nullable = false, length = 50)
    private String interviewRound;

    @Column(name = "interview_date", nullable = false)
    private LocalDate interviewDate;

    @Column(name = "interview_time", nullable = false)
    private LocalTime interviewTime;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes = 60;

    @Column(name = "interviewer_name", length = 200)
    private String interviewerName;

    @Column(name = "interview_type", nullable = false, length = 30)
    private String interviewType;

    @Column(name = "meeting_link", length = 1000)
    private String meetingLink;

    @Column(name = "location", length = 500)
    private String location;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "Scheduled";

    @Column(name = "invitation_status", nullable = false, length = 30)
    private String invitationStatus = "Not sent";

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
