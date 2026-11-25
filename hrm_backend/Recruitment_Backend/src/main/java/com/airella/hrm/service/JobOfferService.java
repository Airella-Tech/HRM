
package com.airella.hrm.service;

import com.airella.hrm.dto.EligibleCandidateDTO;
import com.airella.hrm.dto.JobOfferDTO;
import com.airella.hrm.dto.JobOfferRequestDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.Interview;
import com.airella.hrm.model.InterviewEvaluation;
import com.airella.hrm.model.InterviewEvaluatorAssignment;
import com.airella.hrm.model.InterviewRoundDecision;
import com.airella.hrm.model.JobOffer;
import com.airella.hrm.model.JobOfferStatus;
import com.airella.hrm.repository.InterviewEvaluationRepository;
import com.airella.hrm.repository.InterviewEvaluatorAssignmentRepository;
import com.airella.hrm.repository.InterviewRepository;
import com.airella.hrm.repository.InterviewRoundDecisionRepository;
import com.airella.hrm.repository.JobOfferRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@Transactional
public class JobOfferService {

    private final JobOfferRepository jobOfferRepository;
    private final InterviewRepository interviewRepository;
    private final InterviewRoundDecisionRepository decisionRepository;
    private final InterviewEvaluatorAssignmentRepository assignmentRepository;
    private final InterviewEvaluationRepository evaluationRepository;
    private final AuthService authService;
    private final JavaMailSender mailSender;
    private final RecruitmentNotificationService notificationService;

    private static final List<String> INTERVIEW_ROUNDS = List.of(
            "Technical Interview",
            "HR Interview",
            "Hiring Manager Interview",
            "Final Interview"
    );

    private static final Set<String> PASSING_RECOMMENDATIONS = Set.of(
            "HIRE",
            "STRONG_HIRE"
    );

    @Autowired
    public JobOfferService(
            JobOfferRepository jobOfferRepository,
            AuthService authService,
            JavaMailSender mailSender,
            InterviewRepository interviewRepository,
            InterviewRoundDecisionRepository decisionRepository,
            InterviewEvaluatorAssignmentRepository assignmentRepository,
            InterviewEvaluationRepository evaluationRepository,
            @Autowired(required = false)
            RecruitmentNotificationService notificationService) {

        this.jobOfferRepository = jobOfferRepository;
        this.authService = authService;
        this.mailSender = mailSender;
        this.interviewRepository = interviewRepository;
        this.decisionRepository = decisionRepository;
        this.assignmentRepository = assignmentRepository;
        this.evaluationRepository = evaluationRepository;
        this.notificationService = notificationService;
    }

    // ------------------------------------------------------------
    // CREATE A NEW JOB OFFER
    // ------------------------------------------------------------

    public JobOfferDTO create(JobOfferRequestDTO request) {

        validateDates(request);

        Long companyId = authService.getCurrentCompanyId();

        // An application is mandatory for every job offer.
        if (request.applicationId() == null) {
            throw new BusinessException(
                    "An application must be selected before creating a job offer."
            );
        }

        // Prevent duplicate job offers for the same application.
        if (jobOfferRepository.existsByCompanyIdAndApplicationId(
                companyId,
                request.applicationId())) {

            throw new BusinessException(
                    "A job offer already exists for this application."
            );
        }

        // All four interview rounds must pass.
        validateJobOfferEligibility(
                companyId,
                request.applicationId()
        );

        JobOffer offer = new JobOffer();

        offer.setCompanyId(companyId);
        offer.setStatus(JobOfferStatus.DRAFT);

        applyRequest(offer, request);

        JobOffer saved = jobOfferRepository.save(offer);

        if (notificationService != null) {
            notificationService.offerCreated(saved);
        }

        return toDto(saved);
    }

    // ------------------------------------------------------------
    // GET CANDIDATES ELIGIBLE FOR JOB OFFERS
    // ------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<EligibleCandidateDTO> getEligibleCandidates() {

        Long companyId = authService.getCurrentCompanyId();

        List<Interview> interviews =
                interviewRepository
                        .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                                companyId
                        );

        // Group interviews by application ID and vacancy ID.
        Map<String, List<Interview>> groupedInterviews =
                new LinkedHashMap<>();

        for (Interview interview : interviews) {

            if (interview.getApplicationId() == null
                    || interview.getVacancyId() == null) {
                continue;
            }

            String key = interview.getApplicationId()
                    + "-" + interview.getVacancyId();

            groupedInterviews
                    .computeIfAbsent(key, k -> new ArrayList<>())
                    .add(interview);
        }

        List<EligibleCandidateDTO> eligibleCandidates =
                new ArrayList<>();

        for (List<Interview> candidateInterviews
                : groupedInterviews.values()) {

            Interview firstInterview = candidateInterviews.get(0);

            Long applicationId = firstInterview.getApplicationId();

            // Exclude applications that already have a job offer.
            boolean alreadyHasOffer =
                    jobOfferRepository.existsByCompanyIdAndApplicationId(
                            companyId,
                            applicationId
                    );

            if (alreadyHasOffer) {
                continue;
            }

            // Every one of the four rounds must pass.
            List<String> approvedRounds = new ArrayList<>();

            for (String round : INTERVIEW_ROUNDS) {

                boolean roundEligible = isRoundEligible(
                        companyId,
                        candidateInterviews,
                        round
                );

                if (roundEligible) {
                    approvedRounds.add(round);
                }
            }

            // The candidate is eligible only after all four rounds pass.
            if (approvedRounds.size() != INTERVIEW_ROUNDS.size()) {
                continue;
            }

            eligibleCandidates.add(
                    new EligibleCandidateDTO(
                            applicationId,
                            firstInterview.getVacancyId(),
                            firstInterview.getCandidateName(),
                            firstInterview.getCandidateEmail(),
                            firstInterview.getVacancyTitle(),
                            approvedRounds
                    )
            );
        }

        return eligibleCandidates;
    }

    // ------------------------------------------------------------
    // VALIDATE JOB OFFER ELIGIBILITY
    //
    // All four rounds must:
    // 1. Exist.
    // 2. Be completed.
    // 3. Have at least one assigned interviewer per interview.
    // 4. Have a submitted evaluation from every assigned interviewer.
    // 5. Have HIRE or STRONG_HIRE from every assigned interviewer.
    // 6. Have Recruitment Manager approval for every interview.
    // ------------------------------------------------------------

    private void validateJobOfferEligibility(
            Long companyId,
            Long applicationId) {

        List<Interview> candidateInterviews =
                interviewRepository
                        .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                                companyId
                        )
                        .stream()
                        .filter(interview ->
                                applicationId.equals(
                                        interview.getApplicationId()
                                )
                        )
                        .toList();

        for (String requiredRound : INTERVIEW_ROUNDS) {

            boolean roundEligible = isRoundEligible(
                    companyId,
                    candidateInterviews,
                    requiredRound
            );

            if (!roundEligible) {

                throw new BusinessException(
                        "The candidate is not eligible for a job offer. "
                                + requiredRound
                                + " must be completed, every assigned interviewer "
                                + "must submit a HIRE or STRONG_HIRE recommendation, "
                                + "and the Recruitment Manager must approve every "
                                + "interview in the round."
                );
            }
        }
    }

    // ------------------------------------------------------------
    // CHECK WHETHER EVERY INTERVIEW IN A ROUND IS ELIGIBLE
    // ------------------------------------------------------------

    private boolean isRoundEligible(
            Long companyId,
            List<Interview> candidateInterviews,
            String requiredRound) {

        List<Interview> roundInterviews = candidateInterviews.stream()
                .filter(interview ->
                        interview.getInterviewRound() != null
                                && normalizeRound(interview.getInterviewRound())
                                .equals(normalizeRound(requiredRound))
                )
                .toList();

        // The required round must have at least one interview.
        if (roundInterviews.isEmpty()) {
            return false;
        }

        // Every interview record in this round must pass.
        return roundInterviews.stream()
                .allMatch(interview ->
                        isInterviewRoundEligible(companyId, interview)
                );
    }

    // ------------------------------------------------------------
    // CHECK WHETHER ONE INTERVIEW IS FULLY ELIGIBLE
    // ------------------------------------------------------------

    private boolean isInterviewRoundEligible(
            Long companyId,
            Interview interview) {

        // The interview must be completed.
        if (interview.getStatus() == null
                || !"Completed".equalsIgnoreCase(
                interview.getStatus().trim())) {

            return false;
        }

        Long interviewId = interview.getId();

        // The Recruitment Manager must approve this interview.
        boolean managerApproved =
                decisionRepository
                        .existsByCompanyIdAndInterviewIdAndDecision(
                                companyId,
                                interviewId,
                                InterviewRoundDecision.Decision.APPROVED
                        );

        if (!managerApproved) {
            return false;
        }

        // Get every assigned interviewer.
        List<InterviewEvaluatorAssignment> assignments =
                assignmentRepository.findByCompanyIdAndInterviewId(
                        companyId,
                        interviewId
                );

        // An interview without assigned evaluators cannot pass.
        if (assignments.isEmpty()) {
            return false;
        }

        // Get all evaluations for this interview.
        List<InterviewEvaluation> evaluations =
                evaluationRepository
                        .findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
                                companyId,
                                interviewId
                        );

        // Every assigned interviewer must have a passing evaluation.
        return assignments.stream().allMatch(assignment -> {

            Long evaluatorId = assignment.getEmployeeId();

            if (evaluatorId == null) {
                return false;
            }

            return evaluations.stream().anyMatch(evaluation -> {

                if (!evaluatorId.equals(evaluation.getEvaluatorId())) {
                    return false;
                }

                if (!"SUBMITTED".equalsIgnoreCase(
                        evaluation.getStatus())) {
                    return false;
                }

                if (evaluation.getSubmittedAt() == null) {
                    return false;
                }

                String recommendation =
                        normalizeRecommendation(
                                evaluation.getRecommendation()
                        );

                return PASSING_RECOMMENDATIONS.contains(
                        recommendation
                );
            });
        });
    }

    // ------------------------------------------------------------
    // NORMALIZE INTERVIEW ROUND NAMES
    // ------------------------------------------------------------

    private String normalizeRound(String round) {

        if (round == null) {
            return "";
        }

        return round.trim()
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }

    // ------------------------------------------------------------
    // NORMALIZE EVALUATION RECOMMENDATIONS
    // ------------------------------------------------------------

    private String normalizeRecommendation(String recommendation) {

        if (recommendation == null) {
            return "";
        }

        return recommendation.trim()
                .replaceAll("[\\s-]+", "_")
                .toUpperCase(Locale.ROOT);
    }

    // ------------------------------------------------------------
    // GET JOB OFFERS BELONGING TO THE AUTHENTICATED COMPANY
    // ------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<JobOfferDTO> list(JobOfferStatus status) {

        Long companyId = authService.getCurrentCompanyId();

        List<JobOffer> offers = status == null
                ? jobOfferRepository
                .findByCompanyIdOrderByCreatedAtDesc(companyId)
                : jobOfferRepository
                .findByCompanyIdAndStatusOrderByCreatedAtDesc(
                        companyId, status
                );

        return offers.stream()
                .map(this::toDto)
                .toList();
    }

    // ------------------------------------------------------------
    // GET ONE JOB OFFER
    // ------------------------------------------------------------

    @Transactional(readOnly = true)
    public JobOfferDTO get(Long id) {
        return toDto(findOffer(id));
    }

    // ------------------------------------------------------------
    // UPDATE A DRAFT JOB OFFER
    // ------------------------------------------------------------

    public JobOfferDTO update(
            Long id,
            JobOfferRequestDTO request) {

        JobOffer offer = findOffer(id);

        if (offer.getStatus() != JobOfferStatus.DRAFT) {
            throw new BusinessException(
                    "Only draft job offers can be edited."
            );
        }

        validateDates(request);

        // An application is mandatory.
        if (request.applicationId() == null) {
            throw new BusinessException(
                    "An application must be selected before updating a job offer."
            );
        }

        // Prevent linking another offer to the same application.
        if (!request.applicationId().equals(offer.getApplicationId())
                && jobOfferRepository
                .existsByCompanyIdAndApplicationIdAndIdNot(
                        offer.getCompanyId(),
                        request.applicationId(),
                        offer.getId())) {

            throw new BusinessException(
                    "A job offer already exists for this application."
            );
        }

        // Recheck eligibility before updating.
        validateJobOfferEligibility(
                offer.getCompanyId(),
                request.applicationId()
        );

        applyRequest(offer, request);

        JobOffer saved = jobOfferRepository.save(offer);

        if (notificationService != null) {
            notificationService.offerCreated(saved);
        }

        return toDto(saved);
    }

    // ------------------------------------------------------------
    // CHANGE A JOB OFFER'S STATUS
    // ------------------------------------------------------------

    public JobOfferDTO updateStatus(
            Long id,
            JobOfferStatus newStatus) {

        if (newStatus == null) {
            throw new BusinessException(
                    "Offer status is required."
            );
        }

        JobOffer offer = findOffer(id);

        // Prevent bypassing eligibility by directly changing
        // a DRAFT offer to SENT.
        if (newStatus == JobOfferStatus.SENT) {

            if (offer.getApplicationId() == null) {
                throw new BusinessException(
                        "This job offer is not linked to an application."
                );
            }

            validateJobOfferEligibility(
                    offer.getCompanyId(),
                    offer.getApplicationId()
            );
        }

        JobOfferStatus currentStatus = offer.getStatus();

        boolean allowed = switch (currentStatus) {

            case DRAFT ->
                    newStatus == JobOfferStatus.SENT;

            case SENT, PENDING ->
                    newStatus == JobOfferStatus.PENDING
                            || newStatus == JobOfferStatus.ACCEPTED
                            || newStatus == JobOfferStatus.REJECTED
                            || newStatus == JobOfferStatus.WITHDRAWN;

            default -> false;
        };

        if (!allowed) {
            throw new BusinessException(
                    "Cannot change offer status from "
                            + currentStatus + " to "
                            + newStatus + "."
            );
        }

        JobOfferStatus prev = offer.getStatus();
        offer.setStatus(newStatus);

        JobOffer saved = jobOfferRepository.save(offer);

        if (notificationService != null) {
            notificationService.offerStatusUpdated(saved, prev);
        }

        return toDto(saved);
    }

    // ------------------------------------------------------------
    // SEND THE JOB OFFER EMAIL TO THE CANDIDATE
    // ------------------------------------------------------------

    public void sendOfferEmail(Long id) {

        JobOffer offer = findOffer(id);

        if (offer.getStatus() != JobOfferStatus.DRAFT) {
            throw new BusinessException(
                    "Only draft job offers can be emailed."
            );
        }

        // An application must be linked to the offer.
        if (offer.getApplicationId() == null) {
            throw new BusinessException(
                    "This job offer is not linked to an application."
            );
        }

        // Recheck eligibility before sending the offer.
        validateJobOfferEligibility(
                offer.getCompanyId(),
                offer.getApplicationId()
        );

        String candidateEmail = offer.getCandidateEmail();

        if (candidateEmail == null
                || candidateEmail.isBlank()) {

            throw new BusinessException(
                    "The candidate email address is missing."
            );
        }

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(candidateEmail.trim());

        message.setSubject(
                "Job Offer - " + offer.getJobTitle()
        );

        StringBuilder body = new StringBuilder();

        body.append("Dear ")
                .append(offer.getCandidateName())
                .append(",\n\n");

        body.append(
                "We are pleased to offer you the following position.\n\n"
        );

        body.append("Job Title: ")
                .append(offer.getJobTitle())
                .append("\n");

        if (offer.getDepartment() != null) {
            body.append("Department: ")
                    .append(offer.getDepartment())
                    .append("\n");
        }

        if (offer.getEmploymentType() != null) {
            body.append("Employment Type: ")
                    .append(offer.getEmploymentType())
                    .append("\n");
        }

        if (offer.getSalary() != null) {
            body.append("Salary: ")
                    .append(offer.getSalary())
                    .append("\n");
        }

        if (offer.getStartDate() != null) {
            body.append("Proposed Start Date: ")
                    .append(offer.getStartDate())
                    .append("\n");
        }

        if (offer.getExpiryDate() != null) {
            body.append("Offer Expiry Date: ")
                    .append(offer.getExpiryDate())
                    .append("\n");
        }

        if (offer.getNotes() != null
                && !offer.getNotes().isBlank()) {

            body.append("\nAdditional Information:\n")
                    .append(offer.getNotes())
                    .append("\n");
        }

        body.append(
                "\nPlease contact our recruitment team if you have any questions.\n\n"
        );

        body.append("Kind regards,\n")
                .append("Recruitment Team");

        message.setText(body.toString());

        try {
            mailSender.send(message);

        } catch (MailException ex) {

            throw new BusinessException(
                    "Unable to send the job offer email. "
                            + "Please check the email configuration and try again."
            );
        }

        // Mark the offer as SENT only after email sending succeeds.
        JobOfferStatus prev = offer.getStatus();
        offer.setStatus(JobOfferStatus.SENT);

        JobOffer saved = jobOfferRepository.save(offer);

        if (notificationService != null) {
            notificationService.offerStatusUpdated(saved, prev);
        }
    }

    // ------------------------------------------------------------
    // DELETE A DRAFT JOB OFFER
    // ------------------------------------------------------------

    public void deleteDraft(Long id) {

        JobOffer offer = findOffer(id);

        if (offer.getStatus() != JobOfferStatus.DRAFT) {
            throw new BusinessException(
                    "Only draft job offers can be deleted."
            );
        }

        jobOfferRepository.delete(offer);
    }

    // ------------------------------------------------------------
    // FIND AN OFFER BELONGING TO THE CURRENT COMPANY
    // ------------------------------------------------------------

    private JobOffer findOffer(Long id) {

        Long companyId = authService.getCurrentCompanyId();

        return jobOfferRepository
                .findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Job offer", "id", id
                        )
                );
    }

    // ------------------------------------------------------------
    // VALIDATE JOB OFFER DATES
    // ------------------------------------------------------------

    private void validateDates(JobOfferRequestDTO request) {

        if (request.startDate() != null
                && request.expiryDate() != null
                && !request.expiryDate().isBefore(
                request.startDate())) {

            throw new BusinessException(
                    "Offer expiry date must be before the start date."
            );
        }
    }

    // ------------------------------------------------------------
    // COPY REQUEST DATA TO THE ENTITY
    // ------------------------------------------------------------

    private void applyRequest(
            JobOffer offer,
            JobOfferRequestDTO request) {

        offer.setApplicationId(request.applicationId());

        offer.setCandidateName(
                request.candidateName().trim()
        );

        offer.setCandidateEmail(
                request.email().trim()
        );

        offer.setJobTitle(
                request.jobTitle().trim()
        );

        offer.setDepartment(
                clean(request.department())
        );

        offer.setEmploymentType(
                clean(request.employmentType())
        );

        offer.setSalary(request.salary());

        offer.setStartDate(request.startDate());

        offer.setExpiryDate(request.expiryDate());

        offer.setNotes(clean(request.notes()));
    }

    private String clean(String value) {

        return value == null || value.isBlank()
                ? null
                : value.trim();
    }

    // ------------------------------------------------------------
    // CONVERT ENTITY TO RESPONSE DTO
    // ------------------------------------------------------------

    private JobOfferDTO toDto(JobOffer offer) {

        return new JobOfferDTO(
                offer.getId(),
                offer.getApplicationId(),
                offer.getCandidateName(),
                offer.getCandidateEmail(),
                offer.getJobTitle(),
                offer.getDepartment(),
                offer.getEmploymentType(),
                offer.getSalary(),
                offer.getStartDate(),
                offer.getExpiryDate(),
                offer.getStatus(),
                offer.getNotes(),
                offer.getCreatedAt(),
                offer.getUpdatedAt()
        );
    }
}
