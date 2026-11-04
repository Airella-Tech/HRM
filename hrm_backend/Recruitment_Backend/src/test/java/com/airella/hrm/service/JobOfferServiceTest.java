
package com.airella.hrm.service;

import com.airella.hrm.dto.EligibleCandidateDTO;
import com.airella.hrm.dto.JobOfferDTO;
import com.airella.hrm.dto.JobOfferRequestDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.Interview;
import com.airella.hrm.model.InterviewRoundDecision;
import com.airella.hrm.model.JobOffer;
import com.airella.hrm.model.JobOfferStatus;
import com.airella.hrm.repository.InterviewRepository;
import com.airella.hrm.repository.InterviewRoundDecisionRepository;
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
    private static final Long VACANCY_ID = 200L;

    @Mock
    private JobOfferRepository jobOfferRepository;

    @Mock
    private AuthService authService;

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private InterviewRepository interviewRepository;

    @Mock
    private InterviewRoundDecisionRepository decisionRepository;

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
    void createShouldCreateJobOfferSuccessfully() {

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
    void createShouldThrowExceptionWhenOfferAlreadyExists() {

        JobOfferRequestDTO request = createRequest(APPLICATION_ID);

        when(jobOfferRepository.existsByCompanyIdAndApplicationId(
                COMPANY_ID, APPLICATION_ID
        )).thenReturn(true);

        assertThrows(
                BusinessException.class,
                () -> jobOfferService.create(request)
        );

        verify(jobOfferRepository, never())
                .save(any(JobOffer.class));
    }

    @Test
    void createShouldAllowOfferWithoutApplicationId() {

        JobOfferRequestDTO request = createRequest(null);

        when(jobOfferRepository.save(any(JobOffer.class)))
                .thenAnswer(invocation -> {
                    JobOffer offer = invocation.getArgument(0);
                    offer.setId(OFFER_ID);
                    return offer;
                });

        JobOfferDTO result = jobOfferService.create(request);

        assertNotNull(result);
        assertNull(result.applicationId());

        verify(jobOfferRepository, never())
                .existsByCompanyIdAndApplicationId(anyLong(), anyLong());
    }

    @Test
    void createShouldRejectExpiryDateAfterStartDate() {

        JobOfferRequestDTO request = new JobOfferRequestDTO(
                APPLICATION_ID,
                "Sanduni Sewwandi",
                "sanduni@example.com",
                "Software Engineer",
                "Engineering",
                "Full-time",
                new BigDecimal("150000"),
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 11, 10),
                "Test offer"
        );

        assertThrows(
                BusinessException.class,
                () -> jobOfferService.create(request)
        );

        verify(jobOfferRepository, never())
                .save(any(JobOffer.class));
    }

    @Test
    void createShouldRejectExpiryDateEqualToStartDate() {

        LocalDate sameDate = LocalDate.of(2026, 11, 30);

        JobOfferRequestDTO request = new JobOfferRequestDTO(
                APPLICATION_ID,
                "Sanduni Sewwandi",
                "sanduni@example.com",
                "Software Engineer",
                "Engineering",
                "Full-time",
                new BigDecimal("150000"),
                sameDate,
                sameDate,
                "Test offer"
        );

        assertThrows(
                BusinessException.class,
                () -> jobOfferService.create(request)
        );

        verify(jobOfferRepository, never())
                .save(any(JobOffer.class));
    }

    @Test
    void createShouldAllowNullStartOrExpiryDate() {

        JobOfferRequestDTO request = new JobOfferRequestDTO(
                APPLICATION_ID,
                "Sanduni Sewwandi",
                "sanduni@example.com",
                "Software Engineer",
                "Engineering",
                "Full-time",
                new BigDecimal("150000"),
                null,
                LocalDate.of(2026, 11, 30),
                "Test offer"
        );

        when(jobOfferRepository.existsByCompanyIdAndApplicationId(
                COMPANY_ID, APPLICATION_ID
        )).thenReturn(false);

        when(jobOfferRepository.save(any(JobOffer.class)))
                .thenAnswer(invocation -> {
                    JobOffer offer = invocation.getArgument(0);
                    offer.setId(OFFER_ID);
                    return offer;
                });

        assertDoesNotThrow(() -> jobOfferService.create(request));
    }

    // --------------------------------------------------
    // LIST JOB OFFERS
    // --------------------------------------------------

    @Test
    void listShouldReturnAllOffersWhenStatusIsNull() {

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
    void listShouldReturnOffersFilteredByStatus() {

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

    @Test
    void listShouldReturnEmptyListWhenNoOffersExist() {

        when(jobOfferRepository.findByCompanyIdOrderByCreatedAtDesc(
                COMPANY_ID
        )).thenReturn(List.of());

        List<JobOfferDTO> result = jobOfferService.list(null);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // --------------------------------------------------
    // GET JOB OFFER
    // --------------------------------------------------

    @Test
    void getShouldReturnOfferWhenFound() {

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
    void getShouldThrowExceptionWhenOfferNotFound() {

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> jobOfferService.get(OFFER_ID)
        );
    }

    @Test
    void getShouldSearchWithinCurrentCompany() {

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> jobOfferService.get(OFFER_ID)
        );

        verify(jobOfferRepository)
                .findByIdAndCompanyId(OFFER_ID, COMPANY_ID);
    }

    // --------------------------------------------------
    // UPDATE JOB OFFER
    // --------------------------------------------------

    @Test
    void updateShouldUpdateDraftOfferSuccessfully() {

        JobOffer offer = createOffer(JobOfferStatus.DRAFT);

        JobOfferRequestDTO request = new JobOfferRequestDTO(
                APPLICATION_ID,
                "Sanduni Sewwandi",
                "sanduni.updated@example.com",
                "Senior Software Engineer",
                "Engineering",
                "Full-time",
                new BigDecimal("180000"),
                LocalDate.of(2026, 11, 30),
                LocalDate.of(2026, 11, 1),
                "Updated offer"
        );

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        when(jobOfferRepository.save(any(JobOffer.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        JobOfferDTO result = jobOfferService.update(OFFER_ID, request);

        assertEquals("Senior Software Engineer", result.jobTitle());
        assertEquals(new BigDecimal("180000"), result.salary());
        assertEquals(JobOfferStatus.DRAFT, result.status());

        verify(jobOfferRepository).save(offer);

        verify(jobOfferRepository, never())
                .existsByCompanyIdAndApplicationIdAndIdNot(
                        anyLong(), anyLong(), anyLong()
                );
    }

    @Test
    void updateShouldRejectWhenOfferIsNotDraft() {

        JobOffer offer = createOffer(JobOfferStatus.SENT);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        assertThrows(
                BusinessException.class,
                () -> jobOfferService.update(
                        OFFER_ID, createRequest(APPLICATION_ID)
                )
        );

        verify(jobOfferRepository, never())
                .save(any(JobOffer.class));
    }

    @Test
    void updateShouldRejectWhenOfferDoesNotExist() {

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> jobOfferService.update(
                        OFFER_ID, createRequest(APPLICATION_ID)
                )
        );
    }

    @Test
    void updateShouldRejectDuplicateApplicationForAnotherOffer() {

        JobOffer offer = createOffer(JobOfferStatus.DRAFT);

        Long anotherApplicationId = 300L;

        JobOfferRequestDTO request =
                createRequest(anotherApplicationId);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        when(jobOfferRepository
                .existsByCompanyIdAndApplicationIdAndIdNot(
                        COMPANY_ID,
                        anotherApplicationId,
                        OFFER_ID
                )).thenReturn(true);

        assertThrows(
                BusinessException.class,
                () -> jobOfferService.update(OFFER_ID, request)
        );

        verify(jobOfferRepository, never())
                .save(any(JobOffer.class));
    }

    @Test
    void updateShouldAllowKeepingSameApplicationId() {

        JobOffer offer = createOffer(JobOfferStatus.DRAFT);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        when(jobOfferRepository.save(any(JobOffer.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        JobOfferDTO result = jobOfferService.update(
                OFFER_ID,
                createRequest(APPLICATION_ID)
        );

        assertNotNull(result);

        verify(jobOfferRepository, never())
                .existsByCompanyIdAndApplicationIdAndIdNot(
                        anyLong(), anyLong(), anyLong()
                );
    }

    @Test
    void updateShouldRejectInvalidDates() {

        JobOffer offer = createOffer(JobOfferStatus.DRAFT);

        JobOfferRequestDTO request = new JobOfferRequestDTO(
                APPLICATION_ID,
                "Sanduni Sewwandi",
                "sanduni@example.com",
                "Software Engineer",
                "Engineering",
                "Full-time",
                new BigDecimal("150000"),
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 11, 10),
                "Invalid dates"
        );

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        assertThrows(
                BusinessException.class,
                () -> jobOfferService.update(OFFER_ID, request)
        );

        verify(jobOfferRepository, never())
                .save(any(JobOffer.class));
    }

    // --------------------------------------------------
    // UPDATE OFFER STATUS
    // --------------------------------------------------

    @Test
    void updateStatusShouldChangeDraftToSent() {

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
    void updateStatusShouldAllowSentOfferToBecomePending() {

        JobOffer offer = createOffer(JobOfferStatus.SENT);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        when(jobOfferRepository.save(any(JobOffer.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        JobOfferDTO result = jobOfferService.updateStatus(
                OFFER_ID, JobOfferStatus.PENDING
        );

        assertEquals(JobOfferStatus.PENDING, result.status());
    }

    @Test
    void updateStatusShouldAllowPendingOfferToRemainPending() {

        JobOffer offer = createOffer(JobOfferStatus.PENDING);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        when(jobOfferRepository.save(any(JobOffer.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        JobOfferDTO result = jobOfferService.updateStatus(
                OFFER_ID, JobOfferStatus.PENDING
        );

        assertEquals(JobOfferStatus.PENDING, result.status());
    }

    @Test
    void updateStatusShouldAllowSentOfferToBeAccepted() {

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
    void updateStatusShouldAllowPendingOfferToBeRejected() {

        JobOffer offer = createOffer(JobOfferStatus.PENDING);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        when(jobOfferRepository.save(any(JobOffer.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        JobOfferDTO result = jobOfferService.updateStatus(
                OFFER_ID, JobOfferStatus.REJECTED
        );

        assertEquals(JobOfferStatus.REJECTED, result.status());
    }

    @Test
    void updateStatusShouldAllowSentOfferToBeWithdrawn() {

        JobOffer offer = createOffer(JobOfferStatus.SENT);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        when(jobOfferRepository.save(any(JobOffer.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        JobOfferDTO result = jobOfferService.updateStatus(
                OFFER_ID, JobOfferStatus.WITHDRAWN
        );

        assertEquals(JobOfferStatus.WITHDRAWN, result.status());
    }

    @Test
    void updateStatusShouldRejectInvalidTransitionFromDraftToAccepted() {

        JobOffer offer = createOffer(JobOfferStatus.DRAFT);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        assertThrows(
                BusinessException.class,
                () -> jobOfferService.updateStatus(
                        OFFER_ID, JobOfferStatus.ACCEPTED
                )
        );

        verify(jobOfferRepository, never())
                .save(any(JobOffer.class));
    }

    @Test
    void updateStatusShouldRejectTransitionFromAcceptedToSent() {

        JobOffer offer = createOffer(JobOfferStatus.ACCEPTED);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        assertThrows(
                BusinessException.class,
                () -> jobOfferService.updateStatus(
                        OFFER_ID, JobOfferStatus.SENT
                )
        );

        verify(jobOfferRepository, never())
                .save(any(JobOffer.class));
    }

    @Test
    void updateStatusShouldRejectTransitionFromRejectedToPending() {

        JobOffer offer = createOffer(JobOfferStatus.REJECTED);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        assertThrows(
                BusinessException.class,
                () -> jobOfferService.updateStatus(
                        OFFER_ID, JobOfferStatus.PENDING
                )
        );
    }

    @Test
    void updateStatusShouldRejectNullStatus() {

        assertThrows(
                BusinessException.class,
                () -> jobOfferService.updateStatus(OFFER_ID, null)
        );

        verify(jobOfferRepository, never())
                .save(any(JobOffer.class));
    }

    @Test
    void updateStatusShouldRejectWhenOfferDoesNotExist() {

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> jobOfferService.updateStatus(
                        OFFER_ID, JobOfferStatus.SENT
                )
        );
    }

    // --------------------------------------------------
    // SEND OFFER EMAIL
    // --------------------------------------------------

    @Test
    void sendOfferEmailShouldSendEmailAndUpdateStatus() {

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
        assertTrue(email.getText().contains("Sanduni Sewwandi"));
        assertTrue(email.getText().contains("Engineering"));
        assertTrue(email.getText().contains("150000"));

        assertEquals(JobOfferStatus.SENT, offer.getStatus());

        verify(jobOfferRepository).save(offer);
    }

    @Test
    void sendOfferEmailShouldRejectMissingCandidateEmail() {

        JobOffer offer = createOffer(JobOfferStatus.DRAFT);
        offer.setCandidateEmail(" ");

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        assertThrows(
                BusinessException.class,
                () -> jobOfferService.sendOfferEmail(OFFER_ID)
        );

        verify(mailSender, never())
                .send(any(SimpleMailMessage.class));

        verify(jobOfferRepository, never())
                .save(any(JobOffer.class));
    }

    @Test
    void sendOfferEmailShouldRejectWhenMailSendingFails() {

        JobOffer offer = createOffer(JobOfferStatus.DRAFT);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        doThrow(new MailSendException("Mail server error"))
                .when(mailSender)
                .send(any(SimpleMailMessage.class));

        assertThrows(
                BusinessException.class,
                () -> jobOfferService.sendOfferEmail(OFFER_ID)
        );

        assertEquals(JobOfferStatus.DRAFT, offer.getStatus());

        verify(jobOfferRepository, never())
                .save(any(JobOffer.class));
    }

    @Test
    void sendOfferEmailShouldRejectNonDraftOffer() {

        JobOffer offer = createOffer(JobOfferStatus.SENT);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        assertThrows(
                BusinessException.class,
                () -> jobOfferService.sendOfferEmail(OFFER_ID)
        );

        verify(mailSender, never())
                .send(any(SimpleMailMessage.class));
    }

    @Test
    void sendOfferEmailShouldRejectWhenOfferDoesNotExist() {

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> jobOfferService.sendOfferEmail(OFFER_ID)
        );

        verify(mailSender, never())
                .send(any(SimpleMailMessage.class));
    }

    // --------------------------------------------------
    // DELETE JOB OFFER
    // --------------------------------------------------

    @Test
    void deleteDraftShouldDeleteDraftOffer() {

        JobOffer offer = createOffer(JobOfferStatus.DRAFT);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        jobOfferService.deleteDraft(OFFER_ID);

        verify(jobOfferRepository).delete(offer);
    }

    @Test
    void deleteDraftShouldRejectNonDraftOffer() {

        JobOffer offer = createOffer(JobOfferStatus.SENT);

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.of(offer));

        assertThrows(
                BusinessException.class,
                () -> jobOfferService.deleteDraft(OFFER_ID)
        );

        verify(jobOfferRepository, never())
                .delete(any(JobOffer.class));
    }

    @Test
    void deleteDraftShouldRejectWhenOfferDoesNotExist() {

        when(jobOfferRepository.findByIdAndCompanyId(
                OFFER_ID, COMPANY_ID
        )).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> jobOfferService.deleteDraft(OFFER_ID)
        );
    }

    // --------------------------------------------------
    // ELIGIBLE CANDIDATES
    // --------------------------------------------------

    @Test
    void getEligibleCandidatesShouldReturnCandidateWithAllApprovedRounds() {

        List<Interview> interviews = createCompletedInterviews();

        when(interviewRepository
                .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID
                )).thenReturn(interviews);

        when(decisionRepository
                .existsByCompanyIdAndInterviewIdAndDecision(
                        eq(COMPANY_ID),
                        anyLong(),
                        eq(InterviewRoundDecision.Decision.APPROVED)
                )).thenReturn(true);

        when(jobOfferRepository.existsByCompanyIdAndApplicationId(
                COMPANY_ID, APPLICATION_ID
        )).thenReturn(false);

        List<EligibleCandidateDTO> result =
                jobOfferService.getEligibleCandidates();

        assertEquals(1, result.size());
        assertEquals(APPLICATION_ID, result.get(0).applicationId());
        assertEquals(VACANCY_ID, result.get(0).vacancyId());
        assertEquals("Sanduni Sewwandi", result.get(0).candidateName());
        assertEquals(4, result.get(0).completedRounds().size());

        verify(decisionRepository, times(4))
                .existsByCompanyIdAndInterviewIdAndDecision(
                        eq(COMPANY_ID),
                        anyLong(),
                        eq(InterviewRoundDecision.Decision.APPROVED)
                );
    }

    @Test
    void getEligibleCandidatesShouldExcludeCandidateWithExistingOffer() {

        List<Interview> interviews = createCompletedInterviews();

        when(interviewRepository
                .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID
                )).thenReturn(interviews);

        when(decisionRepository
                .existsByCompanyIdAndInterviewIdAndDecision(
                        eq(COMPANY_ID),
                        anyLong(),
                        eq(InterviewRoundDecision.Decision.APPROVED)
                )).thenReturn(true);

        when(jobOfferRepository.existsByCompanyIdAndApplicationId(
                COMPANY_ID, APPLICATION_ID
        )).thenReturn(true);

        List<EligibleCandidateDTO> result =
                jobOfferService.getEligibleCandidates();

        assertTrue(result.isEmpty());
    }

    @Test
    void getEligibleCandidatesShouldExcludeCandidateWithMissingRound() {

        List<Interview> interviews = createCompletedInterviews();
        interviews.remove(3);

        when(interviewRepository
                .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID
                )).thenReturn(interviews);

        when(decisionRepository
                .existsByCompanyIdAndInterviewIdAndDecision(
                        eq(COMPANY_ID),
                        anyLong(),
                        eq(InterviewRoundDecision.Decision.APPROVED)
                )).thenReturn(true);

        List<EligibleCandidateDTO> result =
                jobOfferService.getEligibleCandidates();

        assertTrue(result.isEmpty());

        verify(jobOfferRepository, never())
                .existsByCompanyIdAndApplicationId(
                        anyLong(), anyLong()
                );
    }

    @Test
    void getEligibleCandidatesShouldExcludeCandidateWithoutCompletedRound() {

        List<Interview> interviews = createCompletedInterviews();

        interviews.get(1).setStatus("Scheduled");

        when(interviewRepository
                .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID
                )).thenReturn(interviews);

        when(decisionRepository
                .existsByCompanyIdAndInterviewIdAndDecision(
                        eq(COMPANY_ID),
                        anyLong(),
                        eq(InterviewRoundDecision.Decision.APPROVED)
                )).thenReturn(true);

        List<EligibleCandidateDTO> result =
                jobOfferService.getEligibleCandidates();

        assertTrue(result.isEmpty());
    }

    @Test
    void getEligibleCandidatesShouldExcludeCandidateWithoutManagerApproval() {

        List<Interview> interviews = createCompletedInterviews();

        when(interviewRepository
                .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID
                )).thenReturn(interviews);

        when(decisionRepository
                .existsByCompanyIdAndInterviewIdAndDecision(
                        COMPANY_ID,
                        1L,
                        InterviewRoundDecision.Decision.APPROVED
                )).thenReturn(false);

        when(decisionRepository
                .existsByCompanyIdAndInterviewIdAndDecision(
                        COMPANY_ID,
                        2L,
                        InterviewRoundDecision.Decision.APPROVED
                )).thenReturn(true);

        when(decisionRepository
                .existsByCompanyIdAndInterviewIdAndDecision(
                        COMPANY_ID,
                        3L,
                        InterviewRoundDecision.Decision.APPROVED
                )).thenReturn(true);

        when(decisionRepository
                .existsByCompanyIdAndInterviewIdAndDecision(
                        COMPANY_ID,
                        4L,
                        InterviewRoundDecision.Decision.APPROVED
                )).thenReturn(true);

        List<EligibleCandidateDTO> result =
                jobOfferService.getEligibleCandidates();

        assertTrue(result.isEmpty());
    }

    @Test
    void getEligibleCandidatesShouldExcludeCancelledRound() {

        List<Interview> interviews = createCompletedInterviews();

        interviews.get(2).setStatus("Cancelled");

        when(interviewRepository
                .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID
                )).thenReturn(interviews);

        when(decisionRepository
                .existsByCompanyIdAndInterviewIdAndDecision(
                        eq(COMPANY_ID),
                        anyLong(),
                        eq(InterviewRoundDecision.Decision.APPROVED)
                )).thenReturn(true);

        List<EligibleCandidateDTO> result =
                jobOfferService.getEligibleCandidates();

        assertTrue(result.isEmpty());
    }

    @Test
    void getEligibleCandidatesShouldIgnoreInterviewWithoutApplicationId() {

        Interview interview = createInterview(1L, "Technical Interview");
        interview.setApplicationId(null);

        when(interviewRepository
                .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID
                )).thenReturn(List.of(interview));

        List<EligibleCandidateDTO> result =
                jobOfferService.getEligibleCandidates();

        assertTrue(result.isEmpty());

        verifyNoInteractions(decisionRepository);
    }

    @Test
    void getEligibleCandidatesShouldIgnoreInterviewWithoutVacancyId() {

        Interview interview = createInterview(1L, "Technical Interview");
        interview.setVacancyId(null);

        when(interviewRepository
                .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID
                )).thenReturn(List.of(interview));

        List<EligibleCandidateDTO> result =
                jobOfferService.getEligibleCandidates();

        assertTrue(result.isEmpty());

        verifyNoInteractions(decisionRepository);
    }

    @Test
    void getEligibleCandidatesShouldReturnEmptyListWhenNoInterviewsExist() {

        when(interviewRepository
                .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
                        COMPANY_ID
                )).thenReturn(List.of());

        List<EligibleCandidateDTO> result =
                jobOfferService.getEligibleCandidates();

        assertNotNull(result);
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
                LocalDate.of(2026, 11, 30),
                LocalDate.of(2026, 11, 1),
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

    private Interview createInterview(Long id, String round) {

        Interview interview = new Interview();

        interview.setId(id);
        interview.setCompanyId(COMPANY_ID);
        interview.setApplicationId(APPLICATION_ID);
        interview.setVacancyId(VACANCY_ID);
        interview.setCandidateName("Sanduni Sewwandi");
        interview.setCandidateEmail("sanduni@example.com");
        interview.setVacancyTitle("Software Engineer");
        interview.setInterviewRound(round);
        interview.setStatus("Completed");

        return interview;
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
            interviews.add(createInterview(
                    (long) (i + 1),
                    rounds[i]
            ));
        }

        return interviews;
    }
}
