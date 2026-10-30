
package com.airella.hrm.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

public record InterviewEmailDTO(
        Long id,
        Long interviewId,
        String candidateName,
        String recipient,
        String recipientType,
        String vacancyTitle,
        LocalDate interviewDate,
        LocalTime interviewTime,
        String subject,
        String emailBody,
        String status,
        String errorMessage,
        Integer attemptNumber,
        LocalDateTime sentAt,
        LocalDateTime createdAt
) {
}
