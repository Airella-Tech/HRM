package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "recruitment_permissions")
@Getter
@Setter
@NoArgsConstructor
@ToString
@EqualsAndHashCode(of = "id")
public class RecruitmentPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "permission_code", unique = true, nullable = false, length = 60)
    private String permissionCode;

    @Column(nullable = false, length = 30)
    private String category;

    @Column(nullable = false, length = 255)
    private String description;

    public RecruitmentPermission(String permissionCode, String category, String description) {
        this.permissionCode = permissionCode;
        this.category = category;
        this.description = description;
    }

    public RecruitmentPermission(Long id, String permissionCode, String category, String description) {
        this.id = id;
        this.permissionCode = permissionCode;
        this.category = category;
        this.description = description;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPermissionCode() {
        return permissionCode;
    }

    public void setPermissionCode(String permissionCode) {
        this.permissionCode = permissionCode;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
