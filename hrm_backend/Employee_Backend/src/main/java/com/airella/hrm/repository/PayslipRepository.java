package com.airella.hrm.repository;

import com.airella.hrm.model.Payslip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PayslipRepository extends JpaRepository<Payslip, Long> {
    List<Payslip> findByUserId(Long userId);
    Optional<Payslip> findByUserIdAndMonthAndYear(Long userId, Integer month, Integer year);
    List<Payslip> findByMonthAndYear(Integer month, Integer year);
}
