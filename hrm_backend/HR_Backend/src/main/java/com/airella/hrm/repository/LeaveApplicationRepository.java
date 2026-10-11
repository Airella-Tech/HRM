package com.airella.hrm.repository;

import com.airella.hrm.model.LeaveApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaveApplicationRepository extends JpaRepository<LeaveApplication, Long> {
    List<LeaveApplication> findByUserId(Long userId);
    List<LeaveApplication> findByUserIdAndStatus(Long userId, LeaveApplication.LeaveStatus status);

    @Query("SELECT la FROM LeaveApplication la WHERE la.companyId = :companyId AND la.status = :status")
    List<LeaveApplication> findByCompanyIdAndStatus(@Param("companyId") Long companyId,
                                                     @Param("status") LeaveApplication.LeaveStatus status);

    @Query("SELECT la FROM LeaveApplication la WHERE la.companyId = :companyId")
    List<LeaveApplication> findByCompanyId(@Param("companyId") Long companyId);

    @Query("SELECT la FROM LeaveApplication la WHERE la.userId = :userId " +
           "AND la.status = 'APPROVED' " +
           "AND ((la.startDate <= :endDate AND la.endDate >= :startDate))")
    List<LeaveApplication> findOverlappingLeaves(@Param("userId") Long userId,
                                                  @Param("startDate") LocalDate startDate,
                                                  @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(la) FROM LeaveApplication la WHERE la.companyId = :companyId AND la.status = :status")
    long countByCompanyIdAndStatus(@Param("companyId") Long companyId, @Param("status") LeaveApplication.LeaveStatus status);

    long countByLeaveTypeId(Long leaveTypeId);
}
