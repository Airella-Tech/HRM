package com.airella.hrm.Repo;

import com.airella.hrm.Model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepo extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByCompanyIdOrderByCreatedAtDesc(Long companyId);
    List<AuditLog> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);
    
    @Query("SELECT al FROM AuditLog al WHERE al.createdAt BETWEEN :startDate AND :endDate ORDER BY al.createdAt DESC")
    List<AuditLog> findByDateRange(@Param("startDate") LocalDateTime startDate, 
                                    @Param("endDate") LocalDateTime endDate);
    
    List<AuditLog> findByActionOrderByCreatedAtDesc(String action);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE AuditLog al SET al.employee = null WHERE al.employee.id = :employeeId")
    void detachEmployee(@Param("employeeId") Long employeeId);
}
