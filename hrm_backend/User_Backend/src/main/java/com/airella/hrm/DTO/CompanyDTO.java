package com.airella.hrm.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompanyDTO {
    private Long id;

    @NotBlank(message = "Company name is required")
    private String companyName;

    @NotBlank(message = "Registration number is required")
    private String registrationNumber;

    @Email(message = "Invalid email format")
    private String email;

    private String phone;
    private String address;
    private String website;
    private String status;
    private String rejectionReason;
}
