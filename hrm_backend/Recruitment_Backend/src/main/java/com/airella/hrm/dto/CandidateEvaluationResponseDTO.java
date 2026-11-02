package com.airella.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateEvaluationResponseDTO {
    private Long vacancyId;
    private String vacancyTitle;
    private int evaluatedCount;
    private int autoShortlistedCount;
    private int stagedOrRecommendedCount;
    private int manualReviewCount;
    @Builder.Default
    private List<CandidateScreeningResultDTO> results = new ArrayList<>();
}
