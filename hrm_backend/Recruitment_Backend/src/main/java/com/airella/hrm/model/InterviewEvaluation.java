
package com.airella.hrm.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "interview_evaluations",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_interview_evaluation_evaluator",
                        columnNames = {"interview_id", "evaluator_id"}
                )
        },
        indexes = {
                @Index(name = "idx_evaluation_company", columnList = "company_id"),
                @Index(name = "idx_evaluation_interview", columnList = "interview_id"),
                @Index(name = "idx_evaluation_evaluator", columnList = "evaluator_id"),
                @Index(name = "idx_evaluation_status", columnList = "status")
        }
)
public class InterviewEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(name = "interview_id", nullable = false)
    private Long interviewId;

    @Column(name = "candidate_id")
    private Long candidateId;

    @Column(name = "evaluator_id", nullable = false)
    private Long evaluatorId;

    @Column(name = "technical_knowledge")
    private Integer technicalKnowledge;

    @Column(name = "problem_solving")
    private Integer problemSolving;

    @Column(name = "communication")
    private Integer communication;

    @Column(name = "role_specific_skills")
    private Integer roleSpecificSkills;

    @Column(name = "professionalism")
    private Integer professionalism;

    @Column(columnDefinition = "TEXT")
    private String strengths;

    @Column(name = "areas_for_improvement", columnDefinition = "TEXT")
    private String areasForImprovement;

    @Column(columnDefinition = "TEXT")
    private String comments;

    @Column(length = 40)
    private String recommendation;

    @Column(nullable = false, length = 20)
    private String status = "DRAFT";

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public InterviewEvaluation() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCompanyId() { return companyId; }
    public void setCompanyId(Long companyId) { this.companyId = companyId; }

    public Long getInterviewId() { return interviewId; }
    public void setInterviewId(Long interviewId) { this.interviewId = interviewId; }

    public Long getCandidateId() { return candidateId; }
    public void setCandidateId(Long candidateId) { this.candidateId = candidateId; }

    public Long getEvaluatorId() { return evaluatorId; }
    public void setEvaluatorId(Long evaluatorId) { this.evaluatorId = evaluatorId; }

    public Integer getTechnicalKnowledge() { return technicalKnowledge; }
    public void setTechnicalKnowledge(Integer value) { this.technicalKnowledge = value; }

    public Integer getProblemSolving() { return problemSolving; }
    public void setProblemSolving(Integer value) { this.problemSolving = value; }

    public Integer getCommunication() { return communication; }
    public void setCommunication(Integer value) { this.communication = value; }

    public Integer getRoleSpecificSkills() { return roleSpecificSkills; }
    public void setRoleSpecificSkills(Integer value) { this.roleSpecificSkills = value; }

    public Integer getProfessionalism() { return professionalism; }
    public void setProfessionalism(Integer value) { this.professionalism = value; }

    public String getStrengths() { return strengths; }
    public void setStrengths(String strengths) { this.strengths = strengths; }

    public String getAreasForImprovement() { return areasForImprovement; }
    public void setAreasForImprovement(String value) { this.areasForImprovement = value; }

    public String getComments() { return comments; }
    public void setComments(String comments) { this.comments = comments; }

    public String getRecommendation() { return recommendation; }
    public void setRecommendation(String recommendation) { this.recommendation = recommendation; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
