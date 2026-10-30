
package com.airella.hrm.repository;

import com.airella.hrm.model.InterviewEvaluatorAssignment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository
public interface InterviewEvaluatorAssignmentRepository
        extends JpaRepository<InterviewEvaluatorAssignment, Long> {

    /**
     * Find all evaluator assignments for an interview.
     */
    List<InterviewEvaluatorAssignment> findByInterviewId(Long interviewId);

    /**
     * Find all evaluator assignments for an interview within a company.
     */
    List<InterviewEvaluatorAssignment> findByCompanyIdAndInterviewId(
            Long companyId,
            Long interviewId
    );

    /**
     * Find all interviews assigned to an employee within a company.
     */
    List<InterviewEvaluatorAssignment> findByCompanyIdAndEmployeeId(
            Long companyId,
            Long employeeId
    );

    /**
     * Check whether an employee is assigned to an interview.
     */
    boolean existsByInterviewIdAndEmployeeId(
            Long interviewId,
            Long employeeId
    );

    /**
     * Check whether an employee is assigned to an interview
     * within the specified company.
     */
    boolean existsByCompanyIdAndInterviewIdAndEmployeeId(
            Long companyId,
            Long interviewId,
            Long employeeId
    );

    /**
     * Find a specific employee assignment for an interview.
     */
    Optional<InterviewEvaluatorAssignment> findByInterviewIdAndEmployeeId(
            Long interviewId,
            Long employeeId
    );

    /**
     * Find a specific employee assignment within a company.
     */
    Optional<InterviewEvaluatorAssignment>
    findByCompanyIdAndInterviewIdAndEmployeeId(
            Long companyId,
            Long interviewId,
            Long employeeId
    );

    /**
     * Remove an employee assignment from an interview.
     */
    void deleteByInterviewIdAndEmployeeId(
            Long interviewId,
            Long employeeId
    );

    /**
     * Remove an employee assignment only within the specified company.
     */
    void deleteByCompanyIdAndInterviewIdAndEmployeeId(
            Long companyId,
            Long interviewId,
            Long employeeId
    );

    void deleteByCompanyIdAndInterviewId(Long companyId, Long interviewId);
}
