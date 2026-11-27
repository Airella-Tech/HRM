
package com.airella.hrm.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PhysicalLocationRequestDTO(

        @NotBlank(message = "Location name is required.")
        @Size(max = 200)
        String name,

        @Size(max = 200)
        String building,

        @Size(max = 50)
        String roomNumber,

        @NotNull(message = "Capacity is required.")
        @Min(value = 1, message = "Capacity must be at least 1.")
        Integer capacity,

        String description,

        String status
) {
}
