package com.airella.hrm.repository;

import com.airella.hrm.model.AllowanceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface AllowanceRequestRepository extends JpaRepository<AllowanceRequest, Long> {

    List<AllowanceRequest> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<AllowanceRequest> findByCompanyIdAndStatus(Long companyId, AllowanceRequest.Status status);

    List<AllowanceRequest> findByEmployeeEmailInOrderByCreatedAtDesc(Collection<String> employeeEmails);
}
