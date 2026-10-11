package com.airella.hrm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for Department data.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentDTO {

    private Long id;

    @NotBlank(message = "Department name is required")
    private String name;

    private String shortCode;
    private String description;
    private Long companyId;
    private Long managerId;
    private String managerName;
    private Boolean active;
    private Integer employeeCount;
}
