package com.airella.hrm.service;

import com.airella.hrm.dto.RecruitmentNotificationDTO;
import com.airella.hrm.dto.UserSummaryDTO;
import com.airella.hrm.model.CandidateApplication;
import com.airella.hrm.model.Interview;
import com.airella.hrm.model.InterviewEvaluatorAssignment;
import com.airella.hrm.model.JobVacancy;
import com.airella.hrm.model.RecruitmentNotification;
import com.airella.hrm.model.RecruitmentRole;
import com.airella.hrm.repository.InterviewEvaluatorAssignmentRepository;
import com.airella.hrm.repository.RecruitmentNotificationRepository;
import com.airella.hrm.repository.UserRecruitmentRoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * In-app notifications for recruitment events.
 * Notifications are sent only to users (employees or HR Managers) who have the relevant permission,
 * plus assigned interviewers for interview events.
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

    /** When a vacancy draft is created: tell the creator and users who have VACANCY_CREATE or VACANCY_APPROVE permission. */
    public void vacancyCreated(JobVacancy v) {
        safely(() -> {
            if (v.getCreatedBy() != null) {
                notifyUser(v.getCreatedBy(), v.getCompanyRef(), v.getId(),
                        "VACANCY_CREATED",
                        "Draft vacancy created",
                        "Vacancy draft \"" + v.getTitle() + "\" (" + v.getDepartment() + ") was successfully created.",
                        "/recruitment/vacancies");
            }

            Set<Long> team = findUsersWithPermissions(
                    List.of("VACANCY_CREATE", "VACANCY_APPROVE"),
                    null,
                    v.getCompanyRef()
            );
            if (v.getCreatedBy() != null) team.remove(v.getCreatedBy());

            sendToUsers(team, v.getCompanyRef(), v.getId(),
                    "VACANCY_CREATED",
                    "New vacancy draft created",
                    "A new vacancy draft \"" + v.getTitle() + "\" was created for " + v.getDepartment() + ".",
                    "/recruitment/vacancies");
        });
    }

    /** DRAFT -> PENDING_APPROVAL: tell everyone who has VACANCY_APPROVE permission, plus confirmation to creator. */
    public void vacancySubmitted(JobVacancy v) {
        safely(() -> {
            if (v.getCreatedBy() != null) {
                notifyUser(v.getCreatedBy(), v.getCompanyRef(), v.getId(),
                        "VACANCY_SUBMITTED",
                        "Vacancy submitted for approval",
                        "Your vacancy \"" + v.getTitle() + "\" was submitted for review.",
                        "/recruitment/vacancies");
            }

            Set<Long> recipients = findUsersWithPermissions(
                    List.of("VACANCY_APPROVE"),
                    null,
                    v.getCompanyRef()
            );
            if (v.getCreatedBy() != null) recipients.remove(v.getCreatedBy());

            sendToUsers(recipients, v.getCompanyRef(), v.getId(),
                    "VACANCY_SUBMITTED",
                    "Vacancy waiting for approval",
                    "\"" + v.getTitle() + "\" (" + v.getDepartment() + ") was submitted for approval.",
                    "/recruitment/vacancies?view=approve");
        });
    }

    /** PENDING_APPROVAL -> APPROVED: tell the creator, publishers, and creators. */
    public void vacancyApproved(JobVacancy v) {
        safely(() -> {
            if (v.getCreatedBy() != null) {
                notifyUser(v.getCreatedBy(), v.getCompanyRef(), v.getId(), "VACANCY_APPROVED",
                        "Your vacancy was approved",
                        "\"" + v.getTitle() + "\" was approved and is waiting to be published.",
                        "/recruitment/vacancies");
            }

            Set<Long> publishers = findUsersWithPermissions(
                    List.of("VACANCY_PUBLISH"),
                    null,
                    v.getCompanyRef()
            );
            if (v.getCreatedBy() != null) publishers.remove(v.getCreatedBy());

            sendToUsers(publishers, v.getCompanyRef(), v.getId(),
                    "VACANCY_APPROVED",
                    "Vacancy ready to publish",
                    "\"" + v.getTitle() + "\" was approved and can be published.",
                    "/recruitment/vacancies?view=publish");

            Set<Long> creators = findUsersWithPermissions(
                    List.of("VACANCY_CREATE"),
                    null,
                    v.getCompanyRef()
            );
            if (v.getCreatedBy() != null) creators.remove(v.getCreatedBy());
            creators.removeAll(publishers);

            sendToUsers(creators, v.getCompanyRef(), v.getId(),
                    "VACANCY_APPROVED",
                    "Vacancy approved",
                    "\"" + v.getTitle() + "\" was approved.",
                    "/recruitment/vacancies");
        });
    }

    /** PENDING_APPROVAL -> DRAFT: tell the creator why, and team with VACANCY_CREATE. */
    public void vacancyRejected(JobVacancy v, String reason) {
        safely(() -> {
            if (v.getCreatedBy() != null) {
                notifyUser(v.getCreatedBy(), v.getCompanyRef(), v.getId(), "VACANCY_REJECTED",
                        "Your vacancy was rejected",
                        "\"" + v.getTitle() + "\" was sent back. Reason: " + reason,
                        "/recruitment/vacancies?view=create");
            }

            Set<Long> creators = findUsersWithPermissions(
                    List.of("VACANCY_CREATE"),
                    null,
                    v.getCompanyRef()
            );
            if (v.getCreatedBy() != null) creators.remove(v.getCreatedBy());

            sendToUsers(creators, v.getCompanyRef(), v.getId(),
                    "VACANCY_REJECTED",
                    "Vacancy returned for changes",
                    "\"" + v.getTitle() + "\" was returned for revision. Reason: " + reason,
                    "/recruitment/vacancies");
        });
    }

    /** APPROVED -> PUBLISHED: tell the creator and users with VACANCY_APPROVE, APPLICATION_VIEW, APPLICATION_SCREEN. */
    public void vacancyPublished(JobVacancy v) {
        safely(() -> {
            if (v.getCreatedBy() != null) {
                notifyUser(v.getCreatedBy(), v.getCompanyRef(), v.getId(), "VACANCY_PUBLISHED",
                        "Your vacancy is published",
                        "\"" + v.getTitle() + "\" is now live on the Careers page.",
                        "/recruitment/vacancies");
            }

            Set<Long> interested = findUsersWithPermissions(
                    List.of("VACANCY_APPROVE", "APPLICATION_VIEW", "APPLICATION_SCREEN", "APPLICATION_SHORTLIST"),
                    null,
                    v.getCompanyRef()
            );
            if (v.getCreatedBy() != null) interested.remove(v.getCreatedBy());

            sendToUsers(interested, v.getCompanyRef(), v.getId(),
                    "VACANCY_PUBLISHED",
                    "Vacancy published",
                    "\"" + v.getTitle() + "\" is now live and accepting applications.",
                    "/recruitment/vacancies");
        });
    }

    /** PUBLISHED -> CLOSED: tell the creator and users with VACANCY_APPROVE, VACANCY_PUBLISH. */
    public void vacancyClosed(JobVacancy v) {
        safely(() -> {
            if (v.getCreatedBy() != null) {
                notifyUser(v.getCreatedBy(), v.getCompanyRef(), v.getId(), "VACANCY_CLOSED",
                        "Your vacancy has been closed",
                        "\"" + v.getTitle() + "\" is now closed.",
                        "/recruitment/vacancies");
            }

            Set<Long> interested = findUsersWithPermissions(
                    List.of("VACANCY_APPROVE", "VACANCY_PUBLISH"),
                    null,
                    v.getCompanyRef()
            );
            if (v.getCreatedBy() != null) interested.remove(v.getCreatedBy());

            sendToUsers(interested, v.getCompanyRef(), v.getId(),
                    "VACANCY_CLOSED",
                    "Vacancy closed",
                    "\"" + v.getTitle() + "\" has been closed.",
                    "/recruitment/vacancies");
        });
    }

    // ── Candidate events ───────────────────────────────────

    /** Public applicant applied: notify users who have APPLICATION_VIEW or APPLICATION_SCREEN permissions, plus vacancy creator. */
    public void candidateApplied(CandidateApplication app, JobVacancy vacancy) {
        safely(() -> {
            String jobTitle = vacancy != null ? vacancy.getTitle() : "Vacancy";
            String compRef = app.getCompanyRef() != null ? app.getCompanyRef() : (vacancy != null ? vacancy.getCompanyRef() : null);

            Set<Long> recipients = findUsersWithPermissions(
                    List.of("APPLICATION_VIEW", "APPLICATION_SCREEN", "APPLICATION_SHORTLIST"),
                    app.getCompanyId(),
                    compRef
            );

            // Notify vacancy creator
            if (vacancy != null && vacancy.getCreatedBy() != null) {
                recipients.add(vacancy.getCreatedBy());
            }

            sendToUsers(recipients, compRef, app.getId(),
                    "CANDIDATE_APPLIED",
                    "New candidate application",
                    "Candidate " + app.getCandidateName() + " applied for '" + jobTitle + "'.",
                    "/recruitment/applications");
        });
    }

    /** Candidate shortlisted manually: notify vacancy creator and schedulers/shortlisters. */
    public void candidateShortlisted(CandidateApplication app, JobVacancy vacancy) {
        safely(() -> {
            String jobTitle = vacancy != null ? vacancy.getTitle() : "Vacancy";
            String compRef = app.getCompanyRef() != null ? app.getCompanyRef() : (vacancy != null ? vacancy.getCompanyRef() : null);

            Set<Long> schedulers = findUsersWithPermissions(
                    List.of("INTERVIEW_SCHEDULE"),
                    app.getCompanyId(),
                    compRef
            );

            // Notify vacancy creator
            if (vacancy != null && vacancy.getCreatedBy() != null) {
                schedulers.add(vacancy.getCreatedBy());
            }

            // Prevent user from receiving redundant notification for their own action
            Long currentUserId = permissionService.currentUserId();
            if (currentUserId != null) {
                schedulers.remove(currentUserId);
            }

            sendToUsers(schedulers, compRef, app.getId(),
                    "CANDIDATE_SHORTLISTED",
                    "Candidate shortlisted",
                    app.getCandidateName() + " was shortlisted for '" + jobTitle + "'. Ready for interview scheduling.",
                    "/recruitment/interviews");

            Set<Long> shortlisters = findUsersWithPermissions(
                    List.of("APPLICATION_SHORTLIST"),
                    app.getCompanyId(),
                    compRef
            );
            if (schedulers != null) shortlisters.removeAll(schedulers);
            if (currentUserId != null) shortlisters.remove(currentUserId);

            sendToUsers(shortlisters, compRef, app.getId(),
                    "CANDIDATE_SHORTLISTED",
                    "Candidate shortlisted",
                    app.getCandidateName() + " was shortlisted for '" + jobTitle + "'.",
                    "/recruitment/applications/shortlist");
        });
    }

    /** Batched notification when automated candidate screening shortlists candidates. */
    public void candidatesAutoShortlistedBatch(JobVacancy vacancy, int shortlistedCount, int totalEvaluated) {
        if (shortlistedCount <= 0 || vacancy == null) return;
        safely(() -> {
            String jobTitle = vacancy.getTitle() != null ? vacancy.getTitle() : "Vacancy";
            String compRef = vacancy.getCompanyRef();

            Set<Long> recipients = findUsersWithPermissions(
                    List.of("INTERVIEW_SCHEDULE", "APPLICATION_SHORTLIST"),
                    null,
                    compRef
            );

            // Notify vacancy creator
            if (vacancy.getCreatedBy() != null) {
                recipients.add(vacancy.getCreatedBy());
            }

            // Prevent user from receiving redundant notification for their own action
            Long currentUserId = permissionService.currentUserId();
            if (currentUserId != null) {
                recipients.remove(currentUserId);
            }

            String countStr = shortlistedCount + " candidate" + (shortlistedCount > 1 ? "s" : "");
            String title = "Automated Shortlisting: " + countStr;
            String message = countStr + " automatically shortlisted for '" + jobTitle + "' (" + totalEvaluated + " evaluated). Ready for interview scheduling.";

            sendToUsers(recipients, compRef, vacancy.getId(),
                    "CANDIDATES_AUTO_SHORTLISTED",
                    title,
                    message,
                    "/recruitment/shortlisted-candidates");
        });
    }

    /** Candidate rejected: notify users who have review or shortlist permissions. */
    public void candidateRejected(CandidateApplication app, JobVacancy vacancy, String reason) {
        safely(() -> {
            String jobTitle = vacancy != null ? vacancy.getTitle() : "Vacancy";
            String compRef = app.getCompanyRef() != null ? app.getCompanyRef() : (vacancy != null ? vacancy.getCompanyRef() : null);

            Set<Long> recipients = findUsersWithPermissions(
                    List.of("APPLICATION_VIEW", "APPLICATION_SCREEN", "APPLICATION_SHORTLIST"),
                    app.getCompanyId(),
                    compRef
            );

            sendToUsers(recipients, compRef, app.getId(),
                    "CANDIDATE_REJECTED",
                    "Candidate application rejected",
                    "Application for " + app.getCandidateName() + " (" + jobTitle + ") was rejected. Reason: " + reason,
                    "/recruitment/applications");
        });
    }

    // ── Interview events ───────────────────────────────────

    /** Notify assigned interviewers and users who can schedule/view interviews. */
    public void interviewScheduled(Interview interview) {
        safely(() -> {
            String ref = resolveCompanyRef(null);
            Set<Long> assigned = getAssignedInterviewerIds(interview);

            for (Long interviewerId : assigned) {
                notifyUser(interviewerId, ref, interview.getId(),
                        "INTERVIEW_SCHEDULED",
                        "You have an interview scheduled",
                        "You are scheduled to interview " + interview.getCandidateName()
                                + " (" + interview.getInterviewRound() + ") on "
                                + interview.getInterviewDate() + " at " + interview.getInterviewTime() + ".",
                        "/recruitment/interviews");
            }

            Set<Long> coordinators = findUsersWithPermissions(
                    List.of("INTERVIEW_SCHEDULE", "INTERVIEW_PROGRESS_VIEW", "INTERVIEW_ASSIGN"),
                    interview.getCompanyId(),
                    ref
            );
            coordinators.removeAll(assigned);

            sendToUsers(coordinators, ref, interview.getId(),
                    "INTERVIEW_SCHEDULED",
                    "New interview scheduled",
                    "An interview has been scheduled for "
                            + interview.getCandidateName()
                            + " - " + interview.getInterviewRound()
                            + " on " + interview.getInterviewDate()
                            + " at " + interview.getInterviewTime() + ".",
                    "/recruitment/interviews");
        });
    }

    /** Notify assigned interviewers and users who can schedule/view interviews. */
    public void interviewRescheduled(Interview interview) {
        safely(() -> {
            String ref = resolveCompanyRef(null);
            Set<Long> assigned = getAssignedInterviewerIds(interview);

            for (Long interviewerId : assigned) {
                notifyUser(interviewerId, ref, interview.getId(),
                        "INTERVIEW_RESCHEDULED",
                        "Your interview was rescheduled",
                        "Your interview for " + interview.getCandidateName()
                                + " (" + interview.getInterviewRound() + ") has been rescheduled to "
                                + interview.getInterviewDate() + " at " + interview.getInterviewTime() + ".",
                        "/recruitment/interviews");
            }

            Set<Long> coordinators = findUsersWithPermissions(
                    List.of("INTERVIEW_SCHEDULE", "INTERVIEW_PROGRESS_VIEW"),
                    interview.getCompanyId(),
                    ref
            );
            coordinators.removeAll(assigned);

            sendToUsers(coordinators, ref, interview.getId(),
                    "INTERVIEW_RESCHEDULED",
                    "Interview rescheduled",
                    "The interview for " + interview.getCandidateName()
                            + " has been rescheduled to "
                            + interview.getInterviewDate()
                            + " at " + interview.getInterviewTime() + ".",
                    "/recruitment/interviews");
        });
    }

    /** Notify newly assigned interviewers and users with interview assignment permissions. */
    public void interviewerAssigned(Interview interview, Set<Long> employeeIds) {
        safely(() -> {
            String ref = resolveCompanyRef(null);
            if (employeeIds != null) {
                for (Long employeeId : employeeIds) {
                    notifyUser(employeeId, ref, interview.getId(),
                            "INTERVIEWER_ASSIGNED",
                            "You have been assigned an interview",
                            "You have been assigned to interview "
                                    + interview.getCandidateName()
                                    + " for " + interview.getVacancyTitle()
                                    + " (" + interview.getInterviewRound() + ").",
                            "/recruitment/interviews");
                }
            }

            Set<Long> managers = findUsersWithPermissions(
                    List.of("INTERVIEW_ASSIGN", "INTERVIEW_SCHEDULE", "INTERVIEW_PROGRESS_VIEW"),
                    interview.getCompanyId(),
                    ref
            );
            if (employeeIds != null) managers.removeAll(employeeIds);

            sendToUsers(managers, ref, interview.getId(),
                    "INTERVIEWER_ASSIGNED",
                    "Interviewer assigned",
                    "Interviewers assigned for " + interview.getCandidateName() + " (" + interview.getInterviewRound() + ").",
                    "/recruitment/interviews");
        });
    }

    /** Notify assigned interviewers and progress viewers when status changes. */
    public void interviewStatusUpdated(Interview interview, String previousStatus) {
        safely(() -> {
            String ref = resolveCompanyRef(null);
            Set<Long> assigned = getAssignedInterviewerIds(interview);

            for (Long interviewerId : assigned) {
                notifyUser(interviewerId, ref, interview.getId(),
                        "INTERVIEW_STATUS_UPDATED",
                        "Interview status updated",
                        "Your interview for " + interview.getCandidateName()
                                + " changed from " + previousStatus
                                + " to " + interview.getStatus() + ".",
                        "/recruitment/interviews");
            }

            Set<Long> coordinators = findUsersWithPermissions(
                    List.of("INTERVIEW_PROGRESS_VIEW", "INTERVIEW_DECIDE", "INTERVIEW_SCHEDULE"),
                    interview.getCompanyId(),
                    ref
            );
            coordinators.removeAll(assigned);

            sendToUsers(coordinators, ref, interview.getId(),
                    "INTERVIEW_STATUS_UPDATED",
                    "Interview status updated",
                    "The interview for " + interview.getCandidateName()
                            + " changed from " + previousStatus
                            + " to " + interview.getStatus() + ".",
                    "/recruitment/interviews");
        });
    }

    /** Notify users who have INTERVIEW_DECIDE / PROGRESS_VIEW permission when an evaluation is submitted. */
    public void evaluationSubmitted(Interview interview) {
        safely(() -> {
            String ref = resolveCompanyRef(null);
            Set<Long> decisionMakers = findUsersWithPermissions(
                    List.of("INTERVIEW_DECIDE"),
                    interview.getCompanyId(),
                    ref
            );

            sendToUsers(decisionMakers, ref, interview.getId(),
                    "INTERVIEW_EVALUATION_SUBMITTED",
                    "Interview evaluation submitted",
                    "An interviewer has submitted an evaluation for "
                            + interview.getCandidateName()
                            + " - " + interview.getInterviewRound()
                            + ". A manager decision is now pending.",
                    "/recruitment/evaluations");

            Set<Long> viewers = findUsersWithPermissions(
                    List.of("INTERVIEW_PROGRESS_VIEW", "INTERVIEW_SCHEDULE"),
                    interview.getCompanyId(),
                    ref
            );
            viewers.removeAll(decisionMakers);

            sendToUsers(viewers, ref, interview.getId(),
                    "INTERVIEW_EVALUATION_SUBMITTED",
                    "Evaluation submitted",
                    "An evaluation was submitted for " + interview.getCandidateName() + " (" + interview.getInterviewRound() + ").",
                    "/recruitment/evaluations");
        });
    }

    /** Notify assigned interviewers and offer/progress managers when decision is made. */
    public void roundDecisionMade(Interview interview, String decision, String comments) {
        safely(() -> {
            String ref = resolveCompanyRef(null);
            boolean approved = "APPROVED".equalsIgnoreCase(decision);
            String message = approved
                    ? "The interview round (" + interview.getInterviewRound() + ") was approved for " + interview.getCandidateName() + "."
                    : "The interview round (" + interview.getInterviewRound() + ") was rejected for " + interview.getCandidateName()
                    + (comments != null && !comments.isBlank() ? ". Reason: " + comments : ".");

            Set<Long> assigned = getAssignedInterviewerIds(interview);
            for (Long interviewerId : assigned) {
                notifyUser(interviewerId, ref, interview.getId(),
                        approved ? "INTERVIEW_ROUND_APPROVED" : "INTERVIEW_ROUND_REJECTED",
                        approved ? "Interview round approved" : "Interview round rejected",
                        message,
                        "/recruitment/interviews");
            }

            List<String> perms = approved
                    ? List.of("OFFER_MANAGE", "INTERVIEW_PROGRESS_VIEW", "INTERVIEW_SCHEDULE")
                    : List.of("INTERVIEW_PROGRESS_VIEW", "INTERVIEW_SCHEDULE");

            Set<Long> managers = findUsersWithPermissions(perms, interview.getCompanyId(), ref);
            managers.removeAll(assigned);

            sendToUsers(managers, ref, interview.getId(),
                    approved ? "INTERVIEW_ROUND_APPROVED" : "INTERVIEW_ROUND_REJECTED",
                    approved ? "Interview round approved" : "Interview round rejected",
                    message,
                    "/recruitment/interviews");
        });
    }

    // ── Offer events ───────────────────────────────────────

    /** When a job offer draft is created: notify users with OFFER_MANAGE permission. */
    public void offerCreated(com.airella.hrm.model.JobOffer offer) {
        safely(() -> {
            String ref = resolveCompanyRef(null);
            Set<Long> recipients = findUsersWithPermissions(
                    List.of("OFFER_MANAGE"),
                    offer.getCompanyId(),
                    ref
            );

            sendToUsers(recipients, ref, offer.getId(),
                    "OFFER_CREATED",
                    "New job offer drafted",
                    "A job offer draft was created for " + offer.getCandidateName() + " (" + offer.getJobTitle() + ").",
                    "/recruitment/offers");
        });
    }

    /** When a job offer status changes: notify users with OFFER_MANAGE permission. */
    public void offerStatusUpdated(com.airella.hrm.model.JobOffer offer, com.airella.hrm.model.JobOfferStatus previousStatus) {
        safely(() -> {
            String ref = resolveCompanyRef(null);
            Set<Long> recipients = findUsersWithPermissions(
                    List.of("OFFER_MANAGE"),
                    offer.getCompanyId(),
                    ref
            );

            String statusLabel = offer.getStatus() != null ? offer.getStatus().name() : "UPDATED";
            sendToUsers(recipients, ref, offer.getId(),
                    "OFFER_STATUS_UPDATED",
                    "Job offer " + statusLabel.toLowerCase(),
                    "Job offer for " + offer.getCandidateName() + " (" + offer.getJobTitle() + ") changed to " + statusLabel + ".",
                    "/recruitment/offers");
        });
    }

    // ── Role & Permission events ─────────────────────────

    /** When a recruitment role is assigned to an employee or HR manager. */
    public void roleAssigned(Long targetUserId, String roleName, Long companyId, String companyRef) {
        safely(() -> {
            String ref = resolveCompanyRef(companyRef);
            notifyUser(targetUserId, ref, null,
                    "ROLE_ASSIGNED",
                    "Recruitment role assigned",
                    "You have been assigned the recruitment role '" + roleName + "'. You can now access relevant recruitment features.",
                    "/recruitment/dashboard");

            Set<Long> managers = findUsersWithRoleManagement(companyId, ref);
            managers.remove(targetUserId);
            Long currentUserId = permissionService.currentUserId();
            if (currentUserId != null) {
                managers.remove(currentUserId);
            }
            sendToUsers(managers, ref, null,
                    "ROLE_ASSIGNED",
                    "Recruitment role assigned",
                    "Recruitment role '" + roleName + "' was assigned to user ID " + targetUserId + ".",
                    "/hr/roles-permissions");
        });
    }

    /** When recruitment roles are updated for a user. */
    public void rolesUpdated(Long targetUserId, List<String> roleNames, Long companyId, String companyRef) {
        safely(() -> {
            String ref = resolveCompanyRef(companyRef);
            boolean hasRoles = roleNames != null && !roleNames.isEmpty();
            String msg = hasRoles
                    ? "Your recruitment roles were updated to: " + String.join(", ", roleNames) + "."
                    : "Your recruitment roles have been removed.";
            String link = hasRoles ? "/recruitment/dashboard" : "/employee/dashboard";

            notifyUser(targetUserId, ref, null,
                    "ROLES_UPDATED",
                    "Recruitment roles updated",
                    msg,
                    link);

            Set<Long> managers = findUsersWithRoleManagement(companyId, ref);
            managers.remove(targetUserId);
            Long currentUserId = permissionService.currentUserId();
            if (currentUserId != null) {
                managers.remove(currentUserId);
            }
            sendToUsers(managers, ref, null,
                    "ROLES_UPDATED",
                    "User recruitment roles updated",
                    "Recruitment roles updated for user ID " + targetUserId + " (" + (hasRoles ? String.join(", ", roleNames) : "none") + ").",
                    "/hr/roles-permissions");
        });
    }

    /** When a recruitment role is removed from a user. */
    public void roleRemoved(Long targetUserId, String roleName, Long companyId, String companyRef) {
        safely(() -> {
            String ref = resolveCompanyRef(companyRef);
            notifyUser(targetUserId, ref, null,
                    "ROLE_REMOVED",
                    "Recruitment role removed",
                    "The recruitment role '" + roleName + "' was unassigned from your account.",
                    "/employee/dashboard");

            Set<Long> managers = findUsersWithRoleManagement(companyId, ref);
            managers.remove(targetUserId);
            Long currentUserId = permissionService.currentUserId();
            if (currentUserId != null) {
                managers.remove(currentUserId);
            }
            sendToUsers(managers, ref, null,
                    "ROLE_REMOVED",
                    "Recruitment role removed",
                    "Role '" + roleName + "' was removed from user ID " + targetUserId + ".",
                    "/hr/roles-permissions");
        });
    }

    /** When a new recruitment role is created. */
    public void roleCreated(RecruitmentRole role) {
        safely(() -> {
            String ref = resolveCompanyRef(null);
            Set<Long> managers = findUsersWithRoleManagement(role.getCompanyId(), ref);
            sendToUsers(managers, ref, role.getId(),
                    "ROLE_CREATED",
                    "New recruitment role created",
                    "A new recruitment role '" + role.getRoleName() + "' was created.",
                    "/hr/roles-permissions");
        });
    }

    /** When permissions of an existing recruitment role are modified. */
    public void rolePermissionsUpdated(RecruitmentRole role) {
        safely(() -> {
            String ref = resolveCompanyRef(null);
            Set<Long> managers = findUsersWithRoleManagement(role.getCompanyId(), ref);
            try {
                managers.addAll(userRoleRepo.findUserIdsByRoleId(role.getId()));
            } catch (Exception e) {
                log.debug("Error loading users for role {}: {}", role.getId(), e.getMessage());
            }

            sendToUsers(managers, ref, role.getId(),
                    "ROLE_PERMISSIONS_UPDATED",
                    "Role permissions updated",
                    "Permissions for role '" + role.getRoleName() + "' have been modified.",
                    "/hr/roles-permissions");
        });
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

    // ── Permission & Recipient Resolution Helpers ──────────

    /**
     * Finds all user IDs who have ANY of the requested permissions via their assigned recruitment roles.
     * Accurately scopes to the company.
     */
    private Set<Long> findUsersWithPermissions(Collection<String> permissions, Long companyId, String companyRef) {
        Set<Long> recipients = new LinkedHashSet<>();
        Long cId = companyId != null ? companyId : resolveCompanyId(null);

        String ref = resolveCompanyRef(companyRef);
        if (cId == null && ref != null && !ref.isBlank()) {
            try {
                List<UserSummaryDTO> users = employeeDirectory.findByCompanyRef(ref);
                if (users != null && !users.isEmpty()) {
                    for (UserSummaryDTO u : users) {
                        if (u.getCompanyId() != null) {
                            cId = u.getCompanyId();
                            break;
                        }
                    }
                }
            } catch (Exception e) {
                log.debug("Could not resolve companyId from companyRef {}: {}", ref, e.getMessage());
            }
        }

        for (String perm : permissions) {
            try {
                if (cId != null) {
                    List<Long> byCompany = userRoleRepo.findUserIdsByCompanyIdAndPermissionCode(cId, perm);
                    if (byCompany != null && !byCompany.isEmpty()) {
                        recipients.addAll(byCompany);
                    }
                } else {
                    List<Long> byPerm = userRoleRepo.findUserIdsByPermissionCode(perm);
                    if (byPerm != null && !byPerm.isEmpty()) {
                        recipients.addAll(byPerm);
                    }
                }
            } catch (Exception e) {
                log.debug("Error querying role permissions for {}: {}", perm, e.getMessage());
            }
        }

        return recipients;
    }

    private Set<Long> getAssignedInterviewerIds(Interview interview) {
        if (interview == null || interview.getId() == null) {
            return Collections.emptySet();
        }
        try {
            List<InterviewEvaluatorAssignment> assignments = interview.getCompanyId() != null
                    ? assignmentRepository.findByCompanyIdAndInterviewId(interview.getCompanyId(), interview.getId())
                    : assignmentRepository.findByInterviewId(interview.getId());
            if (assignments == null || assignments.isEmpty()) {
                assignments = assignmentRepository.findByInterviewId(interview.getId());
            }
            return assignments.stream()
                    .map(InterviewEvaluatorAssignment::getEmployeeId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toCollection(LinkedHashSet::new));
        } catch (Exception e) {
            log.debug("Error loading interviewer assignments: {}", e.getMessage());
            return Collections.emptySet();
        }
    }

    private void sendToUsers(Collection<Long> userIds, String companyRef, Long refId,
                             String category, String title, String message, String link) {
        if (userIds == null || userIds.isEmpty()) return;
        for (Long userId : userIds) {
            notifyUser(userId, companyRef, refId, category, title, message, link);
        }
    }

    private void notifyUser(Long userId, String companyRef, Long refId,
                            String category, String title, String message, String link) {
        if (userId == null) return;

        RecruitmentNotification n = new RecruitmentNotification();
        n.setCompanyRef(companyRef != null && !companyRef.isBlank() ? companyRef.trim() : resolveCompanyRef(null));
        n.setUserId(userId);
        n.setTitle(title);
        n.setMessage(message);
        n.setCategory(category);
        n.setLink(link);
        n.setRefId(refId);
        notificationRepo.save(n);
    }

    private Set<Long> findUsersWithRoleManagement(Long companyId, String companyRef) {
        Set<Long> managers = new LinkedHashSet<>();
        Long cId = resolveCompanyId(companyId);
        try {
            if (cId != null) {
                managers.addAll(userRoleRepo.findUserIdsByCompanyIdAndPermissionCode(cId, "RECRUITMENT_ROLE_ADMIN"));
            } else {
                managers.addAll(userRoleRepo.findUserIdsByPermissionCode("RECRUITMENT_ROLE_ADMIN"));
            }
        } catch (Exception e) {
            log.debug("Error querying RECRUITMENT_ROLE_ADMIN users: {}", e.getMessage());
        }

        String ref = resolveCompanyRef(companyRef);
        if (ref != null && !ref.isBlank()) {
            try {
                for (UserSummaryDTO u : employeeDirectory.findByCompanyRef(ref)) {
                    if ("ADMIN".equalsIgnoreCase(u.getRole()) || "HR_MANAGER".equalsIgnoreCase(u.getRole())) {
                        managers.add(u.getId());
                    }
                }
            } catch (Exception e) {
                log.debug("Error finding HR managers/admins: {}", e.getMessage());
            }
        }
        return managers;
    }

    private String resolveCompanyRef(String explicitRef) {
        if (explicitRef != null && !explicitRef.isBlank()) {
            return explicitRef.trim();
        }
        try {
            return authService.getCurrentCompanyRef();
        } catch (Exception e) {
            return "";
        }
    }

    private Long resolveCompanyId(Long explicitCompanyId) {
        if (explicitCompanyId != null) {
            return explicitCompanyId;
        }
        try {
            return authService.getCurrentCompanyId();
        } catch (Exception e) {
            return null;
        }
    }

    private void safely(Runnable action) {
        try {
            action.run();
        } catch (Exception e) {
            log.warn("Could not dispatch recruitment notification: {}", e.getMessage());
        }
    }
}
