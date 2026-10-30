
package com.airella.hrm.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "interview_evaluator_assignments",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_interview_evaluator",
                        columnNames = {"interview_id", "employee_id"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@ToString
@EqualsAndHashCode(of = "id")
public class InterviewEvaluatorAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(name = "interview_id", nullable = false)
    private Long interviewId;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "assigned_by", nullable = false)
    private Long assignedBy;

    @CreationTimestamp
    @Column(name = "assigned_at", nullable = false, updatable = false)
    private LocalDateTime assignedAt;

    /**
     * Constructor used when creating a new evaluator assignment.
     * The database generates the ID and Hibernate generates the timestamp.
     */
    public InterviewEvaluatorAssignment(
            Long companyId,
            Long interviewId,
            Long employeeId,
            Long assignedBy) {

        this.companyId = companyId;
        this.interviewId = interviewId;
        this.employeeId = employeeId;
        this.assignedBy = assignedBy;
    }

    /**
     * Constructor useful for tests and cases where all fields are supplied.
     */
    public InterviewEvaluatorAssignment(
            Long id,
            Long companyId,
            Long interviewId,
            Long employeeId,
            Long assignedBy,
            LocalDateTime assignedAt) {

        this.id = id;
        this.companyId = companyId;
        this.interviewId = interviewId;
        this.employeeId = employeeId;
        this.assignedBy = assignedBy;
        this.assignedAt = assignedAt;
    }
}
