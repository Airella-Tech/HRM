package com.airella.hrm.repository;

import com.airella.hrm.model.Interview;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
class InterviewRepositoryTest {

    @Autowired
    private InterviewRepository interviewRepository;

    private Interview firstInterview;
    private Interview secondInterview;
    private Interview otherCompanyInterview;

    @BeforeEach
    void setUp() {
        interviewRepository.deleteAll();

        firstInterview = createInterview(
                1L, 101L, 10L, "Candidate One", "Scheduled",
                LocalDate.of(2026, 11, 5), LocalTime.of(10, 0));

        secondInterview = createInterview(
                1L, 102L, 10L, "Candidate Two", "Completed",
                LocalDate.of(2026, 11, 5), LocalTime.of(9, 0));

        otherCompanyInterview = createInterview(
                2L, 101L, 10L, "Other Company Candidate", "Scheduled",
                LocalDate.of(2026, 11, 6), LocalTime.of(11, 0));

        firstInterview = interviewRepository.save(firstInterview);
        secondInterview = interviewRepository.save(secondInterview);
        otherCompanyInterview = interviewRepository.save(otherCompanyInterview);
    }

    @Test
    void findByCompanyIdShouldReturnOnlyCompanyInterviewsInDateAndTimeOrder() {
        List<Interview> result =
                interviewRepository
                        .findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(1L);

        assertEquals(2, result.size());
        assertEquals(secondInterview.getId(), result.get(0).getId());
        assertEquals(firstInterview.getId(), result.get(1).getId());
    }

    @Test
    void findByIdAndCompanyIdShouldReturnInterviewForCorrectCompany() {
        Optional<Interview> result =
                interviewRepository.findByIdAndCompanyId(
                        firstInterview.getId(), 1L);

        assertTrue(result.isPresent());
        assertEquals(firstInterview.getId(), result.get().getId());
    }

    @Test
    void findByIdAndCompanyIdShouldNotReturnAnotherCompanyInterview() {
        Optional<Interview> result =
                interviewRepository.findByIdAndCompanyId(
                        otherCompanyInterview.getId(), 1L);

        assertTrue(result.isEmpty());
    }

    @Test
    void findByCompanyIdAndStatusShouldReturnMatchingInterviewsInOrder() {
        List<Interview> result =
                interviewRepository
                        .findByCompanyIdAndStatusOrderByInterviewDateAscInterviewTimeAsc(
                                1L, "Scheduled");

        assertEquals(1, result.size());
        assertEquals(firstInterview.getId(), result.get(0).getId());
        assertEquals("Scheduled", result.get(0).getStatus());
    }

    @Test
    void findByCompanyIdAndInterviewDateShouldReturnMatchingInterviewsInTimeOrder() {
        List<Interview> result =
                interviewRepository
                        .findByCompanyIdAndInterviewDateOrderByInterviewTimeAsc(
                                1L, LocalDate.of(2026, 11, 5));

        assertEquals(2, result.size());
        assertEquals(secondInterview.getId(), result.get(0).getId());
        assertEquals(firstInterview.getId(), result.get(1).getId());
    }

    @Test
    void findByCompanyIdAndApplicationIdShouldReturnApplicationInterviewsNewestFirst() {
        Interview olderInterview = createInterview(
                1L, 103L, 10L, "Candidate Three", "Completed",
                LocalDate.of(2026, 10, 1), LocalTime.of(10, 0));

        Interview newerInterview = createInterview(
                1L, 103L, 10L, "Candidate Three", "Scheduled",
                LocalDate.of(2026, 11, 1), LocalTime.of(10, 0));

        olderInterview = interviewRepository.save(olderInterview);
        newerInterview = interviewRepository.save(newerInterview);

        List<Interview> result =
                interviewRepository
                        .findByCompanyIdAndApplicationIdOrderByInterviewDateDesc(
                                1L, 103L);

        assertEquals(2, result.size());
        assertEquals(newerInterview.getId(), result.get(0).getId());
        assertEquals(olderInterview.getId(), result.get(1).getId());
    }

    @Test
    void findByCompanyIdAndApplicationIdAndVacancyIdShouldReturnMatchingInterviewsInOrder() {
        Interview anotherVacancyInterview = createInterview(
                1L, 103L, 11L, "Candidate Three", "Scheduled",
                LocalDate.of(2026, 11, 4), LocalTime.of(9, 0));

        anotherVacancyInterview =
                interviewRepository.save(anotherVacancyInterview);

        List<Interview> result =
                interviewRepository
                        .findByCompanyIdAndApplicationIdAndVacancyIdOrderByInterviewDateAscInterviewTimeAsc(
                                1L, 101L, 10L);

        assertEquals(1, result.size());
        assertEquals(firstInterview.getId(), result.get(0).getId());
        assertNotEquals(
                anotherVacancyInterview.getId(),
                result.get(0).getId());
    }

    @Test
    void existsByIdAndCompanyIdShouldReturnTrueForCorrectCompany() {
        assertTrue(interviewRepository.existsByIdAndCompanyId(
                firstInterview.getId(), 1L));
    }

    @Test
    void existsByIdAndCompanyIdShouldReturnFalseForWrongCompany() {
        assertFalse(interviewRepository.existsByIdAndCompanyId(
                firstInterview.getId(), 2L));
    }

    private Interview createInterview(
            Long companyId,
            Long applicationId,
            Long vacancyId,
            String candidateName,
            String status,
            LocalDate date,
            LocalTime time) {

        Interview interview = new Interview();
        interview.setCompanyId(companyId);
        interview.setApplicationId(applicationId);
        interview.setCandidateName(candidateName);
        interview.setCandidateEmail(
                candidateName.toLowerCase().replace(" ", ".")
                        + "@example.com");
        interview.setVacancyId(vacancyId);
        interview.setVacancyTitle("Software Engineer");
        interview.setInterviewRound("Technical Interview");
        interview.setInterviewDate(date);
        interview.setInterviewTime(time);
        interview.setDurationMinutes(60);
        interview.setInterviewType("Online");
        interview.setStatus(status);
        interview.setInvitationStatus("Not sent");
        interview.setCreatedBy(100L);

        return interview;
    }
}