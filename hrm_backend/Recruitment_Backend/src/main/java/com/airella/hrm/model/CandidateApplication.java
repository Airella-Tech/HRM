package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Candidate application submitted for a published job vacancy.
 * Scoped by companyRef and optional companyId for multi-tenant safety.
 * Binary PDF CV is stored in CandidateApplicationDocument; extracted text is kept here for screening.
 */
@Entity
@Table(name = "candidate_applications",
        indexes = {
                @Index(name = "idx_app_company_ref", columnList = "company_ref"),
                @Index(name = "idx_app_company_id", columnList = "company_id"),
                @Index(name = "idx_app_tracking_code", columnList = "tracking_code", unique = true),
                @Index(name = "idx_app_email", columnList = "email"),
                @Index(name = "idx_app_vacancy", columnList = "vacancy_id")
        })
@Getter
@Setter
@NoArgsConstructor
public class CandidateApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Unique public tracking code (e.g. APP-A1B2C3D4) */
    @Column(name = "tracking_code", nullable = false, unique = true, length = 32)
    private String trackingCode;

    /** Company registration number or reference */
    @Column(name = "company_ref", nullable = false, length = 150)
    private String companyRef;

    /** Optional numeric company id */
    @Column(name = "company_id")
    private Long companyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vacancy_id", nullable = false)
    private JobVacancy vacancy;

    @Column(name = "candidate_name", nullable = false, length = 120)
    private String candidateName;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(length = 40)
    private String phone;

    @Column(length = 150)
    private String location;

    @Column(length = 250)
    private String education;

    @Column(name = "experience_years", nullable = false)
    private Integer experienceYears = 0;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "candidate_application_skills", joinColumns = @JoinColumn(name = "application_id"))
    @Column(name = "skill", length = 80)
    private Set<String> skills = new LinkedHashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ApplicationStatus status = ApplicationStatus.NEW;

    @Enumerated(EnumType.STRING)
    @Column(name = "eligibility_status", nullable = false, length = 30)
    private EligibilityStatus eligibilityStatus = EligibilityStatus.PENDING;

    @Column(name = "screening_score")
    private Integer screeningScore;

    @Column(name = "screening_notes", columnDefinition = "TEXT")
    private String screeningNotes;

    @Column(name = "criteria_json", columnDefinition = "TEXT")
    private String criteriaJson;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    // ── Resume Document Metadata ────────────────────────
    @Column(name = "resume_file_name", length = 255)
    private String resumeFileName;

    @Column(name = "resume_file_type", length = 100)
    private String resumeFileType = "application/pdf";

    @Column(name = "resume_file_size")
    private Long resumeFileSize;

    /**
     * Text extracted from the PDF resume via Apache PDFBox for ATS screening and skill evaluation.
     */
    @Column(name = "resume_text", columnDefinition = "TEXT")
    private String resumeText;

    @Column(name = "download_count", nullable = false)
    private Integer downloadCount = 0;

    // ── Audit & Lifecycle ────────────────────────────────
    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

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
