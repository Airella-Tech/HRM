package com.airella.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Public response DTO for applicant status tracking.
 * Strictly sanitizes internal HR notes, scores, and reviewer identities.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateApplicationTrackDTO {

    private String trackingCode;
    private String candidateName;
    private String email;
    private Long vacancyId;
    private String jobTitle;
    private String department;
    private String companyRef;

    private String status;               // NEW, UNDER_REVIEW, SHORTLISTED, REJECTED
    private String statusDescription;    // Friendly explanation for the candidate
    private String eligibilityStatus;    // PENDING, ELIGIBLE, INELIGIBLE

    private LocalDate appliedDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
