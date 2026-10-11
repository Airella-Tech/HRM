package com.airella.hrm.Repo;

import com.airella.hrm.Model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepo extends JpaRepository<Notification, Long> {
    List<Notification> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);
    List<Notification> findByEmployeeIdAndIsReadOrderByCreatedAtDesc(Long employeeId, Boolean isRead);
    
    @Query("SELECT n FROM Notification n WHERE n.company.id = :companyId AND n.employee IS NULL ORDER BY n.createdAt DESC")
    List<Notification> findCompanyWideNotifications(@Param("companyId") Long companyId);
    
    Long countByEmployeeIdAndIsRead(Long employeeId, Boolean isRead);
    void deleteByEmployeeId(Long employeeId);
}
