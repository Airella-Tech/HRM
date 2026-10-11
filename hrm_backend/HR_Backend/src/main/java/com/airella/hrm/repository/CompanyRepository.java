package com.airella.hrm.repository;

import com.airella.hrm.model.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {
    Optional<Company> findByRegistrationNumber(String registrationNumber);
    Optional<Company> findByCompanyName(String companyName);
}
