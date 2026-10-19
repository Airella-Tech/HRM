package com.airella.hrm.service;

import com.airella.hrm.config.AuthenticatedUser;
import com.airella.hrm.model.RecruitmentPermission;
import com.airella.hrm.repository.InterviewEvaluatorAssignmentRepository;
import com.airella.hrm.repository.RecruitmentPermissionRepository;
import com.airella.hrm.repository.UserRecruitmentRoleRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PermissionServiceTest {

    @Mock
    private UserRecruitmentRoleRepository userRoleRepo;

    @Mock
    private InterviewEvaluatorAssignmentRepository evaluatorRepo;

    @Mock
    private RecruitmentPermissionRepository permissionRepo;

    @InjectMocks
    private PermissionService permissionService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void isFullAccess_WhenAdmin_ReturnsTrue() {
        setAuth("admin@example.com", 1L, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        assertTrue(permissionService.isFullAccess());
    }

    @Test
    void isFullAccess_WhenHrManager_ReturnsTrue() {
        setAuth("hr@example.com", 2L, List.of(new SimpleGrantedAuthority("ROLE_HR_MANAGER")));
        assertTrue(permissionService.isFullAccess());
    }

    @Test
    void isFullAccess_WhenEmployee_ReturnsFalse() {
        setAuth("emp@example.com", 3L, List.of(new SimpleGrantedAuthority("ROLE_EMPLOYEE")));
        assertFalse(permissionService.isFullAccess());
    }

    @Test
    void has_WhenFullAccess_AlwaysReturnsTrue() {
        setAuth("hr@example.com", 2L, List.of(new SimpleGrantedAuthority("ROLE_HR_MANAGER")));
        assertTrue(permissionService.has("ANY_PERMISSION_CODE"));
    }

    @Test
    void has_WhenEmployeeHasAssignedRole_ReturnsTrue() {
        setAuth("emp@example.com", 10L, List.of(new SimpleGrantedAuthority("ROLE_EMPLOYEE")));
        when(userRoleRepo.findPermissionCodesByUserId(10L))
                .thenReturn(List.of("VACANCY_CREATE", "APPLICATION_VIEW"));

        assertTrue(permissionService.has("VACANCY_CREATE"));
        assertTrue(permissionService.has("APPLICATION_VIEW"));
        assertFalse(permissionService.has("OFFER_MANAGE"));
    }

    @Test
    void hasAny_WhenOneMatches_ReturnsTrue() {
        setAuth("emp@example.com", 10L, List.of(new SimpleGrantedAuthority("ROLE_EMPLOYEE")));
        when(userRoleRepo.findPermissionCodesByUserId(10L))
                .thenReturn(List.of("APPLICATION_VIEW"));

        assertTrue(permissionService.hasAny("VACANCY_CREATE", "APPLICATION_VIEW"));
        assertFalse(permissionService.hasAny("VACANCY_CREATE", "VACANCY_APPROVE"));
    }

    @Test
    void hasAll_WhenAllMatch_ReturnsTrue() {
        setAuth("emp@example.com", 10L, List.of(new SimpleGrantedAuthority("ROLE_EMPLOYEE")));
        when(userRoleRepo.findPermissionCodesByUserId(10L))
                .thenReturn(List.of("INTERVIEW_SCHEDULE", "INTERVIEW_ASSIGN"));

        assertTrue(permissionService.hasAll("INTERVIEW_SCHEDULE", "INTERVIEW_ASSIGN"));
        assertFalse(permissionService.hasAll("INTERVIEW_SCHEDULE", "OFFER_MANAGE"));
    }

    @Test
    void canManageRoles_WhenAdminOrHrManager_ReturnsTrue() {
        setAuth("hr@example.com", 2L, List.of(new SimpleGrantedAuthority("ROLE_HR_MANAGER")));
        assertTrue(permissionService.canManageRoles());
    }

    @Test
    void canManageRoles_WhenEmployeeHasRecruitmentRoleAdmin_ReturnsTrue() {
        setAuth("emp@example.com", 10L, List.of(new SimpleGrantedAuthority("ROLE_EMPLOYEE")));
        when(userRoleRepo.findPermissionCodesByUserId(10L))
                .thenReturn(List.of("RECRUITMENT_ROLE_ADMIN"));

        assertTrue(permissionService.canManageRoles());
    }

    @Test
    void canManageRoles_WhenEmployeeLacksRecruitmentRoleAdmin_ReturnsFalse() {
        setAuth("emp@example.com", 10L, List.of(new SimpleGrantedAuthority("ROLE_EMPLOYEE")));
        when(userRoleRepo.findPermissionCodesByUserId(10L))
                .thenReturn(List.of("APPLICATION_VIEW"));

        assertFalse(permissionService.canManageRoles());
    }

    @Test
    void require_WhenPermissionPresent_DoesNotThrow() {
        setAuth("emp@example.com", 10L, List.of(new SimpleGrantedAuthority("ROLE_EMPLOYEE")));
        when(userRoleRepo.findPermissionCodesByUserId(10L))
                .thenReturn(List.of("VACANCY_CREATE"));

        assertDoesNotThrow(() -> permissionService.require("VACANCY_CREATE"));
    }

    @Test
    void require_WhenPermissionMissing_ThrowsAccessDeniedException() {
        setAuth("emp@example.com", 10L, List.of(new SimpleGrantedAuthority("ROLE_EMPLOYEE")));
        when(userRoleRepo.findPermissionCodesByUserId(10L))
                .thenReturn(List.of("APPLICATION_VIEW"));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> permissionService.require("VACANCY_CREATE"));
        assertTrue(ex.getMessage().contains("VACANCY_CREATE"));
    }

    @Test
    void requireRoleManagement_WhenUnauthorized_ThrowsAccessDeniedException() {
        setAuth("emp@example.com", 10L, List.of(new SimpleGrantedAuthority("ROLE_EMPLOYEE")));
        when(userRoleRepo.findPermissionCodesByUserId(10L)).thenReturn(List.of());

        assertThrows(AccessDeniedException.class, () -> permissionService.requireRoleManagement());
    }

    private void setAuth(String email, Long userId, List<GrantedAuthority> authorities) {
        AuthenticatedUser principal = new AuthenticatedUser(email, userId);
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, authorities);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
