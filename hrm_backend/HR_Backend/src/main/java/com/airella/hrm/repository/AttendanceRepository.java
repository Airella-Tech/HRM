package com.airella.hrm.repository;

import com.airella.hrm.model.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    Optional<Attendance> findByUserIdAndDate(Long userId, LocalDate date);
    List<Attendance> findByUserId(Long userId);
    List<Attendance> findByUserIdAndDateBetween(Long userId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT a FROM Attendance a WHERE a.companyId = :companyId AND a.date = :date")
    List<Attendance> findByCompanyIdAndDate(@Param("companyId") Long companyId, @Param("date") LocalDate date);

    List<Attendance> findByUserIdInAndDateBetween(java.util.Collection<Long> userIds, LocalDate startDate, LocalDate endDate);

    List<Attendance> findByIsAdjustmentRequestedAndAdjustmentStatus(Boolean isAdjustmentRequested, Attendance.AdjustmentStatus status);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.companyId = :companyId AND a.date = :date AND a.status = 'PRESENT'")
    long countPresentByCompanyIdAndDate(@Param("companyId") Long companyId, @Param("date") LocalDate date);
}
