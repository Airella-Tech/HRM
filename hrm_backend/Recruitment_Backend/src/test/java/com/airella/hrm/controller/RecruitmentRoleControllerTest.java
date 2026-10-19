package com.airella.hrm.controller;

import com.airella.hrm.config.AuthenticatedUser;
import com.airella.hrm.config.JwtUtil;
import com.airella.hrm.dto.*;
import com.airella.hrm.service.PermissionService;
import com.airella.hrm.service.RecruitmentRoleService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RecruitmentRoleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private RecruitmentRoleService roleService;

    @MockBean
    private PermissionService permissionService;

    @MockBean
    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateUser(String email, Long userId, String role) {
        AuthenticatedUser principal = new AuthenticatedUser(email, userId);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void getMyAccess_WhenAuthenticated_Returns200WithAccessDTO() throws Exception {
        authenticateUser("emp@example.com", 10L, "EMPLOYEE");

        MyAccessDTO accessDTO = new MyAccessDTO(false, true, Set.of("APPLICATION_VIEW"), List.of("Interviewer"));
        when(permissionService.getMyAccess()).thenReturn(accessDTO);

        mockMvc.perform(get("/api/recruitment/roles/my-access"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.hasRecruitmentAccess").value(true))
                .andExpect(jsonPath("$.data.permissions[0]").value("APPLICATION_VIEW"))
                .andExpect(jsonPath("$.data.roles[0]").value("Interviewer"));
    }

    @Test
    void checkPermission_WhenGranted_ReturnsTrue() throws Exception {
        authenticateUser("emp@example.com", 10L, "EMPLOYEE");
        when(permissionService.has("VACANCY_CREATE")).thenReturn(true);

        mockMvc.perform(get("/api/recruitment/roles/check").param("permission", "VACANCY_CREATE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.granted").value(true));
    }

    @Test
    void getRoles_WhenUserCanManageRoles_ReturnsRoleList() throws Exception {
        authenticateUser("hr@example.com", 2L, "HR_MANAGER");
        when(permissionService.canManageRoles()).thenReturn(true);

        RecruitmentRoleDTO roleDTO = RecruitmentRoleDTO.builder()
                .id(1L)
                .companyId(5L)
                .roleName("Recruiter")
                .description("Handles recruitment")
                .isSystemDefault(true)
                .assignedUsersCount(2)
                .build();

        when(roleService.getRolesForCurrentCompany(any(), any())).thenReturn(List.of(roleDTO));

        mockMvc.perform(get("/api/recruitment/roles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].roleName").value("Recruiter"));
    }

    @Test
    void createRole_WhenAuthorized_Returns201Created() throws Exception {
        authenticateUser("hr@example.com", 2L, "HR_MANAGER");
        when(permissionService.canManageRoles()).thenReturn(true);

        CreateRecruitmentRoleRequest req = CreateRecruitmentRoleRequest.builder()
                .roleName("Interviewer")
                .description("Conducts interviews")
                .permissionCodes(Set.of("INTERVIEW_EVALUATE"))
                .build();

        RecruitmentRoleDTO created = RecruitmentRoleDTO.builder()
                .id(10L)
                .roleName("Interviewer")
                .companyId(5L)
                .build();

        when(roleService.createRole(any(CreateRecruitmentRoleRequest.class))).thenReturn(created);

        mockMvc.perform(post("/api/recruitment/roles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.roleName").value("Interviewer"));
    }

    @Test
    void getPermissionsByCategory_WhenAuthorized_Returns200() throws Exception {
        authenticateUser("hr@example.com", 2L, "HR_MANAGER");
        when(permissionService.canManageRoles()).thenReturn(true);

        RecruitmentPermissionDTO perm = new RecruitmentPermissionDTO(1L, "VACANCY_CREATE", "VACANCY", "Create vacancy");
        when(roleService.getPermissionsGroupedByCategory()).thenReturn(Map.of("VACANCY", List.of(perm)));

        mockMvc.perform(get("/api/recruitment/roles/permissions/by-category"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.VACANCY[0].permissionCode").value("VACANCY_CREATE"));
    }

    @Test
    void getRoleById_WhenAuthorized_ReturnsRole() throws Exception {
        authenticateUser("hr@example.com", 2L, "HR_MANAGER");
        when(permissionService.canManageRoles()).thenReturn(true);

        RecruitmentRoleDTO role = RecruitmentRoleDTO.builder()
                .id(10L)
                .roleName("Interviewer")
                .companyId(5L)
                .build();
        when(roleService.getRoleById(10L)).thenReturn(role);

        mockMvc.perform(get("/api/recruitment/roles/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(10))
                .andExpect(jsonPath("$.data.roleName").value("Interviewer"));
    }

    @Test
    void updateRole_WhenAuthorized_ReturnsUpdatedRole() throws Exception {
        authenticateUser("hr@example.com", 2L, "HR_MANAGER");
        when(permissionService.canManageRoles()).thenReturn(true);

        UpdateRecruitmentRoleRequest req = UpdateRecruitmentRoleRequest.builder()
                .roleName("Senior Interviewer")
                .description("Updated description")
                .build();

        RecruitmentRoleDTO updated = RecruitmentRoleDTO.builder()
                .id(10L)
                .roleName("Senior Interviewer")
                .description("Updated description")
                .companyId(5L)
                .build();

        when(roleService.updateRole(eq(10L), any(UpdateRecruitmentRoleRequest.class))).thenReturn(updated);

        mockMvc.perform(put("/api/recruitment/roles/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.roleName").value("Senior Interviewer"));
    }

    @Test
    void deleteRole_WhenAuthorized_Returns200() throws Exception {
        authenticateUser("hr@example.com", 2L, "HR_MANAGER");
        when(permissionService.canManageRoles()).thenReturn(true);

        mockMvc.perform(delete("/api/recruitment/roles/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void assignRolesToUser_WhenAuthorized_Returns200() throws Exception {
        authenticateUser("hr@example.com", 2L, "HR_MANAGER");
        when(permissionService.canManageRoles()).thenReturn(true);

        AssignUserRoleRequest req = AssignUserRoleRequest.builder()
                .userId(15L)
                .roleIds(List.of(10L))
                .build();

        UserRecruitmentAssignmentDTO result = UserRecruitmentAssignmentDTO.builder()
                .userId(15L)
                .fullName("John Smith")
                .build();

        when(roleService.assignRolesToUser(any(AssignUserRoleRequest.class))).thenReturn(result);

        mockMvc.perform(post("/api/recruitment/roles/users/assign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullName").value("John Smith"));
    }

    @Test
    void getRoles_WhenUserCannotManageRoles_Returns403Forbidden() throws Exception {
        authenticateUser("employee@example.com", 15L, "EMPLOYEE");
        when(permissionService.canManageRoles()).thenReturn(false);

        mockMvc.perform(get("/api/recruitment/roles"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }
}
