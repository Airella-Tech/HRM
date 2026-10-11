package com.airella.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for Leave Balance data.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaveBalanceDTO {

    private Long id;
    private Long employeeId;
    private String employeeName;
    private Long leaveTypeId;
    private String leaveTypeName;
    private Integer year;
    private Integer totalDays;
    private Integer usedDays;
    private Integer remainingDays;
}
