package com.airella.hrm.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employees")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Employee {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String employeeId;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
    @Column(nullable = false)
    private String password;

    private String nic;
    private LocalDate dob;
    private String address;
    private String phone;

    @Enumerated(EnumType.STRING)
    private Gender gender;

    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Department department;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.EMPLOYEE; // ADMIN, HR_MANAGER, EMPLOYEE

    private String designation;

    // One of the employment types HR defines (hrm_db_hr.employment_types), stored by name
    @Column(name = "employment_type", length = 100)
    private String employmentType;

    private LocalDate joiningDate;
    private LocalDate terminationDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EmployeeStatus status = EmployeeStatus.ACTIVE; // ACTIVE, INACTIVE, TERMINATED

    private String resetPasswordToken;
    private LocalDateTime resetPasswordTokenExpiry;

    @Column(name = "must_change_password")
    private Boolean mustChangePassword = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum Gender {
        MALE, FEMALE, OTHER
    }

    public enum Role {
        ADMIN, HR_MANAGER, EMPLOYEE
    }

    public enum EmployeeStatus {
        ACTIVE, INACTIVE, TERMINATED
    }
}
