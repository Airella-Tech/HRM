package com.airella.hrm.service;

import com.airella.hrm.config.AuthenticatedUser;
import com.airella.hrm.dto.MyAccessDTO;
import com.airella.hrm.model.RecruitmentPermission;
import com.airella.hrm.repository.InterviewerAssignmentRepository;
import com.airella.hrm.repository.UserRoleAssignmentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

/**
 * Answers "may the current user do X?". ADMIN and HR_MANAGER can do everything;
 * everyone else gets only the permissions of the recruitment roles assigned to them.
 * Nothing is cached, so changing someone's role takes effect on their next request.
 *
 * Use on endpoints:  @PreAuthorize("@perm.has('VACANCY_MANAGE')")
 * Several allowed:   @PreAuthorize("@perm.has('VACANCY_MANAGE') or @perm.has('VACANCY_VIEW')")
 * Assigned only:     @PreAuthorize("@perm.has('INTERVIEW_EVALUATE') and @perm.isAssignedToInterview(#interviewId)")
 */
@Service("perm")
@Transactional(readOnly = true)
public class PermissionService {

    private static final Logger log = LoggerFactory.getLogger(PermissionService.class);

    private final UserRoleAssignmentRepository assignmentRepository;
    private final InterviewerAssignmentRepository interviewerRepository;

    public PermissionService(UserRoleAssignmentRepository assignmentRepository,
                             InterviewerAssignmentRepository interviewerRepository) {
        this.assignmentRepository = assignmentRepository;
        this.interviewerRepository = interviewerRepository;
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

    public Set<RecruitmentPermission> currentPermissions() {
        if (isFullAccess()) {
            return EnumSet.allOf(RecruitmentPermission.class);
        }
        Long userId = currentUserId();
        if (userId == null) {
            return EnumSet.noneOf(RecruitmentPermission.class);
        }
        List<RecruitmentPermission> found = assignmentRepository.findPermissionsByUserId(userId);
        return found.isEmpty() ? EnumSet.noneOf(RecruitmentPermission.class) : EnumSet.copyOf(found);
    }

    /** Used from @PreAuthorize. The name must match a RecruitmentPermission exactly. */
    public boolean has(String permission) {
        try {
            return currentPermissions().contains(RecruitmentPermission.valueOf(permission));
        } catch (IllegalArgumentException e) {
            log.error("Unknown recruitment permission '{}' used in @PreAuthorize", permission);
            return false;
        }
    }

    /** True if the user is assigned to this interview (full-access users always pass). */
    public boolean isAssignedToInterview(Long interviewId) {
        if (isFullAccess()) return true;
        Long userId = currentUserId();
        return userId != null && interviewId != null
                && interviewerRepository.existsByUserIdAndInterviewId(userId, interviewId);
    }

    /** True if the user is assigned to this application (full-access users always pass). */
    public boolean isAssignedToApplication(Long applicationId) {
        if (isFullAccess()) return true;
        Long userId = currentUserId();
        return userId != null && applicationId != null
                && interviewerRepository.existsByUserIdAndApplicationId(userId, applicationId);
    }

    public MyAccessDTO getMyAccess() {
        boolean full = isFullAccess();
        Set<String> permissions = currentPermissions().stream()
                .map(Enum::name)
                .collect(Collectors.toCollection(TreeSet::new));
        Long userId = currentUserId();
        List<String> roles = (full || userId == null) ? List.of() : assignmentRepository.findRoleNamesByUserId(userId);
        return new MyAccessDTO(full, full || !permissions.isEmpty(), permissions, roles);
    }
}