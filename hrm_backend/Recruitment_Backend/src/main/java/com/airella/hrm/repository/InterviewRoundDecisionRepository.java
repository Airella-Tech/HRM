
package com.airella.hrm.repository;

import com.airella.hrm.model.InterviewRoundDecision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InterviewRoundDecisionRepository
        extends JpaRepository<InterviewRoundDecision, Long> {

    Optional<InterviewRoundDecision> findByCompanyIdAndInterviewId(
            Long companyId,
            Long interviewId
    );

    List<InterviewRoundDecision> findByCompanyIdAndApplicationIdOrderByDecidedAtAsc(
            Long companyId,
            Long applicationId
    );

    boolean existsByCompanyIdAndInterviewIdAndDecision(
            Long companyId,
            Long interviewId,
            InterviewRoundDecision.Decision decision
    );
}
