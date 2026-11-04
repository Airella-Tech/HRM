package com.airella.hrm.dto;

import jakarta.validation.constraints.NotBlank;

public record InterviewStatusUpdateDTO(
        @NotBlank(message = "Interview status is required")
        String status
) {
}