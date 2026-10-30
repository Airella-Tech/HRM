package com.airella.hrm.service;

import com.airella.hrm.dto.*;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.model.*;
import com.airella.hrm.repository.CandidateApplicationRepository;
import com.airella.hrm.repository.CandidateScreeningResultRepository;
import com.airella.hrm.repository.JobVacancyRepository;
import com.airella.hrm.repository.VacancyScreeningConfigRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CandidateScreeningServiceTest {

    @Mock
    private VacancyScreeningConfigRepository configRepo;

    @Mock
    private CandidateScreeningResultRepository resultRepo;

    @Mock
    private CandidateApplicationRepository applicationRepo;

    @Mock
    private JobVacancyRepository vacancyRepo;

    @Mock
    private AuthService authService;

    @Mock
    private PermissionService permissionService;

    @Mock
    private AuditService auditService;

    private ObjectMapper objectMapper;
    private CandidateScreeningService service;

    private JobVacancy backendVacancy;
    private JobVacancy hrVacancy;
    private CandidateApplication sampleCandidate;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        service = new CandidateScreeningService(
                configRepo,
                resultRepo,
                applicationRepo,
                vacancyRepo,
                authService,
                permissionService,
                auditService,
                objectMapper
        );

        // Vacancy 1: Backend Developer for Company A
        backendVacancy = new JobVacancy();
        backendVacancy.setId(10L);
        backendVacancy.setTitle("Senior Backend Developer");
        backendVacancy.setDepartment("Engineering");
        backendVacancy.setCompanyRef("COMP_A");
        backendVacancy.setRequiredSkills(Set.of("Java", "Spring Boot", "PostgreSQL"));
        backendVacancy.setExperienceLevel("Senior");

        // Vacancy 2: HR Executive for Company A
        hrVacancy = new JobVacancy();
        hrVacancy.setId(20L);
        hrVacancy.setTitle("HR Executive");
        hrVacancy.setDepartment("Human Resources");
        hrVacancy.setCompanyRef("COMP_A");
        hrVacancy.setRequiredSkills(Set.of("Recruitment", "Employee Relations", "Payroll"));
        hrVacancy.setExperienceLevel("Mid");

        // Sample candidate
        sampleCandidate = new CandidateApplication();
        sampleCandidate.setId(100L);
        sampleCandidate.setCandidateName("Alice Johnson");
        sampleCandidate.setEmail("alice@example.com");
        sampleCandidate.setCompanyRef("COMP_A");
        sampleCandidate.setVacancy(backendVacancy);
        sampleCandidate.setExperienceYears(5);
        sampleCandidate.setEducation("Bachelor of Science in Computer Science");
        sampleCandidate.setSkills(Set.of("Java", "Spring Boot", "PostgreSQL", "Docker"));
        sampleCandidate.setResumeText("Experienced software engineer with 5 years designing REST APIs, microservices architecture, and CI/CD pipelines.");
        sampleCandidate.setStatus(ApplicationStatus.NEW);
    }

    // =========================================================================
    // 1. Valid and Invalid Screening Configurations & Weights totaling 100%
    // =========================================================================

    @Test
    @DisplayName("Valid configuration with weights totaling exactly 100% saves successfully")
    void saveConfig_weightsTotal100_savesSuccessfully() {
        when(vacancyRepo.findById(10L)).thenReturn(Optional.of(backendVacancy));
        when(permissionService.isFullAccess()).thenReturn(true);
        when(configRepo.findByVacancyId(10L)).thenReturn(Optional.empty());

        VacancyScreeningConfigDTO dto = VacancyScreeningConfigDTO.builder()
                .vacancyId(10L)
                .skillsWeight(40)
                .experienceWeight(25)
                .qualificationsWeight(20)
                .evidenceWeight(15)
                .minimumScore(75)
                .autoShortlistEnabled(true)
                .requiredSkills(List.of(new ScreeningSkillCriterionDTO("Java", true, List.of("JDK"))))
                .minExperienceYears(3)
                .requiredDegreeLevel("BACHELORS")
                .build();

        when(configRepo.save(any(VacancyScreeningConfig.class))).thenAnswer(i -> {
            VacancyScreeningConfig c = i.getArgument(0);
            c.setId(1L);
            c.setCreatedAt(LocalDateTime.now());
            c.setUpdatedAt(LocalDateTime.now());
            return c;
        });

        VacancyScreeningConfigDTO saved = service.saveConfigForVacancy(10L, dto);

        assertNotNull(saved);
        assertEquals(40, saved.getSkillsWeight());
        assertEquals(25, saved.getExperienceWeight());
        assertEquals(20, saved.getQualificationsWeight());
        assertEquals(15, saved.getEvidenceWeight());
        assertEquals(100, saved.getTotalWeight());
        assertTrue(saved.isWeightValid());
    }

    @Test
    @DisplayName("Configuration rejected when percentage weights do not total 100%")
    void saveConfig_weightsDoNotTotal100_throwsBusinessException() {
        when(vacancyRepo.findById(10L)).thenReturn(Optional.of(backendVacancy));
        when(permissionService.isFullAccess()).thenReturn(true);

        VacancyScreeningConfigDTO invalidDto = VacancyScreeningConfigDTO.builder()
                .vacancyId(10L)
                .skillsWeight(40)
                .experienceWeight(20)
                .qualificationsWeight(20)
                .evidenceWeight(10) // Sum = 90%
                .minimumScore(75)
                .build();

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.saveConfigForVacancy(10L, invalidDto));

        assertTrue(ex.getMessage().contains("must total exactly 100%"));
    }

    @Test
    @DisplayName("Configuration rejected when category weights contain negative numbers")
    void saveConfig_negativeWeight_throwsBusinessException() {
        when(vacancyRepo.findById(10L)).thenReturn(Optional.of(backendVacancy));
        when(permissionService.isFullAccess()).thenReturn(true);

        VacancyScreeningConfigDTO invalidDto = VacancyScreeningConfigDTO.builder()
                .vacancyId(10L)
                .skillsWeight(110)
                .experienceWeight(-10)
                .qualificationsWeight(0)
                .evidenceWeight(0)
                .minimumScore(75)
                .build();

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.saveConfigForVacancy(10L, invalidDto));

        assertTrue(ex.getMessage().contains("cannot be negative"));
    }

    // =========================================================================
    // 2. Different Configurations for Different Vacancies & Outcomes
    // =========================================================================

    @Test
    @DisplayName("Same candidate scores differently under Backend Developer vs HR Executive vacancy")
    void evaluate_sameCandidateDifferentVacancies_yieldsDifferentScores() {
        // Backend Config: Prioritizes technical skills (Java, Spring Boot)
        VacancyScreeningConfig backendConfig = new VacancyScreeningConfig();
        backendConfig.setId(1L);
        backendConfig.setVacancyId(10L);
        backendConfig.setCompanyRef("COMP_A");
        backendConfig.setSkillsWeight(50);
        backendConfig.setExperienceWeight(30);
        backendConfig.setQualificationsWeight(10);
        backendConfig.setEvidenceWeight(10);
        backendConfig.setMinimumScore(75);
        backendConfig.setAutoShortlistEnabled(false);
        backendConfig.setCriteriaJson("{\"requiredSkills\":[{\"name\":\"Java\",\"mandatory\":true},{\"name\":\"Spring Boot\",\"mandatory\":true}],\"minExperienceYears\":3,\"requiredDegreeLevel\":\"BACHELORS\"}");

        // HR Config: Prioritizes HR experience and qualifications (Recruitment, Payroll)
        VacancyScreeningConfig hrConfig = new VacancyScreeningConfig();
        hrConfig.setId(2L);
        hrConfig.setVacancyId(20L);
        hrConfig.setCompanyRef("COMP_A");
        hrConfig.setSkillsWeight(40);
        hrConfig.setExperienceWeight(30);
        hrConfig.setQualificationsWeight(20);
        hrConfig.setEvidenceWeight(10);
        hrConfig.setMinimumScore(70);
        hrConfig.setAutoShortlistEnabled(false);
        hrConfig.setCriteriaJson("{\"requiredSkills\":[{\"name\":\"Recruitment\",\"mandatory\":true},{\"name\":\"Payroll\",\"mandatory\":true}],\"minExperienceYears\":4,\"requiredDegreeLevel\":\"BACHELORS\"}");

        when(permissionService.isFullAccess()).thenReturn(true);
        when(resultRepo.save(any(CandidateScreeningResult.class))).thenAnswer(i -> i.getArgument(0));

        // Evaluate for Backend Vacancy
        when(applicationRepo.findById(100L)).thenReturn(Optional.of(sampleCandidate));
        when(configRepo.findByVacancyId(10L)).thenReturn(Optional.of(backendConfig));

        CandidateScreeningResultDTO backendResult = service.evaluateCandidate(100L);

        // Re-target candidate to HR vacancy
        CandidateApplication candApplyingForHr = new CandidateApplication();
        candApplyingForHr.setId(101L);
        candApplyingForHr.setCandidateName("Alice Johnson");
        candApplyingForHr.setCompanyRef("COMP_A");
        candApplyingForHr.setVacancy(hrVacancy);
        candApplyingForHr.setExperienceYears(5);
        candApplyingForHr.setEducation("Bachelor of Science in Computer Science");
        candApplyingForHr.setSkills(Set.of("Java", "Spring Boot", "PostgreSQL"));
        candApplyingForHr.setResumeText(sampleCandidate.getResumeText());

        when(applicationRepo.findById(101L)).thenReturn(Optional.of(candApplyingForHr));
        when(configRepo.findByVacancyId(20L)).thenReturn(Optional.of(hrConfig));

        CandidateScreeningResultDTO hrResult = service.evaluateCandidate(101L);

        // Technical candidate should score very high for Backend, but fail mandatory skills for HR
        assertTrue(backendResult.getOverallScore() >= 80.0, "Backend score should be high");
        assertEquals("RECOMMENDED_FOR_SHORTLIST", backendResult.getRecommendation());
        assertEquals("MET", backendResult.getMandatorySkillsMet());

        assertTrue(hrResult.getOverallScore() < 50.0, "HR score should be low due to technical mismatch");
        assertEquals("UNMET", hrResult.getMandatorySkillsMet());
        assertEquals("NOT_RECOMMENDED", hrResult.getRecommendation());
    }

    // =========================================================================
    // 3. Mandatory Requirements (Met, Unmet, Unknown)
    // =========================================================================

    @Test
    @DisplayName("Mandatory requirement UNMET prevents shortlisting even if overall score is high")
    void evaluate_mandatoryUnmet_resultsInNotRecommended() {
        VacancyScreeningConfig config = new VacancyScreeningConfig();
        config.setVacancyId(10L);
        config.setCompanyRef("COMP_A");
        config.setSkillsWeight(40);
        config.setExperienceWeight(25);
        config.setQualificationsWeight(20);
        config.setEvidenceWeight(15);
        config.setMinimumScore(60); // Low threshold
        config.setAutoShortlistEnabled(true);
        // Requires Kubernetes as MANDATORY
        config.setCriteriaJson("{\"requiredSkills\":[{\"name\":\"Java\",\"mandatory\":false},{\"name\":\"Kubernetes\",\"mandatory\":true}],\"minExperienceYears\":2}");

        when(permissionService.isFullAccess()).thenReturn(true);
        when(applicationRepo.findById(100L)).thenReturn(Optional.of(sampleCandidate));
        when(configRepo.findByVacancyId(10L)).thenReturn(Optional.of(config));
        when(resultRepo.save(any(CandidateScreeningResult.class))).thenAnswer(i -> i.getArgument(0));

        CandidateScreeningResultDTO result = service.evaluateCandidate(100L);

        assertEquals("UNMET", result.getMandatorySkillsMet());
        assertFalse(result.getAllMandatoryMet());
        assertEquals("NOT_RECOMMENDED", result.getRecommendation());
        assertFalse(result.getAutoShortlisted());
        assertNotEquals(ApplicationStatus.SHORTLISTED, sampleCandidate.getStatus());
    }

    @Test
    @DisplayName("Ambiguous or missing CV information results in REQUIRES_MANUAL_REVIEW without rejection")
    void evaluate_missingResumeText_resultsInManualReview() {
        sampleCandidate.setResumeText(null); // No CV text extracted

        VacancyScreeningConfig config = new VacancyScreeningConfig();
        config.setVacancyId(10L);
        config.setCompanyRef("COMP_A");
        config.setSkillsWeight(40);
        config.setExperienceWeight(25);
        config.setQualificationsWeight(20);
        config.setEvidenceWeight(15);
        config.setMinimumScore(70);
        config.setAutoShortlistEnabled(true);
        config.setCriteriaJson("{\"requiredSkills\":[{\"name\":\"Java\",\"mandatory\":true}],\"minExperienceYears\":3,\"experienceMandatory\":true}");

        when(permissionService.isFullAccess()).thenReturn(true);
        when(applicationRepo.findById(100L)).thenReturn(Optional.of(sampleCandidate));
        when(configRepo.findByVacancyId(10L)).thenReturn(Optional.of(config));
        when(resultRepo.save(any(CandidateScreeningResult.class))).thenAnswer(i -> i.getArgument(0));

        CandidateScreeningResultDTO result = service.evaluateCandidate(100L);

        assertEquals("REQUIRES_MANUAL_REVIEW", result.getRecommendation());
        assertFalse(result.getAutoShortlisted());
        // Candidate must not be auto-rejected
        assertNotEquals(ApplicationStatus.REJECTED, sampleCandidate.getStatus());
    }

    // =========================================================================
    // 4. Automatic Shortlisting Triggered vs Disabled
    // =========================================================================

    @Test
    @DisplayName("Automatic shortlisting enabled: qualifying candidate status updated to SHORTLISTED")
    void evaluate_autoShortlistEnabledAndMeetsThreshold_updatesStatusToShortlisted() {
        VacancyScreeningConfig config = new VacancyScreeningConfig();
        config.setVacancyId(10L);
        config.setCompanyRef("COMP_A");
        config.setSkillsWeight(40);
        config.setExperienceWeight(25);
        config.setQualificationsWeight(20);
        config.setEvidenceWeight(15);
        config.setMinimumScore(75);
        config.setAutoShortlistEnabled(true); // Enabled!
        config.setCriteriaJson("{\"requiredSkills\":[{\"name\":\"Java\",\"mandatory\":true},{\"name\":\"Spring Boot\",\"mandatory\":false}],\"minExperienceYears\":3,\"experienceMandatory\":true,\"requiredDegreeLevel\":\"BACHELORS\"}");

        when(permissionService.isFullAccess()).thenReturn(true);
        when(applicationRepo.findById(100L)).thenReturn(Optional.of(sampleCandidate));
        when(configRepo.findByVacancyId(10L)).thenReturn(Optional.of(config));
        when(resultRepo.save(any(CandidateScreeningResult.class))).thenAnswer(i -> i.getArgument(0));

        CandidateScreeningResultDTO result = service.evaluateCandidate(100L);

        assertTrue(result.getOverallScore() >= 75.0);
        assertTrue(result.getAllMandatoryMet());
        assertTrue(result.getAutoShortlisted());
        assertEquals("SYSTEM_AUTOMATED", result.getDecisionSource());
        assertEquals(ApplicationStatus.SHORTLISTED, sampleCandidate.getStatus());
    }

    @Test
    @DisplayName("Automatic shortlisting disabled: candidate qualifies but status remains unchanged for recruiter confirmation")
    void evaluate_autoShortlistDisabled_qualifiesWithoutAutoStatusChange() {
        VacancyScreeningConfig config = new VacancyScreeningConfig();
        config.setVacancyId(10L);
        config.setCompanyRef("COMP_A");
        config.setSkillsWeight(40);
        config.setExperienceWeight(25);
        config.setQualificationsWeight(20);
        config.setEvidenceWeight(15);
        config.setMinimumScore(75);
        config.setAutoShortlistEnabled(false); // Disabled!
        config.setCriteriaJson("{\"requiredSkills\":[{\"name\":\"Java\",\"mandatory\":true}],\"minExperienceYears\":3,\"experienceMandatory\":true,\"requiredDegreeLevel\":\"BACHELORS\"}");

        when(permissionService.isFullAccess()).thenReturn(true);
        when(applicationRepo.findById(100L)).thenReturn(Optional.of(sampleCandidate));
        when(configRepo.findByVacancyId(10L)).thenReturn(Optional.of(config));
        when(resultRepo.save(any(CandidateScreeningResult.class))).thenAnswer(i -> i.getArgument(0));

        CandidateScreeningResultDTO result = service.evaluateCandidate(100L);

        assertTrue(result.getOverallScore() >= 75.0);
        assertEquals("RECOMMENDED_FOR_SHORTLIST", result.getRecommendation());
        assertFalse(result.getAutoShortlisted());
        assertEquals("PENDING_REVIEW", result.getDecisionSource());
        // Status remains UNDER_REVIEW, waiting for recruiter confirmation
        assertEquals(ApplicationStatus.UNDER_REVIEW, sampleCandidate.getStatus());
    }

    // =========================================================================
    // 5. Multi-Company Isolation & Security
    // =========================================================================

    @Test
    @DisplayName("Cross-company access blocked when user attempts to access vacancy from another company")
    void evaluate_crossCompanyAccess_throwsAccessDeniedException() {
        JobVacancy companyBVacancy = new JobVacancy();
        companyBVacancy.setId(99L);
        companyBVacancy.setTitle("Frontend Engineer");
        companyBVacancy.setCompanyRef("COMP_B"); // Belongs to Company B

        CandidateApplication companyBApp = new CandidateApplication();
        companyBApp.setId(999L);
        companyBApp.setCompanyRef("COMP_B");
        companyBApp.setVacancy(companyBVacancy);

        when(permissionService.isFullAccess()).thenReturn(false);
        when(authService.getCurrentCompanyRef()).thenReturn("COMP_A"); // Current user is in Company A
        when(applicationRepo.findById(999L)).thenReturn(Optional.of(companyBApp));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.evaluateCandidate(999L));

        assertTrue(ex.getMessage().contains("Access denied"));
    }

    // =========================================================================
    // 6. Manual Shortlist & Reject Actions
    // =========================================================================

    @Test
    @DisplayName("Manual shortlist updates application and saves recruiter attribution record")
    void shortlistCandidateManual_updatesStatusAndRecordsAudit() {
        when(permissionService.isFullAccess()).thenReturn(true);
        when(permissionService.currentUserId()).thenReturn(42L);
        when(applicationRepo.findById(100L)).thenReturn(Optional.of(sampleCandidate));
        when(applicationRepo.save(any(CandidateApplication.class))).thenAnswer(i -> i.getArgument(0));

        CandidateApplicationDTO result = service.shortlistCandidateManual(100L, "Impressive portfolio");

        assertEquals("SHORTLISTED", result.getStatus());
        assertEquals("ELIGIBLE", result.getEligibilityStatus());
        verify(resultRepo).save(argThat(r ->
                "RECRUITER_MANUAL".equals(r.getDecisionSource()) &&
                r.getDecisionReason().contains("Impressive portfolio")
        ));
    }

    @Test
    @DisplayName("Manual reject updates application with structured feedback")
    void rejectCandidateManual_updatesStatusWithStructuredReason() {
        when(permissionService.isFullAccess()).thenReturn(true);
        when(permissionService.currentUserId()).thenReturn(42L);
        when(applicationRepo.findById(100L)).thenReturn(Optional.of(sampleCandidate));
        when(applicationRepo.save(any(CandidateApplication.class))).thenAnswer(i -> i.getArgument(0));

        CandidateApplicationDTO result = service.rejectCandidateManual(100L, "Key technical skills mismatch");

        assertEquals("REJECTED", result.getStatus());
        assertEquals("INELIGIBLE", result.getEligibilityStatus());
        assertEquals("Key technical skills mismatch", result.getRejectionReason());
    }
}
