
package com.airella.hrm.service;

import com.airella.hrm.dto.InterviewDTO;
import com.airella.hrm.dto.InterviewRequestDTO;
import com.airella.hrm.dto.UserSummaryDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.Interview;
import com.airella.hrm.model.InterviewEvaluatorAssignment;
import com.airella.hrm.repository.InterviewEvaluatorAssignmentRepository;
import com.airella.hrm.repository.InterviewRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class InterviewService {

    private static final List<String> INTERVIEW_ROUNDS = List.of(
            "Technical Interview",
            "HR Interview",
            "Hiring Manager Interview",
            "Final Interview"
    );

    private final InterviewRepository interviewRepository;
    private final InterviewEvaluatorAssignmentRepository assignmentRepository;
    private final EmployeeDirectory employeeDirectory;
    private final AuthService authService;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final InterviewEmailService interviewEmailService;
    private final InterviewEvaluationService interviewEvaluationService;

    public InterviewService(
            InterviewRepository interviewRepository,
            InterviewEvaluatorAssignmentRepository assignmentRepository,
            EmployeeDirectory employeeDirectory,
            AuthService authService,
            PermissionService permissionService,
            AuditService auditService,
            InterviewEmailService interviewEmailService,
            InterviewEvaluationService interviewEvaluationService) {

        this.interviewRepository = interviewRepository;
        this.assignmentRepository = assignmentRepository;
        this.employeeDirectory = employeeDirectory;
        this.authService = authService;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.interviewEmailService = interviewEmailService;
        this.interviewEvaluationService = interviewEvaluationService;
    }

    // ------------------------------------------------------------
    // CREATE INTERVIEW
    // ------------------------------------------------------------

    public InterviewDTO create(InterviewRequestDTO request) {
        Long companyId = authService.getCurrentCompanyId();

        Interview interview = new Interview();
        interview.setCompanyId(companyId);
        interview.setCreatedBy(permissionService.currentUserId());

        apply(interview, request, companyId);
        validateRoundProgression(interview, companyId);

        interview = interviewRepository.save(interview);

        syncAssignments(interview, request, companyId);

        audit(
                "INTERVIEW_CREATED",
                interview,
                "Created interview for " + interview.getCandidateName()
        );

        try {
            interviewEmailService.sendInvitation(interview, false);
            interview = interviewRepository.save(interview);
        } catch (Exception exception) {
            interview.setInvitationStatus("Failed");
            interview = interviewRepository.save(interview);
        }

        return toDto(interview);
    }

    // ------------------------------------------------------------
    // UPDATE / RESCHEDULE INTERVIEW
    // ------------------------------------------------------------

    public InterviewDTO update(Long id, InterviewRequestDTO request) {
        Long companyId = authService.getCurrentCompanyId();
        Interview interview = find(id, companyId);

        if ("Completed".equalsIgnoreCase(interview.getStatus())
                || "Cancelled".equalsIgnoreCase(interview.getStatus())) {
            throw new BusinessException(
                    "Completed or cancelled interviews cannot be rescheduled."
            );
        }

        String originalRound = interview.getInterviewRound();

        String oldCandidateName = interview.getCandidateName();
        String oldCandidateEmail = interview.getCandidateEmail();
        String oldVacancyTitle = interview.getVacancyTitle();
        String oldInterviewRound = interview.getInterviewRound();
        LocalDate oldInterviewDate = interview.getInterviewDate();
        var oldInterviewTime = interview.getInterviewTime();
        Integer oldDuration = interview.getDurationMinutes();
        String oldInterviewerName = interview.getInterviewerName();
        String oldInterviewType = interview.getInterviewType();
        String oldMeetingLink = interview.getMeetingLink();
        String oldLocation = interview.getLocation();

        apply(interview, request, companyId);

        if (!Objects.equals(
                normalizeRound(originalRound),
                normalizeRound(interview.getInterviewRound()))) {
            throw new BusinessException(
                    "An existing interview's round cannot be changed. "
                            + "Create a separate interview for another round."
            );
        }

        validateRoundProgression(interview, companyId);

        boolean invitationDetailsChanged =
                !Objects.equals(oldCandidateName, interview.getCandidateName())
                        || !Objects.equals(oldCandidateEmail, interview.getCandidateEmail())
                        || !Objects.equals(oldVacancyTitle, interview.getVacancyTitle())
                        || !Objects.equals(oldInterviewRound, interview.getInterviewRound())
                        || !Objects.equals(oldInterviewDate, interview.getInterviewDate())
                        || !Objects.equals(oldInterviewTime, interview.getInterviewTime())
                        || !Objects.equals(oldDuration, interview.getDurationMinutes())
                        || !Objects.equals(oldInterviewerName, interview.getInterviewerName())
                        || !Objects.equals(oldInterviewType, interview.getInterviewType())
                        || !Objects.equals(oldMeetingLink, interview.getMeetingLink())
                        || !Objects.equals(oldLocation, interview.getLocation());

        interview = interviewRepository.save(interview);

        syncAssignments(interview, request, companyId);

        audit(
                "INTERVIEW_UPDATED",
                interview,
                "Updated interview for " + interview.getCandidateName()
        );

        if (invitationDetailsChanged) {
            try {
                interviewEmailService.sendInvitation(interview, true);
                interview = interviewRepository.save(interview);
            } catch (Exception exception) {
                interview.setInvitationStatus("Failed");
                interview = interviewRepository.save(interview);
            }
        }

        return toDto(interview);
    }

    // ------------------------------------------------------------
    // UPDATE INTERVIEW STATUS
    // ------------------------------------------------------------

    public InterviewDTO updateStatus(Long id, String requestedStatus) {
        Long companyId = authService.getCurrentCompanyId();
        Interview interview = find(id, companyId);

        if (requestedStatus == null || requestedStatus.isBlank()) {
            throw new BusinessException("Interview status is required.");
        }

        String newStatus;

        switch (requestedStatus.trim().toLowerCase(Locale.ROOT)) {
            case "scheduled" -> newStatus = "Scheduled";
            case "pending" -> newStatus = "Pending";
            case "in_progress", "in progress" -> newStatus = "In Progress";
            case "completed" -> newStatus = "Completed";
            case "cancelled", "canceled" -> newStatus = "Cancelled";
            default -> throw new BusinessException(
                    "Invalid interview status. Choose Scheduled, Pending, "
                            + "In Progress, Completed, or Cancelled."
            );
        }

        String currentStatus = interview.getStatus();

        if (currentStatus != null
                && (currentStatus.equalsIgnoreCase("Completed")
                || currentStatus.equalsIgnoreCase("Cancelled"))
                && !currentStatus.equalsIgnoreCase(newStatus)) {
            throw new BusinessException(
                    "A completed or cancelled interview cannot be reopened "
                            + "or changed to another status."
            );
        }

        if (!Objects.equals(currentStatus, newStatus)) {
            interview.setStatus(newStatus);
            interview = interviewRepository.save(interview);

            audit(
                    "INTERVIEW_STATUS_UPDATED",
                    interview,
                    "Interview status changed from "
                            + (currentStatus == null ? "Unknown" : currentStatus)
                            + " to " + newStatus
            );
        }

        return toDto(interview);
    }

    // ------------------------------------------------------------
    // ASSIGN / REPLACE INTERVIEWERS
    // ------------------------------------------------------------

    public InterviewDTO assignInterviewers(
            Long id,
            List<Long> employeeIds) {

        Long companyId = authService.getCurrentCompanyId();
        Interview interview = find(id, companyId);

        if ("Completed".equalsIgnoreCase(interview.getStatus())
                || "Cancelled".equalsIgnoreCase(interview.getStatus())) {
            throw new BusinessException(
                    "Interviewers cannot be reassigned to completed or cancelled interviews."
            );
        }

        if (employeeIds == null) {
            throw new BusinessException("Employee IDs are required.");
        }

        List<UserSummaryDTO> selectedUsers =
                resolveInterviewerUsers(employeeIds);

        syncAssignmentUsers(interview, selectedUsers, companyId);

        String interviewerNames = selectedUsers.stream()
                .map(UserSummaryDTO::getFullName)
                .filter(name -> name != null && !name.isBlank())
                .collect(Collectors.joining(", "));

        interview.setInterviewerName(blankToNull(interviewerNames));
        interview = interviewRepository.save(interview);

        audit(
                "INTERVIEW_INTERVIEWERS_ASSIGNED",
                interview,
                "Updated interviewer assignments for "
                        + interview.getCandidateName()
        );

        return toDto(interview);
    }

    // ------------------------------------------------------------
    // VALIDATE INTERVIEW ROUND PROGRESSION
    // Technical -> HR -> Hiring Manager -> Final
    // ------------------------------------------------------------

    private void validateRoundProgression(
            Interview interview,
            Long companyId) {

        String round = interview.getInterviewRound();
        int currentIndex = getRoundIndex(round);

        if (currentIndex == -1) {
            throw new BusinessException(
                    "Invalid interview round. Choose Technical Interview, "
                            + "HR Interview, Hiring Manager Interview, or Final Interview."
            );
        }

        // The Technical Interview is the first round.
        if (currentIndex == 0) {
            return;
        }

        if (interview.getApplicationId() == null) {
            throw new BusinessException(
                    "An application ID is required to validate interview progression."
            );
        }

        if (interview.getVacancyId() == null) {
            throw new BusinessException(
                    "A vacancy ID is required to validate interview progression."
            );
        }

        List<Interview> applicationInterviews =
                interviewRepository
                        .findByCompanyIdAndApplicationIdAndVacancyIdOrderByInterviewDateAscInterviewTimeAsc(
                                companyId,
                                interview.getApplicationId(),
                                interview.getVacancyId()
                        );

        String previousRound = INTERVIEW_ROUNDS.get(currentIndex - 1);

        List<Interview> previousRoundInterviews =
                applicationInterviews.stream()
                        .filter(existing ->
                                existing.getId() == null
                                        || !existing.getId().equals(interview.getId()))
                        .filter(existing ->
                                !"Cancelled".equalsIgnoreCase(existing.getStatus()))
                        .filter(existing ->
                                getRoundIndex(existing.getInterviewRound())
                                        == currentIndex - 1)
                        .toList();

        if (previousRoundInterviews.isEmpty()) {
            throw new BusinessException(
                    "The candidate must have a " + previousRound
                            + " interview before the " + round
                            + " can be scheduled."
            );
        }

        boolean passedPreviousRound =
                previousRoundInterviews.stream()
                        .anyMatch(previousInterview ->
                                "Completed".equalsIgnoreCase(
                                        previousInterview.getStatus())
                                        && interviewEvaluationService
                                        .hasPassingSubmittedEvaluation(
                                                previousInterview.getId()
                                        ));

        if (!passedPreviousRound) {
            throw new BusinessException(
                    "The candidate cannot proceed to " + round
                            + ". The " + previousRound
                            + " must be completed and have a submitted "
                            + "HIRE or STRONG_HIRE evaluation."
            );
        }
    }

    private int getRoundIndex(String round) {
        if (round == null || round.isBlank()) {
            return -1;
        }

        String normalized = normalizeRound(round);

        return switch (normalized) {
            case "technical", "technical interview" -> 0;
            case "hr", "hr interview" -> 1;
            case "hiring manager", "hiring manager interview" -> 2;
            case "final", "final interview" -> 3;
            default -> -1;
        };
    }

    private String normalizeRound(String round) {
        if (round == null) {
            return null;
        }

        return round.trim()
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }

    // ------------------------------------------------------------
    // GET SINGLE INTERVIEW
    // ------------------------------------------------------------

    @Transactional(readOnly = true)
    public InterviewDTO get(Long id) {
        Long companyId = authService.getCurrentCompanyId();
        return toDto(find(id, companyId));
    }

    // ------------------------------------------------------------
    // LIST ALL COMPANY INTERVIEWS
    // ------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<InterviewDTO> list(String status, LocalDate date) {
        Long companyId = authService.getCurrentCompanyId();

        return interviewRepository
                .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(companyId)
                .stream()
                .filter(interview ->
                        status == null
                                || status.isBlank()
                                || (interview.getStatus() != null
                                && interview.getStatus().equalsIgnoreCase(
                                status.trim())))
                .filter(interview ->
                        date == null
                                || (interview.getInterviewDate() != null
                                && interview.getInterviewDate().equals(date)))
                .map(this::toDto)
                .toList();
    }

    // ------------------------------------------------------------
    // GET INTERVIEWS ASSIGNED TO THE CURRENT INTERVIEWER
    // ------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<InterviewDTO> getMyAssignedInterviews() {
        Long companyId = authService.getCurrentCompanyId();
        Long employeeId = permissionService.currentUserId();

        if (employeeId == null) {
            throw new BusinessException(
                    "Unable to identify the logged-in employee."
            );
        }

        return assignmentRepository
                .findByCompanyIdAndEmployeeId(companyId, employeeId)
                .stream()
                .map(InterviewEvaluatorAssignment::getInterviewId)
                .filter(Objects::nonNull)
                .distinct()
                .map(id -> interviewRepository
                        .findByIdAndCompanyId(id, companyId)
                        .orElse(null))
                .filter(Objects::nonNull)
                .map(this::toDto)
                .toList();
    }

    // ------------------------------------------------------------
    // DELETE INTERVIEW
    // ------------------------------------------------------------

    public void delete(Long id) {
        Long companyId = authService.getCurrentCompanyId();
        Interview interview = find(id, companyId);

        if ("Completed".equalsIgnoreCase(interview.getStatus())) {
            throw new BusinessException(
                    "Completed interviews cannot be deleted."
            );
        }

        audit(
                "INTERVIEW_DELETED",
                interview,
                "Deleted interview for " + interview.getCandidateName()
        );

        assignmentRepository.deleteByCompanyIdAndInterviewId(companyId, id);
        interviewRepository.delete(interview);
    }

    // ------------------------------------------------------------
    // APPLY AND VALIDATE INTERVIEW DETAILS
    // ------------------------------------------------------------

    private void apply(
            Interview interview,
            InterviewRequestDTO request,
            Long companyId) {

        if (request == null) {
            throw new BusinessException("Interview details are required.");
        }

        requireText(request.candidateName(), "Candidate name");
        requireText(request.candidateEmail(), "Candidate email");
        requireText(request.vacancyTitle(), "Vacancy title");
        requireText(request.interviewRound(), "Interview round");
        requireText(request.interviewType(), "Interview type");

        if (request.interviewDate() == null) {
            throw new BusinessException("Interview date is required.");
        }

        if (request.interviewTime() == null) {
            throw new BusinessException("Interview time is required.");
        }

        String email = request.candidateEmail().trim();

        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new BusinessException(
                    "Enter a valid candidate email address."
            );
        }

        int duration = request.durationMinutes() == null
                ? 60
                : request.durationMinutes();

        if (duration <= 0 || duration > 480) {
            throw new BusinessException(
                    "Interview duration must be between 1 and 480 minutes."
            );
        }

        String type = request.interviewType().trim();

        if (!type.equalsIgnoreCase("Online")
                && !type.equalsIgnoreCase("Physical")) {
            throw new BusinessException(
                    "Interview type must be Online or Physical."
            );
        }

        String interviewerName = blankToNull(request.interviewerName());

        if (request.interviewerIds() != null) {
            List<UserSummaryDTO> selectedUsers =
                    resolveInterviewerUsers(request.interviewerIds());

            interviewerName = selectedUsers.stream()
                    .map(UserSummaryDTO::getFullName)
                    .filter(name -> name != null && !name.isBlank())
                    .collect(Collectors.joining(", "));

            interviewerName = blankToNull(interviewerName);
        }

        // Use the application ID rather than a separate candidate ID.
        interview.setApplicationId(request.applicationId());
        interview.setCandidateName(request.candidateName().trim());
        interview.setCandidateEmail(email);
        interview.setVacancyId(request.vacancyId());
        interview.setVacancyTitle(request.vacancyTitle().trim());
        interview.setInterviewRound(request.interviewRound().trim());
        interview.setInterviewDate(request.interviewDate());
        interview.setInterviewTime(request.interviewTime());
        interview.setDurationMinutes(duration);
        interview.setInterviewerName(interviewerName);
        interview.setInterviewType(
                type.equalsIgnoreCase("online") ? "Online" : "Physical"
        );
        interview.setMeetingLink(blankToNull(request.meetingLink()));
        interview.setLocation(blankToNull(request.location()));
        interview.setNotes(blankToNull(request.notes()));

        if (interview.getStatus() == null
                || interview.getStatus().isBlank()) {
            interview.setStatus("Scheduled");
        }

        if (interview.getInvitationStatus() == null
                || interview.getInvitationStatus().isBlank()) {
            interview.setInvitationStatus("Not sent");
        }
    }

    // ------------------------------------------------------------
    // RESOLVE AND VALIDATE INTERVIEWERS
    // ------------------------------------------------------------

    private List<UserSummaryDTO> resolveInterviewerUsers(
            List<Long> requestedIds) {

        if (requestedIds == null) {
            return List.of();
        }

        List<Long> ids = requestedIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (ids.size() != requestedIds.size()) {
            throw new BusinessException(
                    "Interviewer IDs must be valid and unique."
            );
        }

        if (ids.isEmpty()) {
            return List.of();
        }

        String companyRef = authService.getCurrentCompanyRef();

        List<UserSummaryDTO> companyUsers =
                employeeDirectory.findByCompanyRef(companyRef);

        Map<Long, UserSummaryDTO> usersById = new LinkedHashMap<>();

        for (UserSummaryDTO user : companyUsers) {
            if (user.getId() != null) {
                usersById.put(user.getId(), user);
            }
        }

        List<UserSummaryDTO> selectedUsers = new ArrayList<>();

        for (Long id : ids) {
            UserSummaryDTO user = usersById.get(id);

            if (user == null) {
                throw new BusinessException(
                        "One or more selected interviewers do not belong to your company."
                );
            }

            if (user.getFullName() == null || user.getFullName().isBlank()) {
                throw new BusinessException(
                        "A selected interviewer does not have a valid display name."
                );
            }

            selectedUsers.add(user);
        }

        return selectedUsers;
    }

    // ------------------------------------------------------------
    // SYNCHRONIZE INTERVIEWER ASSIGNMENTS
    // ------------------------------------------------------------

    private void syncAssignmentUsers(
            Interview interview,
            List<UserSummaryDTO> selectedUsers,
            Long companyId) {

        List<InterviewEvaluatorAssignment> existingAssignments =
                assignmentRepository.findByCompanyIdAndInterviewId(
                        companyId,
                        interview.getId()
                );

        Set<Long> selectedIds = selectedUsers.stream()
                .map(UserSummaryDTO::getId)
                .collect(Collectors.toSet());

        Set<Long> existingIds = existingAssignments.stream()
                .map(InterviewEvaluatorAssignment::getEmployeeId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<InterviewEvaluatorAssignment> assignmentsToRemove =
                existingAssignments.stream()
                        .filter(assignment ->
                                !selectedIds.contains(
                                        assignment.getEmployeeId()))
                        .toList();

        if (!assignmentsToRemove.isEmpty()) {
            assignmentRepository.deleteAll(assignmentsToRemove);
            assignmentRepository.flush();
        }

        Long assignedBy = permissionService.currentUserId();

        for (UserSummaryDTO user : selectedUsers) {
            if (!existingIds.contains(user.getId())) {
                assignmentRepository.save(
                        new InterviewEvaluatorAssignment(
                                companyId,
                                interview.getId(),
                                user.getId(),
                                assignedBy
                        )
                );
            }
        }
    }

    private void syncAssignments(
            Interview interview,
            InterviewRequestDTO request,
            Long companyId) {

        if (request.interviewerIds() == null) {
            return;
        }

        List<UserSummaryDTO> selectedUsers =
                resolveInterviewerUsers(request.interviewerIds());

        syncAssignmentUsers(interview, selectedUsers, companyId);
    }

    // ------------------------------------------------------------
    // FIND INTERVIEW WITH COMPANY ISOLATION
    // ------------------------------------------------------------

    private Interview find(Long id, Long companyId) {
        return interviewRepository.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Interview",
                                "id",
                                id
                        )
                );
    }

    // ------------------------------------------------------------
    // VALIDATION / HELPER METHODS
    // ------------------------------------------------------------

    private void requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(field + " is required.");
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank()
                ? null
                : value.trim();
    }

    // ------------------------------------------------------------
    // MAP INTERVIEW ENTITY TO DTO
    // ------------------------------------------------------------

    private InterviewDTO toDto(Interview interview) {
        List<Long> interviewerIds =
                assignmentRepository.findByCompanyIdAndInterviewId(
                                interview.getCompanyId(),
                                interview.getId()
                        )
                        .stream()
                        .map(InterviewEvaluatorAssignment::getEmployeeId)
                        .filter(Objects::nonNull)
                        .distinct()
                        .toList();

        return new InterviewDTO(
                interview.getId(),
                interview.getApplicationId(),
                interview.getCandidateName(),
                interview.getCandidateEmail(),
                interview.getVacancyId(),
                interview.getVacancyTitle(),
                interview.getInterviewRound(),
                interview.getInterviewDate(),
                interview.getInterviewTime(),
                interview.getDurationMinutes(),
                interview.getInterviewerName(),
                interview.getInterviewType(),
                interview.getMeetingLink(),
                interview.getLocation(),
                interview.getStatus(),
                interview.getInvitationStatus(),
                interview.getNotes(),
                interview.getCreatedBy(),
                interview.getCreatedAt(),
                interview.getUpdatedAt(),
                interviewerIds
        );
    }

    // ------------------------------------------------------------
    // AUDIT LOGGING
    // ------------------------------------------------------------

    private void audit(
            String action,
            Interview interview,
            String description) {

        try {
            auditService.logAction(
                    action,
                    "Interview",
                    interview.getId(),
                    description,
                    authService.getCurrentCompanyRef()
            );
        } catch (Exception ignored) {
            // Audit failure should not prevent the interview operation.
        }
    }
}
