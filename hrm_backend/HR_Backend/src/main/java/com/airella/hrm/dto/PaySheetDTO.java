package com.airella.hrm.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * What an employee is paid: their job role's basic payment plus their individual
 * allowances and deductions. Net total = basic + total allowance - total deduction.
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

    /** True when a basic payment matches the employee's job role and employment type. */
    private boolean configured;
    private Long basicPaymentId;
    private String period;

    private BigDecimal basicSalary = BigDecimal.ZERO;
    /** Allowance / deduction set on the job role. */
    private BigDecimal roleAllowance = BigDecimal.ZERO;
    private BigDecimal roleDeduction = BigDecimal.ZERO;
    /** Sums of the employee's individual allowances / deductions. */
    private BigDecimal additionalAllowance = BigDecimal.ZERO;
    private BigDecimal additionalDeduction = BigDecimal.ZERO;

    private BigDecimal totalAllowance = BigDecimal.ZERO;
    private BigDecimal totalDeduction = BigDecimal.ZERO;
    private BigDecimal netTotal = BigDecimal.ZERO;

    private List<AdditionalPaymentDTO> additionalItems = new ArrayList<>();

    /** When not configured: employment types the employee's job role does have a salary row for. */
    private List<String> configuredEmploymentTypes = new ArrayList<>();

    /** An employee to work the pay sheet out for (details from the user database). */
    @Data
    @NoArgsConstructor
    public static class EmployeeRef {
        private String email;
        private String employeeCode;
        private String fullName;
        private String departmentName;
        private String designation;
        private String employmentType;
    }
}
