package com.airella.hrm.Repo;

import com.airella.hrm.Model.LeaveApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaveApplicationRepo extends JpaRepository<LeaveApplication, Long> {
    List<LeaveApplication> findByEmployeeId(Long employeeId);
    void deleteByEmployeeId(Long employeeId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE LeaveApplication la SET la.approvedBy = null WHERE la.approvedBy.id = :employeeId")
    void clearApprover(@Param("employeeId") Long employeeId);
    List<LeaveApplication> findByEmployeeIdAndStatus(Long employeeId, LeaveApplication.LeaveStatus status);
    
    @Query("SELECT la FROM LeaveApplication la WHERE la.employee.company.id = :companyId AND la.status = :status")
    List<LeaveApplication> findByCompanyIdAndStatus(@Param("companyId") Long companyId, 
                                                     @Param("status") LeaveApplication.LeaveStatus status);
    
    @Query("SELECT la FROM LeaveApplication la WHERE la.employee.company.id = :companyId")
    List<LeaveApplication> findByCompanyId(@Param("companyId") Long companyId);
    
    @Query("SELECT la FROM LeaveApplication la WHERE la.employee.id = :employeeId " +
           "AND la.status = 'APPROVED' " +
           "AND ((la.startDate <= :endDate AND la.endDate >= :startDate))")
    List<LeaveApplication> findOverlappingLeaves(@Param("employeeId") Long employeeId,
                                                  @Param("startDate") LocalDate startDate,
                                                  @Param("endDate") LocalDate endDate);
}
