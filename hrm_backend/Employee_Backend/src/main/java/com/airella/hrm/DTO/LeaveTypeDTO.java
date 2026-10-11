package com.airella.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for Leave Type data.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaveTypeDTO {

    private Long id;
    private String name;
    private String description;
    private Integer defaultDaysPerYear;
    private Boolean carryForward;
    private Integer maxCarryForwardDays;
    private Boolean active;
}
