package com.airella.hrm.DTO;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SalaryDTO {
    private Long id;

    @NotNull(message = "Employee ID is required")
    private Long employeeId;
    private String employeeName;
    private String employeeIdNumber;

    @NotNull(message = "Basic salary is required")
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
