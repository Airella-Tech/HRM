package com.affin.hrm.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime; // <-- Import this
import org.hibernate.annotations.CreationTimestamp; // <-- Import this
import org.hibernate.annotations.UpdateTimestamp; // <-- Import this

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private String fullName;
    private String email;
    private String password;
    private String nic;
    private LocalDate dob;
    private String address;
    private String gender;
    private String department;
    private String role;
    private String employeeId;

    // --- THIS IS THE FIX ---

    @CreationTimestamp // Automatically sets the value on creation
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt; // <-- Change type to LocalDateTime

    @UpdateTimestamp // Automatically updates the value on update
    @Column(nullable = false)
    private LocalDateTime updatedAt; // <-- Change type to LocalDateTime
}