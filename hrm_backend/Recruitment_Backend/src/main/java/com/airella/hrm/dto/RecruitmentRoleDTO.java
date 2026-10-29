package com.airella.hrm.dto;

import com.airella.hrm.model.RecruitmentRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecruitmentRoleDTO {
    private Long id;
    private Long companyId;
    private String roleName;
    private String description;
    private Boolean isSystemDefault;
    private LocalDateTime createdAt;
    @Builder.Default
    private Set<RecruitmentPermissionDTO> permissions = new HashSet<>();
    private long assignedUsersCount;

    public static RecruitmentRoleDTO fromEntity(RecruitmentRole role) {
        return fromEntity(role, 0);
    }

    public static RecruitmentRoleDTO fromEntity(RecruitmentRole role, long assignedUsersCount) {
        if (role == null) return null;
        Set<RecruitmentPermissionDTO> perms = role.getPermissions() != null
                ? role.getPermissions().stream()
                .map(RecruitmentPermissionDTO::fromEntity)
                .collect(Collectors.toSet())
                : new HashSet<>();

        return RecruitmentRoleDTO.builder()
                .id(role.getId())
                .companyId(role.getCompanyId())
                .roleName(role.getRoleName())
                .description(role.getDescription())
                .isSystemDefault(role.getIsSystemDefault())
                .createdAt(role.getCreatedAt())
                .permissions(perms)
                .assignedUsersCount(assignedUsersCount)
                .build();
    }
}
