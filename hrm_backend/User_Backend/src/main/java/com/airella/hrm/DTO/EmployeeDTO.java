package com.airella.hrm.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDTO {
    private Long id;

    @NotBlank(message = "Employee ID is required")
    private String employeeId;

    @NotBlank(message = "Full name is required")
    private String fullName;

    @Email(message = "Invalid email format")
    @NotBlank(message = "Email is required")
    private String email;

    private String password; // Only for creation
    private String nic;
    private LocalDate dob;
    private String address;
    private String phone;
    private String gender;
    private Long companyId;
    private String companyName;
    private Long departmentId;
    private String departmentName;
    private String role;
    private String designation;
    private String employmentType;
    private LocalDate joiningDate;
    private LocalDate terminationDate;
    private String status;
}
