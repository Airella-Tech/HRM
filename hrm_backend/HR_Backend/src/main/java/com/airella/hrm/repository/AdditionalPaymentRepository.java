package com.airella.hrm.repository;

import com.airella.hrm.model.AdditionalPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdditionalPaymentRepository extends JpaRepository<AdditionalPayment, Long> {

    List<AdditionalPayment> findByCompanyIdOrderByIdAsc(Long companyId);

    List<AdditionalPayment> findByCompanyIdAndEmployeeEmailIgnoreCaseOrderByIdAsc(Long companyId, String employeeEmail);

    java.util.Optional<AdditionalPayment> findBySourceRequestId(Long sourceRequestId);

    void deleteByCompanyIdAndEmployeeEmailIgnoreCase(Long companyId, String employeeEmail);
}
