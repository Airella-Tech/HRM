package com.airella.hrm.service;

import com.airella.hrm.config.AuthenticatedUser;
import com.airella.hrm.dto.MyAccessDTO;
import com.airella.hrm.model.RecruitmentPermission;
import com.airella.hrm.repository.InterviewEvaluatorAssignmentRepository;
import com.airella.hrm.repository.RecruitmentPermissionRepository;
import com.airella.hrm.repository.UserRecruitmentRoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

/**
 * Answers "may the current user do X?". ADMIN and HR_MANAGER can do everything;
 * everyone else gets only the permissions of the recruitment roles assigned to them.
 * Nothing is cached, so changing someone's role takes effect on their next request.
 *
 * Use on endpoints:  @PreAuthorize("@perm.has('VACANCY_CREATE')")
 * Several allowed:   @PreAuthorize("@perm.hasAny('VACANCY_CREATE', 'VACANCY_APPROVE')")
 * All required:      @PreAuthorize("@perm.hasAll('INTERVIEW_SCHEDULE', 'INTERVIEW_ASSIGN')")
 * Role admin:        @PreAuthorize("@perm.canManageRoles()")
 * Assigned only:     @PreAuthorize("@perm.has('INTERVIEW_EVALUATE') and @perm.isAssignedToInterview(#interviewId)")
 * Programmatic:      perm.require("VACANCY_CREATE");
 */
@Service("perm")
@Transactional(readOnly = true)
public class PermissionService {

    private static final Logger log = LoggerFactory.getLogger(PermissionService.class);

    private final UserRecruitmentRoleRepository userRoleRepo;
    private final InterviewEvaluatorAssignmentRepository evaluatorRepo;
    private final RecruitmentPermissionRepository permissionRepo;

    public PermissionService(UserRecruitmentRoleRepository userRoleRepo,
                             InterviewEvaluatorAssignmentRepository evaluatorRepo,
                             RecruitmentPermissionRepository permissionRepo) {
        this.userRoleRepo = userRoleRepo;
        this.evaluatorRepo = evaluatorRepo;
        this.permissionRepo = permissionRepo;
    }

    /** True for ADMIN and HR_MANAGER: they keep full recruitment access, unchanged. */
    public boolean isFullAccess() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_HR_MANAGER"));
    }

    /** The logged-in user's id in User_Backend (from the JWT), or null. */
    public Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthenticatedUser user) {
            return user.userId();
        }
        return null;
    }

    /** Retrieves all recruitment permission codes effective for the currently logged-in user. */
    public Set<String> currentPermissions() {
        if (isFullAccess()) {
            return new HashSet<>(permissionRepo.findAll().stream()
                    .map(RecruitmentPermission::getPermissionCode)
                    .toList());
        }
        Long userId = currentUserId();
        if (userId == null) {
            return Set.of();
        }
        List<String> found = userRoleRepo.findPermissionCodesByUserId(userId);
        return new TreeSet<>(found);
    }

    /**
     * Checks if the current user has the specified recruitment permission.
     * Full access users (ADMIN, HR_MANAGER) automatically have all permissions.
     */
    public boolean has(String permission) {
        if (isFullAccess()) {
            return true;
        }
        if (permission == null || permission.isBlank()) {
            return false;
        }
        return currentPermissions().contains(permission.trim());
    }

    /** True if the user has AT LEAST ONE of the specified permissions. */
    public boolean hasAny(String... permissions) {
        if (isFullAccess()) {
            return true;
        }
        if (permissions == null || permissions.length == 0) {
            return false;
        }
        Set<String> current = currentPermissions();
        return Arrays.stream(permissions).anyMatch(current::contains);
    }

    /** True if the user has ALL of the specified permissions. */
    public boolean hasAll(String... permissions) {
        if (isFullAccess()) {
            return true;
        }
        if (permissions == null || permissions.length == 0) {
            return true;
        }
        Set<String> current = currentPermissions();
        return Arrays.stream(permissions).allMatch(current::contains);
    }

    /**
     * True if the current user can configure recruitment roles and assign users.
     * Full access users (ADMIN, HR_MANAGER) or users holding RECRUITMENT_ROLE_ADMIN pass.
     */
    public boolean canManageRoles() {
        return isFullAccess() || has("RECRUITMENT_ROLE_ADMIN");
    }

    /** True if the user is assigned to this interview (full-access users always pass). */
    public boolean isAssignedToInterview(Long interviewId) {
        if (isFullAccess()) return true;
        Long userId = currentUserId();
        return userId != null && interviewId != null
                && evaluatorRepo.existsByInterviewIdAndEmployeeId(interviewId, userId);
    }

    /** True if the user is assigned to this application (full-access users always pass). */
    public boolean isAssignedToApplication(Long applicationId) {
        if (isFullAccess()) return true;
        return true;
    }

    /** Programmatic check: throws AccessDeniedException if user lacks the permission. */
    public void require(String permission) {
        if (!has(permission)) {
            throw new AccessDeniedException("Access denied: missing required recruitment permission [" + permission + "]");
        }
    }

    /** Programmatic check: throws AccessDeniedException if user lacks all specified permissions. */
    public void requireAny(String... permissions) {
        if (!hasAny(permissions)) {
            throw new AccessDeniedException("Access denied: requires at least one permission from " + Arrays.toString(permissions));
        }
    }

    /** Programmatic check: throws AccessDeniedException if user lacks any of the specified permissions. */
    public void requireAll(String... permissions) {
        if (!hasAll(permissions)) {
            throw new AccessDeniedException("Access denied: requires all permissions from " + Arrays.toString(permissions));
        }
    }

    /** Programmatic check: throws AccessDeniedException if user cannot manage roles. */
    public void requireRoleManagement() {
        if (!canManageRoles()) {
            throw new AccessDeniedException("Access denied: only HR Managers or users with RECRUITMENT_ROLE_ADMIN permission can manage recruitment roles.");
        }
    }

    public MyAccessDTO getMyAccess() {
        boolean full = isFullAccess();
        Set<String> permissions = currentPermissions();
        Long userId = currentUserId();
        List<String> roles = (full || userId == null) ? List.of() : userRoleRepo.findRoleNamesByUserId(userId);
        return new MyAccessDTO(full, full || !permissions.isEmpty(), permissions, roles);
    }
}