package com.airella.hrm.dto;

import com.airella.hrm.model.RecruitmentPermission;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecruitmentPermissionDTO {
    private Long id;
    private String permissionCode;
    private String category;
    private String description;

    public String getModule() {
        return category;
    }

    public static RecruitmentPermissionDTO fromEntity(RecruitmentPermission entity) {
        if (entity == null) return null;
        return RecruitmentPermissionDTO.builder()
                .id(entity.getId())
                .permissionCode(entity.getPermissionCode())
                .category(entity.getCategory())
                .description(entity.getDescription())
                .build();
    }
}
