package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * An extra allowance or deduction for one employee on top of their job role's basic payment,
 * e.g. "Fuel allowance +8,000" or "Salary advance -10,000". Employees with no rows here are
 * paid exactly their basic payment.
 * <p>
 * Employee ids differ between the service databases, so the employee is identified by email
 * (with their employee code / name kept as a snapshot for display).
 */
@Entity
@Table(name = "additional_payments", indexes = @Index(columnList = "company_id, employee_email"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"company"})
@EqualsAndHashCode(of = "id")
public class AdditionalPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "employee_email", nullable = false)
    private String employeeEmail;

    private String employeeCode;
    private String employeeName;

    /** Id of the employee's allowance request this row came from (null when HR typed it in). */
    @Column(name = "source_request_id", unique = true)
    private Long sourceRequestId;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    private Long createdById;
    private String createdByName;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum Type {
        ALLOWANCE, DEDUCTION
    }
}
