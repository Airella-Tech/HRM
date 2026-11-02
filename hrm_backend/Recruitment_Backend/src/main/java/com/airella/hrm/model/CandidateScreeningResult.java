package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Historical screening decision and evaluation breakdown for a candidate application.
 * Persists scores, mandatory requirement evaluations, explainable breakdown,
 * and decision attribution without overwriting past history when configs change.
 */
@Entity
@Table(name = "candidate_screening_results",
        indexes = {
                @Index(name = "idx_csr_application_id", columnList = "application_id"),
                @Index(name = "idx_csr_vacancy_id", columnList = "vacancy_id"),
                @Index(name = "idx_csr_company_ref", columnList = "company_ref")
        })
@Getter
@Setter
@NoArgsConstructor
public class CandidateScreeningResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "vacancy_id", nullable = false)
    private Long vacancyId;

    @Column(name = "company_ref", nullable = false, length = 150)
    private String companyRef;

    /** Version of VacancyScreeningConfig applied during this evaluation */
    @Column(name = "config_version", nullable = false)
    private Integer configVersion = 1;

    /** Weighted overall suitability score (0.0 to 100.0) */
    @Column(name = "overall_score", nullable = false)
    private Double overallScore = 0.0;

    /** Criterion Score: Required & preferred skills (0 - 100) */
    @Column(name = "skills_score", nullable = false)
    private Integer skillsScore = 0;

    /** Criterion Score: Relevant work experience (0 - 100) */
    @Column(name = "experience_score", nullable = false)
    private Integer experienceScore = 0;

    /** Criterion Score: Educational qualifications (0 - 100) */
    @Column(name = "qualifications_score", nullable = false)
    private Integer qualificationsScore = 0;

    /** Criterion Score: Job-related CV evidence and responsibilities (0 - 100) */
    @Column(name = "evidence_score", nullable = false)
    private Integer evidenceScore = 0;

    /** Status for mandatory skills requirement: MET, UNMET, UNKNOWN, NOT_APPLICABLE */
    @Column(name = "mandatory_skills_met", nullable = false, length = 30)
    private String mandatorySkillsMet = "MET";

    /** Status for mandatory experience requirement: MET, UNMET, UNKNOWN, NOT_APPLICABLE */
    @Column(name = "mandatory_experience_met", nullable = false, length = 30)
    private String mandatoryExperienceMet = "MET";

    /** Status for mandatory qualification requirement: MET, UNMET, UNKNOWN, NOT_APPLICABLE */
    @Column(name = "mandatory_qualifications_met", nullable = false, length = 30)
    private String mandatoryQualificationsMet = "MET";

    /** True if all configured mandatory requirements are verified as MET */
    @Column(name = "all_mandatory_met", nullable = false)
    private Boolean allMandatoryMet = true;

    /** True if any mandatory requirement could not be verified due to incomplete/unclear CV evidence */
    @Column(name = "has_unknown_mandatory", nullable = false)
    private Boolean hasUnknownMandatory = false;

    /**
     * Screening recommendation:
     * - RECOMMENDED_FOR_SHORTLIST (Met mandatory & score >= minimum)
     * - REQUIRES_MANUAL_REVIEW (Missing or ambiguous evidence in mandatory or key areas)
     * - NOT_RECOMMENDED (Unmet mandatory requirement or score below minimum)
     */
    @Column(name = "recommendation", nullable = false, length = 50)
    private String recommendation = "REQUIRES_MANUAL_REVIEW";

    /** True if candidate was automatically shortlisted by the automated pipeline */
    @Column(name = "auto_shortlisted", nullable = false)
    private Boolean autoShortlisted = false;

    /**
     * Source of shortlisting or screening recommendation:
     * - SYSTEM_AUTOMATED
     * - RECRUITER_MANUAL
     * - PENDING_REVIEW
     */
    @Column(name = "decision_source", nullable = false, length = 50)
    private String decisionSource = "SYSTEM_AUTOMATED";

    /** Summary note or reason justifying the screening result */
    @Column(name = "decision_reason", length = 1000)
    private String decisionReason;

    /**
     * Detailed JSON breakdown:
     * - matchedSkills: List<String>
     * - missingRequiredSkills: List<String>
     * - missingPreferredSkills: List<String>
     * - experienceEvidence: { candidateYears, requiredYears, matchedKeywords }
     * - educationEvidence: { detectedQualifications, requiredLevel, matched }
     * - jobEvidenceDetails: { matchedResponsibilities, extractedSnippets }
     * - reviewReasons: List<String>
     */
    @Column(name = "breakdown_json", columnDefinition = "TEXT")
    private String breakdownJson;

    @Column(name = "evaluated_at", nullable = false)
    private LocalDateTime evaluatedAt;

    @Column(name = "evaluated_by")
    private Long evaluatedBy;

    @PrePersist
    void onCreate() {
        if (evaluatedAt == null) {
            evaluatedAt = LocalDateTime.now();
        }
    }
}
