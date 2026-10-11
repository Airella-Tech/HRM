package com.airella.hrm.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO representing a job role with its title and base salary.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobRoleDTO {

    private Long id;

    @NotBlank(message = "Job title is required")
    @JsonAlias({"title", "name"})
    private String jobTitle;

    private Double basicSalary;
}
