package com.airella.hrm.repository;

import com.airella.hrm.model.CandidateScreeningResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CandidateScreeningResultRepository extends JpaRepository<CandidateScreeningResult, Long> {

    Optional<CandidateScreeningResult> findTopByApplicationIdOrderByEvaluatedAtDesc(Long applicationId);

    Optional<CandidateScreeningResult> findTopByApplicationIdAndCompanyRefOrderByEvaluatedAtDesc(Long applicationId, String companyRef);

    List<CandidateScreeningResult> findByVacancyIdOrderByEvaluatedAtDesc(Long vacancyId);

    List<CandidateScreeningResult> findByVacancyIdAndCompanyRefOrderByEvaluatedAtDesc(Long vacancyId, String companyRef);

    List<CandidateScreeningResult> findByApplicationIdOrderByEvaluatedAtDesc(Long applicationId);

    void deleteByApplicationId(Long applicationId);
}
