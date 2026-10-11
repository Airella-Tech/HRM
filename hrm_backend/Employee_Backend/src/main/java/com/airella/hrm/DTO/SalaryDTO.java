package com.airella.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Data Transfer Object for Salary data.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SalaryDTO {

    private Long id;
    private Long employeeId;
    private String employeeName;
    private BigDecimal basicSalary;
    private BigDecimal houseAllowance;
    private BigDecimal transportAllowance;
    private BigDecimal medicalAllowance;
    private BigDecimal otherAllowances;
    private BigDecimal tax;
    private BigDecimal providentFund;
    private BigDecimal otherDeductions;
    private BigDecimal grossSalary;
    private BigDecimal netSalary;
}
