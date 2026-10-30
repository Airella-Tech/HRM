package com.airella.hrm.service;

import com.airella.hrm.dto.ApplyJobRequest;
import com.airella.hrm.dto.CandidateApplicationDTO;
import com.airella.hrm.dto.CandidateApplicationTrackDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.*;
import com.airella.hrm.repository.CandidateApplicationDocumentRepository;
import com.airella.hrm.repository.CandidateApplicationRepository;
import com.airella.hrm.repository.JobVacancyRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Service for Candidate Application intake and database-backed PDF storage.
 * Follows the Employee_Backend pattern (byte[] stored as PostgreSQL bytea in a
 * separate table).
 * Extracts CV text via Apache PDFBox for recruitment screening without reading
 * binary PDFs.
 */
@Service
@Transactional
public class CandidateApplicationService {

    private static final Logger log = LoggerFactory.getLogger(CandidateApplicationService.class);
    private static final long MAX_DOCUMENT_BYTES = 5 * 1024 * 1024; // 5 MB

    private final CandidateApplicationRepository applicationRepo;
    private final CandidateApplicationDocumentRepository documentRepo;
    private final JobVacancyRepository vacancyRepo;
    private final AuthService authService;
    private final AuditService auditService;
    private final EmailService emailService;

    public CandidateApplicationService(CandidateApplicationRepository applicationRepo,
            CandidateApplicationDocumentRepository documentRepo,
            JobVacancyRepository vacancyRepo,
            AuthService authService,
            AuditService auditService,
            EmailService emailService) {
        this.applicationRepo = applicationRepo;
        this.documentRepo = documentRepo;
        this.vacancyRepo = vacancyRepo;
        this.authService = authService;
        this.auditService = auditService;
        this.emailService = emailService;
    }

    // Public Application Submission & Database-Backed Document Storage

    public CandidateApplicationDTO submitApplication(Long vacancyId,
            String companyRef,
            ApplyJobRequest request,
            MultipartFile resumeFile) {
        if (vacancyId == null) {
            throw new BusinessException("Job vacancy ID is required.");
        }

        // 1. Validate vacancy exists and is currently published
        JobVacancy vacancy = vacancyRepo.findById(vacancyId)
                .orElseThrow(() -> new ResourceNotFoundException("JobVacancy", "id", vacancyId));

        if (vacancy.getStatus() != VacancyStatus.PUBLISHED) {
            throw new BusinessException("This vacancy is no longer accepting applications.");
        }
        if (vacancy.getDeadline() != null && vacancy.getDeadline().isBefore(LocalDate.now())) {
            throw new BusinessException("The application deadline for this position has passed.");
        }

        // Validate company reference if provided
        if (companyRef != null && !companyRef.isBlank()) {
            if (!vacancy.getCompanyRef().equalsIgnoreCase(companyRef.trim())) {
                log.warn("Company mismatch: vacancy company {} vs requested {}", vacancy.getCompanyRef(), companyRef);
            }
        }

        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);

        // 2. 90-Day Duplicate Submission Prevention (same email + vacancyId)
        LocalDateTime cutoff = LocalDateTime.now().minusDays(90);
        if (applicationRepo.existsByEmailIgnoreCaseAndVacancyIdAndCreatedAtGreaterThanEqual(email, vacancy.getId(),
                cutoff)) {
            throw new BusinessException(
                    "You have already applied for the '" + vacancy.getTitle() +
                            "' role within the last 90 days. Duplicate submissions are not permitted.");
        }

        // 3. Strict PDF Validation & Read Bytes (Following Employee_Backend convention)
        byte[] pdfBytes = readAndValidatePdf(resumeFile);

        // 4. Extract Text from PDF using Apache PDFBox for recruitment screening
        String extractedText = extractTextFromPdf(pdfBytes);

        // Standardized or original filename
        String originalFilename = sanitizeFileName(resumeFile, request.getCandidateName());

        // 5. Create CandidateApplication Entity
        CandidateApplication app = new CandidateApplication();
        app.setVacancy(vacancy);
        app.setCompanyRef(vacancy.getCompanyRef());

        try {
            Long cId = authService.resolveCompanyId(null);
            app.setCompanyId(cId);
        } catch (Exception ignored) {
            // Public unauthenticated flow
        }

        app.setCandidateName(request.getCandidateName().trim());
        app.setEmail(email);
        app.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        app.setLocation(request.getLocation() != null ? request.getLocation().trim() : null);
        app.setEducation(request.getEducation() != null ? request.getEducation().trim() : null);
        app.setExperienceYears(request.getExperienceYears() != null ? Math.max(0, request.getExperienceYears()) : 0);
        app.setSummary(request.getSummary() != null ? request.getSummary().trim() : null);

        if (request.getSkills() != null && !request.getSkills().isEmpty()) {
            Set<String> parsedSkills = new LinkedHashSet<>();
            for (String s : request.getSkills()) {
                if (s != null && s.contains(",")) {
                    for (String part : s.split(",")) {
                        if (!part.trim().isEmpty())
                            parsedSkills.add(part.trim());
                    }
                } else if (s != null && !s.trim().isEmpty()) {
                    parsedSkills.add(s.trim());
                }
            }
            app.setSkills(parsedSkills.isEmpty() && vacancy.getRequiredSkills() != null
                    ? new LinkedHashSet<>(vacancy.getRequiredSkills())
                    : parsedSkills);
        } else if (vacancy.getRequiredSkills() != null) {
            app.setSkills(new LinkedHashSet<>(vacancy.getRequiredSkills()));
        }

        app.setStatus(ApplicationStatus.NEW);
        app.setEligibilityStatus(EligibilityStatus.PENDING);
        app.setTrackingCode(generateUniqueTrackingCode());

        // Metadata & extracted text for screening
        app.setResumeFileName(originalFilename);
        app.setResumeFileType("application/pdf");
        app.setResumeFileSize((long) pdfBytes.length);
        app.setResumeText(extractedText);

        CandidateApplication savedApp = applicationRepo.save(app);

        // 6. Save PDF Binary into separate CandidateApplicationDocument table
        // (PostgreSQL bytea)
        CandidateApplicationDocument document = new CandidateApplicationDocument();
        document.setApplicationId(savedApp.getId());
        document.setFileName(originalFilename);
        document.setContentType("application/pdf");
        document.setFileSize((long) pdfBytes.length);
        document.setData(pdfBytes);
        documentRepo.save(document);

        // Audit log
        auditService.logAction(
                "APPLY",
                "CandidateApplication",
                savedApp.getId(),
                "Candidate " + savedApp.getCandidateName() + " applied for '" + vacancy.getTitle() + "' [Tracking: "
                        + savedApp.getTrackingCode() + "]",
                savedApp.getCompanyRef());

        // Send confirmation email with tracking code & direct tracking link
        try {
            emailService.sendApplicationConfirmation(
                    savedApp.getEmail(),
                    savedApp.getCandidateName(),
                    vacancy.getTitle(),
                    savedApp.getCompanyRef(),
                    savedApp.getTrackingCode());
        } catch (Exception e) {
            log.error("Failed to send application confirmation email to {}: {}", savedApp.getEmail(), e.getMessage());
        }

        return toDto(savedApp);
    }

    // =========================================================================
    // Secure Document Viewing / Downloading (Authorized HR Users)
    // =========================================================================

    @Transactional(readOnly = true)
    public CandidateApplicationDocument getDocumentForApplication(Long applicationId) {
        CandidateApplication app = findApplicationForCurrentStaff(applicationId);

        // Increment download counter
        app.setDownloadCount(app.getDownloadCount() + 1);
        applicationRepo.save(app);

        return documentRepo.findByApplicationId(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("CandidateApplicationDocument", "applicationId",
                        applicationId));
    }

    // Validation & Apache PDFBox Text Extraction Helpers

    /**
     * Reads and validates the uploaded file following Employee_Backend readPdf
     * conventions:
     * - Checks not null / not empty
     * - Checks size <= 5 MB
     * - Checks filename ends with .pdf
     * - Checks magic header (%PDF-)
     */
    private byte[] readAndValidatePdf(MultipartFile document) {
        if (document == null || document.isEmpty()) {
            throw new BusinessException("CV / Resume document (PDF) is required.");
        }
        if (document.getSize() > MAX_DOCUMENT_BYTES) {
            throw new BusinessException("The CV document must be 5 MB or smaller.");
        }

        String original = document.getOriginalFilename();
        if (original != null && !original.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw new BusinessException("Only standard PDF documents (.pdf) are accepted.");
        }

        byte[] data;
        try {
            data = document.getBytes();
        } catch (IOException e) {
            throw new BusinessException("Could not read uploaded resume document.");
        }

        // Validate PDF binary magic bytes: %PDF-
        boolean isPdf = data.length >= 5 && data[0] == '%' && data[1] == 'P' && data[2] == 'D' && data[3] == 'F'
                && data[4] == '-';
        if (!isPdf) {
            throw new BusinessException("Only valid PDF files can be uploaded as resumes.");
        }

        return data;
    }

    /**
     * Extracts plain text from the PDF binary using Apache PDFBox for ATS
     * screening.
     */
    private String extractTextFromPdf(byte[] pdfBytes) {
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String text = stripper.getText(document);
            return text != null ? text.trim() : "";
        } catch (Exception e) {
            log.warn("Could not extract text from PDF resume: {}", e.getMessage());
            return "";
        }
    }

    private String sanitizeFileName(MultipartFile document, String candidateName) {
        String original = document != null ? document.getOriginalFilename() : null;
        if (original != null && !original.isBlank()) {
            String name = original.replaceAll("[\\\\/]", "_").trim();
            if (!name.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
                name = name + ".pdf";
            }
            return name.length() > 200 ? name.substring(name.length() - 200) : name;
        }
        String cleanName = candidateName != null ? candidateName.replaceAll("\\s+", "_") : "Candidate";
        return cleanName + "_CV.pdf";
    }

    private String generateUniqueTrackingCode() {
        return "APP-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
    }

    // =========================================================================
    // Authorized Staff Candidate Application Retrieval
    // =========================================================================

    /**
     * Retrieves all candidate applications for authorized HR users.
     * Filterable by vacancyId, status, and search keyword.
     */
    @Transactional(readOnly = true)
    public List<CandidateApplicationDTO> getApplications(Long vacancyId, String statusStr, String search) {
        List<CandidateApplication> applications;

        if (isFullAccessUser()) {
            String companyRef = safeGetCurrentCompanyRef();
            Long companyId = safeGetCurrentCompanyId();
            if (companyRef != null || companyId != null) {
                applications = applicationRepo.findAllByCompany(companyRef, companyId);
            } else {
                applications = applicationRepo.findAllWithDetails();
            }
        } else {
            String companyRef = safeGetCurrentCompanyRef();
            Long companyId = safeGetCurrentCompanyId();
            if (companyRef == null && companyId == null) {
                return List.of();
            }
            applications = applicationRepo.findAllByCompany(companyRef, companyId);
        }

        return applications.stream()
                .filter(app -> {
                    // Filter by vacancyId if provided
                    if (vacancyId != null) {
                        if (app.getVacancy() == null || !vacancyId.equals(app.getVacancy().getId())) {
                            return false;
                        }
                    }
                    // Filter by status if provided and not ALL
                    if (statusStr != null && !statusStr.isBlank() && !"ALL".equalsIgnoreCase(statusStr.trim())) {
                        if (app.getStatus() == null || !app.getStatus().name().equalsIgnoreCase(statusStr.trim())) {
                            return false;
                        }
                    }
                    // Filter by search query if provided
                    if (search != null && !search.isBlank()) {
                        String query = search.trim().toLowerCase(Locale.ROOT);
                        boolean matchesName = app.getCandidateName() != null && app.getCandidateName().toLowerCase(Locale.ROOT).contains(query);
                        boolean matchesEmail = app.getEmail() != null && app.getEmail().toLowerCase(Locale.ROOT).contains(query);
                        boolean matchesPhone = app.getPhone() != null && app.getPhone().toLowerCase(Locale.ROOT).contains(query);
                        boolean matchesCode = app.getTrackingCode() != null && app.getTrackingCode().toLowerCase(Locale.ROOT).contains(query);
                        boolean matchesJob = app.getVacancy() != null && app.getVacancy().getTitle() != null && app.getVacancy().getTitle().toLowerCase(Locale.ROOT).contains(query);
                        boolean matchesDept = app.getVacancy() != null && app.getVacancy().getDepartment() != null && app.getVacancy().getDepartment().toLowerCase(Locale.ROOT).contains(query);
                        return matchesName || matchesEmail || matchesPhone || matchesCode || matchesJob || matchesDept;
                    }
                    return true;
                })
                .map(this::toDto)
                .toList();
    }

    /**
     * Retrieves a single candidate application profile by ID.
     */
    @Transactional(readOnly = true)
    public CandidateApplicationDTO getApplicationById(Long id) {
        CandidateApplication app = findApplicationForCurrentStaff(id);
        return toDto(app);
    }

    private CandidateApplication findApplicationForCurrentStaff(Long id) {
        if (isFullAccessUser()) {
            return applicationRepo.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("CandidateApplication", "id", id));
        }

        String companyRef = safeGetCurrentCompanyRef();
        Long companyId = safeGetCurrentCompanyId();

        CandidateApplication app = (companyRef != null || companyId != null)
                ? applicationRepo.findByIdAndCompany(id, companyRef, companyId)
                        .orElseThrow(() -> new ResourceNotFoundException("CandidateApplication", "id", id))
                : applicationRepo.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException("CandidateApplication", "id", id));

        validateCompanyAccess(app.getCompanyRef(), app.getCompanyId());
        return app;
    }

    private boolean isFullAccessUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_HR_MANAGER"));
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

    private void validateCompanyAccess(String entityCompanyRef, Long entityCompanyId) {
        if (isFullAccessUser()) {
            return;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("Authentication required.");
        }

        String userCompanyRef = safeGetCurrentCompanyRef();
        Long userCompanyId = safeGetCurrentCompanyId();

        boolean matchRef = (userCompanyRef != null && entityCompanyRef != null &&
                userCompanyRef.trim().equalsIgnoreCase(entityCompanyRef.trim()));
        boolean matchId = (userCompanyId != null && entityCompanyId != null &&
                userCompanyId.equals(entityCompanyId));

        if (!matchRef && !matchId && (userCompanyRef != null || userCompanyId != null)) {
            throw new AccessDeniedException("Access denied: You cannot view records from another company.");
        }
    }

    public CandidateApplicationDTO toDto(CandidateApplication a) {
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

        dto.setResumeFileName(a.getResumeFileName());
        dto.setResumeFileType(a.getResumeFileType());
        if (a.getResumeFileSize() != null) {
            dto.setResumeFileSize(String.format("%.1f MB", a.getResumeFileSize() / (1024.0 * 1024.0)));
        }
        dto.setResumeText(a.getResumeText());
        dto.setDownloadCount(a.getDownloadCount() != null ? a.getDownloadCount() : 0);

        dto.setCompanyRef(a.getCompanyRef());
        dto.setCompanyId(a.getCompanyId());

        if (a.getCreatedAt() != null) {
            dto.setAppliedDate(a.getCreatedAt().toLocalDate());
            dto.setCreatedAt(a.getCreatedAt());
        }
        dto.setUpdatedAt(a.getUpdatedAt());
        dto.setReviewedBy(a.getReviewedBy());
        dto.setReviewedAt(a.getReviewedAt());

        return dto;
    }

    // Public Application Status Tracking

    @Transactional(readOnly = true)
    public CandidateApplicationTrackDTO trackApplication(String trackingCode, String email) {
        if (trackingCode == null || trackingCode.isBlank()) {
            throw new BusinessException("Tracking code is required.");
        }
        if (email == null || email.isBlank()) {
            throw new BusinessException("Email address is required.");
        }

        CandidateApplication app = applicationRepo
                .findByTrackingCodeIgnoreCaseAndEmailIgnoreCase(trackingCode.trim(),
                        email.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResourceNotFoundException("Application", "trackingCode", trackingCode));

        return toTrackDto(app);
    }

    private CandidateApplicationTrackDTO toTrackDto(CandidateApplication a) {
        String status = a.getStatus() != null ? a.getStatus().name() : "NEW";
        String statusDescription;

        switch (status) {
            case "NEW" -> statusDescription = "Application received and queued for review.";
            case "UNDER_REVIEW" ->
                statusDescription = "Your application is currently being reviewed by our recruitment team.";
            case "SHORTLISTED" ->
                statusDescription = "Congratulations! Your profile has been shortlisted for the next stage.";
            case "REJECTED" ->
                statusDescription = "Thank you for applying. After careful review, we have decided to proceed with other candidates.";
            default -> statusDescription = "Application is in progress.";
        }

        return CandidateApplicationTrackDTO.builder()
                .trackingCode(a.getTrackingCode())
                .candidateName(a.getCandidateName())
                .email(a.getEmail())
                .vacancyId(a.getVacancy() != null ? a.getVacancy().getId() : null)
                .jobTitle(a.getVacancy() != null ? a.getVacancy().getTitle() : null)
                .department(a.getVacancy() != null ? a.getVacancy().getDepartment() : null)
                .companyRef(a.getCompanyRef())
                .status(status)
                .statusDescription(statusDescription)
                .eligibilityStatus(a.getEligibilityStatus() != null ? a.getEligibilityStatus().name() : "PENDING")
                .appliedDate(a.getCreatedAt() != null ? a.getCreatedAt().toLocalDate() : null)
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }
}
