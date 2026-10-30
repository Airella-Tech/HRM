package com.airella.hrm.repository;

import com.airella.hrm.model.VacancyScreeningConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VacancyScreeningConfigRepository extends JpaRepository<VacancyScreeningConfig, Long> {

    Optional<VacancyScreeningConfig> findByVacancyId(Long vacancyId);

    Optional<VacancyScreeningConfig> findByVacancyIdAndCompanyRef(Long vacancyId, String companyRef);

    boolean existsByVacancyId(Long vacancyId);

    void deleteByVacancyIdAndCompanyRef(Long vacancyId, String companyRef);
}
