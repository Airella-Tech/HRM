package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * "This user may evaluate this interview / this candidate's application."
 * Ids are plain numbers so this does not depend on the interview/application tables.
 */
@Entity
@Table(name = "recruitment_interviewer_assignments")
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(of = "id")
public class InterviewerAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_ref", nullable = false)
    private String companyRef;

    /** The interviewer's id in User_Backend. */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Set when assigned to one specific interview. */
    @Column(name = "interview_id")
    private Long interviewId;

    /** Set when assigned to a candidate's application in general. */
    @Column(name = "application_id")
    private Long applicationId;

    private Long assignedBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}