package com.airella.hrm.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** An allowance request as shown to the employee and to HR (without the PDF bytes). */
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

    /** Body HR_Backend sends to approve or reject a request. */
    @Data
    @NoArgsConstructor
    public static class ReviewRequest {
        /** APPROVED or REJECTED */
        private String status;
        private String comment;
        private String reviewedByName;
    }
}
