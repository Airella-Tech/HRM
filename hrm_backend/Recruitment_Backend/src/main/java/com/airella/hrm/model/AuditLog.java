package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * AuditLog entity — records recruitment actions for auditing.
 */
@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String action;

    @Column(nullable = false)
    private String entity;

    private Long entityId;

    @Column(length = 1000)
    private String description;

    /** The acting user's id in User_Backend. */
    @Column(name = "user_id")
    private Long userId;

    /** Company key (registration number) this action belongs to. */
    @Column(name = "company_ref")
    private String companyRef;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}