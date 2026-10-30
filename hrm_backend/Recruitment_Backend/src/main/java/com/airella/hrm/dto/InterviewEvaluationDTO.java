
package com.airella.hrm.dto;

import java.time.LocalDateTime;

public record InterviewEvaluationDTO(
        Long id,
        Long interviewId,
        Long candidateId,
        String candidateName,
        String candidateEmail,
        String vacancyTitle,
        String interviewRound,
        Long evaluatorId,
        Integer technicalKnowledge,
        Integer problemSolving,
        Integer communication,
        Integer roleSpecificSkills,
        Integer professionalism,
        Double averageScore,
        String strengths,
        String areasForImprovement,
        String comments,
        String recommendation,
        String status,
        LocalDateTime submittedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
