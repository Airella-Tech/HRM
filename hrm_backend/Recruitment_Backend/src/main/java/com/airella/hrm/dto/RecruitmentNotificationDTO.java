package com.airella.hrm.dto;

import java.time.LocalDateTime;

/** Same field names as the Employee service notifications, so the bell can show both. */
public record RecruitmentNotificationDTO(
        Long id,
        String title,
        String message,
        String category,
        String link,
        Long refId,
        boolean isRead,
        LocalDateTime createdAt) {
}