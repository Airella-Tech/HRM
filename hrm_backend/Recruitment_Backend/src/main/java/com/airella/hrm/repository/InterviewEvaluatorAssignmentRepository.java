package com.airella.hrm.repository;

import com.airella.hrm.model.InterviewEvaluatorAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InterviewEvaluatorAssignmentRepository extends JpaRepository<InterviewEvaluatorAssignment, Long> {
    List<InterviewEvaluatorAssignment> findByInterviewId(Long interviewId);
    List<InterviewEvaluatorAssignment> findByCompanyIdAndEmployeeId(Long companyId, Long employeeId);
    boolean existsByInterviewIdAndEmployeeId(Long interviewId, Long employeeId);
    Optional<InterviewEvaluatorAssignment> findByInterviewIdAndEmployeeId(Long interviewId, Long employeeId);
    void deleteByInterviewIdAndEmployeeId(Long interviewId, Long employeeId);
}
