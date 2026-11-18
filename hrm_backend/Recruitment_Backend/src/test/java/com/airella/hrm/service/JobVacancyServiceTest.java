package com.airella.hrm.service;

import com.airella.hrm.dto.VacancyDTO;
import com.airella.hrm.dto.VacancyRequestDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.JobVacancy;
import com.airella.hrm.model.VacancyStatus;
import com.airella.hrm.repository.CandidateApplicationRepository;
import com.airella.hrm.repository.JobVacancyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JobVacancyServiceTest {

    private static final String COMPANY_REF = "COMP-001";
    private static final Long VACANCY_ID = 10L;
    private static final Long USER_ID = 7L;

    @Mock
    private JobVacancyRepository vacancyRepo;

    @Mock
    private AuthService authService;

    @Mock
    private PermissionService permissionService;

    @Mock
    private AuditService auditService;

    @Mock
    private RecruitmentNotificationService notificationService;

    @Mock
    private CandidateApplicationRepository applicationRepo;

    @InjectMocks
    private JobVacancyService service;

    @BeforeEach
    void setUp() {
        lenient().when(authService.getCurrentCompanyRef()).thenReturn(COMPANY_REF);
        lenient().when(permissionService.currentUserId()).thenReturn(USER_ID);
        lenient().when(vacancyRepo.save(any(JobVacancy.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    // --------------------------------------------------
    // HELPERS
    // --------------------------------------------------

    private VacancyRequestDTO request(BigDecimal salaryMin, BigDecimal salaryMax) {
        return new VacancyRequestDTO(
                "  Java Developer  ",
                "Engineering",
                "Full-time",
                2,
                "Build backend services",
                "BSc in Computer Science",
                List.of("Java", " Spring ", "Java", " "),
                "Mid",
                salaryMin,
                salaryMax,
                LocalDate.now().plusDays(30));
    }

    private JobVacancy vacancy(VacancyStatus status, LocalDate deadline) {
        JobVacancy v = new JobVacancy();
        v.setId(VACANCY_ID);
        v.setCompanyRef(COMPANY_REF);
        v.setTitle("Java Developer");
        v.setDepartment("Engineering");
        v.setStatus(status);
        v.setDeadline(deadline);
        return v;
    }

    private void givenVacancy(JobVacancy v) {
        when(vacancyRepo.findByIdAndCompanyRef(VACANCY_ID, COMPANY_REF))
                .thenReturn(Optional.of(v));
    }

    // --------------------------------------------------
    // CREATE / UPDATE / DELETE
    // --------------------------------------------------

    @Test
    void createShouldSaveDraftTrimAndDeduplicateSkills() {
        VacancyDTO result = service.create(request(null, null));

        assertEquals(VacancyStatus.DRAFT, result.status());
        assertEquals("Java Developer", result.title());
        assertEquals(List.of("Java", "Spring"), result.requiredSkills());
        assertEquals(USER_ID, result.createdBy());
        verify(auditService).logAction(eq("VACANCY_CREATED"), eq("JobVacancy"), any(),
                contains("Java Developer"), eq(COMPANY_REF));
        verify(notificationService).vacancyCreated(any(JobVacancy.class));
    }

    @Test
    void createShouldRejectWhenMaxSalaryIsLowerThanMinSalary() {
        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.create(request(new BigDecimal("100000"), new BigDecimal("50000"))));

        assertEquals("Maximum salary cannot be lower than minimum salary.", ex.getMessage());
        verify(vacancyRepo, never()).save(any());
    }

    @Test
    void updateShouldChangeDraftVacancy() {
        givenVacancy(vacancy(VacancyStatus.DRAFT, LocalDate.now().plusDays(10)));

        VacancyDTO result = service.update(VACANCY_ID, request(null, null));

        assertEquals("Java Developer", result.title());
        verify(auditService).logAction(eq("VACANCY_UPDATED"), eq("JobVacancy"), eq(VACANCY_ID),
                anyString(), eq(COMPANY_REF));
    }

    @Test
    void updateShouldRejectNonDraftVacancy() {
        givenVacancy(vacancy(VacancyStatus.PUBLISHED, LocalDate.now().plusDays(10)));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.update(VACANCY_ID, request(null, null)));

        assertEquals("Only draft vacancies can be edited.", ex.getMessage());
        verify(vacancyRepo, never()).save(any());
    }

    @Test
    void getShouldThrowWhenVacancyNotFound() {
        when(vacancyRepo.findByIdAndCompanyRef(VACANCY_ID, COMPANY_REF))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.get(VACANCY_ID));
    }

    @Test
    void listShouldFilterByStatusWhenGiven() {
        when(vacancyRepo.findByCompanyRefAndStatusOrderByCreatedAtDesc(COMPANY_REF, VacancyStatus.PUBLISHED))
                .thenReturn(List.of(vacancy(VacancyStatus.PUBLISHED, LocalDate.now().plusDays(5))));

        List<VacancyDTO> result = service.list(VacancyStatus.PUBLISHED);

        assertEquals(1, result.size());
        verify(vacancyRepo, never()).findByCompanyRefOrderByCreatedAtDesc(any());
    }

    @Test
    void listShouldReturnAllWhenStatusIsNull() {
        when(vacancyRepo.findByCompanyRefOrderByCreatedAtDesc(COMPANY_REF))
                .thenReturn(List.of(vacancy(VacancyStatus.DRAFT, LocalDate.now().plusDays(5))));

        List<VacancyDTO> result = service.list(null);

        assertEquals(1, result.size());
    }

    @Test
    void deleteDraftShouldDeleteDraftVacancy() {
        JobVacancy draft = vacancy(VacancyStatus.DRAFT, LocalDate.now().plusDays(5));
        givenVacancy(draft);

        service.deleteDraft(VACANCY_ID);

        verify(vacancyRepo).delete(draft);
        verify(auditService).logAction(eq("VACANCY_DELETED"), eq("JobVacancy"), eq(VACANCY_ID),
                anyString(), eq(COMPANY_REF));
    }

    @Test
    void deleteDraftShouldRejectNonDraftVacancy() {
        givenVacancy(vacancy(VacancyStatus.APPROVED, LocalDate.now().plusDays(5)));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.deleteDraft(VACANCY_ID));

        assertEquals("Only draft vacancies can be deleted.", ex.getMessage());
        verify(vacancyRepo, never()).delete(any());
    }

    // --------------------------------------------------
    // SUBMIT FOR APPROVAL
    // --------------------------------------------------

    @Test
    void submitForApprovalShouldMoveDraftToPendingApproval() {
        JobVacancy draft = vacancy(VacancyStatus.DRAFT, LocalDate.now().plusDays(10));
        draft.setRejectionReason("Old reason");
        givenVacancy(draft);

        VacancyDTO result = service.submitForApproval(VACANCY_ID);

        assertEquals(VacancyStatus.PENDING_APPROVAL, result.status());
        assertNull(result.rejectionReason());
        verify(notificationService).vacancySubmitted(draft);
    }

    @Test
    void submitForApprovalShouldRejectWhenDeadlineHasPassed() {
        givenVacancy(vacancy(VacancyStatus.DRAFT, LocalDate.now()));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.submitForApproval(VACANCY_ID));

        assertTrue(ex.getMessage().contains("deadline has passed"));
        verify(vacancyRepo, never()).save(any());
    }

    @Test
    void submitForApprovalShouldRejectNonDraftVacancy() {
        givenVacancy(vacancy(VacancyStatus.PUBLISHED, LocalDate.now().plusDays(10)));

        assertThrows(BusinessException.class, () -> service.submitForApproval(VACANCY_ID));
    }

    // --------------------------------------------------
    // APPROVE / REJECT
    // --------------------------------------------------

    @Test
    void approveShouldMovePendingVacancyToApproved() {
        JobVacancy pending = vacancy(VacancyStatus.PENDING_APPROVAL, LocalDate.now().plusDays(10));
        givenVacancy(pending);

        VacancyDTO result = service.approve(VACANCY_ID);

        assertEquals(VacancyStatus.APPROVED, result.status());
        assertEquals(USER_ID, result.reviewedBy());
        assertNotNull(result.reviewedAt());
        verify(notificationService).vacancyApproved(pending);
    }

    @Test
    void approveShouldRejectWhenNotPendingApproval() {
        givenVacancy(vacancy(VacancyStatus.DRAFT, LocalDate.now().plusDays(10)));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.approve(VACANCY_ID));

        assertEquals("Only vacancies waiting for approval can be approved.", ex.getMessage());
        verify(notificationService, never()).vacancyApproved(any());
    }

    @Test
    void rejectShouldReturnVacancyToDraftWithTrimmedReason() {
        JobVacancy pending = vacancy(VacancyStatus.PENDING_APPROVAL, LocalDate.now().plusDays(10));
        givenVacancy(pending);

        VacancyDTO result = service.reject(VACANCY_ID, "  Fill in the details  ");

        assertEquals(VacancyStatus.DRAFT, result.status());
        assertEquals("Fill in the details", result.rejectionReason());
        assertEquals(USER_ID, result.reviewedBy());
        verify(notificationService).vacancyRejected(pending, "Fill in the details");
    }

    @Test
    void rejectShouldFailWhenNotPendingApproval() {
        givenVacancy(vacancy(VacancyStatus.APPROVED, LocalDate.now().plusDays(10)));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.reject(VACANCY_ID, "Reason"));

        assertEquals("Only vacancies waiting for approval can be rejected.", ex.getMessage());
        verify(notificationService, never()).vacancyRejected(any(), any());
    }

    // --------------------------------------------------
    // PUBLISH / CLOSE
    // --------------------------------------------------

    @Test
    void publishShouldMoveApprovedVacancyToPublished() {
        JobVacancy approved = vacancy(VacancyStatus.APPROVED, LocalDate.now().plusDays(10));
        givenVacancy(approved);

        VacancyDTO result = service.publish(VACANCY_ID);

        assertEquals(VacancyStatus.PUBLISHED, result.status());
        assertNotNull(result.publishedAt());
        verify(notificationService).vacancyPublished(approved);
    }

    @Test
    void publishShouldRejectNonApprovedVacancy() {
        givenVacancy(vacancy(VacancyStatus.DRAFT, LocalDate.now().plusDays(10)));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.publish(VACANCY_ID));

        assertEquals("Only approved vacancies can be published.", ex.getMessage());
    }

    @Test
    void publishShouldRejectWhenDeadlineIsInThePast() {
        givenVacancy(vacancy(VacancyStatus.APPROVED, LocalDate.now().minusDays(1)));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.publish(VACANCY_ID));

        assertTrue(ex.getMessage().contains("deadline has passed"));
        verify(notificationService, never()).vacancyPublished(any());
    }

    @Test
    void closeShouldMovePublishedVacancyToClosed() {
        JobVacancy published = vacancy(VacancyStatus.PUBLISHED, LocalDate.now().plusDays(10));
        givenVacancy(published);

        VacancyDTO result = service.close(VACANCY_ID);

        assertEquals(VacancyStatus.CLOSED, result.status());
        assertNotNull(result.closedAt());
        verify(notificationService).vacancyClosed(published);
    }

    @Test
    void closeShouldRejectNonPublishedVacancy() {
        givenVacancy(vacancy(VacancyStatus.APPROVED, LocalDate.now().plusDays(10)));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.close(VACANCY_ID));

        assertEquals("Only published vacancies can be closed.", ex.getMessage());
    }

    // --------------------------------------------------
    // AUTO CLOSE
    // --------------------------------------------------

    @Test
    void autoCloseExpiredShouldCloseEveryExpiredPublishedVacancy() {
        JobVacancy first = vacancy(VacancyStatus.PUBLISHED, LocalDate.now().minusDays(2));
        JobVacancy second = vacancy(VacancyStatus.PUBLISHED, LocalDate.now().minusDays(1));
        second.setId(11L);
        when(vacancyRepo.findByStatusAndDeadlineBefore(eq(VacancyStatus.PUBLISHED), any(LocalDate.class)))
                .thenReturn(List.of(first, second));

        int closed = service.autoCloseExpired();

        assertEquals(2, closed);
        assertEquals(VacancyStatus.CLOSED, first.getStatus());
        assertEquals(VacancyStatus.CLOSED, second.getStatus());
        verify(auditService, times(2)).logAction(eq("VACANCY_AUTO_CLOSED"), eq("JobVacancy"), any(),
                anyString(), eq(COMPANY_REF));
        verify(notificationService, times(2)).vacancyClosed(any(JobVacancy.class));
    }

    @Test
    void autoCloseExpiredShouldDoNothingWhenNothingExpired() {
        when(vacancyRepo.findByStatusAndDeadlineBefore(eq(VacancyStatus.PUBLISHED), any(LocalDate.class)))
                .thenReturn(List.of());

        int closed = service.autoCloseExpired();

        assertEquals(0, closed);
        verify(vacancyRepo, never()).save(any());
        verifyNoInteractions(notificationService);
    }
}