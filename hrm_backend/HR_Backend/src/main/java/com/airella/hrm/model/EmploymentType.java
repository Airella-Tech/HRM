package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * An employment arrangement HR has defined for the company (Full-Time, Internship, ...).
 * Job role leave entitlements are set per employment type.
 */
@Entity
@Table(name = "employment_types")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"company"})
@EqualsAndHashCode(of = "id")
public class EmploymentType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false)
    private Boolean active = true;

    /** HR user (employees.id in hrm_db_hr) who added it, and their name at the time. */
    private Long createdById;
    private String createdByName;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
