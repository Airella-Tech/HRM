
package com.airella.hrm.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record InterviewRequestDTO(
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
        String notes,
        List<Long> interviewerIds
) {
    // Compatibility constructor for existing code and tests.
    public InterviewRequestDTO(
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
            String notes
    ) {
        this(
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
                notes,
                null
        );
    }
}
