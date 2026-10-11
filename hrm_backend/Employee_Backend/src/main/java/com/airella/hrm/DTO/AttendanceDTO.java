package com.airella.hrm.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Data Transfer Object for Attendance records.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceDTO {

    private Long id;
    private Long employeeId;
    private String employeeName;
    private String employeeIdNumber;
    private String departmentName;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;

    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime clockInTime;

    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime clockOutTime;

    private String attendanceType;
    private String clockInLocation;
    private String clockOutLocation;
    private String status;
    private String remarks;
    private Boolean isAdjustmentRequested;
    private String adjustmentReason;
    private String adjustmentStatus;
}
