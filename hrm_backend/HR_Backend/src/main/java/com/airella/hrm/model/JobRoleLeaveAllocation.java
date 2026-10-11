package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * How much of a leave type a job role gets for a given employment type,
 * e.g. "Software Engineer, Full-Time: 14 days of Annual Leave per year".
 */
@Entity
@Table(name = "job_role_leave_allocations",
        uniqueConstraints = @UniqueConstraint(columnNames = {"job_role_id", "employment_type_id", "leave_type_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"company", "department", "jobRole", "employmentType", "leaveType"})
@EqualsAndHashCode(of = "id")
public class JobRoleLeaveAllocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_role_id", nullable = false)
    private JobRole jobRole;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employment_type_id", nullable = false)
    private EmploymentType employmentType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leave_type_id", nullable = false)
    private LeaveType leaveType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Period period;

    /** Number of days granted per period; halves allowed (e.g. 1.5 days per month). */
    @Column(nullable = false)
    private Double days;

    private Long createdById;
    private String createdByName;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum Period {
        ANNUAL, MONTHLY, WEEKLY
    }
}
