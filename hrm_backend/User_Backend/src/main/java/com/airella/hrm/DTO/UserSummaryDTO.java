package com.airella.hrm.DTO;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Non-sensitive view of a user, served to the other backends (HR, Employee, Admin) so they
 * can show and scope their own data. Never carries credentials or personal details.
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
