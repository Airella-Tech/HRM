package com.airella.hrm.service;

import com.airella.hrm.dto.VacancyDTO;
import com.airella.hrm.dto.VacancyRequestDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.ApplicationStatus;
import com.airella.hrm.model.CandidateApplication;
import com.airella.hrm.model.EligibilityStatus;
import com.airella.hrm.model.JobVacancy;
import com.airella.hrm.model.VacancyStatus;
import com.airella.hrm.repository.CandidateApplicationRepository;
import com.airella.hrm.repository.JobVacancyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@Transactional
public class JobVacancyService {

    private static final Logger log = LoggerFactory.getLogger(JobVacancyService.class);

    private final JobVacancyRepository vacancyRepo;
    private final AuthService authService;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final RecruitmentNotificationService notificationService;
    private final CandidateApplicationRepository applicationRepo;

    public JobVacancyService(JobVacancyRepository vacancyRepo,
                             AuthService authService,
                             PermissionService permissionService,
                             AuditService auditService,
                             RecruitmentNotificationService notificationService) {
        this(vacancyRepo, authService, permissionService, auditService, notificationService, null);
    }

    @Autowired
    public JobVacancyService(JobVacancyRepository vacancyRepo,
                             AuthService authService,
                             PermissionService permissionService,
                             AuditService auditService,
                             RecruitmentNotificationService notificationService,
                             @Autowired(required = false) CandidateApplicationRepository applicationRepo) {
        this.vacancyRepo = vacancyRepo;
        this.authService = authService;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.applicationRepo = applicationRepo;
    }

    public VacancyDTO create(VacancyRequestDTO request) {
        String companyRef = authService.getCurrentCompanyRef();

        JobVacancy vacancy = new JobVacancy();
        vacancy.setCompanyRef(companyRef);
        vacancy.setStatus(VacancyStatus.DRAFT);
        vacancy.setCreatedBy(permissionService.currentUserId());
        apply(vacancy, request);

        vacancy = vacancyRepo.save(vacancy);
        auditService.logAction("VACANCY_CREATED", "JobVacancy", vacancy.getId(),
                "Created vacancy draft: " + vacancy.getTitle(), companyRef);
        notificationService.vacancyCreated(vacancy);
        log.info("Vacancy {} created for company {}", vacancy.getId(), companyRef);
        return toDto(vacancy);
    }

    public VacancyDTO update(Long id, VacancyRequestDTO request) {
        String companyRef = authService.getCurrentCompanyRef();
        JobVacancy vacancy = find(id, companyRef);

        if (vacancy.getStatus() != VacancyStatus.DRAFT) {
            throw new BusinessException("Only draft vacancies can be edited.");
        }
        apply(vacancy, request);

        vacancy = vacancyRepo.save(vacancy);
        auditService.logAction("VACANCY_UPDATED", "JobVacancy", vacancy.getId(),
                "Updated vacancy draft: " + vacancy.getTitle(), companyRef);
        return toDto(vacancy);
    }

    @Transactional(readOnly = true)
    public VacancyDTO get(Long id) {
        return toDto(find(id, authService.getCurrentCompanyRef()));
    }

    @Transactional(readOnly = true)
    public List<VacancyDTO> list(VacancyStatus status) {
        String companyRef = authService.getCurrentCompanyRef();
        List<JobVacancy> vacancies = (status == null)
                ? vacancyRepo.findByCompanyRefOrderByCreatedAtDesc(companyRef)
                : vacancyRepo.findByCompanyRefAndStatusOrderByCreatedAtDesc(companyRef, status);
        return vacancies.stream().map(this::toDto).toList();
    }

    public void deleteDraft(Long id) {
        String companyRef = authService.getCurrentCompanyRef();
        JobVacancy vacancy = find(id, companyRef);

        if (vacancy.getStatus() != VacancyStatus.DRAFT) {
            throw new BusinessException("Only draft vacancies can be deleted.");
        }
        vacancyRepo.delete(vacancy);
        auditService.logAction("VACANCY_DELETED", "JobVacancy", id,
                "Deleted vacancy draft: " + vacancy.getTitle(), companyRef);
    }

    // ── Approval flow (JVA) ──────────────────────────────

    /** DRAFT -> PENDING_APPROVAL */
    public VacancyDTO submitForApproval(Long id) {
        String companyRef = authService.getCurrentCompanyRef();
        JobVacancy vacancy = find(id, companyRef);

        if (vacancy.getStatus() != VacancyStatus.DRAFT) {
            throw new BusinessException("Only draft vacancies can be submitted for approval.");
        }
        if (!vacancy.getDeadline().isAfter(LocalDate.now())) {
            throw new BusinessException("The application deadline has passed. Edit the deadline before submitting.");
        }

        vacancy.setStatus(VacancyStatus.PENDING_APPROVAL);
        vacancy.setRejectionReason(null);
        vacancy.setReviewedBy(null);
        vacancy.setReviewedAt(null);

        vacancy = vacancyRepo.save(vacancy);
        auditService.logAction("VACANCY_SUBMITTED", "JobVacancy", vacancy.getId(),
       
                "Submitted vacancy for approval: " + vacancy.getTitle(), companyRef);
                 notificationService.vacancySubmitted(vacancy);
        return toDto(vacancy);
    }

    /** PENDING_APPROVAL -> APPROVED */
    public VacancyDTO approve(Long id) {
        String companyRef = authService.getCurrentCompanyRef();
        JobVacancy vacancy = find(id, companyRef);

        if (vacancy.getStatus() != VacancyStatus.PENDING_APPROVAL) {
            throw new BusinessException("Only vacancies waiting for approval can be approved.");
        }

        vacancy.setStatus(VacancyStatus.APPROVED);
        vacancy.setReviewedBy(permissionService.currentUserId());
        vacancy.setReviewedAt(LocalDateTime.now());
        vacancy.setRejectionReason(null);

        vacancy = vacancyRepo.save(vacancy);
        auditService.logAction("VACANCY_APPROVED", "JobVacancy", vacancy.getId(),
      
                "Approved vacancy: " + vacancy.getTitle(), companyRef);
                  notificationService.vacancyApproved(vacancy);
        return toDto(vacancy);
    }

    /** PENDING_APPROVAL -> DRAFT (with a reason, so the creator can fix and resubmit) */
    public VacancyDTO reject(Long id, String reason) {
        String companyRef = authService.getCurrentCompanyRef();
        JobVacancy vacancy = find(id, companyRef);

        if (vacancy.getStatus() != VacancyStatus.PENDING_APPROVAL) {
            throw new BusinessException("Only vacancies waiting for approval can be rejected.");
        }

        vacancy.setStatus(VacancyStatus.DRAFT);
        vacancy.setRejectionReason(reason.trim());
        vacancy.setReviewedBy(permissionService.currentUserId());
        vacancy.setReviewedAt(LocalDateTime.now());

        vacancy = vacancyRepo.save(vacancy);
        auditService.logAction("VACANCY_REJECTED", "JobVacancy", vacancy.getId(),
      
                "Rejected vacancy: " + vacancy.getTitle() + " — " + reason.trim(), companyRef);
                  notificationService.vacancyRejected(vacancy, reason.trim());
        return toDto(vacancy);
    }

    // ── Publish and close (JVP) ──────────────────────────

    /** APPROVED -> PUBLISHED */
    public VacancyDTO publish(Long id) {
        String companyRef = authService.getCurrentCompanyRef();
        JobVacancy vacancy = find(id, companyRef);

        if (vacancy.getStatus() != VacancyStatus.APPROVED) {
            throw new BusinessException("Only approved vacancies can be published.");
        }
        if (vacancy.getDeadline().isBefore(LocalDate.now())) {
            throw new BusinessException("The application deadline has passed, so this vacancy cannot be published.");
        }

        vacancy.setStatus(VacancyStatus.PUBLISHED);
        vacancy.setPublishedAt(LocalDateTime.now());

        vacancy = vacancyRepo.save(vacancy);
        auditService.logAction("VACANCY_PUBLISHED", "JobVacancy", vacancy.getId(),
       
                "Published vacancy: " + vacancy.getTitle(), companyRef);
                 notificationService.vacancyPublished(vacancy);
        return toDto(vacancy);
    }

    /** PUBLISHED -> CLOSED (closed by hand from Job Vacancy Management page) */
    public VacancyDTO close(Long id) {
        String companyRef = authService.getCurrentCompanyRef();
        JobVacancy vacancy = find(id, companyRef);

        if (vacancy.getStatus() != VacancyStatus.PUBLISHED) {
            throw new BusinessException("Only published vacancies can be closed.");
        }

        vacancy.setStatus(VacancyStatus.CLOSED);
        vacancy.setClosedAt(LocalDateTime.now());

        vacancy = vacancyRepo.save(vacancy);
        auditService.logAction("VACANCY_CLOSED", "JobVacancy", vacancy.getId(),
                "Closed vacancy: " + vacancy.getTitle(), companyRef);
        if (notificationService != null) {
            notificationService.vacancyClosed(vacancy);
        }
        return toDto(vacancy);
    }

    // ── Recruitment Workflow ("After Process") Removal & Restoration ──
    // Does NOT alter vacancy.status so Job Vacancy Management page is not affected.

    /** Remove vacancy from Applications page -> moved to Applications History */
    public VacancyDTO removeFromApplications(Long id) {
        String companyRef = authService.getCurrentCompanyRef();
        JobVacancy vacancy = find(id, companyRef);

        vacancy.setRemovedFromApplications(true);
        vacancy.setRemovedFromApplicationsAt(LocalDateTime.now());

        vacancy = vacancyRepo.save(vacancy);
        auditService.logAction("VACANCY_REMOVED_APPLICATIONS", "JobVacancy", vacancy.getId(),
                "Removed vacancy from active applications: " + vacancy.getTitle(), companyRef);
        return toDto(vacancy);
    }

    /** Restore vacancy back to Active Applications */
    public VacancyDTO restoreToApplications(Long id) {
        String companyRef = authService.getCurrentCompanyRef();
        JobVacancy vacancy = find(id, companyRef);

        vacancy.setRemovedFromApplications(false);
        vacancy.setRemovedFromApplicationsAt(null);

        vacancy = vacancyRepo.save(vacancy);
        auditService.logAction("VACANCY_RESTORED_APPLICATIONS", "JobVacancy", vacancy.getId(),
                "Restored vacancy to active applications: " + vacancy.getTitle(), companyRef);
        return toDto(vacancy);
    }

    /**
     * Remove vacancy from Shortlist page:
     * 1. Marks vacancy as removedFromShortlist = true.
     * 2. Finds all candidate applications for this vacancy:
     *    Any candidate not confirmed as SHORTLISTED (and not already REJECTED)
     *    is automatically set to REJECTED with rejectionReason = "Position archived / closed without shortlist confirmation".
     *    This immediately updates their status in the public tracking page (/careers/track).
     * 3. DOES NOT touch vacancy.status (remains PUBLISHED or unchanged in Job Vacancy create page).
     */
    public VacancyDTO removeFromShortlist(Long id) {
        String companyRef = authService.getCurrentCompanyRef();
        JobVacancy vacancy = find(id, companyRef);

        vacancy.setRemovedFromShortlist(true);
        vacancy.setRemovedFromShortlistAt(LocalDateTime.now());
        vacancy = vacancyRepo.save(vacancy);

        if (applicationRepo != null) {
            List<CandidateApplication> apps = applicationRepo.findByVacancyId(id);
            int rejectedCount = 0;
            Long currentUserId = permissionService != null ? permissionService.currentUserId() : null;
            LocalDateTime now = LocalDateTime.now();

            for (CandidateApplication app : apps) {
                ApplicationStatus curStatus = app.getStatus();
                if (curStatus != ApplicationStatus.SHORTLISTED
                        && curStatus != ApplicationStatus.REJECTED) {
                    app.setStatus(ApplicationStatus.REJECTED);
                    app.setEligibilityStatus(EligibilityStatus.INELIGIBLE);
                    app.setRejectionReason("Position archived / closed without shortlist confirmation");
                    app.setReviewedBy(currentUserId);
                    app.setReviewedAt(now);
                    applicationRepo.save(app);
                    rejectedCount++;

                    auditService.logAction("CANDIDATE_REJECTED", "CandidateApplication", app.getId(),
                            "Auto-rejected on vacancy shortlist removal: " + app.getCandidateName(), companyRef);
                }
            }
            log.info("Removed vacancy {} from shortlist and auto-rejected {} unconfirmed candidates", id, rejectedCount);
        }

        auditService.logAction("VACANCY_REMOVED_SHORTLIST", "JobVacancy", vacancy.getId(),
                "Removed vacancy from active shortlist and auto-rejected unconfirmed candidates: " + vacancy.getTitle(), companyRef);
        return toDto(vacancy);
    }

    /** Restore vacancy back to Active Shortlist */
    public VacancyDTO restoreToShortlist(Long id) {
        String companyRef = authService.getCurrentCompanyRef();
        JobVacancy vacancy = find(id, companyRef);

        vacancy.setRemovedFromShortlist(false);
        vacancy.setRemovedFromShortlistAt(null);

        vacancy = vacancyRepo.save(vacancy);
        auditService.logAction("VACANCY_RESTORED_SHORTLIST", "JobVacancy", vacancy.getId(),
                "Restored vacancy to active shortlist: " + vacancy.getTitle(), companyRef);
        return toDto(vacancy);
    }

    /** Remove vacancy from Review page -> moved to Review History */
    public VacancyDTO removeFromReview(Long id) {
        String companyRef = authService.getCurrentCompanyRef();
        JobVacancy vacancy = find(id, companyRef);

        vacancy.setRemovedFromReview(true);
        vacancy.setRemovedFromReviewAt(LocalDateTime.now());

        vacancy = vacancyRepo.save(vacancy);
        auditService.logAction("VACANCY_REMOVED_REVIEW", "JobVacancy", vacancy.getId(),
                "Removed vacancy from active review: " + vacancy.getTitle(), companyRef);
        return toDto(vacancy);
    }

    /** Restore vacancy back to Active Review */
    public VacancyDTO restoreToReview(Long id) {
        String companyRef = authService.getCurrentCompanyRef();
        JobVacancy vacancy = find(id, companyRef);

        vacancy.setRemovedFromReview(false);
        vacancy.setRemovedFromReviewAt(null);

        vacancy = vacancyRepo.save(vacancy);
        auditService.logAction("VACANCY_RESTORED_REVIEW", "JobVacancy", vacancy.getId(),
                "Restored vacancy to active review: " + vacancy.getTitle(), companyRef);
        return toDto(vacancy);
    }

    /**
     * Closes every published vacancy whose deadline has passed, for all companies.
     * Called by the scheduler (no logged-in user, so the audit log shows a system action).
     */
    public int autoCloseExpired() {
        List<JobVacancy> expired =
                vacancyRepo.findByStatusAndDeadlineBefore(VacancyStatus.PUBLISHED, LocalDate.now());

        for (JobVacancy vacancy : expired) {
            vacancy.setStatus(VacancyStatus.CLOSED);
            vacancy.setClosedAt(LocalDateTime.now());
            vacancyRepo.save(vacancy);
            auditService.logAction("VACANCY_AUTO_CLOSED", "JobVacancy", vacancy.getId(),
                    "Auto-closed after deadline " + vacancy.getDeadline() + ": " + vacancy.getTitle(),
                    vacancy.getCompanyRef());
            notificationService.vacancyClosed(vacancy);
        }

        if (!expired.isEmpty()) {
            log.info("Auto-closed {} expired vacancies", expired.size());
        }
        return expired.size();
    }

    // ── helpers ──────────────────────────────────────────

    private JobVacancy find(Long id, String companyRef) {
        return vacancyRepo.findByIdAndCompanyRef(id, companyRef)
                .orElseThrow(() -> new ResourceNotFoundException("Vacancy", "id", id));
    }

    private void apply(JobVacancy vacancy, VacancyRequestDTO request) {
        if (request.salaryMin() != null && request.salaryMax() != null
                && request.salaryMax().compareTo(request.salaryMin()) < 0) {
            throw new BusinessException("Maximum salary cannot be lower than minimum salary.");
        }

        vacancy.setTitle(request.title().trim());
        vacancy.setDepartment(request.department().trim());
        vacancy.setJobType(request.jobType().trim());
        vacancy.setVacancyCount(request.vacancyCount());
        vacancy.setDescription(request.description().trim());
        vacancy.setQualifications(request.qualifications().trim());
        vacancy.setExperienceLevel(request.experienceLevel() == null ? null : request.experienceLevel().trim());
        vacancy.setSalaryMin(request.salaryMin());
        vacancy.setSalaryMax(request.salaryMax());
        vacancy.setDeadline(request.deadline());

        Set<String> skills = new LinkedHashSet<>();
        if (request.requiredSkills() != null) {
            for (String skill : request.requiredSkills()) {
                if (skill != null && !skill.isBlank()) {
                    skills.add(skill.trim());
                }
            }
        }
        vacancy.getRequiredSkills().clear();
        vacancy.getRequiredSkills().addAll(skills);
    }

    private VacancyDTO toDto(JobVacancy v) {
        return new VacancyDTO(
                v.getId(), v.getTitle(), v.getDepartment(), v.getJobType(), v.getVacancyCount(),
                v.getDescription(), v.getQualifications(), List.copyOf(v.getRequiredSkills()),
                v.getExperienceLevel(), v.getSalaryMin(), v.getSalaryMax(), v.getDeadline(),
                v.getStatus(), v.getRejectionReason(), v.getReviewedBy(), v.getReviewedAt(),
                v.getPublishedAt(), v.getClosedAt(),
                v.getCreatedBy(), v.getCreatedAt(), v.getUpdatedAt(),
                v.getRemovedFromApplications(), v.getRemovedFromApplicationsAt(),
                v.getRemovedFromShortlist(), v.getRemovedFromShortlistAt(),
                v.getRemovedFromReview(), v.getRemovedFromReviewAt());
    }
}