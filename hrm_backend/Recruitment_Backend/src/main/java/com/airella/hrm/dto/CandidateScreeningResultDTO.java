package com.airella.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateScreeningResultDTO {

    private Long id;
    private Long applicationId;
    private String candidateName;
    private Long vacancyId;
    private String vacancyTitle;
    private String companyRef;

    private Integer configVersion;

    private Double overallScore;
    private Integer skillsScore;
    private Integer experienceScore;
    private Integer qualificationsScore;
    private Integer evidenceScore;

    // Weight snapshot applied
    private Integer skillsWeight;
    private Integer experienceWeight;
    private Integer qualificationsWeight;
    private Integer evidenceWeight;
    private Integer minimumScore;

    private String mandatorySkillsMet;
    private String mandatoryExperienceMet;
    private String mandatoryQualificationsMet;
    private Boolean allMandatoryMet;
    private Boolean hasUnknownMandatory;

    private String recommendation;
    private Boolean autoShortlisted;
    private String decisionSource;
    private String decisionReason;

    private Map<String, Object> breakdown;

    private LocalDateTime evaluatedAt;
    private Long evaluatedBy;
}
