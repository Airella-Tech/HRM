package com.airella.hrm.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

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
    private Integer jobRoleCount;
    private List<JobRoleDTO> jobRoles = new ArrayList<>();
}
