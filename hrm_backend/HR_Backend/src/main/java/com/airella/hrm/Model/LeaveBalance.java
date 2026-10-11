package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * LeaveBalance entity — tracks leave balance per employee per type per year.
 */
@Entity
@Table(name = "leave_balances")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"leaveType"})
@EqualsAndHashCode(of = "id")
public class LeaveBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The employee's id in User_Backend (hrm_db_user.employees.id). */
    @Column(name = "user_id")
    private Long userId;

    /** Id of this database's company the record belongs to. */
    @Column(name = "company_id")
    private Long companyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leave_type_id", nullable = false)
    private LeaveType leaveType;

    @Column(nullable = false)
    private Integer year;

    @Column(nullable = false)
    private Integer totalDays;

    @Column(nullable = false)
    private Integer usedDays = 0;

    @Column(nullable = false)
    private Integer remainingDays;
}
