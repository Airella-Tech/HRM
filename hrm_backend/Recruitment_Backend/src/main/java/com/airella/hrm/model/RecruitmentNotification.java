package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** One in-app notification for one user (shown in the bell for recruiters). */
@Entity
@Table(name = "recruitment_notifications",
        indexes = @Index(name = "idx_rec_notif_user", columnList = "user_id, created_at"))
@Getter
@Setter
@NoArgsConstructor
public class RecruitmentNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Company key (registration number) the notification belongs to. */
    @Column(name = "company_ref")
    private String companyRef;

    /** The person who should see it (their id in User_Backend). */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String message;

    /** e.g. VACANCY_SUBMITTED, VACANCY_APPROVED, VACANCY_REJECTED, VACANCY_PUBLISHED */
    private String category;

    /** Frontend page to open when the notification is clicked. */
    private String link;

    /** The vacancy this is about. */
    @Column(name = "ref_id")
    private Long refId;

    @Column(name = "is_read", nullable = false)
    private boolean seen = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}