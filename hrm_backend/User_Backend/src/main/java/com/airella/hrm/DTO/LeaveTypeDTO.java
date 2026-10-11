package com.airella.hrm.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaveTypeDTO {
    private Long id;

    @NotBlank(message = "Leave type name is required")
    private String name;

    private String description;

    @NotNull(message = "Default days per year is required")
    private Integer defaultDaysPerYear;

    private Long companyId; // null for system-wide
    private Boolean requiresApproval;
    private Boolean active;
}
