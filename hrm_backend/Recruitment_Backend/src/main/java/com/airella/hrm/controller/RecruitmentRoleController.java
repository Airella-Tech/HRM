package com.airella.hrm.controller;

import com.airella.hrm.dto.*;
import com.airella.hrm.service.PermissionService;
import com.airella.hrm.service.RecruitmentRoleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller for Recruitment Roles, Permissions, and User Assignments.
 * Managed by HR Managers and Administrators.
 */
@RestController
@RequestMapping("/api/recruitment/roles")
public class RecruitmentRoleController {

    private final RecruitmentRoleService roleService;
    private final PermissionService permissionService;

    public RecruitmentRoleController(RecruitmentRoleService roleService, PermissionService permissionService) {
        this.roleService = roleService;
        this.permissionService = permissionService;
    }

    // ── Current User Access Verification ─────────────────────────

    @GetMapping("/my-access")
    public ResponseEntity<ApiResponse<MyAccessDTO>> getMyAccess() {
        return ResponseEntity.ok(ApiResponse.success(permissionService.getMyAccess()));
    }

    @GetMapping("/check")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkPermission(@RequestParam String permission) {
        boolean hasAccess = permissionService.has(permission);
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "permission", permission,
                "granted", hasAccess
        )));
    }

    // ── System Permissions ───────────────────────────────────────

    @GetMapping("/permissions")
    @PreAuthorize("@perm.canManageRoles()")
    public ResponseEntity<ApiResponse<List<RecruitmentPermissionDTO>>> getAllPermissions() {
        return ResponseEntity.ok(ApiResponse.success(roleService.getAllPermissions()));
    }

    @GetMapping("/permissions/by-category")
    @PreAuthorize("@perm.canManageRoles()")
    public ResponseEntity<ApiResponse<Map<String, List<RecruitmentPermissionDTO>>>> getPermissionsByCategory() {
        return ResponseEntity.ok(ApiResponse.success(roleService.getPermissionsGroupedByCategory()));
    }

    // ── Roles Management ─────────────────────────────────────────

    @GetMapping
    @PreAuthorize("@perm.canManageRoles()")
    public ResponseEntity<ApiResponse<List<RecruitmentRoleDTO>>> getRoles(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean customOnly) {
        return ResponseEntity.ok(ApiResponse.success(roleService.getRolesForCurrentCompany(search, customOnly)));
    }

    @GetMapping("/defaults")
    @PreAuthorize("@perm.canManageRoles()")
    public ResponseEntity<ApiResponse<List<RecruitmentRoleDTO>>> getDefaultRoleTemplates() {
        return ResponseEntity.ok(ApiResponse.success(roleService.getDefaultRoleTemplatesForCurrentCompany()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@perm.canManageRoles()")
    public ResponseEntity<ApiResponse<RecruitmentRoleDTO>> getRoleById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(roleService.getRoleById(id)));
    }

    @PostMapping
    @PreAuthorize("@perm.canManageRoles()")
    public ResponseEntity<ApiResponse<RecruitmentRoleDTO>> createRole(@Valid @RequestBody CreateRecruitmentRoleRequest request) {
        RecruitmentRoleDTO created = roleService.createRole(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "Recruitment role created successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perm.canManageRoles()")
    public ResponseEntity<ApiResponse<RecruitmentRoleDTO>> updateRole(@PathVariable Long id,
                                                                      @Valid @RequestBody UpdateRecruitmentRoleRequest request) {
        RecruitmentRoleDTO updated = roleService.updateRole(id, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Recruitment role updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.canManageRoles()")
    public ResponseEntity<ApiResponse<Void>> deleteRole(@PathVariable Long id) {
        roleService.deleteRole(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Recruitment role deleted successfully"));
    }

    // ── Existing User Role Assignments ───────────────────────────

    @GetMapping("/users")
    @PreAuthorize("@perm.canManageRoles()")
    public ResponseEntity<ApiResponse<List<UserRecruitmentAssignmentDTO>>> getCompanyUsersWithRoles() {
        return ResponseEntity.ok(ApiResponse.success(roleService.getCompanyUsersWithRoles()));
    }

    @GetMapping("/users/{userId}")
    @PreAuthorize("@perm.canManageRoles()")
    public ResponseEntity<ApiResponse<UserRecruitmentAssignmentDTO>> getUserRoleAssignments(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.success(roleService.getUserRoleAssignments(userId)));
    }

    @PostMapping("/users/assign")
    @PreAuthorize("@perm.canManageRoles()")
    public ResponseEntity<ApiResponse<UserRecruitmentAssignmentDTO>> assignRolesToUser(
            @Valid @RequestBody AssignUserRoleRequest request) {
        UserRecruitmentAssignmentDTO result = roleService.assignRolesToUser(request);
        return ResponseEntity.ok(ApiResponse.success(result, "Role(s) assigned successfully"));
    }

    @DeleteMapping("/users/{userId}/roles/{roleId}")
    @PreAuthorize("@perm.canManageRoles()")
    public ResponseEntity<ApiResponse<Void>> removeRoleFromUser(@PathVariable Long userId,
                                                                @PathVariable Long roleId) {
        roleService.removeRoleFromUser(userId, roleId);
        return ResponseEntity.ok(ApiResponse.success(null, "Role unassigned successfully"));
    }

    @PutMapping("/users/{userId}")
    @PreAuthorize("@perm.canManageRoles()")
    public ResponseEntity<ApiResponse<UserRecruitmentAssignmentDTO>> updateUserRoles(
            @PathVariable Long userId,
            @RequestBody List<Long> roleIds) {
        UserRecruitmentAssignmentDTO result = roleService.updateUserRoles(userId, roleIds);
        return ResponseEntity.ok(ApiResponse.success(result, "User roles updated successfully"));
    }
}
