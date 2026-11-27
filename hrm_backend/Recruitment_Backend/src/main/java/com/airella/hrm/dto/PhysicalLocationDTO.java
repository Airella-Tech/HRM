
package com.airella.hrm.dto;

import java.time.LocalDateTime;

public record PhysicalLocationDTO(
        Long id,
        String name,
        String building,
        String roomNumber,
        Integer capacity,
        String description,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
