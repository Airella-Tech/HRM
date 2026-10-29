package com.airella.hrm.repository;

import com.airella.hrm.model.RecruitmentNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecruitmentNotificationRepository extends JpaRepository<RecruitmentNotification, Long> {

    List<RecruitmentNotification> findTop50ByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<RecruitmentNotification> findByIdAndUserId(Long id, Long userId);

    @Modifying
    @Query("update RecruitmentNotification n set n.seen = true where n.userId = :userId and n.seen = false")
    int markAllRead(@Param("userId") Long userId);
}