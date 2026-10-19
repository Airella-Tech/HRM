package com.airella.hrm.service;

import com.airella.hrm.dto.VacancyDTO;
import com.airella.hrm.dto.VacancyRequestDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.JobVacancy;
import com.airella.hrm.model.VacancyStatus;
import com.airella.hrm.repository.JobVacancyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    public JobVacancyService(JobVacancyRepository vacancyRepo,
                             AuthService authService,
                             PermissionService permissionService,
                             AuditService auditService) {
        this.vacancyRepo = vacancyRepo;
        this.authService = authService;
        this.permissionService = permissionService;
        this.auditService = auditService;
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
        return toDto(vacancy);
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
                v.getCreatedBy(), v.getCreatedAt(), v.getUpdatedAt());
    }
}