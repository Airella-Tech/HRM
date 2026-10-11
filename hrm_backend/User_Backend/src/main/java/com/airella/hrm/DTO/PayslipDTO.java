package com.airella.hrm.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PayslipDTO {
    private Long id;
    private Long employeeId;
    private String employeeName;
    private String employeeIdNumber;
    private Integer month;
    private Integer year;
    private BigDecimal basicSalary;
    private BigDecimal totalAllowances;
    private BigDecimal totalDeductions;
    private BigDecimal grossSalary;
    private BigDecimal netSalary;
    private Integer workingDays;
    private Integer presentDays;
    private Integer absentDays;
    private String status;
}
