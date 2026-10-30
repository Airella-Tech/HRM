
package com.airella.hrm.repository;

import com.airella.hrm.model.InterviewEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InterviewEvaluationRepository
        extends JpaRepository<InterviewEvaluation, Long> {

    Optional<InterviewEvaluation>
    findByIdAndCompanyId(Long id, Long companyId);

    Optional<InterviewEvaluation>
    findByCompanyIdAndInterviewIdAndEvaluatorId(
            Long companyId,
            Long interviewId,
            Long evaluatorId
    );

    List<InterviewEvaluation>
    findByCompanyIdAndEvaluatorIdOrderByUpdatedAtDesc(
            Long companyId,
            Long evaluatorId
    );

    List<InterviewEvaluation>
    findByCompanyIdAndInterviewIdOrderByCreatedAtAsc(
            Long companyId,
            Long interviewId
    );

    List<InterviewEvaluation>
    findByCompanyIdAndStatusOrderByUpdatedAtDesc(
            Long companyId,
            String status
    );

    boolean existsByCompanyIdAndInterviewIdAndEvaluatorIdAndStatus(
            Long companyId,
            Long interviewId,
            Long evaluatorId,
            String status
    );
}
