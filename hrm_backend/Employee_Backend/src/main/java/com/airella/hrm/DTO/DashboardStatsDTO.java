package com.airella.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for dashboard statistics.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDTO {

    private long totalEmployees;
    private long presentToday;
    private long onLeave;
    private long pendingLeaves;
    private long totalDepartments;
    private long newJoining;
}
