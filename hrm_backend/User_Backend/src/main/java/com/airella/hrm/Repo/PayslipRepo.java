package com.airella.hrm.Repo;

import com.airella.hrm.Model.Payslip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PayslipRepo extends JpaRepository<Payslip, Long> {
    Optional<Payslip> findByEmployeeIdAndMonthAndYear(Long employeeId, Integer month, Integer year);
    List<Payslip> findByEmployeeId(Long employeeId);
    void deleteByEmployeeId(Long employeeId);
    List<Payslip> findByEmployeeIdOrderByYearDescMonthDesc(Long employeeId);
    
    @Query("SELECT p FROM Payslip p WHERE p.employee.company.id = :companyId AND p.month = :month AND p.year = :year")
    List<Payslip> findByCompanyIdAndMonthAndYear(@Param("companyId") Long companyId, 
                                                  @Param("month") Integer month, 
                                                  @Param("year") Integer year);
}
