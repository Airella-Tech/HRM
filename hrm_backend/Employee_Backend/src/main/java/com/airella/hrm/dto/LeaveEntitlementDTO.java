package com.airella.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Leave one employee is entitled to, taken from their job role's allocation for their employment type.
 * Received from HR_Backend; the employee's leave balances follow it.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaveEntitlementDTO {

    private Long leaveTypeId;
    private String leaveTypeName;

    /** As assigned by HR: ANNUAL, MONTHLY or WEEKLY, and days per that period. */
    private String period;
    private Double days;

    /** The assignment over a whole year (days x 1, 12 or 52), rounded down to whole days. */
    private Integer daysPerYear;
}
