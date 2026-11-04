package com.airella.hrm.dto;

import java.time.LocalDateTime;

public record InterviewRoundDecisionDTO(
        Long id,
        Long companyId,
        Long applicationId,
        Long interviewId,
        String interviewRound,
        Long managerId,
        String decision,
        String comments,
        LocalDateTime decidedAt
) {}