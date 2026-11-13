package com.airella.hrm.controller;

import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.dto.RejectRequestDTO;
import com.airella.hrm.dto.VacancyDTO;
import com.airella.hrm.dto.VacancyRequestDTO;
import com.airella.hrm.model.VacancyStatus;
import com.airella.hrm.service.JobVacancyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recruitment/jobs")
public class JobVacancyController {

    private static final String CAN_SEE_VACANCIES =
            "@perm.isFullAccess() or @perm.hasRecruitmentAccess()";

    private final JobVacancyService vacancyService;

    public JobVacancyController(JobVacancyService vacancyService) {
        this.vacancyService = vacancyService;
    }

    @PostMapping
    @PreAuthorize("@perm.has('VACANCY_CREATE')")
    public ResponseEntity<ApiResponse<VacancyDTO>> create(@Valid @RequestBody VacancyRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(vacancyService.create(request), "Vacancy draft created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perm.has('VACANCY_CREATE')")
    public ResponseEntity<ApiResponse<VacancyDTO>> update(@PathVariable Long id,
                                                          @Valid @RequestBody VacancyRequestDTO request) {
        return ResponseEntity.ok(ApiResponse.success(vacancyService.update(id, request), "Vacancy updated"));
    }

    @GetMapping
    @PreAuthorize(CAN_SEE_VACANCIES)
    public ResponseEntity<ApiResponse<List<VacancyDTO>>> list(@RequestParam(required = false) VacancyStatus status) {
        return ResponseEntity.ok(ApiResponse.success(vacancyService.list(status)));
    }

    @GetMapping("/{id}")
    @PreAuthorize(CAN_SEE_VACANCIES)
    public ResponseEntity<ApiResponse<VacancyDTO>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(vacancyService.get(id)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.has('VACANCY_CREATE')")
    public ResponseEntity<ApiResponse<Void>> deleteDraft(@PathVariable Long id) {
        vacancyService.deleteDraft(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Vacancy draft deleted"));
    }

    // ── Approval flow ────────────────────────────────────

    @PostMapping("/{id}/submit")
    @PreAuthorize("@perm.has('VACANCY_CREATE')")
    public ResponseEntity<ApiResponse<VacancyDTO>> submit(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(vacancyService.submitForApproval(id),
                "Vacancy submitted for approval"));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("@perm.has('VACANCY_APPROVE')")
    public ResponseEntity<ApiResponse<VacancyDTO>> approve(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(vacancyService.approve(id), "Vacancy approved"));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("@perm.has('VACANCY_APPROVE')")
    public ResponseEntity<ApiResponse<VacancyDTO>> reject(@PathVariable Long id,
                                                          @Valid @RequestBody RejectRequestDTO request) {
        return ResponseEntity.ok(ApiResponse.success(vacancyService.reject(id, request.reason()),
                "Vacancy sent back to draft"));
    }

    // ── Publish and close ────────────────────────────────

    @PostMapping("/{id}/publish")
    @PreAuthorize("@perm.has('VACANCY_PUBLISH')")
    public ResponseEntity<ApiResponse<VacancyDTO>> publish(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(vacancyService.publish(id), "Vacancy published"));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("@perm.has('VACANCY_PUBLISH')")
    public ResponseEntity<ApiResponse<VacancyDTO>> close(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(vacancyService.close(id), "Vacancy closed"));
    }

    // ── Recruitment "After Process" Workflow Endpoints ──

    @PostMapping("/{id}/remove-applications")
    @PreAuthorize("@perm.hasAny('APPLICATION_VIEW', 'RESUME_DOWNLOAD', 'APPLICATION_SCREEN', 'APPLICATION_SHORTLIST', 'VACANCY_PUBLISH')")
    public ResponseEntity<ApiResponse<VacancyDTO>> removeApplications(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(vacancyService.removeFromApplications(id),
                "Vacancy removed from active applications"));
    }

    @PostMapping("/{id}/restore-applications")
    @PreAuthorize("@perm.hasAny('APPLICATION_VIEW', 'RESUME_DOWNLOAD', 'APPLICATION_SCREEN', 'APPLICATION_SHORTLIST', 'VACANCY_PUBLISH')")
    public ResponseEntity<ApiResponse<VacancyDTO>> restoreApplications(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(vacancyService.restoreToApplications(id),
                "Vacancy restored to active applications"));
    }

    @PostMapping("/{id}/remove-shortlist")
    @PreAuthorize("@perm.hasAny('APPLICATION_SHORTLIST', 'APPLICATION_VIEW', 'VACANCY_PUBLISH')")
    public ResponseEntity<ApiResponse<VacancyDTO>> removeShortlist(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(vacancyService.removeFromShortlist(id),
                "Vacancy removed from active shortlist and unconfirmed candidates updated to rejected"));
    }

    @PostMapping("/{id}/restore-shortlist")
    @PreAuthorize("@perm.hasAny('APPLICATION_SHORTLIST', 'APPLICATION_VIEW', 'VACANCY_PUBLISH')")
    public ResponseEntity<ApiResponse<VacancyDTO>> restoreShortlist(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(vacancyService.restoreToShortlist(id),
                "Vacancy restored to active shortlist"));
    }

    @PostMapping("/{id}/remove-review")
    @PreAuthorize("@perm.hasAny('APPLICATION_SCREEN', 'APPLICATION_VIEW', 'VACANCY_PUBLISH')")
    public ResponseEntity<ApiResponse<VacancyDTO>> removeReview(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(vacancyService.removeFromReview(id),
                "Vacancy removed from active review"));
    }

    @PostMapping("/{id}/restore-review")
    @PreAuthorize("@perm.hasAny('APPLICATION_SCREEN', 'APPLICATION_VIEW', 'VACANCY_PUBLISH')")
    public ResponseEntity<ApiResponse<VacancyDTO>> restoreReview(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(vacancyService.restoreToReview(id),
                "Vacancy restored to active review"));
    }
}