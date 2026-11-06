package com.airella.hrm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InterviewRoundDecisionRequestDTO(

        @NotBlank(message = "Decision is required")
        String decision,

        @Size(max = 10000, message = "Comments are too long")
        String comments

) {}