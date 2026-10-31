package com.airella.hrm.repository;

import com.airella.hrm.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByCompanyRefOrderByCreatedAtDesc(String companyRef);

    /** Newest 500 entries for the audit log screen. */
    List<AuditLog> findTop500ByCompanyRefOrderByCreatedAtDesc(String companyRef);
}