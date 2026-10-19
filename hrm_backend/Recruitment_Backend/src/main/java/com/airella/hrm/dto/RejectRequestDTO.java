package com.airella.hrm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RejectRequestDTO(
        @NotBlank(message = "Please give a reason for rejecting the vacancy")
        @Size(max = 500, message = "Reason must be 500 characters or less")
        String reason
) {
}