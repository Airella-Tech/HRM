package com.airella.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateApplicationDTO {

    private Long id;
    private String trackingCode;
    private String candidateName;
    private String email;
    private String phone;
    private String location;
    private String education;
    private Integer experienceYears;
    private String summary;
    private List<String> skills;

    private Long vacancyId;
    private String jobTitle;
    private String vacancyTitle;
    private String department;

    private String status;
    private String eligibilityStatus;
    private Integer screeningScore;
    private Integer matchScore;
    private String screeningNotes;
    private String rejectionReason;
    private Object criteria;

    private String resumeFileName;
    private String resumeFileType;
    private String resumeFileSize;
    private String resumeText;
    private Integer downloadCount;

    private String companyRef;
    private Long companyId;

    private LocalDate appliedDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Long reviewedBy;
    private LocalDateTime reviewedAt;
}
