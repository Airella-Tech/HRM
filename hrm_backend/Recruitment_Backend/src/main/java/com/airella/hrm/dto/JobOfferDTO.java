
package com.airella.hrm.dto;

import com.airella.hrm.model.JobOfferStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record JobOfferDTO(
        Long id,
        Long applicationId,
        String candidateName,
        String email,
        String jobTitle,
        String department,
        String employmentType,
        BigDecimal salary,
        LocalDate startDate,
        LocalDate expiryDate,
        JobOfferStatus status,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
