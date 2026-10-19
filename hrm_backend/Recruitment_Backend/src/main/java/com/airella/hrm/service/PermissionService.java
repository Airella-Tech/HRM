package com.airella.hrm.service;

import com.airella.hrm.config.AuthenticatedUser;
import com.airella.hrm.dto.MyAccessDTO;
import com.airella.hrm.model.RecruitmentPermission;
import com.airella.hrm.repository.InterviewEvaluatorAssignmentRepository;
import com.airella.hrm.repository.RecruitmentPermissionRepository;
import com.airella.hrm.repository.UserRecruitmentRoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
 * Several allowed:   @PreAuthorize("@perm.has('VACANCY_CREATE') or @perm.has('VACANCY_VIEW')")
 * Assigned only:     @PreAuthorize("@perm.has('INTERVIEW_EVALUATE') and @perm.isAssignedToInterview(#interviewId)")
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

    /** Used from @PreAuthorize. The name must match a recruitment permission code. */
    public boolean has(String permission) {
        if (isFullAccess()) {
            return true;
        }
        return currentPermissions().contains(permission);
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

    public MyAccessDTO getMyAccess() {
        boolean full = isFullAccess();
        Set<String> permissions = currentPermissions();
        Long userId = currentUserId();
        List<String> roles = (full || userId == null) ? List.of() : userRoleRepo.findRoleNamesByUserId(userId);
        return new MyAccessDTO(full, full || !permissions.isEmpty(), permissions, roles);
    }
}