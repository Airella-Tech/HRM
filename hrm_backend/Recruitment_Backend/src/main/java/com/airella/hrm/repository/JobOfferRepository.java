
package com.airella.hrm.repository;

import com.airella.hrm.model.JobOffer;
import com.airella.hrm.model.JobOfferStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JobOfferRepository
        extends JpaRepository<JobOffer, Long> {

    List<JobOffer> findByCompanyIdOrderByCreatedAtDesc(
            Long companyId
    );

    List<JobOffer> findByCompanyIdAndStatusOrderByCreatedAtDesc(
            Long companyId,
            JobOfferStatus status
    );

    Optional<JobOffer> findByIdAndCompanyId(
            Long id,
            Long companyId
    );

    long countByCompanyIdAndStatus(
            Long companyId,
            JobOfferStatus status
    );

    boolean existsByCompanyIdAndApplicationId(
            Long companyId,
            Long applicationId
    );

    boolean existsByCompanyIdAndApplicationIdAndIdNot(
            Long companyId,
            Long applicationId,
            Long id
    );
}
