
package com.airella.hrm.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record JobOfferRequestDTO(

        // Links the job offer to the candidate's application
        Long applicationId,

        @NotBlank(message = "Candidate name is required")
        @Size(max = 150)
        String candidateName,

        @NotBlank(message = "Candidate email is required")
        @Email(message = "Enter a valid email address")
        @Size(max = 180)
        String email,

        @NotBlank(message = "Job title is required")
        @Size(max = 150)
        String jobTitle,

        @Size(max = 100)
        String department,

        @Size(max = 50)
        String employmentType,

        @NotNull(message = "Salary is required")
        @DecimalMin(value = "0.01", message = "Salary must be greater than zero")
        BigDecimal salary,

        @NotNull(message = "Start date is required")
        LocalDate startDate,

        @NotNull(message = "Expiry date is required")
        LocalDate expiryDate,

        @Size(max = 5000)
        String notes
) {}
