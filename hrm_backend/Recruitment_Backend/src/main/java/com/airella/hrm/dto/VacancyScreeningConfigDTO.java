package com.airella.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VacancyScreeningConfigDTO {

    private Long id;
    private Long vacancyId;
    private String vacancyTitle;
    private String companyRef;

    // Category percentage weights (must sum to exactly 100)
    @Builder.Default
    private Integer skillsWeight = 40;
    @Builder.Default
    private Integer experienceWeight = 25;
    @Builder.Default
    private Integer qualificationsWeight = 20;
    @Builder.Default
    private Integer evidenceWeight = 15;

    // Minimum passing overall score
    @Builder.Default
    private Integer minimumScore = 75;

    // Auto shortlist toggle
    @Builder.Default
    private Boolean autoShortlistEnabled = false;

    @Builder.Default
    private Integer configVersion = 1;

    // A. Skills Criteria
    @Builder.Default
    private List<ScreeningSkillCriterionDTO> requiredSkills = new ArrayList<>();
    @Builder.Default
    private List<String> preferredSkills = new ArrayList<>();

    // B. Work Experience Criteria
    @Builder.Default
    private Integer minExperienceYears = 0;
    @Builder.Default
    private Boolean experienceMandatory = false;
    @Builder.Default
    private List<String> experienceKeywords = new ArrayList<>();

    // C. Educational Qualifications
    @Builder.Default
    private String requiredDegreeLevel = "ANY"; // ANY, DIPLOMA, BACHELORS, MASTERS, DOCTORATE
    @Builder.Default
    private Boolean educationMandatory = false;
    @Builder.Default
    private List<String> preferredQualifications = new ArrayList<>();

    // D. Job-Related CV Evidence & Responsibilities
    @Builder.Default
    private List<String> jobEvidenceKeywords = new ArrayList<>();
    @Builder.Default
    private Boolean evidenceMandatory = false;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long updatedBy;

    /**
     * Checks whether weights total 100% and all are non-negative.
     */
    public boolean isWeightValid() {
        if (skillsWeight == null || experienceWeight == null ||
                qualificationsWeight == null || evidenceWeight == null) {
            return false;
        }
        if (skillsWeight < 0 || experienceWeight < 0 ||
                qualificationsWeight < 0 || evidenceWeight < 0) {
            return false;
        }
        return (skillsWeight + experienceWeight + qualificationsWeight + evidenceWeight) == 100;
    }

    public int getTotalWeight() {
        int s = skillsWeight != null ? skillsWeight : 0;
        int exp = experienceWeight != null ? experienceWeight : 0;
        int q = qualificationsWeight != null ? qualificationsWeight : 0;
        int ev = evidenceWeight != null ? evidenceWeight : 0;
        return s + exp + q + ev;
    }
}
