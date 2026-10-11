package com.airella.hrm.dto;

import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * The logged-in employee's profile page. Personal and employment details come from
 * User_Backend (hrm_db_user.employees); the reporting manager is their department's manager.
 */
@Data
@NoArgsConstructor
public class EmployeeProfileDTO {
    private Long id;
    private String employeeId;
    private String fullName;
    private String email;
    private String role;
    private String status;
    private String designation;
    private String employmentType;
    private LocalDate joiningDate;
    private String departmentName;
    private String companyName;
    private String reportingManagerName;

    private String nic;
    private LocalDate dob;
    private String gender;
    private String phone;
    private String address;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelation;

    /** What an employee may change on their own profile; employment details are managed by HR. */
    @Data
    @NoArgsConstructor
    public static class UpdateRequest {
        @Size(max = 20, message = "Phone number is too long")
        @Pattern(regexp = "^$|^[0-9+()\\-\\s]{7,20}$", message = "Enter a valid phone number")
        private String phone;

        @Size(max = 255, message = "Address is too long")
        private String address;

        @Past(message = "Date of birth must be in the past")
        private LocalDate dob;

        @Pattern(regexp = "^$|^(?i)(MALE|FEMALE|OTHER)$", message = "Gender must be Male, Female or Other")
        private String gender;

        @Size(max = 100, message = "Emergency contact name is too long")
        private String emergencyContactName;

        @Size(max = 20, message = "Emergency contact phone is too long")
        @Pattern(regexp = "^$|^[0-9+()\\-\\s]{7,20}$", message = "Enter a valid emergency contact phone number")
        private String emergencyContactPhone;

        @Size(max = 50, message = "Relationship is too long")
        private String emergencyContactRelation;
    }
}
