package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Notification entity — system notifications for employees.
 */
@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"company"})
@EqualsAndHashCode(of = "id")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    /** The employee's id in User_Backend (hrm_db_user.employees.id). */
    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false)
    private Boolean isRead = false;

    /**
     * What the notification is about (LEAVE_REQUEST, ALLOWANCE_REQUEST, LEAVE_APPROVED, LEAVE_REJECTED,
     * ALLOWANCE_APPROVED, ALLOWANCE_REJECTED, BIRTHDAY, BIRTHDAY_WISH, PAYSLIP ...). Kept as plain text
     * (not an enum) so new kinds never need a database constraint change.
     */
    @Column(length = 40)
    private String category;

    /** Front-end route opened when the notification is clicked; null = not clickable (e.g. birthdays). */
    @Column(length = 255)
    private String link;

    /** Id of the leave / allowance request this notification is about. */
    @Column(name = "ref_id")
    private Long refId;

    /** Stops the same notification being created twice for one recipient (e.g. one birthday per day). */
    @Column(name = "dedupe_key", length = 120)
    private String dedupeKey;

    // ── Who the notification is about (used by birthday notifications) ──
    @Column(name = "subject_name")
    private String subjectName;
    @Column(name = "subject_employee_code", length = 60)
    private String subjectEmployeeCode;
    @Column(name = "subject_department")
    private String subjectDepartment;
    @Column(name = "subject_job_role")
    private String subjectJobRole;

    /** Set when the person deletes it from their list (kept so it is never re-created). null = not deleted. */
    @Column(name = "deleted")
    private Boolean deleted = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum NotificationType {
        LEAVE_APPROVAL, LEAVE_REJECTION, ATTENDANCE, PAYROLL, GENERAL, COMPANY_REQUEST
    }
}
