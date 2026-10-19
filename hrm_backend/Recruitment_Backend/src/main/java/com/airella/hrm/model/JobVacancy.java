package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "job_vacancies",
        indexes = @Index(name = "idx_vacancy_company", columnList = "company_ref"))
@Getter
@Setter
@NoArgsConstructor
public class JobVacancy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Company registration number (or name) taken from the logged-in user. */
    @Column(name = "company_ref", nullable = false, length = 150)
    private String companyRef;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 100)
    private String department;

    @Column(name = "job_type", nullable = false, length = 40)
    private String jobType;

    @Column(name = "vacancy_count", nullable = false)
    private Integer vacancyCount = 1;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String qualifications;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "job_vacancy_skills", joinColumns = @JoinColumn(name = "vacancy_id"))
    @Column(name = "skill", length = 60)
    private Set<String> requiredSkills = new LinkedHashSet<>();

    @Column(name = "experience_level", length = 50)
    private String experienceLevel;

    @Column(name = "salary_min", precision = 12, scale = 2)
    private BigDecimal salaryMin;

    @Column(name = "salary_max", precision = 12, scale = 2)
    private BigDecimal salaryMax;

    @Column(nullable = false)
    private LocalDate deadline;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private VacancyStatus status = VacancyStatus.DRAFT;

    /** User_Backend id of the person who created it. */
    @Column(name = "created_by")
    private Long createdBy;
        /** Why the approver sent it back (cleared when it is submitted again). */
    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    /** User_Backend id of the person who approved or rejected it. */
    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
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