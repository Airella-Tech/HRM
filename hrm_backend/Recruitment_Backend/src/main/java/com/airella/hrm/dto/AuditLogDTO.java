package com.airella.hrm.dto;

import java.time.LocalDateTime;

/** One audit log row for the screen, with the acting person's name already filled in. */
public record AuditLogDTO(
        Long id,
        String action,
        String entity,
        Long entityId,
        String description,
        Long userId,
        String userName,
        LocalDateTime createdAt
) {}