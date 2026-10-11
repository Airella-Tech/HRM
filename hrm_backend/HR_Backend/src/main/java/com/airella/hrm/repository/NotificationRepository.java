package com.airella.hrm.repository;

import com.airella.hrm.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Notification> findByCompanyIdAndIsReadOrderByCreatedAtDesc(Long companyId, Boolean isRead);
    List<Notification> findByCompanyIdOrderByCreatedAtDesc(Long companyId);
}
