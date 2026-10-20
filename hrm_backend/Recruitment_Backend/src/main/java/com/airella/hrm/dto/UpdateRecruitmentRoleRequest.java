package com.airella.hrm.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateRecruitmentRoleRequest {

    @Size(max = 50, message = "Role name must not exceed 50 characters")
    private String roleName;

    @Size(max = 255, message = "Description must not exceed 255 characters")
    private String description;

    private Set<Long> permissionIds;

    private Set<String> permissionCodes;
}
