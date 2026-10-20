package com.airella.hrm.repository;

import com.airella.hrm.model.JobVacancy;
import com.airella.hrm.model.VacancyStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface JobVacancyRepository extends JpaRepository<JobVacancy, Long> {

    List<JobVacancy> findByCompanyRefOrderByCreatedAtDesc(String companyRef);

    List<JobVacancy> findByCompanyRefAndStatusOrderByCreatedAtDesc(String companyRef, VacancyStatus status);

    Optional<JobVacancy> findByIdAndCompanyRef(Long id, String companyRef);

    /** Used by the auto-close job: vacancies in this status whose deadline is before the given date. */
    List<JobVacancy> findByStatusAndDeadlineBefore(VacancyStatus status, LocalDate date);
}