package com.airella.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** One individual allowance or deduction of an employee. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdditionalPaymentDTO {

    private Long id;
    private String employeeEmail;
    private String employeeCode;
    private String employeeName;

    /** Allowance request this row was created from, if any. */
    private Long sourceRequestId;

    private String name;
    /** ALLOWANCE or DEDUCTION */
    private String type;
    private BigDecimal amount;

    private String createdByName;
    private LocalDateTime updatedAt;

    /**
     * Request body: the complete list of an employee's individual allowances / deductions.
     * It replaces what was saved before, so an empty list clears them.
     */
    @Data
    @NoArgsConstructor
    public static class SaveRequest {
        private String employeeEmail;
        private String employeeCode;
        private String employeeName;
        private List<AdditionalPaymentDTO> items = new ArrayList<>();
    }
}
