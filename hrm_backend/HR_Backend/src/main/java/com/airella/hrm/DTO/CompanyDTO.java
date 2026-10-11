package com.airella.hrm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for Company data.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompanyDTO {

    private Long id;

    @NotBlank(message = "Company name is required")
    private String companyName;

    @NotBlank(message = "Registration number is required")
    private String registrationNumber;

    private String email;
    private String phone;
    private String address;
    private String website;
    private String status;
    private String rejectionReason;
    private Integer employeeCount;
}
