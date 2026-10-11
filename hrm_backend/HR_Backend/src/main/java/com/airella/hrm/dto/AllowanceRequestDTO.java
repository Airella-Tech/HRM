package com.airella.hrm.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * An employee's allowance request, owned by Employee_Backend (hrm_db_employee.allowance_requests)
 * and reviewed here by HR.
 */
@Data
@NoArgsConstructor
public class AllowanceRequestDTO {

    private Long id;
    private String employeeEmail;
    private String employeeCode;
    private String employeeName;

    private String name;
    private BigDecimal amount;
    private String description;

    private String documentName;
    private Long documentSize;

    /** PENDING, APPROVED or REJECTED */
    private String status;
    private String reviewComment;
    private String reviewedByName;
    private LocalDateTime reviewedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** Set by HR_Backend: an approved request already added to the employee's individual allowances. */
    private boolean addedToPay;

    /** Body sent to Employee_Backend to approve or reject a request. */
    @Data
    @NoArgsConstructor
    public static class ReviewRequest {
        private String status;
        private String comment;
        private String reviewedByName;
    }
}
