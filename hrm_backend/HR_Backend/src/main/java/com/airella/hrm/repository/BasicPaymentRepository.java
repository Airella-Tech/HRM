package com.airella.hrm.repository;

import com.airella.hrm.model.BasicPayment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BasicPaymentRepository extends JpaRepository<BasicPayment, Long> {

    @EntityGraph(attributePaths = {"department", "jobRole", "employmentType"})
    List<BasicPayment> findByCompanyIdOrderByUpdatedAtDesc(Long companyId);

    @EntityGraph(attributePaths = {"department", "jobRole", "employmentType"})
    List<BasicPayment> findByCompanyIdAndDepartmentIdOrderByUpdatedAtDesc(Long companyId, Long departmentId);

    Optional<BasicPayment> findByJobRoleIdAndEmploymentTypeId(Long jobRoleId, Long employmentTypeId);

    long countByEmploymentTypeId(Long employmentTypeId);
}
