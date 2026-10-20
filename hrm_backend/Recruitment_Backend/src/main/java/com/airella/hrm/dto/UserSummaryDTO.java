package com.airella.hrm.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * A user as returned by User_Backend (/api/internal/users). Never contains credentials.
 */
@Data
@NoArgsConstructor
public class UserSummaryDTO {
    private Long id;
    private String employeeId;
    private String fullName;
    private String email;
    private String role;
    private String status;
    private String designation;
    private String employmentType;
    private LocalDate joiningDate;
    private LocalDate terminationDate;
    private String departmentName;
    private Long companyId;
    private String companyName;
    private String companyRegistrationNumber;
}