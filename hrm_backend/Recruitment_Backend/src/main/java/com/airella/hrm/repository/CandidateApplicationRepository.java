package com.airella.hrm.repository;

import com.airella.hrm.model.CandidateApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CandidateApplicationRepository extends JpaRepository<CandidateApplication, Long> {

    /**
     * Duplicate submission check: candidate with same email applied for this vacancy within cutoff date.
     */
    boolean existsByEmailIgnoreCaseAndVacancyIdAndCreatedAtGreaterThanEqual(
            String email, Long vacancyId, LocalDateTime cutoffDate);

    /**
     * Lookup by tracking code and email.
     */
    Optional<CandidateApplication> findByTrackingCodeIgnoreCaseAndEmailIgnoreCase(
            String trackingCode, String email);

    /**
     * Lookup by ID and company reference or companyId.
     */
    @Query("""
        SELECT a FROM CandidateApplication a
        LEFT JOIN FETCH a.vacancy
        LEFT JOIN FETCH a.skills
        WHERE a.id = :id
          AND (
            (:companyRef IS NOT NULL AND LOWER(a.companyRef) = LOWER(:companyRef))
            OR (:companyId IS NOT NULL AND a.companyId = :companyId)
          )
    """)
    Optional<CandidateApplication> findByIdAndCompany(
            @Param("id") Long id,
            @Param("companyRef") String companyRef,
            @Param("companyId") Long companyId);

    /**
     * List all applications for a company.
     */
    @Query("""
        SELECT DISTINCT a FROM CandidateApplication a
        LEFT JOIN FETCH a.vacancy
        LEFT JOIN FETCH a.skills
        WHERE (
            (:companyRef IS NOT NULL AND LOWER(a.companyRef) = LOWER(:companyRef))
            OR (:companyId IS NOT NULL AND a.companyId = :companyId)
        )
        ORDER BY a.createdAt DESC
    """)
    List<CandidateApplication> findAllByCompany(
            @Param("companyRef") String companyRef,
            @Param("companyId") Long companyId);

    /**
     * List all applications with details (for super admin).
     */
    @Query("""
        SELECT DISTINCT a FROM CandidateApplication a
        LEFT JOIN FETCH a.vacancy
        LEFT JOIN FETCH a.skills
        ORDER BY a.createdAt DESC
    """)
    List<CandidateApplication> findAllWithDetails();
}
