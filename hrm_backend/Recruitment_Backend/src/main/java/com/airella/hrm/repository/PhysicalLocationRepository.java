
package com.airella.hrm.repository;

import com.airella.hrm.model.PhysicalLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PhysicalLocationRepository
        extends JpaRepository<PhysicalLocation, Long> {

    List<PhysicalLocation> findByCompanyIdOrderByNameAsc(
            Long companyId
    );

    List<PhysicalLocation> findByCompanyIdAndStatusOrderByNameAsc(
            Long companyId,
            String status
    );

    Optional<PhysicalLocation> findByIdAndCompanyId(
            Long id,
            Long companyId
    );
}
