
package com.airella.hrm.repository;

import com.airella.hrm.model.Interview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InterviewRepository extends JpaRepository<Interview, Long> {

    // Get all interviews belonging to a company.
    List<Interview> findByCompanyIdOrderByInterviewDateAscInterviewTimeAsc(
            Long companyId
    );

    // Find one interview within the current company.
    Optional<Interview> findByIdAndCompanyId(
            Long id,
            Long companyId
    );

    // Filter interviews by company and status.
    List<Interview> findByCompanyIdAndStatusOrderByInterviewDateAscInterviewTimeAsc(
            Long companyId,
            String status
    );

    // Get interviews scheduled for a specific date.
    List<Interview> findByCompanyIdAndInterviewDateOrderByInterviewTimeAsc(
            Long companyId,
            LocalDate interviewDate
    );

    // Get interviews for a particular application.
    List<Interview>
    findByCompanyIdAndApplicationIdOrderByInterviewDateDesc(
            Long companyId,
            Long applicationId
    );

    // Find interviews for the same application, vacancy, and company.
// Used to validate progression through interview rounds.
    List<Interview>
    findByCompanyIdAndApplicationIdAndVacancyIdOrderByInterviewDateAscInterviewTimeAsc(
            Long companyId,
            Long applicationId,
            Long vacancyId
    );
    // Check whether an interview exists in the company.
    boolean existsByIdAndCompanyId(
            Long id,
            Long companyId
    );
}
