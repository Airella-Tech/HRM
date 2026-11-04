
package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "interview_round_decisions",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_interview_round_decision",
                        columnNames = {"company_id", "interview_id"}
                )
        },
        indexes = {
                @Index(
                        name = "idx_round_decision_application",
                        columnList = "company_id, application_id"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
public class InterviewRoundDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "interview_id", nullable = false)
    private Long interviewId;

    @Column(name = "interview_round", nullable = false, length = 100)
    private String interviewRound;

    @Column(name = "manager_id", nullable = false)
    private Long managerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Decision decision;

    @Column(columnDefinition = "TEXT")
    private String comments;

    @Column(name = "decided_at", nullable = false)
    private LocalDateTime decidedAt;

    @PrePersist
    protected void onCreate() {
        decidedAt = LocalDateTime.now();
    }

    public enum Decision {
        APPROVED,
        REJECTED
    }
}
