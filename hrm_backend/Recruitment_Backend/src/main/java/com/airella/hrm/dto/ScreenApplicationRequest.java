package com.airella.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScreenApplicationRequest {
    private Integer screeningScore;
    private String screeningNotes;
    private String eligibilityStatus;
    private Object criteria;
    private String readinessStatus;
}

