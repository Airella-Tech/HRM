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
public class ScreeningSkillCriterionDTO {
    private String name;
    private boolean mandatory;
    @Builder.Default
    private List<String> aliases = new ArrayList<>();
}
