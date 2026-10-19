package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "recruitment_roles", uniqueConstraints = @UniqueConstraint(name = "uk_company_role", columnNames = {
        "company_id", "role_name" }))
@Getter
@Setter
@ToString(exclude = "permissions")
@EqualsAndHashCode(of = "id")
public class RecruitmentRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(name = "role_name", nullable = false, length = 50)
    private String roleName;

    @Column(length = 255)
    private String description;

    @Column(name = "is_system_default")
    private Boolean isSystemDefault;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "recruitment_role_permissions", joinColumns = @JoinColumn(name = "role_id"), inverseJoinColumns = @JoinColumn(name = "permission_id"))
    private Set<RecruitmentPermission> permissions;

    public RecruitmentRole() {
        this.isSystemDefault = false;
        this.permissions = new HashSet<>();
    }

    public RecruitmentRole(Long companyId, String roleName, String description) {
        this();
        this.companyId = companyId;
        this.roleName = roleName;
        this.description = description;
    }

    public RecruitmentRole(Long id, Long companyId, String roleName, String description, Boolean isSystemDefault, LocalDateTime createdAt, Set<RecruitmentPermission> permissions) {
        this.id = id;
        this.companyId = companyId;
        this.roleName = roleName;
        this.description = description;
        this.isSystemDefault = isSystemDefault != null ? isSystemDefault : false;
        this.createdAt = createdAt;
        this.permissions = permissions != null ? permissions : new HashSet<>();
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

    public String getRoleName() {
        return roleName;
    }

    public void setRoleName(String roleName) {
        this.roleName = roleName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getIsSystemDefault() {
        return isSystemDefault;
    }

    public void setIsSystemDefault(Boolean isSystemDefault) {
        this.isSystemDefault = isSystemDefault;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Set<RecruitmentPermission> getPermissions() {
        if (permissions == null) {
            permissions = new HashSet<>();
        }
        return permissions;
    }

    public void setPermissions(Set<RecruitmentPermission> permissions) {
        this.permissions = permissions;
    }
}
