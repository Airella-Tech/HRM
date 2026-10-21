package com.airella.hrm.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** What a visitor on the Careers page is allowed to see. No internal fields. */
public record PublicVacancyDTO(
        Long id,
        String title,
        String department,
        String jobType,
        Integer vacancyCount,
        String description,
        String qualifications,
        List<String> requiredSkills,
        String experienceLevel,
        BigDecimal salaryMin,
        BigDecimal salaryMax,
        LocalDate deadline,
        LocalDateTime publishedAt
) {
}