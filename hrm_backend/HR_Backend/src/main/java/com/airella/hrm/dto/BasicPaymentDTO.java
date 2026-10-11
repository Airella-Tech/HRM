package com.airella.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * One job role salary row: employment type + period + basic + allowance + deduction.
 * Used both for saving (only the salary fields are read) and for the history list.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BasicPaymentDTO {

    private Long id;
    private Long departmentId;
    private String departmentName;
    private Long jobRoleId;
    private String jobRoleTitle;

    private Long employmentTypeId;
    private String employmentTypeName;

    /** MONTHLY, WEEKLY or ANNUAL */
    private String period;
    private BigDecimal basicSalary;
    private BigDecimal allowance;
    private BigDecimal deduction;
    private BigDecimal totalSalary;

    /** How many employees are currently paid from this row. */
    private Integer employeeCount;

    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** Request body for saving one or more salary rows for a single job role. */
    @Data
    @NoArgsConstructor
    public static class SaveRequest {
        private Long jobRoleId;
        private List<BasicPaymentDTO> payments = new ArrayList<>();
    }
}
