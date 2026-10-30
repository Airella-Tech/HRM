
package com.airella.hrm.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public record InterviewDTO(
        Long id,
        Long applicationId,
        String candidateName,
        String candidateEmail,
        Long vacancyId,
        String vacancyTitle,
        String interviewRound,
        LocalDate interviewDate,
        LocalTime interviewTime,
        Integer durationMinutes,
        String interviewerName,
        String interviewType,
        String meetingLink,
        String location,
        String status,
        String invitationStatus,
        String notes,
        Long createdBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<Long> interviewerIds
) {
    // Compatibility constructor for existing code and tests.
    public InterviewDTO(
            Long id,
            Long applicationId,
            String candidateName,
            String candidateEmail,
            Long vacancyId,
            String vacancyTitle,
            String interviewRound,
            LocalDate interviewDate,
            LocalTime interviewTime,
            Integer durationMinutes,
            String interviewerName,
            String interviewType,
            String meetingLink,
            String location,
            String status,
            String invitationStatus,
            String notes,
            Long createdBy,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        this(
                id,
                applicationId,
                candidateName,
                candidateEmail,
                vacancyId,
                vacancyTitle,
                interviewRound,
                interviewDate,
                interviewTime,
                durationMinutes,
                interviewerName,
                interviewType,
                meetingLink,
                location,
                status,
                invitationStatus,
                notes,
                createdBy,
                createdAt,
                updatedAt,
                List.of()
        );
    }
}
