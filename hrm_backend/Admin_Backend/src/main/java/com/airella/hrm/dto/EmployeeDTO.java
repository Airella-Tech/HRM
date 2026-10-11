package com.airella.hrm.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Data Transfer Object for Employee data.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDTO {

    private Long id;

    @NotBlank(message = "Employee ID is required")
    private String employeeId;

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String email;

    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    private String nic;
    private LocalDate dob;
    private String address;
    private String phone;
    private String gender;
    private String role;
    private String designation;
    private LocalDate joiningDate;
    private LocalDate terminationDate;
    private String status;

    // Company info
    private Long companyId;
    private String companyName;

    // Department info
    private Long departmentId;
    private String departmentName;
}
