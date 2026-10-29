package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "user_recruitment_roles",
    uniqueConstraints = @UniqueConstraint(name = "uk_user_recruitment_role", columnNames = {"company_id", "user_id", "role_id"})
)
@Getter
@Setter
@NoArgsConstructor
@ToString(exclude = "role")
@EqualsAndHashCode(of = "id")
public class UserRecruitmentRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false)
    private RecruitmentRole role;

    @CreationTimestamp
    @Column(name = "assigned_at", updatable = false)
    private LocalDateTime assignedAt;

    public UserRecruitmentRole(Long companyId, Long userId, RecruitmentRole role) {
        this.companyId = companyId;
        this.userId = userId;
        this.role = role;
    }

    public UserRecruitmentRole(Long id, Long companyId, Long userId, RecruitmentRole role, LocalDateTime assignedAt) {
        this.id = id;
        this.companyId = companyId;
        this.userId = userId;
        this.role = role;
        this.assignedAt = assignedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public void setCompanyId(Long companyId) {
        this.companyId = companyId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public RecruitmentRole getRole() {
        return role;
    }

    public void setRole(RecruitmentRole role) {
        this.role = role;
    }

    public LocalDateTime getAssignedAt() {
        return assignedAt;
    }

    public void setAssignedAt(LocalDateTime assignedAt) {
        this.assignedAt = assignedAt;
    }
}
