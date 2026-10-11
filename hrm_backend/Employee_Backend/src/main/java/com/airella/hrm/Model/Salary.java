package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Salary entity — stores salary structure for an employee.
 */
@Entity
@Table(name = "salaries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class Salary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The employee's id in User_Backend (hrm_db_user.employees.id). */
    // Sent to and from HR_Backend as "employeeId" (its SalaryDTO)
    @com.fasterxml.jackson.annotation.JsonProperty("employeeId")
    @com.fasterxml.jackson.annotation.JsonAlias("userId")
    @Column(name = "user_id", unique = true)
    private Long userId;

    /** Id of this database's company the record belongs to. */
    @Column(name = "company_id")
    private Long companyId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal basicSalary;

    @Column(precision = 10, scale = 2)
    private BigDecimal houseAllowance = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    private BigDecimal transportAllowance = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    private BigDecimal medicalAllowance = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    private BigDecimal otherAllowances = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    private BigDecimal tax = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    private BigDecimal providentFund = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    private BigDecimal otherDeductions = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal grossSalary;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal netSalary;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
