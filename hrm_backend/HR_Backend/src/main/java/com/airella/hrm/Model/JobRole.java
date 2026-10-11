package com.airella.hrm.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * JobRole entity — represents a defined job title and its base salary within a department.
 */
@Entity
@Table(name = "job_roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"department"})
@EqualsAndHashCode(of = "id")
public class JobRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String jobTitle;

    @Column(name = "title")
    private String title;

    @Column(name = "active")
    private Boolean active = true;

    private String description;

    @Column(nullable = false)
    private Double basicSalary;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void prePersist() {
        if (this.title == null && this.jobTitle != null) {
            this.title = this.jobTitle;
        }
        if (this.jobTitle == null && this.title != null) {
            this.jobTitle = this.title;
        }
        if (this.active == null) {
            this.active = true;
        }
        if (this.basicSalary == null) {
            this.basicSalary = 0.0;
        }
    }
}
