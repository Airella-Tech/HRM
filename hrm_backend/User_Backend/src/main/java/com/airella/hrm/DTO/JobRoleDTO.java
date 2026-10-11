package com.airella.hrm.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobRoleDTO {
    private Long id;

    @NotBlank(message = "Job title is required")
    private String jobTitle;

    private Double basicSalary;
}
