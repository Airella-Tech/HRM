package com.airella.hrm.repository;

import com.airella.hrm.model.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for Company entity in Admin_Backend (hrm_db_admin).
 */
@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {

    Optional<Company> findByRegistrationNumber(String registrationNumber);

    Optional<Company> findByEmailIgnoreCase(String email);

    List<Company> findByStatus(Company.CompanyStatus status);

    long countByStatus(Company.CompanyStatus status);
}
