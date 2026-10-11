package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * AuditLog entity — records system actions for auditing.
 * Simplified for microservice boundaries (no direct references to Employee/Company entities).
 */
@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@EqualsAndHashCode(of = "id")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String action;

    @Column(nullable = false)
    private String entity;

    @Column(name = "entity_type")
    private String entityType;

    private Long entityId;

    @Column(length = 1000)
    private String description;

    @Column(name = "performed_by")
    private String performedBy = "ADMIN";

    private Long userId;
    
    private String userEmail;

    private Long companyId;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
