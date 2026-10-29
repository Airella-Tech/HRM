package com.airella.hrm.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record VacancyRequestDTO(
        @NotBlank @Size(max = 120) String title,
        @NotBlank @Size(max = 100) String department,
        @NotBlank @Size(max = 40) String jobType,
        @NotNull @Min(1) Integer vacancyCount,
        @NotBlank String description,
        @NotBlank String qualifications,
        List<@Size(max = 60) String> requiredSkills,
        @Size(max = 50) String experienceLevel,
        @DecimalMin("0.0") BigDecimal salaryMin,
        @DecimalMin("0.0") BigDecimal salaryMax,
        @NotNull @Future LocalDate deadline
) {
}