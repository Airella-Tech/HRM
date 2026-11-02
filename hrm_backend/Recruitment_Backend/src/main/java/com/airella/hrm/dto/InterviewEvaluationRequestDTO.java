
package com.airella.hrm.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record InterviewEvaluationRequestDTO(

        @Min(1) @Max(5)
        Integer technicalKnowledge,

        @Min(1) @Max(5)
        Integer problemSolving,

        @Min(1) @Max(5)
        Integer communication,

        @Min(1) @Max(5)
        Integer roleSpecificSkills,

        @Min(1) @Max(5)
        Integer professionalism,

        @Size(max = 10000)
        String strengths,

        @Size(max = 10000)
        String areasForImprovement,

        @Size(max = 10000)
        String comments,

        String recommendation

) {
}
