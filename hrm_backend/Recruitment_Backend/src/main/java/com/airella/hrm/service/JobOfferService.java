
package com.airella.hrm.service;

import com.airella.hrm.dto.EligibleCandidateDTO;
import com.airella.hrm.dto.JobOfferDTO;
import com.airella.hrm.dto.JobOfferRequestDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.Interview;
import com.airella.hrm.model.JobOffer;
import com.airella.hrm.model.JobOfferStatus;
import com.airella.hrm.repository.InterviewRepository;
import com.airella.hrm.repository.JobOfferRepository;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class JobOfferService {

    private final JobOfferRepository jobOfferRepository;
    private final InterviewRepository interviewRepository;
    private final InterviewEvaluationService interviewEvaluationService;
    private final AuthService authService;
    private final JavaMailSender mailSender;

    private static final List<String> INTERVIEW_ROUNDS = List.of(
            "Technical Interview",
            "HR Interview",
            "Hiring Manager Interview",
            "Final Interview"
    );

    public JobOfferService(
            JobOfferRepository jobOfferRepository,
            AuthService authService,
            JavaMailSender mailSender,
            InterviewRepository interviewRepository,
            InterviewEvaluationService interviewEvaluationService) {

        this.jobOfferRepository = jobOfferRepository;
        this.authService = authService;
        this.mailSender = mailSender;
        this.interviewRepository = interviewRepository;
        this.interviewEvaluationService = interviewEvaluationService;
    }

    // Create a new job offer
    public JobOfferDTO create(JobOfferRequestDTO request) {

        validateDates(request);

        Long companyId = authService.getCurrentCompanyId();

        // Prevent duplicate offers for the same application
        if (request.applicationId() != null
                && jobOfferRepository.existsByCompanyIdAndApplicationId(
                companyId,
                request.applicationId())) {

            throw new BusinessException(
                    "A job offer already exists for this application.");
        }

        JobOffer offer = new JobOffer();

        offer.setCompanyId(companyId);
        offer.setStatus(JobOfferStatus.DRAFT);

        applyRequest(offer, request);

        return toDto(jobOfferRepository.save(offer));
    }

    // Get candidates who successfully completed all four interview rounds
    @Transactional(readOnly = true)
    public List<EligibleCandidateDTO> getEligibleCandidates() {

        Long companyId = authService.getCurrentCompanyId();

        List<Interview> interviews =
                interviewRepository
                        .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                                companyId
                        );

        // Group interviews by application ID and vacancy ID
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

            List<String> completedRounds = new ArrayList<>();

            // Check whether each interview round was successfully passed
            for (String round : INTERVIEW_ROUNDS) {

                boolean passed = candidateInterviews.stream()

                        .filter(interview ->
                                interview.getInterviewRound() != null
                                        && interview.getInterviewRound()
                                        .trim()
                                        .equalsIgnoreCase(round))

                        .filter(interview ->
                                interview.getStatus() != null
                                        && interview.getStatus()
                                        .trim()
                                        .equalsIgnoreCase("Completed"))

                        .anyMatch(interview ->
                                interviewEvaluationService
                                        .hasPassingSubmittedEvaluation(
                                                interview.getId()
                                        ));

                if (passed) {
                    completedRounds.add(round);
                }
            }

            // Candidate must pass all four rounds
            if (completedRounds.size() != INTERVIEW_ROUNDS.size()) {
                continue;
            }

            // Exclude applications that already have a job offer
            boolean alreadyHasOffer =
                    jobOfferRepository.existsByCompanyIdAndApplicationId(
                            companyId,
                            firstInterview.getApplicationId()
                    );

            if (alreadyHasOffer) {
                continue;
            }

            eligibleCandidates.add(
                    new EligibleCandidateDTO(
                            firstInterview.getApplicationId(),
                            firstInterview.getVacancyId(),
                            firstInterview.getCandidateName(),
                            firstInterview.getCandidateEmail(),
                            firstInterview.getVacancyTitle(),
                            completedRounds
                    )
            );
        }

        return eligibleCandidates;
    }

    // Get job offers belonging to the authenticated company
    @Transactional(readOnly = true)
    public List<JobOfferDTO> list(JobOfferStatus status) {

        Long companyId = authService.getCurrentCompanyId();

        List<JobOffer> offers = status == null
                ? jobOfferRepository
                .findByCompanyIdOrderByCreatedAtDesc(companyId)
                : jobOfferRepository
                .findByCompanyIdAndStatusOrderByCreatedAtDesc(
                        companyId, status);

        return offers.stream()
                .map(this::toDto)
                .toList();
    }

    // Get one job offer
    @Transactional(readOnly = true)
    public JobOfferDTO get(Long id) {
        return toDto(findOffer(id));
    }

    // Update a draft job offer
    public JobOfferDTO update(
            Long id,
            JobOfferRequestDTO request) {

        JobOffer offer = findOffer(id);

        if (offer.getStatus() != JobOfferStatus.DRAFT) {
            throw new BusinessException(
                    "Only draft job offers can be edited.");
        }

        validateDates(request);

        // Prevent linking another offer to the same application
        if (request.applicationId() != null
                && !request.applicationId().equals(
                offer.getApplicationId())
                && jobOfferRepository
                .existsByCompanyIdAndApplicationIdAndIdNot(
                        offer.getCompanyId(),
                        request.applicationId(),
                        offer.getId())) {

            throw new BusinessException(
                    "A job offer already exists for this application.");
        }

        applyRequest(offer, request);

        return toDto(jobOfferRepository.save(offer));
    }

    // Change a job offer's status
    public JobOfferDTO updateStatus(
            Long id,
            JobOfferStatus newStatus) {

        if (newStatus == null) {
            throw new BusinessException(
                    "Offer status is required.");
        }

        JobOffer offer = findOffer(id);
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
                            + newStatus + ".");
        }

        offer.setStatus(newStatus);

        return toDto(jobOfferRepository.save(offer));
    }

    // Send the job offer email to the candidate
    public void sendOfferEmail(Long id) {

        JobOffer offer = findOffer(id);

        if (offer.getStatus() != JobOfferStatus.DRAFT) {
            throw new BusinessException(
                    "Only draft job offers can be emailed.");
        }

        String candidateEmail = offer.getCandidateEmail();

        if (candidateEmail == null
                || candidateEmail.isBlank()) {

            throw new BusinessException(
                    "The candidate email address is missing.");
        }

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(candidateEmail.trim());

        message.setSubject(
                "Job Offer - " + offer.getJobTitle());

        StringBuilder body = new StringBuilder();

        body.append("Dear ")
                .append(offer.getCandidateName())
                .append(",\n\n");

        body.append(
                "We are pleased to offer you the following position.\n\n");

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
                "\nPlease contact our recruitment team if you have any questions.\n\n");

        body.append("Kind regards,\n")
                .append("Recruitment Team");

        message.setText(body.toString());

        try {
            mailSender.send(message);

        } catch (MailException ex) {

            throw new BusinessException(
                    "Unable to send the job offer email. "
                            + "Please check the email configuration and try again.");
        }

        // Mark the offer as SENT only after email sending succeeds
        offer.setStatus(JobOfferStatus.SENT);

        jobOfferRepository.save(offer);
    }

    // Delete a draft job offer
    public void deleteDraft(Long id) {

        JobOffer offer = findOffer(id);

        if (offer.getStatus() != JobOfferStatus.DRAFT) {
            throw new BusinessException(
                    "Only draft job offers can be deleted.");
        }

        jobOfferRepository.delete(offer);
    }

    // Find an offer belonging to the current company
    private JobOffer findOffer(Long id) {

        Long companyId = authService.getCurrentCompanyId();

        return jobOfferRepository
                .findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Job offer", "id", id));
    }

    // Validate job offer dates
    // Offer expiry date must be before the proposed start date.
    private void validateDates(JobOfferRequestDTO request) {

        if (request.startDate() != null
                && request.expiryDate() != null
                && !request.expiryDate().isBefore(
                request.startDate())) {

            throw new BusinessException(
                    "Offer expiry date must be before the start date.");
        }
    }

    // Copy request data to the entity
    private void applyRequest(
            JobOffer offer,
            JobOfferRequestDTO request) {

        offer.setApplicationId(request.applicationId());

        offer.setCandidateName(
                request.candidateName().trim());

        offer.setCandidateEmail(
                request.email().trim());

        offer.setJobTitle(
                request.jobTitle().trim());

        offer.setDepartment(
                clean(request.department()));

        offer.setEmploymentType(
                clean(request.employmentType()));

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

    // Convert the entity to a response DTO
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
