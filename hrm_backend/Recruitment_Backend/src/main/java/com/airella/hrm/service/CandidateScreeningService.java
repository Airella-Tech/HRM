package com.airella.hrm.service;

import com.airella.hrm.dto.*;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.*;
import com.airella.hrm.repository.CandidateApplicationRepository;
import com.airella.hrm.repository.CandidateScreeningResultRepository;
import com.airella.hrm.repository.JobVacancyRepository;
import com.airella.hrm.repository.VacancyScreeningConfigRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Reusable Candidate Screening and Automatic Shortlisting Engine.
 *
 * Evaluates candidate applications against vacancy-specific screening configurations:
 * 1. Criterion Percentage Weights (must total exactly 100%)
 * 2. Mandatory Requirements evaluation (MET, UNMET, UNKNOWN)
 * 3. Weighted Suitability Score Calculation:
 *    Overall = (Skills * W_s + Experience * W_exp + Qualifications * W_q + Evidence * W_ev) / 100
 * 4. Threshold & Shortlisting Policy:
 *    - Automatically shortlists candidate if enabled, mandatory met, and overall >= minimum
 *    - Flags ambiguous or missing CV information for manual review
 *    - Never auto-rejects candidates solely on score
 * 5. Strict multi-company isolation and historical audit preservation.
 */
@Service
@Transactional
public class CandidateScreeningService {

    private static final Logger log = LoggerFactory.getLogger(CandidateScreeningService.class);

    private final VacancyScreeningConfigRepository configRepo;
    private final CandidateScreeningResultRepository resultRepo;
    private final CandidateApplicationRepository applicationRepo;
    private final JobVacancyRepository vacancyRepo;
    private final AuthService authService;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    // Common skill aliases / synonyms mapping for explainable normalization
    private static final Map<String, List<String>> DEFAULT_SKILL_ALIASES = Map.ofEntries(
            Map.entry("java", List.of("core java", "j2se", "jdk", "java 8", "java 11", "java 17", "java 21")),
            Map.entry("spring boot", List.of("springboot", "spring-boot", "spring framework", "spring")),
            Map.entry("react", List.of("react.js", "reactjs", "react-js")),
            Map.entry("angular", List.of("angular.js", "angularjs", "angular 2+")),
            Map.entry("vue", List.of("vue.js", "vuejs")),
            Map.entry("node.js", List.of("nodejs", "node", "express.js", "express")),
            Map.entry("python", List.of("python3", "py", "django", "fastapi", "flask")),
            Map.entry("postgresql", List.of("postgres", "psql", "postgresql 14", "postgresql 15")),
            Map.entry("sql", List.of("relational database", "rdbms", "mysql", "mssql", "oracle")),
            Map.entry("docker", List.of("containers", "dockerfile", "containerization")),
            Map.entry("kubernetes", List.of("k8s", "kubectl", "container orchestration")),
            Map.entry("aws", List.of("amazon web services", "ec2", "s3", "lambda", "ecs")),
            Map.entry("ci/cd", List.of("cicd", "continuous integration", "github actions", "gitlab ci", "jenkins")),
            Map.entry("selenium", List.of("selenium webdriver", "automation testing", "test automation"))
    );

    public CandidateScreeningService(VacancyScreeningConfigRepository configRepo,
                                     CandidateScreeningResultRepository resultRepo,
                                     CandidateApplicationRepository applicationRepo,
                                     JobVacancyRepository vacancyRepo,
                                     AuthService authService,
                                     PermissionService permissionService,
                                     AuditService auditService,
                                     ObjectMapper objectMapper) {
        this.configRepo = configRepo;
        this.resultRepo = resultRepo;
        this.applicationRepo = applicationRepo;
        this.vacancyRepo = vacancyRepo;
        this.authService = authService;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    // =========================================================================
    // 1. Vacancy-Specific Screening Configuration Management
    // =========================================================================

    /**
     * Retrieves the screening configuration for a specific vacancy.
     * If no configuration has been created yet, a pre-populated default configuration
     * matching the vacancy's title and required skills is returned.
     */
    @Transactional(readOnly = true)
    public VacancyScreeningConfigDTO getConfigForVacancy(Long vacancyId) {
        JobVacancy vacancy = getValidatedVacancy(vacancyId);

        Optional<VacancyScreeningConfig> existing = configRepo.findByVacancyId(vacancyId);
        if (existing.isPresent()) {
            return toConfigDto(existing.get(), vacancy.getTitle());
        }

        // Return initial template for this vacancy
        return createDefaultConfigTemplate(vacancy);
    }

    /**
     * Saves or updates the vacancy screening configuration.
     * Enforces:
     * - Multi-company ownership (can only configure vacancies belonging to user's company)
     * - Percentage weights must sum to exactly 100%
     * - Rejection of negative weights or invalid numbers
     * - Historical version incrementing
     */
    public VacancyScreeningConfigDTO saveConfigForVacancy(Long vacancyId, VacancyScreeningConfigDTO dto) {
        JobVacancy vacancy = getValidatedVacancy(vacancyId);

        // 1. Validate weights
        validateWeights(dto);

        // 2. Validate threshold
        if (dto.getMinimumScore() == null || dto.getMinimumScore() < 0 || dto.getMinimumScore() > 100) {
            throw new BusinessException("Minimum qualification score must be between 0 and 100%.");
        }

        VacancyScreeningConfig config = configRepo.findByVacancyId(vacancyId)
                .orElseGet(() -> {
                    VacancyScreeningConfig c = new VacancyScreeningConfig();
                    c.setVacancyId(vacancyId);
                    c.setCompanyRef(vacancy.getCompanyRef());
                    c.setConfigVersion(1);
                    return c;
                });

        // If updating existing, increment config version to protect historical decisions
        if (config.getId() != null) {
            config.setConfigVersion(config.getConfigVersion() + 1);
        }

        config.setSkillsWeight(dto.getSkillsWeight());
        config.setExperienceWeight(dto.getExperienceWeight());
        config.setQualificationsWeight(dto.getQualificationsWeight());
        config.setEvidenceWeight(dto.getEvidenceWeight());
        config.setMinimumScore(dto.getMinimumScore());
        config.setAutoShortlistEnabled(Boolean.TRUE.equals(dto.getAutoShortlistEnabled()));
        config.setUpdatedBy(permissionService.currentUserId());

        // Serialize structured criteria to JSON
        Map<String, Object> criteriaMap = new LinkedHashMap<>();
        criteriaMap.put("requiredSkills", dto.getRequiredSkills() != null ? dto.getRequiredSkills() : List.of());
        criteriaMap.put("preferredSkills", dto.getPreferredSkills() != null ? dto.getPreferredSkills() : List.of());
        criteriaMap.put("minExperienceYears", dto.getMinExperienceYears() != null ? dto.getMinExperienceYears() : 0);
        criteriaMap.put("experienceMandatory", Boolean.TRUE.equals(dto.getExperienceMandatory()));
        criteriaMap.put("experienceKeywords", dto.getExperienceKeywords() != null ? dto.getExperienceKeywords() : List.of());
        criteriaMap.put("requiredDegreeLevel", dto.getRequiredDegreeLevel() != null ? dto.getRequiredDegreeLevel() : "ANY");
        criteriaMap.put("educationMandatory", Boolean.TRUE.equals(dto.getEducationMandatory()));
        criteriaMap.put("preferredQualifications", dto.getPreferredQualifications() != null ? dto.getPreferredQualifications() : List.of());
        criteriaMap.put("jobEvidenceKeywords", dto.getJobEvidenceKeywords() != null ? dto.getJobEvidenceKeywords() : List.of());
        criteriaMap.put("evidenceMandatory", Boolean.TRUE.equals(dto.getEvidenceMandatory()));

        try {
            config.setCriteriaJson(objectMapper.writeValueAsString(criteriaMap));
        } catch (Exception e) {
            log.warn("Failed to serialize criteriaJson: {}", e.getMessage());
            config.setCriteriaJson("{}");
        }

        VacancyScreeningConfig saved = configRepo.save(config);

        auditService.logAction(
                "SCREENING_CONFIG_UPDATED",
                "VacancyScreeningConfig",
                saved.getId(),
                "Updated screening configuration (v" + saved.getConfigVersion() + ") for vacancy '" + vacancy.getTitle() +
                        "' [AutoShortlist: " + saved.getAutoShortlistEnabled() + ", MinScore: " + saved.getMinimumScore() + "%]",
                saved.getCompanyRef()
        );

        return toConfigDto(saved, vacancy.getTitle());
    }

    /**
     * Validates that percentage weights sum to exactly 100% and are non-negative.
     */
    public void validateWeights(VacancyScreeningConfigDTO dto) {
        if (dto.getSkillsWeight() == null || dto.getExperienceWeight() == null ||
                dto.getQualificationsWeight() == null || dto.getEvidenceWeight() == null) {
            throw new BusinessException("All criterion percentage weights must be specified.");
        }

        if (dto.getSkillsWeight() < 0 || dto.getExperienceWeight() < 0 ||
                dto.getQualificationsWeight() < 0 || dto.getEvidenceWeight() < 0) {
            throw new BusinessException("Percentage weights cannot be negative.");
        }

        int total = dto.getSkillsWeight() + dto.getExperienceWeight() +
                dto.getQualificationsWeight() + dto.getEvidenceWeight();

        if (total != 100) {
            throw new BusinessException("The configured screening weights must total exactly 100%. Current sum: " + total + "%.");
        }
    }

    // =========================================================================
    // 2. Candidate Evaluation and Automatic Shortlisting Engine
    // =========================================================================

    /**
     * Evaluates a single candidate application against the active screening configuration of its vacancy.
     */
    public CandidateScreeningResultDTO evaluateCandidate(Long applicationId) {
        CandidateApplication app = applicationRepo.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("CandidateApplication", "id", applicationId));

        validateCompanyAccess(app.getCompanyRef(), app.getCompanyId());

        JobVacancy vacancy = app.getVacancy();
        if (vacancy == null) {
            throw new BusinessException("Application is not associated with a valid job vacancy.");
        }

        // Load active configuration for this vacancy (or generate default template if not explicitly saved)
        VacancyScreeningConfig config = configRepo.findByVacancyId(vacancy.getId())
                .orElseGet(() -> createAndSaveDefaultConfig(vacancy));

        return runCandidateEvaluation(app, vacancy, config, permissionService.currentUserId());
    }

    /**
     * Evaluates all candidate applications for a specific vacancy.
     * Applies automatic shortlisting if enabled on qualifying candidates.
     */
    public CandidateEvaluationResponseDTO evaluateVacancyCandidates(Long vacancyId) {
        JobVacancy vacancy = getValidatedVacancy(vacancyId);

        VacancyScreeningConfig config = configRepo.findByVacancyId(vacancyId)
                .orElseGet(() -> createAndSaveDefaultConfig(vacancy));

        // Retrieve all applications for this vacancy
        List<CandidateApplication> applications = applicationRepo.findAllByCompany(vacancy.getCompanyRef(), null)
                .stream()
                .filter(a -> a.getVacancy() != null && vacancyId.equals(a.getVacancy().getId()))
                .toList();

        List<CandidateScreeningResultDTO> results = new ArrayList<>();
        int autoShortlistedCount = 0;
        int recommendedCount = 0;
        int manualReviewCount = 0;

        Long currentUserId = permissionService.currentUserId();

        for (CandidateApplication app : applications) {
            CandidateScreeningResultDTO result = runCandidateEvaluation(app, vacancy, config, currentUserId);
            results.add(result);

            if (Boolean.TRUE.equals(result.getAutoShortlisted())) {
                autoShortlistedCount++;
            }
            if ("RECOMMENDED_FOR_SHORTLIST".equals(result.getRecommendation())) {
                recommendedCount++;
            } else if ("REQUIRES_MANUAL_REVIEW".equals(result.getRecommendation())) {
                manualReviewCount++;
            }
        }

        auditService.logAction(
                "VACANCY_SCREENING_EVALUATED",
                "JobVacancy",
                vacancy.getId(),
                "Ran automated candidate screening for '" + vacancy.getTitle() + "'. Evaluated " + applications.size() +
                        " applicants; Auto-shortlisted: " + autoShortlistedCount + "; Recommended: " + recommendedCount,
                vacancy.getCompanyRef()
        );

        return CandidateEvaluationResponseDTO.builder()
                .vacancyId(vacancyId)
                .vacancyTitle(vacancy.getTitle())
                .evaluatedCount(applications.size())
                .autoShortlistedCount(autoShortlistedCount)
                .stagedOrRecommendedCount(recommendedCount)
                .manualReviewCount(manualReviewCount)
                .results(results)
                .build();
    }

    /**
     * Force rescreens applications for a vacancy using the latest configuration revision.
     */
    public CandidateEvaluationResponseDTO rescreenVacancy(Long vacancyId) {
        log.info("Triggered controlled rescreening for vacancy {}", vacancyId);
        return evaluateVacancyCandidates(vacancyId);
    }

    /**
     * Core explainable evaluation algorithm for a candidate application.
     */
    private CandidateScreeningResultDTO runCandidateEvaluation(CandidateApplication app,
                                                               JobVacancy vacancy,
                                                               VacancyScreeningConfig config,
                                                               Long evaluatorUserId) {
        VacancyScreeningConfigDTO configDto = toConfigDto(config, vacancy.getTitle());

        String resumeText = app.getResumeText() != null ? app.getResumeText().toLowerCase(Locale.ROOT) : "";
        boolean isResumeMissingOrEmpty = resumeText.isBlank();

        // ── 1. Skills Evaluation ─────────────────────────────────────────────
        EvaluationSkillResult skillResult = evaluateSkills(app, configDto, resumeText, isResumeMissingOrEmpty);

        // ── 2. Work Experience Evaluation ────────────────────────────────────
        EvaluationExperienceResult expResult = evaluateExperience(app, configDto, resumeText, isResumeMissingOrEmpty);

        // ── 3. Educational Qualifications Evaluation ─────────────────────────
        EvaluationEducationResult eduResult = evaluateEducation(app, configDto, resumeText, isResumeMissingOrEmpty);

        // ── 4. Job-Related CV Evidence Evaluation ────────────────────────────
        EvaluationEvidenceResult evResult = evaluateEvidence(app, configDto, resumeText, isResumeMissingOrEmpty);

        // ── 5. Weighted Overall Suitability Score ────────────────────────────
        // Formula: Overall = (Skills * W_s + Experience * W_exp + Qualifications * W_q + Evidence * W_ev) / 100.0
        double weightedSum = (skillResult.score * config.getSkillsWeight()) +
                (expResult.score * config.getExperienceWeight()) +
                (eduResult.score * config.getQualificationsWeight()) +
                (evResult.score * config.getEvidenceWeight());

        double overallScoreRaw = weightedSum / 100.0;
        BigDecimal roundedScore = BigDecimal.valueOf(overallScoreRaw).setScale(1, RoundingMode.HALF_UP);
        double overallScore = roundedScore.doubleValue();
        int integerScore = (int) Math.round(overallScore);

        // ── 6. Mandatory Requirements Check ──────────────────────────────────
        boolean allMandatoryMet = "MET".equals(skillResult.mandatoryStatus) &&
                "MET".equals(expResult.mandatoryStatus) &&
                "MET".equals(eduResult.mandatoryStatus);

        boolean hasUnknownMandatory = "UNKNOWN".equals(skillResult.mandatoryStatus) ||
                "UNKNOWN".equals(expResult.mandatoryStatus) ||
                "UNKNOWN".equals(eduResult.mandatoryStatus);

        boolean hasUnmetMandatory = "UNMET".equals(skillResult.mandatoryStatus) ||
                "UNMET".equals(expResult.mandatoryStatus) ||
                "UNMET".equals(eduResult.mandatoryStatus);

        // ── 7. Decision, Recommendation & Policy ─────────────────────────────
        String recommendation;
        boolean autoShortlisted = false;
        String decisionSource;
        String decisionReason;

        int minScore = config.getMinimumScore() != null ? config.getMinimumScore() : 75;
        boolean meetsThreshold = integerScore >= minScore;

        if (hasUnmetMandatory) {
            recommendation = "NOT_RECOMMENDED";
            decisionSource = "SYSTEM_AUTOMATED";
            decisionReason = "Does not meet mandatory requirement: " + getUnmetMandatoryReason(skillResult, expResult, eduResult);
        } else if (hasUnknownMandatory || isResumeMissingOrEmpty) {
            recommendation = "REQUIRES_MANUAL_REVIEW";
            decisionSource = "PENDING_REVIEW";
            decisionReason = isResumeMissingOrEmpty
                    ? "CV document text is missing or could not be extracted; requires manual recruiter review."
                    : "Ambiguous or incomplete CV evidence for mandatory requirements: " + getUnknownMandatoryReason(skillResult, expResult, eduResult);
        } else if (allMandatoryMet && meetsThreshold) {
            recommendation = "RECOMMENDED_FOR_SHORTLIST";

            if (Boolean.TRUE.equals(config.getAutoShortlistEnabled())) {
                autoShortlisted = true;
                decisionSource = "SYSTEM_AUTOMATED";
                decisionReason = "All mandatory requirements verified and score (" + overallScore + "%) meets qualification threshold (" + minScore + "%). Automatically shortlisted.";
            } else {
                decisionSource = "PENDING_REVIEW";
                decisionReason = "Meets all mandatory criteria and threshold (" + overallScore + "% >= " + minScore + "%). Ready for recruiter shortlisting confirmation.";
            }
        } else {
            // Below threshold, but mandatory requirements were met
            recommendation = "NOT_RECOMMENDED";
            decisionSource = "SYSTEM_AUTOMATED";
            decisionReason = "Score (" + overallScore + "%) is below configured minimum threshold (" + minScore + "%).";
        }

        // ── 8. Assemble Detailed Breakdown JSON ──────────────────────────────
        Map<String, Object> breakdown = new LinkedHashMap<>();
        breakdown.put("skillsScore", skillResult.score);
        breakdown.put("matchedSkills", skillResult.matchedSkills);
        breakdown.put("missingRequiredSkills", skillResult.missingRequiredSkills);
        breakdown.put("missingPreferredSkills", skillResult.missingPreferredSkills);
        breakdown.put("mandatorySkillsStatus", skillResult.mandatoryStatus);

        breakdown.put("experienceScore", expResult.score);
        breakdown.put("candidateExperienceYears", app.getExperienceYears());
        breakdown.put("requiredExperienceYears", configDto.getMinExperienceYears());
        breakdown.put("matchedExperienceKeywords", expResult.matchedKeywords);
        breakdown.put("missingExperienceKeywords", expResult.missingKeywords);
        breakdown.put("mandatoryExperienceStatus", expResult.mandatoryStatus);

        breakdown.put("qualificationsScore", eduResult.score);
        breakdown.put("candidateEducation", app.getEducation());
        breakdown.put("requiredDegreeLevel", configDto.getRequiredDegreeLevel());
        breakdown.put("matchedQualifications", eduResult.matchedQualifications);
        breakdown.put("mandatoryEducationStatus", eduResult.mandatoryStatus);

        breakdown.put("evidenceScore", evResult.score);
        breakdown.put("matchedEvidenceKeywords", evResult.matchedKeywords);
        breakdown.put("extractedSnippets", evResult.extractedSnippets);

        breakdown.put("weightsApplied", Map.of(
                "skills", config.getSkillsWeight(),
                "experience", config.getExperienceWeight(),
                "qualifications", config.getQualificationsWeight(),
                "evidence", config.getEvidenceWeight()
        ));
        breakdown.put("minimumScore", minScore);

        String breakdownJson = "";
        try {
            breakdownJson = objectMapper.writeValueAsString(breakdown);
        } catch (Exception e) {
            log.warn("Error converting breakdown to JSON: {}", e.getMessage());
        }

        // ── 9. Persist CandidateScreeningResult ──────────────────────────────
        CandidateScreeningResult resultEntity = new CandidateScreeningResult();
        resultEntity.setApplicationId(app.getId());
        resultEntity.setVacancyId(vacancy.getId());
        resultEntity.setCompanyRef(app.getCompanyRef());
        resultEntity.setConfigVersion(config.getConfigVersion());
        resultEntity.setOverallScore(overallScore);
        resultEntity.setSkillsScore(skillResult.score);
        resultEntity.setExperienceScore(expResult.score);
        resultEntity.setQualificationsScore(eduResult.score);
        resultEntity.setEvidenceScore(evResult.score);
        resultEntity.setMandatorySkillsMet(skillResult.mandatoryStatus);
        resultEntity.setMandatoryExperienceMet(expResult.mandatoryStatus);
        resultEntity.setMandatoryQualificationsMet(eduResult.mandatoryStatus);
        resultEntity.setAllMandatoryMet(allMandatoryMet);
        resultEntity.setHasUnknownMandatory(hasUnknownMandatory);
        resultEntity.setRecommendation(recommendation);
        resultEntity.setAutoShortlisted(autoShortlisted);
        resultEntity.setDecisionSource(decisionSource);
        resultEntity.setDecisionReason(decisionReason);
        resultEntity.setBreakdownJson(breakdownJson);
        resultEntity.setEvaluatedAt(LocalDateTime.now());
        resultEntity.setEvaluatedBy(evaluatorUserId);

        resultEntity = resultRepo.save(resultEntity);

        // ── 10. Update CandidateApplication Entity ───────────────────────────
        app.setScreeningScore(integerScore);
        app.setScreeningNotes(decisionReason);
        app.setCriteriaJson(breakdownJson);

        if (allMandatoryMet && meetsThreshold) {
            app.setEligibilityStatus(EligibilityStatus.ELIGIBLE);
        } else if (hasUnmetMandatory) {
            app.setEligibilityStatus(EligibilityStatus.INELIGIBLE);
        } else {
            app.setEligibilityStatus(EligibilityStatus.PENDING);
        }

        // Apply Automatic Shortlisting to application status if policy satisfied
        if (autoShortlisted && app.getStatus() != ApplicationStatus.REJECTED) {
            app.setStatus(ApplicationStatus.SHORTLISTED);
            app.setRejectionReason(null);
            app.setReviewedAt(LocalDateTime.now());
            app.setReviewedBy(evaluatorUserId);
        } else if (app.getStatus() == ApplicationStatus.NEW) {
            // Move from NEW to UNDER_REVIEW once screened
            app.setStatus(ApplicationStatus.UNDER_REVIEW);
        }

        applicationRepo.save(app);

        return toResultDto(resultEntity, app.getCandidateName(), vacancy.getTitle(), config);
    }

    // =========================================================================
    // 3. Detailed Rule-Based Evaluators
    // =========================================================================

    /**
     * Evaluates candidate skills against configured required & preferred skills.
     */
    private EvaluationSkillResult evaluateSkills(CandidateApplication app,
                                                 VacancyScreeningConfigDTO config,
                                                 String resumeText,
                                                 boolean isResumeEmpty) {
        List<ScreeningSkillCriterionDTO> required = config.getRequiredSkills() != null
                ? config.getRequiredSkills() : List.of();
        List<String> preferred = config.getPreferredSkills() != null
                ? config.getPreferredSkills() : List.of();

        if (required.isEmpty() && preferred.isEmpty()) {
            return new EvaluationSkillResult(100, "MET", List.of(), List.of(), List.of());
        }

        Set<String> candidateSkills = new HashSet<>();
        if (app.getSkills() != null) {
            for (String s : app.getSkills()) {
                if (s != null) candidateSkills.add(s.trim().toLowerCase(Locale.ROOT));
            }
        }

        List<String> matched = new ArrayList<>();
        List<String> missingReq = new ArrayList<>();
        List<String> missingPref = new ArrayList<>();

        boolean hasMandatoryReq = false;
        boolean allMandatorySkillsMet = true;
        boolean hasUnknownMandatory = false;

        // Check Required Skills
        int matchedReqCount = 0;
        for (ScreeningSkillCriterionDTO req : required) {
            if (req.getName() == null || req.getName().isBlank()) continue;
            String skillName = req.getName().trim().toLowerCase(Locale.ROOT);

            boolean isMatch = isSkillPresent(skillName, req.getAliases(), candidateSkills, resumeText);
            if (isMatch) {
                matchedReqCount++;
                matched.add(req.getName());
            } else {
                missingReq.add(req.getName());
                if (req.isMandatory()) {
                    hasMandatoryReq = true;
                    if (isResumeEmpty) {
                        hasUnknownMandatory = true;
                    } else {
                        allMandatorySkillsMet = false;
                    }
                }
            }
        }

        // Check Preferred Skills
        int matchedPrefCount = 0;
        for (String pref : preferred) {
            if (pref == null || pref.isBlank()) continue;
            String skillName = pref.trim().toLowerCase(Locale.ROOT);

            boolean isMatch = isSkillPresent(skillName, List.of(), candidateSkills, resumeText);
            if (isMatch) {
                matchedPrefCount++;
                matched.add(pref);
            } else {
                missingPref.add(pref);
            }
        }

        // Calculate Skills Score (0 - 100)
        int score;
        if (!required.isEmpty() && !preferred.isEmpty()) {
            double reqRatio = (double) matchedReqCount / required.size();
            double prefRatio = (double) matchedPrefCount / preferred.size();
            score = (int) Math.round((reqRatio * 80.0) + (prefRatio * 20.0));
        } else if (!required.isEmpty()) {
            score = (int) Math.round(((double) matchedReqCount / required.size()) * 100.0);
        } else {
            score = (int) Math.round(((double) matchedPrefCount / preferred.size()) * 100.0);
        }

        String mandatoryStatus = "MET";
        if (hasMandatoryReq) {
            if (!allMandatorySkillsMet) {
                mandatoryStatus = "UNMET";
            } else if (hasUnknownMandatory) {
                mandatoryStatus = "UNKNOWN";
            }
        }

        return new EvaluationSkillResult(Math.min(100, Math.max(0, score)), mandatoryStatus, matched, missingReq, missingPref);
    }

    private boolean isSkillPresent(String skillName, List<String> aliases, Set<String> candidateSkills, String resumeText) {
        // Direct match in candidate structured skills
        if (candidateSkills.contains(skillName)) return true;

        // Check alias matches in structured skills
        List<String> allAliases = new ArrayList<>();
        if (aliases != null) allAliases.addAll(aliases);
        if (DEFAULT_SKILL_ALIASES.containsKey(skillName)) {
            allAliases.addAll(DEFAULT_SKILL_ALIASES.get(skillName));
        }

        for (String alias : allAliases) {
            if (candidateSkills.contains(alias.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }

        // Match in extracted resume text with word boundaries
        if (!resumeText.isBlank()) {
            if (containsWord(resumeText, skillName)) return true;
            for (String alias : allAliases) {
                if (containsWord(resumeText, alias.toLowerCase(Locale.ROOT))) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Evaluates work experience against minimum years and relevant experience categories.
     */
    private EvaluationExperienceResult evaluateExperience(CandidateApplication app,
                                                           VacancyScreeningConfigDTO config,
                                                           String resumeText,
                                                           boolean isResumeEmpty) {
        int minYears = config.getMinExperienceYears() != null ? config.getMinExperienceYears() : 0;
        boolean isMandatory = Boolean.TRUE.equals(config.getExperienceMandatory());
        List<String> keywords = config.getExperienceKeywords() != null ? config.getExperienceKeywords() : List.of();

        int candYears = app.getExperienceYears() != null ? app.getExperienceYears() : 0;

        // Try extracting experience years from resume if candidate structured years is 0
        if (candYears == 0 && !resumeText.isBlank()) {
            candYears = extractExperienceYearsFromText(resumeText);
        }

        List<String> matchedKeywords = new ArrayList<>();
        List<String> missingKeywords = new ArrayList<>();
        for (String kw : keywords) {
            if (kw == null || kw.isBlank()) continue;
            if (!resumeText.isBlank() && containsWord(resumeText, kw.toLowerCase(Locale.ROOT))) {
                matchedKeywords.add(kw);
            } else {
                missingKeywords.add(kw);
            }
        }

        int score;
        if (minYears == 0 && keywords.isEmpty()) {
            score = 100;
        } else if (minYears == 0) {
            double kwRatio = (double) matchedKeywords.size() / keywords.size();
            score = (int) Math.round(kwRatio * 100.0);
        } else {
            double yearsRatio = Math.min(1.0, (double) candYears / minYears);
            double kwBonus = keywords.isEmpty() ? 0.0 : ((double) matchedKeywords.size() / keywords.size()) * 20.0;
            score = (int) Math.round((yearsRatio * 80.0) + kwBonus);
        }

        String mandatoryStatus = "MET";
        if (isMandatory && minYears > 0) {
            if (candYears >= minYears) {
                mandatoryStatus = "MET";
            } else if (isResumeEmpty) {
                mandatoryStatus = "UNKNOWN";
            } else {
                mandatoryStatus = "UNMET";
            }
        }

        return new EvaluationExperienceResult(Math.min(100, Math.max(0, score)), mandatoryStatus, matchedKeywords, missingKeywords);
    }

    /**
     * Evaluates educational qualifications.
     */
    private EvaluationEducationResult evaluateEducation(CandidateApplication app,
                                                         VacancyScreeningConfigDTO config,
                                                         String resumeText,
                                                         boolean isResumeEmpty) {
        String requiredDegree = config.getRequiredDegreeLevel() != null ? config.getRequiredDegreeLevel().toUpperCase(Locale.ROOT) : "ANY";
        boolean isMandatory = Boolean.TRUE.equals(config.getEducationMandatory());
        List<String> preferredQuals = config.getPreferredQualifications() != null ? config.getPreferredQualifications() : List.of();

        String candidateEdu = app.getEducation() != null ? app.getEducation().toLowerCase(Locale.ROOT) : "";
        boolean candidateHasEduSpecified = !candidateEdu.isBlank() && !"not specified".equals(candidateEdu);

        List<String> matchedQualifications = new ArrayList<>();
        for (String pq : preferredQuals) {
            if (pq == null || pq.isBlank()) continue;
            String pql = pq.toLowerCase(Locale.ROOT);
            if (candidateEdu.contains(pql) || (!resumeText.isBlank() && containsWord(resumeText, pql))) {
                matchedQualifications.add(pq);
            }
        }

        if ("ANY".equals(requiredDegree)) {
            int score = matchedQualifications.isEmpty() ? 90 : 100;
            return new EvaluationEducationResult(score, "MET", matchedQualifications);
        }

        int requiredLevelWeight = getDegreeLevelWeight(requiredDegree);
        int candidateLevelWeight = detectDegreeLevelWeight(candidateEdu, resumeText);

        int score;
        String mandatoryStatus;

        if (candidateLevelWeight >= requiredLevelWeight && candidateLevelWeight > 0) {
            score = 85 + (matchedQualifications.isEmpty() ? 0 : 15);
            mandatoryStatus = "MET";
        } else if (candidateLevelWeight > 0) {
            // Explicitly has a lower degree
            score = 40 + (matchedQualifications.isEmpty() ? 0 : 15);
            mandatoryStatus = isMandatory ? "UNMET" : "MET";
        } else {
            // Degree not found in text or candidate edu
            if (!candidateHasEduSpecified && isResumeEmpty) {
                score = 50; // Ambiguous / insufficient info
                mandatoryStatus = isMandatory ? "UNKNOWN" : "MET";
            } else {
                score = 30;
                mandatoryStatus = isMandatory ? "UNMET" : "MET";
            }
        }

        return new EvaluationEducationResult(Math.min(100, Math.max(0, score)), mandatoryStatus, matchedQualifications);
    }

    /**
     * Evaluates job-related CV evidence, projects, and responsibilities.
     */
    private EvaluationEvidenceResult evaluateEvidence(CandidateApplication app,
                                                       VacancyScreeningConfigDTO config,
                                                       String resumeText,
                                                       boolean isResumeEmpty) {
        List<String> keywords = config.getJobEvidenceKeywords() != null ? config.getJobEvidenceKeywords() : List.of();
        boolean isMandatory = Boolean.TRUE.equals(config.getEvidenceMandatory());

        if (keywords.isEmpty()) {
            return new EvaluationEvidenceResult(isResumeEmpty ? 60 : 85, "MET", List.of(), List.of());
        }

        if (isResumeEmpty) {
            // Cannot verify evidence without CV text -> neutral score, flag for review if mandatory
            return new EvaluationEvidenceResult(40, isMandatory ? "UNKNOWN" : "MET", List.of(), List.of("No CV text available for responsibility analysis"));
        }

        List<String> matched = new ArrayList<>();
        List<String> snippets = new ArrayList<>();

        for (String kw : keywords) {
            if (kw == null || kw.isBlank()) continue;
            String kwLower = kw.toLowerCase(Locale.ROOT);
            if (containsWord(resumeText, kwLower)) {
                matched.add(kw);
                String snippet = extractSnippetAround(resumeText, kwLower);
                if (snippet != null) snippets.add(snippet);
            }
        }

        double matchRatio = (double) matched.size() / keywords.size();
        int score = (int) Math.round(matchRatio * 100.0);

        String mandatoryStatus = "MET";
        if (isMandatory) {
            if (matched.isEmpty()) {
                mandatoryStatus = "UNMET";
            } else if (matched.size() < (keywords.size() / 2)) {
                mandatoryStatus = "UNKNOWN";
            }
        }

        return new EvaluationEvidenceResult(Math.min(100, Math.max(0, score)), mandatoryStatus, matched, snippets);
    }

    // =========================================================================
    // 4. Manual Actions: Single Shortlist and Reject
    // =========================================================================

    public CandidateApplicationDTO shortlistCandidateManual(Long applicationId, String notes) {
        CandidateApplication app = applicationRepo.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("CandidateApplication", "id", applicationId));

        validateCompanyAccess(app.getCompanyRef(), app.getCompanyId());

        app.setStatus(ApplicationStatus.SHORTLISTED);
        app.setEligibilityStatus(EligibilityStatus.ELIGIBLE);
        app.setRejectionReason(null);
        if (notes != null && !notes.isBlank()) {
            app.setScreeningNotes(notes.trim());
        }
        app.setReviewedBy(permissionService.currentUserId());
        app.setReviewedAt(LocalDateTime.now());

        CandidateApplication saved = applicationRepo.save(app);

        // Record screening result record reflecting manual recruiter decision
        CandidateScreeningResult manualRecord = new CandidateScreeningResult();
        manualRecord.setApplicationId(saved.getId());
        manualRecord.setVacancyId(saved.getVacancy() != null ? saved.getVacancy().getId() : 0L);
        manualRecord.setCompanyRef(saved.getCompanyRef());
        manualRecord.setOverallScore(saved.getScreeningScore() != null ? Double.valueOf(saved.getScreeningScore()) : 85.0);
        manualRecord.setSkillsScore(85);
        manualRecord.setExperienceScore(85);
        manualRecord.setQualificationsScore(85);
        manualRecord.setEvidenceScore(85);
        manualRecord.setRecommendation("RECOMMENDED_FOR_SHORTLIST");
        manualRecord.setAutoShortlisted(false);
        manualRecord.setDecisionSource("RECRUITER_MANUAL");
        manualRecord.setDecisionReason(notes != null ? notes : "Manually shortlisted by recruiter");
        manualRecord.setEvaluatedAt(LocalDateTime.now());
        manualRecord.setEvaluatedBy(permissionService.currentUserId());
        resultRepo.save(manualRecord);

        auditService.logAction(
                "CANDIDATE_SHORTLISTED_MANUAL",
                "CandidateApplication",
                saved.getId(),
                "Candidate " + saved.getCandidateName() + " manually shortlisted for vacancy",
                saved.getCompanyRef()
        );

        return toApplicationDto(saved);
    }

    public CandidateApplicationDTO rejectCandidateManual(Long applicationId, String reason) {
        CandidateApplication app = applicationRepo.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("CandidateApplication", "id", applicationId));

        validateCompanyAccess(app.getCompanyRef(), app.getCompanyId());

        if (reason == null || reason.isBlank()) {
            throw new BusinessException("A structured rejection reason is required.");
        }

        app.setStatus(ApplicationStatus.REJECTED);
        app.setEligibilityStatus(EligibilityStatus.INELIGIBLE);
        app.setRejectionReason(reason.trim());
        app.setReviewedBy(permissionService.currentUserId());
        app.setReviewedAt(LocalDateTime.now());

        CandidateApplication saved = applicationRepo.save(app);

        CandidateScreeningResult rejectRecord = new CandidateScreeningResult();
        rejectRecord.setApplicationId(saved.getId());
        rejectRecord.setVacancyId(saved.getVacancy() != null ? saved.getVacancy().getId() : 0L);
        rejectRecord.setCompanyRef(saved.getCompanyRef());
        rejectRecord.setOverallScore(saved.getScreeningScore() != null ? Double.valueOf(saved.getScreeningScore()) : 50.0);
        rejectRecord.setRecommendation("NOT_RECOMMENDED");
        rejectRecord.setAutoShortlisted(false);
        rejectRecord.setDecisionSource("RECRUITER_MANUAL");
        rejectRecord.setDecisionReason("Application rejected: " + reason.trim());
        rejectRecord.setEvaluatedAt(LocalDateTime.now());
        rejectRecord.setEvaluatedBy(permissionService.currentUserId());
        resultRepo.save(rejectRecord);

        auditService.logAction(
                "CANDIDATE_REJECTED",
                "CandidateApplication",
                saved.getId(),
                "Candidate " + saved.getCandidateName() + " rejected. Reason: " + reason.trim(),
                saved.getCompanyRef()
        );

        return toApplicationDto(saved);
    }

    // =========================================================================
    // 5. Results Retrieval
    // =========================================================================

    @Transactional(readOnly = true)
    public CandidateScreeningResultDTO getLatestResultForApplication(Long applicationId) {
        CandidateApplication app = applicationRepo.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("CandidateApplication", "id", applicationId));

        validateCompanyAccess(app.getCompanyRef(), app.getCompanyId());

        CandidateScreeningResult result = resultRepo.findTopByApplicationIdOrderByEvaluatedAtDesc(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("CandidateScreeningResult", "applicationId", applicationId));

        JobVacancy vacancy = app.getVacancy();
        VacancyScreeningConfig config = configRepo.findByVacancyId(vacancy != null ? vacancy.getId() : 0L).orElse(null);

        return toResultDto(result, app.getCandidateName(), vacancy != null ? vacancy.getTitle() : "Vacancy", config);
    }

    @Transactional(readOnly = true)
    public List<CandidateScreeningResultDTO> getResultsForVacancy(Long vacancyId) {
        JobVacancy vacancy = getValidatedVacancy(vacancyId);
        List<CandidateScreeningResult> results = resultRepo.findByVacancyIdOrderByEvaluatedAtDesc(vacancyId);

        VacancyScreeningConfig config = configRepo.findByVacancyId(vacancyId).orElse(null);

        Map<Long, String> candidateNames = new HashMap<>();
        applicationRepo.findAllByCompany(vacancy.getCompanyRef(), null).forEach(a -> candidateNames.put(a.getId(), a.getCandidateName()));

        return results.stream()
                .map(r -> toResultDto(r, candidateNames.getOrDefault(r.getApplicationId(), "Applicant"), vacancy.getTitle(), config))
                .toList();
    }

    // =========================================================================
    // Helper & Mapping Methods
    // =========================================================================

    private JobVacancy getValidatedVacancy(Long vacancyId) {
        JobVacancy vacancy = vacancyRepo.findById(vacancyId)
                .orElseThrow(() -> new ResourceNotFoundException("JobVacancy", "id", vacancyId));
        validateCompanyAccess(vacancy.getCompanyRef(), null);
        return vacancy;
    }

    private void validateCompanyAccess(String entityCompanyRef, Long entityCompanyId) {
        if (permissionService.isFullAccess()) {
            return;
        }

        String userCompanyRef = safeGetCurrentCompanyRef();
        Long userCompanyId = safeGetCurrentCompanyId();

        boolean matchRef = (userCompanyRef != null && entityCompanyRef != null &&
                userCompanyRef.trim().equalsIgnoreCase(entityCompanyRef.trim()));
        boolean matchId = (userCompanyId != null && entityCompanyId != null &&
                userCompanyId.equals(entityCompanyId));

        if (!matchRef && !matchId && (userCompanyRef != null || userCompanyId != null)) {
            throw new AccessDeniedException("Access denied: You cannot view or configure records from another company.");
        }
    }

    private String safeGetCurrentCompanyRef() {
        try {
            return authService.getCurrentCompanyRef();
        } catch (Exception e) {
            return null;
        }
    }

    private Long safeGetCurrentCompanyId() {
        try {
            return authService.resolveCompanyId(null);
        } catch (Exception e) {
            return null;
        }
    }

    private VacancyScreeningConfigDTO createDefaultConfigTemplate(JobVacancy vacancy) {
        List<ScreeningSkillCriterionDTO> requiredSkills = new ArrayList<>();
        if (vacancy.getRequiredSkills() != null) {
            for (String s : vacancy.getRequiredSkills()) {
                if (s != null && !s.isBlank()) {
                    requiredSkills.add(ScreeningSkillCriterionDTO.builder()
                            .name(s.trim())
                            .mandatory(true)
                            .aliases(DEFAULT_SKILL_ALIASES.getOrDefault(s.trim().toLowerCase(Locale.ROOT), List.of()))
                            .build());
                }
            }
        }

        int defaultYears = 0;
        if (vacancy.getExperienceLevel() != null) {
            String exp = vacancy.getExperienceLevel().toLowerCase(Locale.ROOT);
            if (exp.contains("entry") || exp.contains("junior")) defaultYears = 1;
            else if (exp.contains("mid")) defaultYears = 3;
            else if (exp.contains("senior") || exp.contains("lead")) defaultYears = 5;
        }

        return VacancyScreeningConfigDTO.builder()
                .vacancyId(vacancy.getId())
                .vacancyTitle(vacancy.getTitle())
                .companyRef(vacancy.getCompanyRef())
                .skillsWeight(40)
                .experienceWeight(25)
                .qualificationsWeight(20)
                .evidenceWeight(15)
                .minimumScore(75)
                .autoShortlistEnabled(false)
                .configVersion(1)
                .requiredSkills(requiredSkills)
                .preferredSkills(List.of("Problem Solving", "Team Collaboration"))
                .minExperienceYears(defaultYears)
                .experienceMandatory(defaultYears > 0)
                .experienceKeywords(List.of("development", "implementation", "design", "agile"))
                .requiredDegreeLevel("BACHELORS")
                .educationMandatory(false)
                .preferredQualifications(List.of("Degree in Computer Science / IT or relevant field"))
                .jobEvidenceKeywords(List.of("project", "responsibility", "architecture", "delivery"))
                .evidenceMandatory(false)
                .build();
    }

    private VacancyScreeningConfig createAndSaveDefaultConfig(JobVacancy vacancy) {
        VacancyScreeningConfigDTO dto = createDefaultConfigTemplate(vacancy);
        VacancyScreeningConfig config = new VacancyScreeningConfig();
        config.setVacancyId(vacancy.getId());
        config.setCompanyRef(vacancy.getCompanyRef());
        config.setSkillsWeight(dto.getSkillsWeight());
        config.setExperienceWeight(dto.getExperienceWeight());
        config.setQualificationsWeight(dto.getQualificationsWeight());
        config.setEvidenceWeight(dto.getEvidenceWeight());
        config.setMinimumScore(dto.getMinimumScore());
        config.setAutoShortlistEnabled(dto.getAutoShortlistEnabled());
        config.setConfigVersion(1);

        Map<String, Object> criteria = new LinkedHashMap<>();
        criteria.put("requiredSkills", dto.getRequiredSkills());
        criteria.put("preferredSkills", dto.getPreferredSkills());
        criteria.put("minExperienceYears", dto.getMinExperienceYears());
        criteria.put("experienceMandatory", dto.getExperienceMandatory());
        criteria.put("experienceKeywords", dto.getExperienceKeywords());
        criteria.put("requiredDegreeLevel", dto.getRequiredDegreeLevel());
        criteria.put("educationMandatory", dto.getEducationMandatory());
        criteria.put("preferredQualifications", dto.getPreferredQualifications());
        criteria.put("jobEvidenceKeywords", dto.getJobEvidenceKeywords());
        criteria.put("evidenceMandatory", dto.getEvidenceMandatory());

        try {
            config.setCriteriaJson(objectMapper.writeValueAsString(criteria));
        } catch (Exception ignored) {}

        return configRepo.save(config);
    }

    private VacancyScreeningConfigDTO toConfigDto(VacancyScreeningConfig c, String vacancyTitle) {
        VacancyScreeningConfigDTO dto = VacancyScreeningConfigDTO.builder()
                .id(c.getId())
                .vacancyId(c.getVacancyId())
                .vacancyTitle(vacancyTitle)
                .companyRef(c.getCompanyRef())
                .skillsWeight(c.getSkillsWeight())
                .experienceWeight(c.getExperienceWeight())
                .qualificationsWeight(c.getQualificationsWeight())
                .evidenceWeight(c.getEvidenceWeight())
                .minimumScore(c.getMinimumScore())
                .autoShortlistEnabled(c.getAutoShortlistEnabled())
                .configVersion(c.getConfigVersion())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .updatedBy(c.getUpdatedBy())
                .build();

        if (c.getCriteriaJson() != null && !c.getCriteriaJson().isBlank()) {
            try {
                Map<String, Object> map = objectMapper.readValue(c.getCriteriaJson(), new TypeReference<>() {});
                if (map.containsKey("requiredSkills")) {
                    List<?> raw = (List<?>) map.get("requiredSkills");
                    List<ScreeningSkillCriterionDTO> list = new ArrayList<>();
                    for (Object item : raw) {
                        list.add(objectMapper.convertValue(item, ScreeningSkillCriterionDTO.class));
                    }
                    dto.setRequiredSkills(list);
                }
                if (map.containsKey("preferredSkills")) {
                    dto.setPreferredSkills(objectMapper.convertValue(map.get("preferredSkills"), new TypeReference<>() {}));
                }
                if (map.containsKey("minExperienceYears")) {
                    dto.setMinExperienceYears((Integer) map.get("minExperienceYears"));
                }
                if (map.containsKey("experienceMandatory")) {
                    dto.setExperienceMandatory((Boolean) map.get("experienceMandatory"));
                }
                if (map.containsKey("experienceKeywords")) {
                    dto.setExperienceKeywords(objectMapper.convertValue(map.get("experienceKeywords"), new TypeReference<>() {}));
                }
                if (map.containsKey("requiredDegreeLevel")) {
                    dto.setRequiredDegreeLevel((String) map.get("requiredDegreeLevel"));
                }
                if (map.containsKey("educationMandatory")) {
                    dto.setEducationMandatory((Boolean) map.get("educationMandatory"));
                }
                if (map.containsKey("preferredQualifications")) {
                    dto.setPreferredQualifications(objectMapper.convertValue(map.get("preferredQualifications"), new TypeReference<>() {}));
                }
                if (map.containsKey("jobEvidenceKeywords")) {
                    dto.setJobEvidenceKeywords(objectMapper.convertValue(map.get("jobEvidenceKeywords"), new TypeReference<>() {}));
                }
                if (map.containsKey("evidenceMandatory")) {
                    dto.setEvidenceMandatory((Boolean) map.get("evidenceMandatory"));
                }
            } catch (Exception e) {
                log.warn("Error deserializing criteriaJson: {}", e.getMessage());
            }
        }

        return dto;
    }

    private CandidateScreeningResultDTO toResultDto(CandidateScreeningResult r, String candidateName, String vacancyTitle, VacancyScreeningConfig config) {
        Map<String, Object> breakdown = new HashMap<>();
        if (r.getBreakdownJson() != null && !r.getBreakdownJson().isBlank()) {
            try {
                breakdown = objectMapper.readValue(r.getBreakdownJson(), new TypeReference<>() {});
            } catch (Exception ignored) {}
        }

        return CandidateScreeningResultDTO.builder()
                .id(r.getId())
                .applicationId(r.getApplicationId())
                .candidateName(candidateName)
                .vacancyId(r.getVacancyId())
                .vacancyTitle(vacancyTitle)
                .companyRef(r.getCompanyRef())
                .configVersion(r.getConfigVersion())
                .overallScore(r.getOverallScore())
                .skillsScore(r.getSkillsScore())
                .experienceScore(r.getExperienceScore())
                .qualificationsScore(r.getQualificationsScore())
                .evidenceScore(r.getEvidenceScore())
                .skillsWeight(config != null ? config.getSkillsWeight() : 40)
                .experienceWeight(config != null ? config.getExperienceWeight() : 25)
                .qualificationsWeight(config != null ? config.getQualificationsWeight() : 20)
                .evidenceWeight(config != null ? config.getEvidenceWeight() : 15)
                .minimumScore(config != null ? config.getMinimumScore() : 75)
                .mandatorySkillsMet(r.getMandatorySkillsMet())
                .mandatoryExperienceMet(r.getMandatoryExperienceMet())
                .mandatoryQualificationsMet(r.getMandatoryQualificationsMet())
                .allMandatoryMet(r.getAllMandatoryMet())
                .hasUnknownMandatory(r.getHasUnknownMandatory())
                .recommendation(r.getRecommendation())
                .autoShortlisted(r.getAutoShortlisted())
                .decisionSource(r.getDecisionSource())
                .decisionReason(r.getDecisionReason())
                .breakdown(breakdown)
                .evaluatedAt(r.getEvaluatedAt())
                .evaluatedBy(r.getEvaluatedBy())
                .build();
    }

    private CandidateApplicationDTO toApplicationDto(CandidateApplication a) {
        CandidateApplicationDTO dto = new CandidateApplicationDTO();
        dto.setId(a.getId());
        dto.setTrackingCode(a.getTrackingCode());
        dto.setCandidateName(a.getCandidateName());
        dto.setEmail(a.getEmail());
        dto.setPhone(a.getPhone());
        dto.setLocation(a.getLocation());
        dto.setEducation(a.getEducation());
        dto.setExperienceYears(a.getExperienceYears());
        dto.setSummary(a.getSummary());
        dto.setSkills(a.getSkills() != null ? new ArrayList<>(a.getSkills()) : List.of());
        if (a.getVacancy() != null) {
            dto.setVacancyId(a.getVacancy().getId());
            dto.setJobTitle(a.getVacancy().getTitle());
            dto.setVacancyTitle(a.getVacancy().getTitle());
            dto.setDepartment(a.getVacancy().getDepartment());
        }
        dto.setStatus(a.getStatus() != null ? a.getStatus().name() : "NEW");
        dto.setEligibilityStatus(a.getEligibilityStatus() != null ? a.getEligibilityStatus().name() : "PENDING");
        dto.setScreeningScore(a.getScreeningScore());
        dto.setMatchScore(a.getScreeningScore());
        dto.setScreeningNotes(a.getScreeningNotes());
        dto.setRejectionReason(a.getRejectionReason());
        dto.setCompanyRef(a.getCompanyRef());
        dto.setCompanyId(a.getCompanyId());
        dto.setResumeFileName(a.getResumeFileName());
        dto.setResumeText(a.getResumeText());
        return dto;
    }

    private boolean containsWord(String text, String word) {
        if (text == null || word == null || word.isBlank()) return false;
        String regex = "\\b" + Pattern.quote(word) + "\\b";
        return Pattern.compile(regex, Pattern.CASE_INSENSITIVE).matcher(text).find();
    }

    private int extractExperienceYearsFromText(String text) {
        Pattern pattern = Pattern.compile("(\\d{1,2})\\+?\\s*(?:years?|yrs?)(?:\\s+of)?\\s+(?:experience|exp)", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);
        int max = 0;
        while (matcher.find()) {
            try {
                int y = Integer.parseInt(matcher.group(1));
                if (y > max && y <= 40) max = y;
            } catch (Exception ignored) {}
        }
        return max;
    }

    private int getDegreeLevelWeight(String level) {
        return switch (level) {
            case "DIPLOMA" -> 1;
            case "BACHELORS" -> 2;
            case "MASTERS" -> 3;
            case "DOCTORATE" -> 4;
            default -> 0;
        };
    }

    private int detectDegreeLevelWeight(String edu, String resumeText) {
        String combined = (edu + " " + resumeText).toLowerCase(Locale.ROOT);
        if (combined.contains("phd") || combined.contains("doctorate") || combined.contains("doctor of philosophy")) {
            return 4;
        }
        if (combined.contains("master") || combined.contains("msc") || combined.contains("mba") || combined.contains("m.tech") || combined.contains("postgraduate")) {
            return 3;
        }
        if (combined.contains("bachelor") || combined.contains("bsc") || combined.contains("b.tech") || combined.contains("b.e") || combined.contains("degree") || combined.contains("undergraduate")) {
            return 2;
        }
        if (combined.contains("diploma") || combined.contains("associate") || combined.contains("hnd")) {
            return 1;
        }
        return 0;
    }

    private String extractSnippetAround(String text, String keyword) {
        int idx = text.indexOf(keyword);
        if (idx == -1) return null;
        int start = Math.max(0, idx - 40);
        int end = Math.min(text.length(), idx + keyword.length() + 60);
        return "..." + text.substring(start, end).replaceAll("\\s+", " ").trim() + "...";
    }

    private String getUnmetMandatoryReason(EvaluationSkillResult s, EvaluationExperienceResult e, EvaluationEducationResult edu) {
        List<String> reasons = new ArrayList<>();
        if ("UNMET".equals(s.mandatoryStatus)) reasons.add("Missing mandatory skills: " + String.join(", ", s.missingRequiredSkills));
        if ("UNMET".equals(e.mandatoryStatus)) reasons.add("Required work experience not met");
        if ("UNMET".equals(edu.mandatoryStatus)) reasons.add("Required qualification level not met");
        return String.join("; ", reasons);
    }

    private String getUnknownMandatoryReason(EvaluationSkillResult s, EvaluationExperienceResult e, EvaluationEducationResult edu) {
        List<String> reasons = new ArrayList<>();
        if ("UNKNOWN".equals(s.mandatoryStatus)) reasons.add("Skill evidence uncertain");
        if ("UNKNOWN".equals(e.mandatoryStatus)) reasons.add("Experience duration unverified");
        if ("UNKNOWN".equals(edu.mandatoryStatus)) reasons.add("Degree qualification unverified");
        return String.join("; ", reasons);
    }

    // Records for individual category results
    private record EvaluationSkillResult(int score, String mandatoryStatus, List<String> matchedSkills, List<String> missingRequiredSkills, List<String> missingPreferredSkills) {}
    private record EvaluationExperienceResult(int score, String mandatoryStatus, List<String> matchedKeywords, List<String> missingKeywords) {}
    private record EvaluationEducationResult(int score, String mandatoryStatus, List<String> matchedQualifications) {}
    private record EvaluationEvidenceResult(int score, String mandatoryStatus, List<String> matchedKeywords, List<String> extractedSnippets) {}
}
