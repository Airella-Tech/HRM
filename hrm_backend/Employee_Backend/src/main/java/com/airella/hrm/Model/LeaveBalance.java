package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * LeaveBalance entity — tracks leave balance per employee per type per year.
 */
@Entity
@Table(name = "leave_balances")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
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

    /** leave_types.id in hrm_db_hr — leave types are owned by HR_Backend. */
    @Column(name = "leave_type_id", nullable = false)
    private Long leaveTypeId;

    /** Leave type name when this row was saved, so it still reads correctly if HR renames or removes the type. */
    private String leaveTypeName;

    @Column(nullable = false)
    private Integer year;

    @Column(nullable = false)
    private Integer totalDays;

    @Column(nullable = false)
    private Integer usedDays = 0;

    @Column(nullable = false)
    private Integer remainingDays;

    // Existing NOT NULL column in leave_balances
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
