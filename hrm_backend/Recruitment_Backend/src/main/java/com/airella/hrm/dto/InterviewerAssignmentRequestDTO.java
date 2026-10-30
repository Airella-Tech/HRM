package com.airella.hrm.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record InterviewerAssignmentRequestDTO(
        @NotNull(message = "Employee IDs are required.")
        List<Long> employeeIds
) {
}