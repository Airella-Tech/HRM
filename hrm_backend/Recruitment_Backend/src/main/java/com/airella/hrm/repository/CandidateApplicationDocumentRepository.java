package com.airella.hrm.repository;

import com.airella.hrm.model.CandidateApplicationDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CandidateApplicationDocumentRepository extends JpaRepository<CandidateApplicationDocument, Long> {

    Optional<CandidateApplicationDocument> findByApplicationId(Long applicationId);

    boolean existsByApplicationId(Long applicationId);

    void deleteByApplicationId(Long applicationId);
}
