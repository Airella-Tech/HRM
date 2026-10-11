package com.airella.hrm.Repo;

import com.airella.hrm.Model.SessionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SessionLogRepo extends JpaRepository<SessionLog, Long> {
    List<SessionLog> findByUserId(Long userId);
    void deleteByUserId(Long userId);
    Optional<SessionLog> findFirstByUserIdAndStatusTrueOrderByIdDesc(Long userId);
}
