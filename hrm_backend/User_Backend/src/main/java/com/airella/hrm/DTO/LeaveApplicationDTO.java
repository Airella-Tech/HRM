package com.airella.hrm.DTO;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaveApplicationDTO {
    private Long id;
    private Long employeeId;
    private String employeeName;
    private String employeeIdNumber;

    @NotNull(message = "Leave type is required")
    private Long leaveTypeId;
    private String leaveTypeName;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    private Integer numberOfDays;
    private String reason;
    private String status;
    private String rejectionReason;
    private Long approvedBy;
    private String approvedByName;
}
