package com.airella.hrm.service;

import com.airella.hrm.dto.RecruitmentNotificationDTO;
import com.airella.hrm.dto.UserSummaryDTO;
import com.airella.hrm.model.JobVacancy;
import com.airella.hrm.model.RecruitmentNotification;
import com.airella.hrm.repository.RecruitmentNotificationRepository;
import com.airella.hrm.repository.UserRecruitmentRoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * In-app notifications for vacancy events. Sending never breaks the action that caused it:
 * if something goes wrong the problem is logged and the vacancy action still succeeds.
 */
@Service
public class RecruitmentNotificationService {

    private static final Logger log = LoggerFactory.getLogger(RecruitmentNotificationService.class);

    private final RecruitmentNotificationRepository notificationRepo;
    private final UserRecruitmentRoleRepository userRoleRepo;
    private final EmployeeDirectory employeeDirectory;
    private final AuthService authService;
    private final PermissionService permissionService;

    public RecruitmentNotificationService(RecruitmentNotificationRepository notificationRepo,
                                          UserRecruitmentRoleRepository userRoleRepo,
                                          EmployeeDirectory employeeDirectory,
                                          AuthService authService,
                                          PermissionService permissionService) {
        this.notificationRepo = notificationRepo;
        this.userRoleRepo = userRoleRepo;
        this.employeeDirectory = employeeDirectory;
        this.authService = authService;
        this.permissionService = permissionService;
    }

    // ── Vacancy events ───────────────────────────────────

    /** DRAFT -> PENDING_APPROVAL: tell everyone who can approve. */
    public void vacancySubmitted(JobVacancy v) {
        safely(() -> notifyPermissionHolders("VACANCY_APPROVE", v, Set.of(),
                "VACANCY_SUBMITTED",
                "Vacancy waiting for approval",
                "\"" + v.getTitle() + "\" (" + v.getDepartment() + ") was submitted for approval.",
                "/recruitment/vacancies?view=approve"));
    }

    /** PENDING_APPROVAL -> APPROVED: tell the creator, and everyone who can publish. */
    public void vacancyApproved(JobVacancy v) {
        safely(() -> {
            notifyUser(v.getCreatedBy(), v, "VACANCY_APPROVED",
                    "Your vacancy was approved",
                    "\"" + v.getTitle() + "\" was approved and is waiting to be published.",
                    "/recruitment/vacancies");
            Set<Long> already = new LinkedHashSet<>();
            if (v.getCreatedBy() != null) already.add(v.getCreatedBy());
            notifyPermissionHolders("VACANCY_PUBLISH", v, already,
                    "VACANCY_APPROVED",
                    "Vacancy ready to publish",
                    "\"" + v.getTitle() + "\" was approved and can be published.",
                    "/recruitment/vacancies?view=publish");
        });
    }

    /** PENDING_APPROVAL -> DRAFT: tell the creator why. */
    public void vacancyRejected(JobVacancy v, String reason) {
        safely(() -> notifyUser(v.getCreatedBy(), v, "VACANCY_REJECTED",
                "Your vacancy was rejected",
                "\"" + v.getTitle() + "\" was sent back. Reason: " + reason,
                "/recruitment/vacancies?view=create"));
    }

    /** APPROVED -> PUBLISHED: tell the creator. */
    public void vacancyPublished(JobVacancy v) {
        safely(() -> notifyUser(v.getCreatedBy(), v, "VACANCY_PUBLISHED",
                "Your vacancy is published",
                "\"" + v.getTitle() + "\" is now live on the Careers page.",
                "/recruitment/vacancies"));
    }

    // ── Reading (for the bell) ───────────────────────────

    @Transactional(readOnly = true)
    public List<RecruitmentNotificationDTO> listForCurrentUser() {
        Long userId = permissionService.currentUserId();
        if (userId == null) return List.of();
        return notificationRepo.findTop50ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(n -> new RecruitmentNotificationDTO(n.getId(), n.getTitle(), n.getMessage(),
                        n.getCategory(), n.getLink(), n.getRefId(), n.isSeen(), n.getCreatedAt()))
                .toList();
    }

    @Transactional
    public void markRead(Long id) {
        Long userId = permissionService.currentUserId();
        if (userId == null) return;
        notificationRepo.findByIdAndUserId(id, userId).ifPresent(n -> n.setSeen(true));
    }

    @Transactional
    public void markAllRead() {
        Long userId = permissionService.currentUserId();
        if (userId == null) return;
        notificationRepo.markAllRead(userId);
    }

    // ── Helpers ──────────────────────────────────────────

    /** Everyone with this permission through a recruitment role, plus HR managers and admins. */
    private void notifyPermissionHolders(String permission, JobVacancy v, Set<Long> skip,
                                         String category, String title, String message, String link) {
        Set<Long> recipients = new LinkedHashSet<>(
                userRoleRepo.findUserIdsByCompanyIdAndPermissionCode(authService.getCurrentCompanyId(), permission));
        for (UserSummaryDTO u : employeeDirectory.findByCompanyRef(v.getCompanyRef())) {
            if ("HR_MANAGER".equalsIgnoreCase(u.getRole()) || "ADMIN".equalsIgnoreCase(u.getRole())) {
                recipients.add(u.getId());
            }
        }
        recipients.removeAll(skip);
        for (Long userId : recipients) {
            notifyUser(userId, v, category, title, message, link);
        }
    }

    /** One notification, unless it is for nobody or for the person who just did the action. */
    private void notifyUser(Long userId, JobVacancy v, String category, String title, String message, String link) {
        if (userId == null || userId.equals(permissionService.currentUserId())) return;
        RecruitmentNotification n = new RecruitmentNotification();
        n.setCompanyRef(v.getCompanyRef());
        n.setUserId(userId);
        n.setTitle(title);
        n.setMessage(message);
        n.setCategory(category);
        n.setLink(link);
        n.setRefId(v.getId());
        notificationRepo.save(n);
    }

    private void safely(Runnable action) {
        try {
            action.run();
        } catch (Exception e) {
            log.warn("Could not send vacancy notification: {}", e.getMessage());
        }
    }
}