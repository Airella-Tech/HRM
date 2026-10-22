package com.airella.hrm.dto;

import com.airella.hrm.model.VacancyStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record VacancyDTO(
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
        VacancyStatus status,
        String rejectionReason,
        Long reviewedBy,
        LocalDateTime reviewedAt,
        LocalDateTime publishedAt,
        LocalDateTime closedAt,
        Long createdBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}