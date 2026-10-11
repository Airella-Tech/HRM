package com.airella.hrm.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * The employee's current pay sheet, received from HR_Backend: their job role's basic payment
 * (basic_payments) plus their individual allowances / deductions (additional_payments).
 * Net total = basic + total allowance - total deduction.
 */
@Data
@NoArgsConstructor
public class PaySheetDTO {

    private String employeeEmail;
    private String employeeCode;
    private String employeeName;
    private String departmentName;
    private String designation;
    private String employmentType;

    /** False when HR has not set a salary for the employee's job role and employment type yet. */
    private boolean configured;
    private Long basicPaymentId;
    private String period;

    private BigDecimal basicSalary = BigDecimal.ZERO;
    private BigDecimal roleAllowance = BigDecimal.ZERO;
    private BigDecimal roleDeduction = BigDecimal.ZERO;
    private BigDecimal additionalAllowance = BigDecimal.ZERO;
    private BigDecimal additionalDeduction = BigDecimal.ZERO;
    private BigDecimal totalAllowance = BigDecimal.ZERO;
    private BigDecimal totalDeduction = BigDecimal.ZERO;
    private BigDecimal netTotal = BigDecimal.ZERO;

    private List<Item> additionalItems = new ArrayList<>();

    /** One individual allowance or deduction. */
    @Data
    @NoArgsConstructor
    public static class Item {
        private Long id;
        private String name;
        /** ALLOWANCE or DEDUCTION */
        private String type;
        private BigDecimal amount;
    }
}
