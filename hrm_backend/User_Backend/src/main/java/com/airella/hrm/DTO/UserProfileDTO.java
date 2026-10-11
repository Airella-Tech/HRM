package com.airella.hrm.DTO;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * A user's own profile, including personal details. Served only to Employee_Backend for the
 * employee's profile page — unlike {@link UserSummaryDTO}, which every backend uses.
 */
@Data
@NoArgsConstructor
public class UserProfileDTO {
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
    private String companyRegistrationNumber;

    private String nic;
    private LocalDate dob;
    private String gender;
    private String phone;
    private String address;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelation;

    /** The personal details an employee may change themselves; employment details stay with HR. */
    @Data
    @NoArgsConstructor
    public static class UpdateRequest {
        private String phone;
        private String address;
        private LocalDate dob;
        private String gender;
        private String emergencyContactName;
        private String emergencyContactPhone;
        private String emergencyContactRelation;
    }
}
