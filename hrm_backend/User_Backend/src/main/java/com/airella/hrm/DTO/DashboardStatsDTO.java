package com.airella.hrm.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDTO {
    private Long totalEmployees;
    private Long activeEmployees;
    private Long totalDepartments;
    private Long pendingLeaveApplications;
    private Long todayPresent;
    private Long todayAbsent;
    private Long currentMonthPayslips;
}
