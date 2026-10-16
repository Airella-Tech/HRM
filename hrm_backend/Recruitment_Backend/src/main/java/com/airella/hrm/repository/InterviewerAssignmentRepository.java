package com.airella.hrm.repository;

import com.airella.hrm.model.InterviewerAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InterviewerAssignmentRepository extends JpaRepository<InterviewerAssignment, Long> {
    List<InterviewerAssignment> findByUserId(Long userId);
    List<InterviewerAssignment> findByInterviewIdAndCompanyRef(Long interviewId, String companyRef);
    Optional<InterviewerAssignment> findByIdAndCompanyRef(Long id, String companyRef);
    boolean existsByUserIdAndInterviewId(Long userId, Long interviewId);
    boolean existsByUserIdAndApplicationId(Long userId, Long applicationId);
}