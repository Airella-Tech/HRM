package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * LeaveApplication entity — tracks employee leave requests.
 */
@Entity
@Table(name = "leave_applications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class LeaveApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The employee's id in User_Backend (hrm_db_user.employees.id). */
    @Column(name = "user_id")
    private Long userId;

    /** Id of this database's company the record belongs to. */
    @Column(name = "company_id")
    private Long companyId;

    /** leave_types.id in hrm_db_hr — leave types are owned by HR_Backend. */
    @Column(name = "leave_type_id", nullable = false)
    private Long leaveTypeId;

    /** Leave type name when this row was saved, so it still reads correctly if HR renames or removes the type. */
    private String leaveTypeName;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Column(nullable = false)
    private Integer numberOfDays;

    @Column(length = 1000)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LeaveStatus status = LeaveStatus.PENDING;

    private String rejectionReason;

    /** User_Backend id of the HR user who approved or rejected the request. */
    @Column(name = "approved_by_user_id")
    private Long approvedByUserId;

    private LocalDateTime approvedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum LeaveStatus {
        PENDING, APPROVED, REJECTED, CANCELLED
    }
}
