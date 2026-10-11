package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * LeaveType entity — defines types of leave (Annual, Sick, Casual, etc.).
 */
@Entity
@Table(name = "leave_types")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class LeaveType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private Integer defaultDaysPerYear;

    // Existing NOT NULL column in leave_types
    @Column(nullable = false)
    private Boolean requiresApproval = true;

    /** HR user (employees.id in hrm_db_hr) who added this leave type, and their name at the time. */
    private Long createdById;
    private String createdByName;

    private Boolean carryForward = false;
    private Integer maxCarryForwardDays = 0;

    @Column(nullable = false)
    private Boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
