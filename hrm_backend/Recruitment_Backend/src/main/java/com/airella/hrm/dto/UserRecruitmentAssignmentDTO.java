package com.airella.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRecruitmentAssignmentDTO {
    private Long userId;
    private String employeeId;
    private String fullName;
    private String email;
    private String designation;
    private String departmentName;
    private String systemRole;
    @Builder.Default
    private List<RecruitmentRoleDTO> recruitmentRoles = new ArrayList<>();
    @Builder.Default
    private Set<String> effectivePermissions = new HashSet<>();
}
