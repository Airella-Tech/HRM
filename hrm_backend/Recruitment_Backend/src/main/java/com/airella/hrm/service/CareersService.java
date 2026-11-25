package com.airella.hrm.service;

import com.airella.hrm.dto.PublicVacancyDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.JobVacancy;
import com.airella.hrm.model.VacancyStatus;
import com.airella.hrm.repository.JobVacancyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

/**
 * Public Careers page: shows only published vacancies that are still open.
 * No login — the company is named in the request, and only public fields are returned.
 */
@Service
@Transactional(readOnly = true)
public class CareersService {

    private final JobVacancyRepository vacancyRepo;

    public CareersService(JobVacancyRepository vacancyRepo) {
        this.vacancyRepo = vacancyRepo;
    }

    public List<PublicVacancyDTO> listOpen(String company, String department, String jobType, String search) {
        String companyRef = requireCompany(company);
        String dept = clean(department);
        String type = clean(jobType);
        String query = clean(search) == null ? null : search.trim().toLowerCase(Locale.ROOT);

        return vacancyRepo
                .findByCompanyRefAndStatusAndDeadlineGreaterThanEqualOrderByPublishedAtDesc(
                        companyRef, VacancyStatus.PUBLISHED, LocalDate.now())
                .stream()
                .filter(v -> dept == null || v.getDepartment().equalsIgnoreCase(dept))
                .filter(v -> type == null || v.getJobType().equalsIgnoreCase(type))
                .filter(v -> query == null || matches(v, query))
                .map(this::toDto)
                .toList();
    }

    public PublicVacancyDTO getOpen(Long id, String company) {
        String companyRef = requireCompany(company);
        JobVacancy vacancy = vacancyRepo.findByIdAndCompanyRef(id, companyRef)
                .filter(v -> v.getStatus() == VacancyStatus.PUBLISHED && !v.getDeadline().isBefore(LocalDate.now()))
                .orElseThrow(() -> new ResourceNotFoundException("Vacancy", "id", id));
        return toDto(vacancy);
    }

    // ── helpers ──────────────────────────────────────────

    private String requireCompany(String company) {
        if (company == null || company.isBlank()) {
            throw new BusinessException("Please provide the company, for example ?company=<registration number>.");
        }
        return company.trim();
    }

    private String clean(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }

    private boolean matches(JobVacancy v, String query) {
        return v.getTitle().toLowerCase(Locale.ROOT).contains(query)
                || v.getDepartment().toLowerCase(Locale.ROOT).contains(query)
                || v.getRequiredSkills().stream().anyMatch(s -> s.toLowerCase(Locale.ROOT).contains(query));
    }

    private PublicVacancyDTO toDto(JobVacancy v) {
        return new PublicVacancyDTO(
                v.getId(), v.getTitle(), v.getDepartment(), v.getJobType(), v.getVacancyCount(),
                v.getDescription(), v.getQualifications(), List.copyOf(v.getRequiredSkills()),
                v.getExperienceLevel(), v.getSalaryMin(), v.getSalaryMax(), v.getDeadline(),
                v.getPublishedAt());
    }
}