package com.airella.hrm.service;

import com.airella.hrm.dto.RecruitmentNotificationDTO;
import com.airella.hrm.model.CandidateApplication;
import com.airella.hrm.model.JobVacancy;
import com.airella.hrm.model.RecruitmentNotification;
import com.airella.hrm.repository.InterviewEvaluatorAssignmentRepository;
import com.airella.hrm.repository.RecruitmentNotificationRepository;
import com.airella.hrm.repository.UserRecruitmentRoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecruitmentNotificationServiceTest {

    @Mock
    private RecruitmentNotificationRepository notificationRepo;

    @Mock
    private UserRecruitmentRoleRepository userRoleRepo;

    @Mock
    private EmployeeDirectory employeeDirectory;

    @Mock
    private AuthService authService;

    @Mock
    private PermissionService permissionService;

    @Mock
    private InterviewEvaluatorAssignmentRepository assignmentRepository;

    @InjectMocks
    private RecruitmentNotificationService notificationService;

    private JobVacancy sampleVacancy;
    private CandidateApplication sampleApp;

    @BeforeEach
    void setUp() {
        sampleVacancy = new JobVacancy();
        sampleVacancy.setId(10L);
        sampleVacancy.setTitle("Senior Fullstack Engineer");
        sampleVacancy.setDepartment("Engineering");
        sampleVacancy.setCompanyRef("COMP-001");
        sampleVacancy.setCreatedBy(100L); // Vacancy Creator

        sampleApp = new CandidateApplication();
        sampleApp.setId(200L);
        sampleApp.setCandidateName("Jane Doe");
        sampleApp.setCompanyRef("COMP-001");
        sampleApp.setCompanyId(1L);
        sampleApp.setVacancy(sampleVacancy);
    }

    @Test
    @DisplayName("Candidate applied: Notifies vacancy creator and employees with APPLICATION_VIEW permission")
    void candidateApplied_NotifiesVacancyCreatorAndApplicationViewUsers() {
        when(userRoleRepo.findUserIdsByCompanyIdAndPermissionCode(1L, "APPLICATION_VIEW"))
                .thenReturn(List.of(101L, 102L));

        notificationService.candidateApplied(sampleApp, sampleVacancy);

        ArgumentCaptor<RecruitmentNotification> captor = ArgumentCaptor.forClass(RecruitmentNotification.class);
        verify(notificationRepo, atLeastOnce()).save(captor.capture());

        List<RecruitmentNotification> savedList = captor.getAllValues();
        List<Long> recipientIds = savedList.stream().map(RecruitmentNotification::getUserId).toList();

        // Must notify vacancy creator (100L) and APPLICATION_VIEW users (101L, 102L)
        assertTrue(recipientIds.contains(100L), "Vacancy creator should receive notification");
        assertTrue(recipientIds.contains(101L), "APPLICATION_VIEW user should receive notification");
        assertTrue(recipientIds.contains(102L), "APPLICATION_VIEW user should receive notification");

        RecruitmentNotification first = savedList.get(0);
        assertEquals("CANDIDATE_APPLIED", first.getCategory());
        assertEquals("/recruitment/applications", first.getLink());
    }

    @Test
    @DisplayName("Manual Candidate Shortlist: Notifies vacancy creator and INTERVIEW_SCHEDULE users, excludes actor")
    void candidateShortlisted_NotifiesVacancyCreatorAndSchedulers_ExcludesActor() {
        Long recruiterActorId = 101L;
        when(permissionService.currentUserId()).thenReturn(recruiterActorId);

        when(userRoleRepo.findUserIdsByCompanyIdAndPermissionCode(1L, "INTERVIEW_SCHEDULE"))
                .thenReturn(List.of(101L, 103L)); // 101L is actor, 103L is fellow scheduler

        notificationService.candidateShortlisted(sampleApp, sampleVacancy);

        ArgumentCaptor<RecruitmentNotification> captor = ArgumentCaptor.forClass(RecruitmentNotification.class);
        verify(notificationRepo, atLeastOnce()).save(captor.capture());

        List<RecruitmentNotification> savedList = captor.getAllValues();
        List<Long> recipientIds = savedList.stream().map(RecruitmentNotification::getUserId).toList();

        assertTrue(recipientIds.contains(100L), "Vacancy creator should receive notification");
        assertTrue(recipientIds.contains(103L), "Fellow scheduler should receive notification");
        assertFalse(recipientIds.contains(recruiterActorId),
                "Actor who shortlisted should not receive redundant self-notification");
    }

    @Test
    @DisplayName("Automated shortlisting: Generates a single batched notification with candidate count")
    void candidatesAutoShortlistedBatch_SendsSingleBatchedNotificationWithCount() {
        when(permissionService.currentUserId()).thenReturn(999L);
        lenient().when(userRoleRepo.findUserIdsByPermissionCode("INTERVIEW_SCHEDULE"))
                .thenReturn(List.of(103L));
        lenient().when(userRoleRepo.findUserIdsByCompanyIdAndPermissionCode(any(), eq("INTERVIEW_SCHEDULE")))
                .thenReturn(List.of(103L));

        notificationService.candidatesAutoShortlistedBatch(sampleVacancy, 5, 12);

        ArgumentCaptor<RecruitmentNotification> captor = ArgumentCaptor.forClass(RecruitmentNotification.class);
        verify(notificationRepo, atLeastOnce()).save(captor.capture());

        List<RecruitmentNotification> savedList = captor.getAllValues();
        assertEquals(2, savedList.size(), "Should notify vacancy creator (100L) and scheduler (103L)");

        RecruitmentNotification n = savedList.get(0);
        assertEquals("CANDIDATES_AUTO_SHORTLISTED", n.getCategory());
        assertTrue(n.getTitle().contains("5 candidates"));
        assertTrue(n.getMessage().contains("5 candidates automatically shortlisted"));
        assertTrue(n.getMessage().contains("12 evaluated"));
        assertEquals("/recruitment/shortlisted-candidates", n.getLink());
    }

    @Test
    @DisplayName("Role assigned: Notifies target user and excludes assigning manager from duplicate notifications")
    void roleAssigned_NotifiesTargetUserAndManagers_ExcludesActor() {
        Long targetEmployeeId = 205L;
        Long assigningManagerId = 301L;

        when(permissionService.currentUserId()).thenReturn(assigningManagerId);
        when(userRoleRepo.findUserIdsByCompanyIdAndPermissionCode(1L, "RECRUITMENT_ROLE_ADMIN"))
                .thenReturn(List.of(assigningManagerId, 302L));

        notificationService.roleAssigned(targetEmployeeId, "Recruitment Officer", 1L, "COMP-001");

        ArgumentCaptor<RecruitmentNotification> captor = ArgumentCaptor.forClass(RecruitmentNotification.class);
        verify(notificationRepo, atLeastOnce()).save(captor.capture());

        List<RecruitmentNotification> savedList = captor.getAllValues();
        List<Long> recipientIds = savedList.stream().map(RecruitmentNotification::getUserId).toList();

        assertTrue(recipientIds.contains(targetEmployeeId), "Assigned employee must receive notification");
        assertTrue(recipientIds.contains(302L), "Fellow manager must receive notification");
        assertFalse(recipientIds.contains(assigningManagerId),
                "Assigning manager should not receive redundant self-notification");

        RecruitmentNotification empNotification = savedList.stream()
                .filter(n -> n.getUserId().equals(targetEmployeeId))
                .findFirst()
                .orElseThrow();

        assertEquals("ROLE_ASSIGNED", empNotification.getCategory());
        assertTrue(empNotification.getMessage().contains("Recruitment Officer"));
        assertEquals("/recruitment/dashboard", empNotification.getLink());
    }

    @Test
    @DisplayName("listForCurrentUser: Retrieves top notifications for authenticated user")
    void listForCurrentUser_WhenAuthenticated_ReturnsNotifications() {
        when(permissionService.currentUserId()).thenReturn(100L);

        RecruitmentNotification n1 = new RecruitmentNotification();
        n1.setId(1L);
        n1.setTitle("Test Notification");
        n1.setMessage("Test message");
        n1.setCategory("TEST");
        n1.setLink("/test");
        n1.setSeen(false);
        n1.setCreatedAt(LocalDateTime.now());

        when(notificationRepo.findTop50ByUserIdOrderByCreatedAtDesc(100L)).thenReturn(List.of(n1));

        List<RecruitmentNotificationDTO> list = notificationService.listForCurrentUser();

        assertEquals(1, list.size());
        assertEquals("Test Notification", list.get(0).title());
        assertFalse(list.get(0).isRead());
    }

    @Test
    @DisplayName("markRead: Sets seen flag to true for specific notification")
    void markRead_MarksNotificationAsSeen() {
        when(permissionService.currentUserId()).thenReturn(100L);

        RecruitmentNotification n = new RecruitmentNotification();
        n.setId(1L);
        n.setUserId(100L);
        n.setSeen(false);

        when(notificationRepo.findByIdAndUserId(1L, 100L)).thenReturn(Optional.of(n));

        notificationService.markRead(1L);

        assertTrue(n.isSeen());
    }

    @Test
    @DisplayName("markAllRead: Invokes repository markAllRead for logged-in user")
    void markAllRead_CallsRepositoryMarkAllRead() {
        when(permissionService.currentUserId()).thenReturn(100L);

        notificationService.markAllRead();

        verify(notificationRepo, times(1)).markAllRead(100L);
    }

    @Test
    @DisplayName("Reliability: Failure in notification does not throw exception to caller")
    void safely_WhenRepositoryThrowsException_DoesNotRethrow() {
        when(notificationRepo.save(any())).thenThrow(new RuntimeException("Database error"));

        assertDoesNotThrow(() -> notificationService.roleAssigned(200L, "Interviewer", 1L, "COMP-001"));
    }
}
