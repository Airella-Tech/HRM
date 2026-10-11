package com.airella.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkLocationDTO {
    private Long id;
    private String name;
    private String createdByName;
    private LocalDateTime createdAt;
}
