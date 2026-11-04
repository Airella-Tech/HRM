package com.airella.hrm.dto;

import java.util.List;

public record EligibleCandidateDTO(
        Long applicationId,
        Long vacancyId,
        String candidateName,
        String candidateEmail,
        String vacancyTitle,
        List<String> completedRounds
) {
}