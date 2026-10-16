package com.airella.hrm.service;

import com.airella.hrm.config.AuthenticatedUser;
import com.airella.hrm.model.AuditLog;
import com.airella.hrm.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Creates audit logs. A failure here is logged but never blocks the real action.
 * Usage: auditService.logAction("CREATE", "JobVacancy", id, "Created vacancy X", companyRef);
 */
@Service
@Transactional
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void logAction(String action, String entity, Long entityId, String description, String companyRef) {
        try {
            AuditLog auditLog = new AuditLog();
            auditLog.setAction(action);
            auditLog.setEntity(entity);
            auditLog.setEntityId(entityId);
            auditLog.setDescription(description);
            auditLog.setCompanyRef(companyRef);

            // Acting user's User_Backend id, straight from the JWT
            try {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.getPrincipal() instanceof AuthenticatedUser user) {
                    auditLog.setUserId(user.userId());
                }
            } catch (Exception e) {
                log.debug("No authenticated user for audit log — system action");
            }

            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to create audit log: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getCompanyAuditLogs(String companyRef) {
        return auditLogRepository.findByCompanyRefOrderByCreatedAtDesc(companyRef);
    }
}