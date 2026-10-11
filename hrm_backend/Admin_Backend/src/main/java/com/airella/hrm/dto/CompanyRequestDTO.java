package com.airella.hrm.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for public company registration request submission.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompanyRequestDTO {

    @NotBlank(message = "Company name is required")
    private String companyName;

    @NotBlank(message = "Registration number is required")
    private String registrationNumber;

    @NotBlank(message = "Company email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Phone number is required")
    private String phone;

    @NotBlank(message = "Address is required")
    private String address;

    private String website;

    @NotBlank(message = "Industry is required")
    private String industry;

    @NotNull(message = "Estimated employee count is required")
    private Integer employeeCount;

    @NotBlank(message = "Contact person name is required")
    private String contactPersonName;

    private String contactPersonRole;
    private String notes;
}
