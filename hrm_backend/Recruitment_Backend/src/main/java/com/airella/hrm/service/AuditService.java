package com.airella.hrm.service;

import com.airella.hrm.config.AuthenticatedUser;
import com.airella.hrm.dto.AuditLogDTO;
import com.airella.hrm.dto.UserSummaryDTO;
import com.airella.hrm.model.AuditLog;
import com.airella.hrm.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Creates audit logs. A failure here is logged but never blocks the real action.
 * Usage: auditService.logAction("CREATE", "JobVacancy", id, "Created vacancy X", companyRef);
 */
@Service
@Transactional
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;
    private final EmployeeDirectory employeeDirectory;

    public AuditService(AuditLogRepository auditLogRepository, EmployeeDirectory employeeDirectory) {
        this.auditLogRepository = auditLogRepository;
        this.employeeDirectory = employeeDirectory;
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

    /** Newest 500 entries for the company, with who did it. Used by the Audit Log screen. */
    @Transactional(readOnly = true)
    public List<AuditLogDTO> getRecentLogs(String companyRef) {
        List<AuditLog> logs = auditLogRepository.findTop500ByCompanyRefOrderByCreatedAtDesc(companyRef);
        Map<Long, String> names = namesFor(logs);

        return logs.stream()
                .map(l -> new AuditLogDTO(
                        l.getId(),
                        l.getAction(),
                        l.getEntity(),
                        l.getEntityId(),
                        l.getDescription(),
                        l.getUserId(),
                        l.getUserId() == null
                                ? "System"
                                : names.getOrDefault(l.getUserId(), "User #" + l.getUserId()),
                        l.getCreatedAt()))
                .toList();
    }

    /** userId -> full name. If User_Backend is down we just show "User #id" instead of failing. */
    private Map<Long, String> namesFor(List<AuditLog> logs) {
        Map<Long, String> names = new HashMap<>();
        try {
            Set<Long> ids = logs.stream()
                    .map(AuditLog::getUserId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            for (UserSummaryDTO u : employeeDirectory.mapByIds(ids).values()) {
                names.put(u.getId(), u.getFullName());
            }
        } catch (Exception e) {
            log.warn("Could not look up names for audit log: {}", e.getMessage());
        }
        return names;
    }
}