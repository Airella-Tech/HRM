package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "interview_evaluator_assignments", uniqueConstraints = @UniqueConstraint(name = "uk_interview_evaluator", columnNames = {
        "interview_id", "employee_id" }))
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
    private Long employeeId; // references employee in hrm_db_employee

    @Column(name = "assigned_by", nullable = false)
    private Long assignedBy; // HR Manager or Recruiter who assigned

    @CreationTimestamp
    @Column(name = "assigned_at", updatable = false)
    private LocalDateTime assignedAt;

    public InterviewEvaluatorAssignment(Long companyId, Long interviewId, Long employeeId, Long assignedBy) {
        this.companyId = companyId;
        this.interviewId = interviewId;
        this.employeeId = employeeId;
        this.assignedBy = assignedBy;
    }

    public InterviewEvaluatorAssignment(Long id, Long companyId, Long interviewId, Long employeeId, Long assignedBy, LocalDateTime assignedAt) {
        this.id = id;
        this.companyId = companyId;
        this.interviewId = interviewId;
        this.employeeId = employeeId;
        this.assignedBy = assignedBy;
        this.assignedAt = assignedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public void setCompanyId(Long companyId) {
        this.companyId = companyId;
    }

    public Long getInterviewId() {
        return interviewId;
    }

    public void setInterviewId(Long interviewId) {
        this.interviewId = interviewId;
    }

    public Long getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }

    public Long getAssignedBy() {
        return assignedBy;
    }

    public void setAssignedBy(Long assignedBy) {
        this.assignedBy = assignedBy;
    }

    public LocalDateTime getAssignedAt() {
        return assignedAt;
    }

    public void setAssignedAt(LocalDateTime assignedAt) {
        this.assignedAt = assignedAt;
    }
}
