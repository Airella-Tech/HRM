package com.airella.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * One leave entitlement of a job role: employment type + leave type + period + days.
 * Used both for saving (only the entitlement fields are read) and for the history list.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaveAllocationDTO {

    private Long id;
    private Long departmentId;
    private String departmentName;
    private Long jobRoleId;
    private String jobRoleTitle;

    private Long employmentTypeId;
    private String employmentTypeName;

    private Long leaveTypeId;
    private String leaveTypeName;

    /** ANNUAL, MONTHLY or WEEKLY */
    private String period;
    private Double days;

    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** Request body for saving one or more entitlements for a single job role. */
    @Data
    @NoArgsConstructor
    public static class SaveRequest {
        private Long jobRoleId;
        private List<LeaveAllocationDTO> allocations = new ArrayList<>();
    }
}
