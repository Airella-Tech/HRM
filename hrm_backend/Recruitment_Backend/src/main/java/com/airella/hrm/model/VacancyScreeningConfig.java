package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Vacancy-specific screening configuration.
 * Configures the percentage weights for evaluation categories, mandatory requirements,
 * minimum qualification score, and automatic shortlisting policy.
 * Scoped by companyRef and vacancyId for strict multi-company isolation.
 */
@Entity
@Table(name = "vacancy_screening_configs",
        indexes = {
                @Index(name = "idx_vsc_vacancy_id", columnList = "vacancy_id", unique = true),
                @Index(name = "idx_vsc_company_ref", columnList = "company_ref")
        })
@Getter
@Setter
@NoArgsConstructor
public class VacancyScreeningConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vacancy_id", nullable = false, unique = true)
    private Long vacancyId;

    @Column(name = "company_ref", nullable = false, length = 150)
    private String companyRef;

    /**
     * Percentage weight for skills evaluation (0-100).
     */
    @Column(name = "skills_weight", nullable = false)
    private Integer skillsWeight = 40;

    /**
     * Percentage weight for relevant work experience (0-100).
     */
    @Column(name = "experience_weight", nullable = false)
    private Integer experienceWeight = 25;

    /**
     * Percentage weight for educational qualifications (0-100).
     */
    @Column(name = "qualifications_weight", nullable = false)
    private Integer qualificationsWeight = 20;

    /**
     * Percentage weight for job-related CV evidence & responsibilities (0-100).
     */
    @Column(name = "evidence_weight", nullable = false)
    private Integer evidenceWeight = 15;

    /**
     * Minimum overall score required for automated shortlisting eligibility (e.g., 75%).
     */
    @Column(name = "minimum_score", nullable = false)
    private Integer minimumScore = 75;

    /**
     * When true, candidates meeting all mandatory requirements and reaching minimum_score
     * are automatically transitioned to SHORTLISTED status upon evaluation.
     */
    @Column(name = "auto_shortlist_enabled", nullable = false)
    private Boolean autoShortlistEnabled = false;

    /**
     * Structured criteria specification in JSON format.
     * Contains:
     * - requiredSkills: [{ name: "Java", mandatory: true, aliases: ["Core Java", "JDK"] }]
     * - preferredSkills: ["Docker", "AWS"]
     * - minExperienceYears: 3
     * - experienceMandatory: true
     * - experienceKeywords: ["REST API", "Spring Boot", "Microservices"]
     * - requiredDegreeLevel: "BACHELORS"
     * - educationMandatory: true
     * - preferredQualifications: ["AWS Certified Solutions Architect"]
     * - jobEvidenceKeywords: ["architecture", "leadership", "design"]
     * - evidenceMandatory: false
     */
    @Column(name = "criteria_json", columnDefinition = "TEXT")
    private String criteriaJson;

    /**
     * Configuration revision version to support historical auditing of screening outcomes.
     */
    @Column(name = "config_version", nullable = false)
    private Integer configVersion = 1;

    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "updated_by")
    private Long updatedBy;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
