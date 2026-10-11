package com.airella.hrm.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Department entity — represents a department within a company.
 */
@Entity
@Table(name = "departments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"company", "jobRoles"})
@EqualsAndHashCode(of = "id")
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 20)
    private String shortCode;

    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    /** User_Backend id of the department manager. */
    @Column(name = "manager_user_id")
    private Long managerUserId;

    @Column(nullable = false)
    private Boolean active = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "department", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<JobRole> jobRoles = new ArrayList<>();

    public void addJobRole(JobRole role) {
        if (jobRoles == null) {
            jobRoles = new ArrayList<>();
        }
        jobRoles.add(role);
        role.setDepartment(this);
    }

    public void removeJobRole(JobRole role) {
        if (jobRoles != null) {
            jobRoles.remove(role);
            role.setDepartment(null);
        }
    }
}
