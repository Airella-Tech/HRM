
package com.airella.hrm.service;

import com.airella.hrm.dto.EligibleCandidateDTO;
import com.airella.hrm.dto.JobOfferDTO;
import com.airella.hrm.dto.JobOfferRequestDTO;
import com.airella.hrm.model.Interview;
import com.airella.hrm.model.JobOffer;
import com.airella.hrm.model.JobOfferStatus;
import com.airella.hrm.repository.InterviewRepository;
import com.airella.hrm.repository.JobOfferRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JobOfferServiceTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long OFFER_ID = 10L;
    private static final Long APPLICATION_ID = 100L;

    @Mock
    private JobOfferRepository jobOfferRepository;

    @Mock
    private AuthService authService;

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private InterviewRepository interviewRepository;

    @Mock
    private InterviewEvaluationService interviewEvaluationService;

    @InjectMocks
    private JobOfferService jobOfferService;

    @BeforeEach
    void setUp() {
        lenient().when(authService.getCurrentCompanyId())
                .thenReturn(COMPANY_ID);
    }

    // --------------------------------------------------
    // CREATE JOB OFFER
    // --------------------------------------------------

    @Test
    void create_shouldCreateJobOfferSuccessfully() {

        JobOfferRequestDTO request = createRequest(APPLICATION_ID);

        when(jobOfferRepository.existsByCompanyIdAndApplicationId(
                COMPANY_ID, APPLICATION_ID
        )).thenReturn(false);

        when(jobOfferRepository.save(any(JobOffer.class)))
                .thenAnswer(invocation -> {
                    JobOffer offer = invocation.getArgument(0);
                    offer.setId(OFFER_ID);
                    return offer;
                });

        JobOfferDTO result = jobOfferService.create(request);

        assertNotNull(result);
        assertEquals(OFFER_ID, result.id());
        assertEquals(APPLICATION_ID, result.applicationId());
        assertEquals("Sanduni Sewwandi", result.candidateName());
        assertEquals("Software Engineer", result.jobTitle());
        assertEquals(JobOfferStatus.DRAFT, result.status());

        verify(jobOfferRepository).save(any(JobOffer.class));
    }

    @Test
    void create_shouldThrowExceptionWhenOfferAlreadyExists() {

        JobOfferRequestDTO request = createRequest(APPLICATION_ID);

        when(jobOfferRepository.existsByCompanyIdAndApplicationId(
                COMPANY_ID, APPLICATION_ID
        )).thenReturn(true);

        assertThrows(
                RuntimeException.class,
                () -> jobOfferService.create(request)
        );

        verify(jobOfferRepository, never()).save(any(JobOffer.class));
    }

    @Test
    void create_shouldThrowExceptionWhenExpiryDateIsAfterStartDate() {

        JobOfferRequestDTO request = new JobOfferRequestDTO(
                APPLICATION_ID,
                "Sanduni Sewwandi",
                "sanduni@example.com",
                "Software Engineer",
                "Engineering",
                "Full-time",
                new BigDecimal("150000"),
                LocalDate.of(2026, 11, 1),  // Start date
                LocalDate.of(2026, 11, 10), // Expiry date
                "Test offer"
        );

        assertThrows(
                RuntimeException.class,
                () -> jobOfferService.create(request)
        );

        verify(jobOfferRepository, never()).save(any(JobOffer.class));
    }

    // --------------------------------------------------
    // LIST JOB OFFERS
    // --------------------------------------------------

    @Test
    void list_shouldReturnAllOffersWhenStatusIsNull() {

        JobOffer offer = createOffer(JobOfferStatus.DRAFT);

        when(jobOfferRepository.findByCompanyIdOrderByCreatedAtDesc(
                COMPANY_ID
        )).thenReturn(List.of(offer));

        List<JobOfferDTO> result = jobOfferService.list(null);

        assertEquals(1, result.size());
        assertEquals("Sanduni Sewwandi", result.get(0).candidateName());

        verify(jobOfferRepository)
                .findByCompanyIdOrderByCreatedAtDesc(COMPANY_ID);
    }

    @Test
    void list_shouldReturnOffersFilteredByStatus() {

        JobOffer offer = createOffer(JobOfferStatus.SENT);

        when(jobOfferRepository.findByCompanyIdAndStatusOrderByCreatedAtDesc(
                COMPANY_ID, JobOfferStatus.SENT
        )).thenReturn(List.of(offer));

        List<JobOfferDTO> result =
                jobOfferService.list(JobOfferStatus.SENT);

        assertEquals(1, result.size());
        assertEquals(JobOfferStatus.SENT, result.get(0).status());

        verify(jobOfferRepository)
                .findByCompanyIdAndStatusOrderByCreatedAtDesc(
                        COMPANY_ID, JobOfferStatus.SENT
                );
    }

    // --------------------------------------------------
    // GET JOB OFFER
    // --------------------------------------------------

    @Test
    void get_shouldReturnOfferWhenFound() {

        JobOffer offer = createOffer(JobOfferStatus.DRAFT);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        JobOfferDTO result = jobOfferService.get(OFFER_ID);

        assertNotNull(result);
        assertEquals(OFFER_ID, result.id());
        assertEquals("Software Engineer", result.jobTitle());
    }

    @Test
    void get_shouldThrowExceptionWhenOfferNotFound() {

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.empty());

        assertThrows(
                RuntimeException.class,
                () -> jobOfferService.get(OFFER_ID)
        );
    }

    // --------------------------------------------------
    // UPDATE JOB OFFER
    // --------------------------------------------------

    @Test
    void update_shouldUpdateDraftOfferSuccessfully() {

        JobOffer offer = createOffer(JobOfferStatus.DRAFT);

        JobOfferRequestDTO request = new JobOfferRequestDTO(
                APPLICATION_ID,
                "Sanduni Sewwandi",
                "sanduni.updated@example.com",
                "Senior Software Engineer",
                "Engineering",
                "Full-time",
                new BigDecimal("180000"),
                LocalDate.of(2026, 11, 30), // Start date
                LocalDate.of(2026, 11, 1),  // Expiry date
                "Updated offer"
        );

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        when(jobOfferRepository.save(any(JobOffer.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        JobOfferDTO result = jobOfferService.update(OFFER_ID, request);

        assertEquals("Senior Software Engineer", result.jobTitle());
        assertEquals("sanduni.updated@example.com", result.email());
        assertEquals(new BigDecimal("180000"), result.salary());
        assertEquals(JobOfferStatus.DRAFT, result.status());

        verify(jobOfferRepository).save(offer);
    }

    @Test
    void update_shouldThrowExceptionWhenOfferIsNotDraft() {

        JobOffer offer = createOffer(JobOfferStatus.SENT);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        assertThrows(
                RuntimeException.class,
                () -> jobOfferService.update(
                        OFFER_ID, createRequest(APPLICATION_ID)
                )
        );

        verify(jobOfferRepository, never()).save(any(JobOffer.class));
    }

    // --------------------------------------------------
    // UPDATE OFFER STATUS
    // --------------------------------------------------

    @Test
    void updateStatus_shouldChangeDraftToSent() {

        JobOffer offer = createOffer(JobOfferStatus.DRAFT);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        when(jobOfferRepository.save(any(JobOffer.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        JobOfferDTO result = jobOfferService.updateStatus(
                OFFER_ID, JobOfferStatus.SENT
        );

        assertEquals(JobOfferStatus.SENT, result.status());

        verify(jobOfferRepository).save(offer);
    }

    @Test
    void updateStatus_shouldAllowSentOfferToBeAccepted() {

        JobOffer offer = createOffer(JobOfferStatus.SENT);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        when(jobOfferRepository.save(any(JobOffer.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        JobOfferDTO result = jobOfferService.updateStatus(
                OFFER_ID, JobOfferStatus.ACCEPTED
        );

        assertEquals(JobOfferStatus.ACCEPTED, result.status());
    }

    @Test
    void updateStatus_shouldThrowExceptionForInvalidTransition() {

        JobOffer offer = createOffer(JobOfferStatus.ACCEPTED);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        assertThrows(
                RuntimeException.class,
                () -> jobOfferService.updateStatus(
                        OFFER_ID, JobOfferStatus.SENT
                )
        );

        verify(jobOfferRepository, never()).save(any(JobOffer.class));
    }

    @Test
    void updateStatus_shouldThrowExceptionWhenStatusIsNull() {

        assertThrows(
                RuntimeException.class,
                () -> jobOfferService.updateStatus(OFFER_ID, null)
        );

        verify(jobOfferRepository, never()).save(any(JobOffer.class));
    }

    // --------------------------------------------------
    // SEND OFFER EMAIL
    // --------------------------------------------------

    @Test
    void sendOfferEmail_shouldSendEmailAndUpdateStatus() {

        JobOffer offer = createOffer(JobOfferStatus.DRAFT);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        when(jobOfferRepository.save(any(JobOffer.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        jobOfferService.sendOfferEmail(OFFER_ID);

        ArgumentCaptor<SimpleMailMessage> captor =
                ArgumentCaptor.forClass(SimpleMailMessage.class);

        verify(mailSender).send(captor.capture());

        SimpleMailMessage email = captor.getValue();

        assertArrayEquals(
                new String[]{"sanduni@example.com"},
                email.getTo()
        );

        assertTrue(email.getSubject().contains("Software Engineer"));
        assertEquals(JobOfferStatus.SENT, offer.getStatus());

        verify(jobOfferRepository).save(offer);
    }

    @Test
    void sendOfferEmail_shouldThrowExceptionWhenEmailIsMissing() {

        JobOffer offer = createOffer(JobOfferStatus.DRAFT);
        offer.setCandidateEmail(" ");

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        assertThrows(
                RuntimeException.class,
                () -> jobOfferService.sendOfferEmail(OFFER_ID)
        );

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
        verify(jobOfferRepository, never()).save(any(JobOffer.class));
    }

    @Test
    void sendOfferEmail_shouldThrowExceptionWhenMailSendingFails() {

        JobOffer offer = createOffer(JobOfferStatus.DRAFT);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        doThrow(new MailSendException("Mail server error"))
                .when(mailSender)
                .send(any(SimpleMailMessage.class));

        assertThrows(
                RuntimeException.class,
                () -> jobOfferService.sendOfferEmail(OFFER_ID)
        );

        assertEquals(JobOfferStatus.DRAFT, offer.getStatus());

        verify(jobOfferRepository, never()).save(any(JobOffer.class));
    }

    @Test
    void sendOfferEmail_shouldNotSendEmailForNonDraftOffer() {

        JobOffer offer = createOffer(JobOfferStatus.SENT);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        assertThrows(
                RuntimeException.class,
                () -> jobOfferService.sendOfferEmail(OFFER_ID)
        );

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    // --------------------------------------------------
    // DELETE JOB OFFER
    // --------------------------------------------------

    @Test
    void deleteDraft_shouldDeleteDraftOffer() {

        JobOffer offer = createOffer(JobOfferStatus.DRAFT);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        jobOfferService.deleteDraft(OFFER_ID);

        verify(jobOfferRepository).delete(offer);
    }

    @Test
    void deleteDraft_shouldThrowExceptionWhenOfferIsNotDraft() {

        JobOffer offer = createOffer(JobOfferStatus.SENT);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        assertThrows(
                RuntimeException.class,
                () -> jobOfferService.deleteDraft(OFFER_ID)
        );

        verify(jobOfferRepository, never()).delete(any(JobOffer.class));
    }

    // --------------------------------------------------
    // ELIGIBLE CANDIDATES
    // --------------------------------------------------

    @Test
    void getEligibleCandidates_shouldReturnCandidateWithAllFourPassedRounds() {

        List<Interview> interviews = createCompletedInterviews();

        when(interviewRepository
                .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID
                )).thenReturn(interviews);

        when(interviewEvaluationService.hasPassingSubmittedEvaluation(
                anyLong()
        )).thenReturn(true);

        when(jobOfferRepository.existsByCompanyIdAndApplicationId(
                COMPANY_ID, APPLICATION_ID
        )).thenReturn(false);

        List<EligibleCandidateDTO> result =
                jobOfferService.getEligibleCandidates();

        assertEquals(1, result.size());
        assertEquals(APPLICATION_ID, result.get(0).applicationId());
        assertEquals(4, result.get(0).completedRounds().size());

        verify(interviewEvaluationService, times(4))
                .hasPassingSubmittedEvaluation(anyLong());
    }

    @Test
    void getEligibleCandidates_shouldExcludeCandidateWithExistingOffer() {

        List<Interview> interviews = createCompletedInterviews();

        when(interviewRepository
                .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID
                )).thenReturn(interviews);

        when(interviewEvaluationService.hasPassingSubmittedEvaluation(
                anyLong()
        )).thenReturn(true);

        when(jobOfferRepository.existsByCompanyIdAndApplicationId(
                COMPANY_ID, APPLICATION_ID
        )).thenReturn(true);

        List<EligibleCandidateDTO> result =
                jobOfferService.getEligibleCandidates();

        assertTrue(result.isEmpty());
    }

    @Test
    void getEligibleCandidates_shouldExcludeCandidateWithMissingInterviewRound() {

        List<Interview> interviews = createCompletedInterviews();
        interviews.remove(3);

        when(interviewRepository
                .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID
                )).thenReturn(interviews);

        when(interviewEvaluationService.hasPassingSubmittedEvaluation(
                anyLong()
        )).thenReturn(true);

        List<EligibleCandidateDTO> result =
                jobOfferService.getEligibleCandidates();

        assertTrue(result.isEmpty());
    }

    @Test
    void getEligibleCandidates_shouldExcludeCandidateWithoutPassingEvaluation() {

        List<Interview> interviews = createCompletedInterviews();

        when(interviewRepository
                .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID
                )).thenReturn(interviews);

        when(interviewEvaluationService.hasPassingSubmittedEvaluation(
                anyLong()
        )).thenReturn(false);

        List<EligibleCandidateDTO> result =
                jobOfferService.getEligibleCandidates();

        assertTrue(result.isEmpty());
    }

    // --------------------------------------------------
    // TEST DATA HELPERS
    // --------------------------------------------------

    private JobOfferRequestDTO createRequest(Long applicationId) {

        return new JobOfferRequestDTO(
                applicationId,
                "Sanduni Sewwandi",
                "sanduni@example.com",
                "Software Engineer",
                "Engineering",
                "Full-time",
                new BigDecimal("150000"),
                LocalDate.of(2026, 11, 30), // Start date
                LocalDate.of(2026, 11, 1),  // Expiry date
                "Welcome to our team."
        );
    }

    private JobOffer createOffer(JobOfferStatus status) {

        JobOffer offer = new JobOffer();

        offer.setId(OFFER_ID);
        offer.setCompanyId(COMPANY_ID);
        offer.setApplicationId(APPLICATION_ID);
        offer.setCandidateName("Sanduni Sewwandi");
        offer.setCandidateEmail("sanduni@example.com");
        offer.setJobTitle("Software Engineer");
        offer.setDepartment("Engineering");
        offer.setEmploymentType("Full-time");
        offer.setSalary(new BigDecimal("150000"));
        offer.setStartDate(LocalDate.of(2026, 11, 30));
        offer.setExpiryDate(LocalDate.of(2026, 11, 1));
        offer.setStatus(status);
        offer.setNotes("Welcome to our team.");

        return offer;
    }

    private List<Interview> createCompletedInterviews() {

        String[] rounds = {
                "Technical Interview",
                "HR Interview",
                "Hiring Manager Interview",
                "Final Interview"
        };

        List<Interview> interviews = new ArrayList<>();

        for (int i = 0; i < rounds.length; i++) {

            Interview interview = new Interview();

            interview.setId((long) (i + 1));
            interview.setCompanyId(COMPANY_ID);
            interview.setApplicationId(APPLICATION_ID);
            interview.setVacancyId(200L);
            interview.setCandidateName("Sanduni Sewwandi");
            interview.setCandidateEmail("sanduni@example.com");
            interview.setVacancyTitle("Software Engineer");
            interview.setInterviewRound(rounds[i]);
            interview.setStatus("Completed");

            interviews.add(interview);
        }

        return interviews;
    }
}
