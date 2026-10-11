package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * An allowance an employee asks HR for (e.g. "Medical claim, 12,500"), with a supporting PDF.
 * HR approves or rejects it from the HR dashboard; the decision and HR's comment stay on the
 * row, so it is also the employee's allowance request history.
 */
@Entity
@Table(name = "allowance_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class AllowanceRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The employee's id in User_Backend (hrm_db_user.employees.id). */
    @Column(name = "user_id")
    private Long userId;

    /** Id of this database's company the record belongs to. */
    @Column(name = "company_id")
    private Long companyId;

    /** Snapshot of the employee, and the key HR_Backend uses to find them (ids differ per database). */
    @Column(nullable = false)
    private String employeeEmail;
    private String employeeCode;
    private String employeeName;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(length = 1000)
    private String description;

    /** Supporting PDF, kept in allowance_request_documents. */
    private String documentName;
    private Long documentSize;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    /** HR's comment; required when rejecting. */
    @Column(length = 1000)
    private String reviewComment;
    private String reviewedByName;
    private LocalDateTime reviewedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum Status {
        PENDING, APPROVED, REJECTED
    }
}
