package com.airella.hrm.service;

import com.airella.hrm.dto.*;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.RecruitmentPermission;
import com.airella.hrm.model.RecruitmentRole;
import com.airella.hrm.model.UserRecruitmentRole;
import com.airella.hrm.repository.RecruitmentPermissionRepository;
import com.airella.hrm.repository.RecruitmentRoleRepository;
import com.airella.hrm.repository.UserRecruitmentRoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecruitmentRoleServiceTest {

    @Mock
    private RecruitmentRoleRepository roleRepo;

    @Mock
    private UserRecruitmentRoleRepository userRoleRepo;

    @Mock
    private RecruitmentPermissionRepository permissionRepo;

    @Mock
    private EmployeeDirectory employeeDirectory;

    @Mock
    private AuthService authService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private RecruitmentRoleService roleService;

    private final Long companyId = 5L;
    private final String companyRef = "COMP-001";

    @BeforeEach
    void setUp() {
        lenient().when(authService.getCurrentCompanyId()).thenReturn(companyId);
        lenient().when(authService.getCurrentCompanyRef()).thenReturn(companyRef);
    }

    @Test
    void createRole_WhenValid_SavesAndReturnsDTO() {
        CreateRecruitmentRoleRequest req = CreateRecruitmentRoleRequest.builder()
                .roleName("Interviewer")
                .description("Conducts interviews")
                .permissionCodes(Set.of("INTERVIEW_EVALUATE"))
                .build();

        RecruitmentPermission perm = new RecruitmentPermission(1L, "INTERVIEW_EVALUATE", "INTERVIEW", "Evaluate");
        when(roleRepo.existsByCompanyIdAndRoleNameIgnoreCase(companyId, "Interviewer")).thenReturn(false);
        when(permissionRepo.findByPermissionCodeIn(anyCollection())).thenReturn(List.of(perm));

        RecruitmentRole savedRole = new RecruitmentRole(100L, companyId, "Interviewer", "Conducts interviews", false, null, Set.of(perm));
        when(roleRepo.save(any(RecruitmentRole.class))).thenReturn(savedRole);

        RecruitmentRoleDTO result = roleService.createRole(req);

        assertNotNull(result);
        assertEquals("Interviewer", result.getRoleName());
        assertEquals(companyId, result.getCompanyId());
        verify(auditService).logAction(eq("CREATE"), eq("RecruitmentRole"), eq(100L), anyString(), eq(companyRef));
    }

    @Test
    void createRole_WhenDuplicateName_ThrowsBusinessException() {
        CreateRecruitmentRoleRequest req = CreateRecruitmentRoleRequest.builder()
                .roleName("Recruiter")
                .build();

        when(roleRepo.existsByCompanyIdAndRoleNameIgnoreCase(companyId, "Recruiter")).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class, () -> roleService.createRole(req));
        assertTrue(ex.getMessage().contains("already exists"));
        verify(roleRepo, never()).save(any());
    }

    @Test
    void deleteRole_WhenSystemDefault_ThrowsBusinessException() {
        RecruitmentRole systemRole = new RecruitmentRole(10L, companyId, "System Recruiter", "System role", true, null, Set.of());
        when(roleRepo.findByIdAndCompanyId(10L, companyId)).thenReturn(Optional.of(systemRole));

        BusinessException ex = assertThrows(BusinessException.class, () -> roleService.deleteRole(10L));
        assertTrue(ex.getMessage().contains("System default roles cannot be deleted"));
        verify(roleRepo, never()).delete(any());
    }

    @Test
    void deleteRole_WhenUsersAssigned_ThrowsBusinessException() {
        RecruitmentRole customRole = new RecruitmentRole(20L, companyId, "Lead Evaluator", "Custom role", false, null, Set.of());
        when(roleRepo.findByIdAndCompanyId(20L, companyId)).thenReturn(Optional.of(customRole));
        when(userRoleRepo.countByRoleId(20L)).thenReturn(3L);

        BusinessException ex = assertThrows(BusinessException.class, () -> roleService.deleteRole(20L));
        assertTrue(ex.getMessage().contains("currently assigned to 3 employee(s)"));
        verify(roleRepo, never()).delete(any());
    }

    @Test
    void deleteRole_WhenNoUsersAndNotSystemDefault_DeletesSuccessfully() {
        RecruitmentRole customRole = new RecruitmentRole(20L, companyId, "Lead Evaluator", "Custom role", false, null, Set.of());
        when(roleRepo.findByIdAndCompanyId(20L, companyId)).thenReturn(Optional.of(customRole));
        when(userRoleRepo.countByRoleId(20L)).thenReturn(0L);

        assertDoesNotThrow(() -> roleService.deleteRole(20L));
        verify(roleRepo).delete(customRole);
        verify(auditService).logAction(eq("DELETE"), eq("RecruitmentRole"), eq(20L), anyString(), eq(companyRef));
    }

    @Test
    void assignRolesToUser_WhenValid_SavesAssignments() {
        Long targetUserId = 42L;
        UserSummaryDTO emp = new UserSummaryDTO();
        emp.setId(targetUserId);
        emp.setFullName("Jane Doe");
        emp.setEmail("jane@example.com");
        emp.setRole("EMPLOYEE");

        RecruitmentRole role = new RecruitmentRole(100L, companyId, "Evaluator", "Desc", false, null, Set.of());

        when(employeeDirectory.findById(targetUserId)).thenReturn(Optional.of(emp));
        when(roleRepo.findAllById(List.of(100L))).thenReturn(List.of(role));
        when(userRoleRepo.existsByCompanyIdAndUserIdAndRoleId(companyId, targetUserId, 100L)).thenReturn(false);

        AssignUserRoleRequest req = AssignUserRoleRequest.builder()
                .userId(targetUserId)
                .roleIds(List.of(100L))
                .build();

        UserRecruitmentAssignmentDTO result = roleService.assignRolesToUser(req);

        assertNotNull(result);
        assertEquals(targetUserId, result.getUserId());
        verify(userRoleRepo).save(any(UserRecruitmentRole.class));
        verify(auditService).logAction(eq("ASSIGN"), eq("UserRecruitmentRole"), eq(100L), anyString(), eq(companyRef));
    }

    @Test
    void removeRoleFromUser_WhenExists_DeletesAssignment() {
        Long targetUserId = 42L;
        Long roleId = 100L;
        RecruitmentRole role = new RecruitmentRole(roleId, companyId, "Evaluator", "Desc", false, null, Set.of());
        UserRecruitmentRole assignment = new UserRecruitmentRole(1L, companyId, targetUserId, role, null);

        when(userRoleRepo.findByCompanyIdAndUserIdAndRoleId(companyId, targetUserId, roleId))
                .thenReturn(Optional.of(assignment));

        assertDoesNotThrow(() -> roleService.removeRoleFromUser(targetUserId, roleId));
        verify(userRoleRepo).delete(assignment);
        verify(auditService).logAction(eq("UNASSIGN"), eq("UserRecruitmentRole"), eq(roleId), anyString(), eq(companyRef));
    }
}
