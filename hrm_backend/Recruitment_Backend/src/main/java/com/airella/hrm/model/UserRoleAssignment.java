package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** "This user holds this recruitment role." */
@Entity
@Table(name = "recruitment_user_roles",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "role_id"}))
@Getter
@Setter
@NoArgsConstructor
@ToString(exclude = "role")
@EqualsAndHashCode(of = "id")
public class UserRoleAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The user's id in User_Backend. */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "company_ref", nullable = false)
    private String companyRef;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private RecruitmentRole role;

    /** The HR manager who assigned it (User_Backend id). */
    private Long assignedBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}