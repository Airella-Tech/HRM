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
import com.airella.hrm.model.Interview;
import com.airella.hrm.model.InterviewEvaluatorAssignment;
import com.airella.hrm.repository.InterviewEvaluatorAssignmentRepository;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

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
    private final InterviewEvaluatorAssignmentRepository assignmentRepository;

    public RecruitmentNotificationService(RecruitmentNotificationRepository notificationRepo,
                                          UserRecruitmentRoleRepository userRoleRepo,
                                          EmployeeDirectory employeeDirectory,
                                          AuthService authService,
                                          PermissionService permissionService,
                                          InterviewEvaluatorAssignmentRepository assignmentRepository) {
        this.notificationRepo = notificationRepo;
        this.userRoleRepo = userRoleRepo;
        this.employeeDirectory = employeeDirectory;
        this.authService = authService;
        this.permissionService = permissionService;
        this.assignmentRepository = assignmentRepository;
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

    // ------------------------------------------------------------
// INTERVIEW NOTIFICATIONS
// ------------------------------------------------------------

    /** Notify assigned interviewers when an interview is scheduled. */
    public void interviewScheduled(Interview interview) {
        safely(() -> notifyInterviewers(
                interview,
                "INTERVIEW_SCHEDULED",
                "New interview scheduled",
                "An interview has been scheduled for "
                        + interview.getCandidateName()
                        + " - " + interview.getInterviewRound()
                        + " on " + interview.getInterviewDate()
                        + " at " + interview.getInterviewTime() + ".",
                "/recruitment/interviews"
        ));
    }

    /** Notify assigned interviewers when an interview is rescheduled. */
    public void interviewRescheduled(Interview interview) {
        safely(() -> notifyInterviewers(
                interview,
                "INTERVIEW_RESCHEDULED",
                "Interview rescheduled",
                "The interview for " + interview.getCandidateName()
                        + " has been rescheduled to "
                        + interview.getInterviewDate()
                        + " at " + interview.getInterviewTime() + ".",
                "/recruitment/interviews"
        ));
    }

    /** Notify newly assigned interviewers. */
    public void interviewerAssigned(
            Interview interview,
            Set<Long> employeeIds) {

        safely(() -> {
            if (employeeIds == null || employeeIds.isEmpty()) {
                return;
            }

            for (Long employeeId : employeeIds) {
                notifyInterviewUser(
                        employeeId,
                        interview,
                        "INTERVIEWER_ASSIGNED",
                        "You have been assigned an interview",
                        "You have been assigned to interview "
                                + interview.getCandidateName()
                                + " for " + interview.getVacancyTitle()
                                + " (" + interview.getInterviewRound() + ").",
                        "/recruitment/interviews"
                );
            }
        });
    }

    /** Notify assigned interviewers when the status changes. */
    public void interviewStatusUpdated(
            Interview interview,
            String previousStatus) {

        safely(() -> notifyInterviewers(
                interview,
                "INTERVIEW_STATUS_UPDATED",
                "Interview status updated",
                "The interview for " + interview.getCandidateName()
                        + " changed from " + previousStatus
                        + " to " + interview.getStatus() + ".",
                "/recruitment/interviews"
        ));
    }

    /** Notify users who can make interview decisions after evaluation submission. */
    public void evaluationSubmitted(Interview interview) {
        safely(() -> notifyInterviewPermissionHolders(
                "INTERVIEW_DECIDE",
                interview,
                "INTERVIEW_EVALUATION_SUBMITTED",
                "Interview evaluation submitted",
                "An interviewer has submitted an evaluation for "
                        + interview.getCandidateName()
                        + " - " + interview.getInterviewRound()
                        + ". A manager decision is now pending.",
                "/recruitment/interviews?view=evaluations"
        ));
    }

    /** Notify assigned interviewers when the manager makes a decision. */
    public void roundDecisionMade(
            Interview interview,
            String decision,
            String comments) {

        safely(() -> {
            boolean approved = "APPROVED".equalsIgnoreCase(decision);

            String message = approved
                    ? "The Recruitment Manager approved the "
                    + interview.getInterviewRound()
                    + " for " + interview.getCandidateName() + "."
                    : "The Recruitment Manager rejected the "
                    + interview.getInterviewRound()
                    + " for " + interview.getCandidateName()
                    + ". Reason: " + comments;

            notifyInterviewers(
                    interview,
                    approved
                            ? "INTERVIEW_ROUND_APPROVED"
                            : "INTERVIEW_ROUND_REJECTED",
                    approved
                            ? "Interview round approved"
                            : "Interview round rejected",
                    message,
                    "/recruitment/interviews"
            );
        });
    }

    // ------------------------------------------------------------
// INTERVIEW NOTIFICATION HELPERS
// ------------------------------------------------------------

    private void notifyInterviewers(
            Interview interview,
            String category,
            String title,
            String message,
            String link) {

        if (interview == null || interview.getId() == null) {
            return;
        }

        List<InterviewEvaluatorAssignment> assignments =
                assignmentRepository.findByCompanyIdAndInterviewId(
                        interview.getCompanyId(),
                        interview.getId()
                );

        Set<Long> recipients = assignments.stream()
                .map(InterviewEvaluatorAssignment::getEmployeeId)
                .filter(id -> id != null)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        for (Long userId : recipients) {
            notifyInterviewUser(
                    userId,
                    interview,
                    category,
                    title,
                    message,
                    link
            );
        }
    }

    private void notifyInterviewPermissionHolders(
            String permission,
            Interview interview,
            String category,
            String title,
            String message,
            String link) {

        Set<Long> recipients = new LinkedHashSet<>(
                userRoleRepo.findUserIdsByCompanyIdAndPermissionCode(
                        interview.getCompanyId(),
                        permission
                )
        );

        for (UserSummaryDTO user :
                employeeDirectory.findByCompanyRef(
                        authService.getCurrentCompanyRef())) {

            if ("HR_MANAGER".equalsIgnoreCase(user.getRole())
                    || "ADMIN".equalsIgnoreCase(user.getRole())) {

                recipients.add(user.getId());
            }
        }

        for (Long userId : recipients) {
            notifyInterviewUser(
                    userId,
                    interview,
                    category,
                    title,
                    message,
                    link
            );
        }
    }

    private void notifyInterviewUser(
            Long userId,
            Interview interview,
            String category,
            String title,
            String message,
            String link) {

        if (userId == null
                || interview == null
                || userId.equals(permissionService.currentUserId())) {
            return;
        }

        RecruitmentNotification notification =
                new RecruitmentNotification();

        notification.setCompanyRef(authService.getCurrentCompanyRef());
        notification.setUserId(userId);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setCategory(category);
        notification.setLink(link);
        notification.setRefId(interview.getId());

        notificationRepo.save(notification);
    }
}