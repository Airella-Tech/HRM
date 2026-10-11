package com.airella.hrm.Repo;

import com.airella.hrm.Model.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyRepo extends JpaRepository<Company, Long> {
    Optional<Company> findByRegistrationNumber(String registrationNumber);
    Optional<Company> findByCompanyName(String companyName);
    List<Company> findByStatus(Company.CompanyStatus status);
}
