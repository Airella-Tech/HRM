package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Salary HR has set for a job role and employment type, e.g.
 * "Software Engineer, Full-Time: basic 120,000 + 15,000 allowance - 5,000 deduction per month".
 * Every employee whose designation and employment type match the row is paid from it,
 * so changing a row updates all employees of that job role.
 */
@Entity
@Table(name = "basic_payments",
        uniqueConstraints = @UniqueConstraint(columnNames = {"job_role_id", "employment_type_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"company", "department", "jobRole", "employmentType"})
@EqualsAndHashCode(of = "id")
public class BasicPayment {

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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Period period;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal basicSalary;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal allowance = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal deduction = BigDecimal.ZERO;

    /** basic + allowance - deduction, worked out on save. */
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalSalary;

    private Long createdById;
    private String createdByName;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum Period {
        MONTHLY, WEEKLY, ANNUAL
    }
}
