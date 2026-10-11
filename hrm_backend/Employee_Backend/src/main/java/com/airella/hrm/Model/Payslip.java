package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Payslip entity — monthly payslip records.
 */
@Entity
@Table(name = "payslips", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "month", "year"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class Payslip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The employee's id in User_Backend (hrm_db_user.employees.id). */
    @Column(name = "user_id")
    private Long userId;

    /** Id of this database's company the record belongs to. */
    @Column(name = "company_id")
    private Long companyId;

    @Column(nullable = false)
    private Integer month;

    @Column(nullable = false)
    private Integer year;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal basicSalary;

    @Column(precision = 10, scale = 2)
    private BigDecimal totalAllowances = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    private BigDecimal totalDeductions = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal grossSalary;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal netSalary;

    private Integer workingDays;
    private Integer presentDays;
    private Integer absentDays;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PayslipStatus status = PayslipStatus.GENERATED;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum PayslipStatus {
        GENERATED, PAID
    }
}
