package com.airella.hrm.controller;

import com.airella.hrm.config.AuthenticatedUser;
import com.airella.hrm.config.JwtUtil;
import com.airella.hrm.dto.*;
import com.airella.hrm.service.CandidateScreeningService;
import com.airella.hrm.service.PermissionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CandidateScreeningControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CandidateScreeningService screeningService;

    @MockBean
    private PermissionService permissionService;

    @MockBean
    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        lenient().when(permissionService.isFullAccess()).thenReturn(true);
        lenient().when(permissionService.has(any())).thenReturn(true);
        lenient().when(permissionService.hasAny(any())).thenReturn(true);
        lenient().when(permissionService.hasAny(anyString())).thenReturn(true);
        lenient().when(permissionService.hasAny(anyString(), anyString())).thenReturn(true);
        lenient().when(permissionService.hasAny(anyString(), anyString(), anyString())).thenReturn(true);
    }

    private void authenticateUser(String email, Long userId, String role) {
        AuthenticatedUser principal = new AuthenticatedUser(email, userId);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("GET /api/recruitment/screening/config/{vacancyId} returns screening configuration")
    void getConfig_authorizedUser_returns200() throws Exception {
        authenticateUser("recruiter@company.com", 1L, "HR_MANAGER");

        VacancyScreeningConfigDTO dto = VacancyScreeningConfigDTO.builder()
                .vacancyId(10L)
                .vacancyTitle("Software Engineer")
                .skillsWeight(40)
                .experienceWeight(25)
                .qualificationsWeight(20)
                .evidenceWeight(15)
                .minimumScore(75)
                .autoShortlistEnabled(true)
                .build();

        when(screeningService.getConfigForVacancy(10L)).thenReturn(dto);

        mockMvc.perform(get("/api/recruitment/screening/config/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.skillsWeight").value(40))
                .andExpect(jsonPath("$.data.minimumScore").value(75))
                .andExpect(jsonPath("$.data.autoShortlistEnabled").value(true));
    }

    @Test
    @DisplayName("PUT /api/recruitment/screening/config/{vacancyId} saves configuration")
    void saveConfig_authorizedUser_returns200() throws Exception {
        authenticateUser("recruiter@company.com", 1L, "HR_MANAGER");

        VacancyScreeningConfigDTO dto = VacancyScreeningConfigDTO.builder()
                .vacancyId(10L)
                .skillsWeight(50)
                .experienceWeight(25)
                .qualificationsWeight(15)
                .evidenceWeight(10)
                .minimumScore(80)
                .autoShortlistEnabled(true)
                .build();

        when(screeningService.saveConfigForVacancy(eq(10L), any(VacancyScreeningConfigDTO.class))).thenReturn(dto);

        mockMvc.perform(put("/api/recruitment/screening/config/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.skillsWeight").value(50))
                .andExpect(jsonPath("$.data.minimumScore").value(80));
    }

    @Test
    @DisplayName("POST /api/recruitment/screening/evaluate-vacancy/{vacancyId} triggers batch screening")
    void evaluateVacancy_authorizedUser_returns200() throws Exception {
        authenticateUser("recruiter@company.com", 1L, "HR_MANAGER");

        CandidateEvaluationResponseDTO resp = CandidateEvaluationResponseDTO.builder()
                .vacancyId(10L)
                .vacancyTitle("Software Engineer")
                .evaluatedCount(5)
                .autoShortlistedCount(2)
                .stagedOrRecommendedCount(3)
                .manualReviewCount(1)
                .build();

        when(screeningService.evaluateVacancyCandidates(10L)).thenReturn(resp);

        mockMvc.perform(post("/api/recruitment/screening/evaluate-vacancy/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.evaluatedCount").value(5))
                .andExpect(jsonPath("$.data.autoShortlistedCount").value(2));
    }

    @Test
    @DisplayName("POST /api/recruitment/applications/{id}/shortlist manually shortlists candidate")
    void shortlistCandidate_authorized_returns200() throws Exception {
        authenticateUser("recruiter@company.com", 1L, "HR_MANAGER");

        CandidateApplicationDTO appDto = new CandidateApplicationDTO();
        appDto.setId(100L);
        appDto.setCandidateName("Alice");
        appDto.setStatus("SHORTLISTED");

        when(screeningService.shortlistCandidateManual(eq(100L), any())).thenReturn(appDto);

        mockMvc.perform(post("/api/recruitment/applications/100/shortlist")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notes\":\"Approved by recruiter\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("SHORTLISTED"));
    }
}
