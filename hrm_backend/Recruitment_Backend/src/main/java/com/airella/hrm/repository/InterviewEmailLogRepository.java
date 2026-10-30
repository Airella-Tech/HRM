
package com.airella.hrm.repository;

import com.airella.hrm.model.InterviewEmailLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InterviewEmailLogRepository
        extends JpaRepository<InterviewEmailLog, Long> {

    List<InterviewEmailLog> findByCompanyIdOrderByCreatedAtDesc(
            Long companyId
    );

    Optional<InterviewEmailLog> findByIdAndCompanyId(
            Long id,
            Long companyId
    );

    long countByInterviewIdAndCompanyId(
            Long interviewId,
            Long companyId
    );
}
