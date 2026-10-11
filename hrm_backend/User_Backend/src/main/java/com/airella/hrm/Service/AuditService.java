package com.airella.hrm.service;

import com.airella.hrm.Model.AuditLog;
import com.airella.hrm.Model.Company;
import com.airella.hrm.Model.Employee;
import com.airella.hrm.Repo.AuditLogRepo;
import com.airella.hrm.Repo.CompanyRepo;
import com.airella.hrm.Repo.EmployeeRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class AuditService {

    @Autowired
    private AuditLogRepo auditLogRepo;

    @Autowired
    private CompanyRepo companyRepo;

    @Autowired
    private AuthService authService;

    public void logAction(String action, String entity, Long entityId, String description, Long companyId) {
        try {
            AuditLog auditLog = new AuditLog();
            auditLog.setAction(action);
            auditLog.setEntity(entity);
            auditLog.setEntityId(entityId);
            auditLog.setDescription(description);

            // Set employee (current user)
            try {
                Employee currentEmployee = authService.getCurrentEmployee();
                auditLog.setEmployee(currentEmployee);
            } catch (Exception e) {
                // System action if no current user
            }

            // Set company
            if (companyId != null) {
                Company company = companyRepo.findById(companyId).orElse(null);
                auditLog.setCompany(company);
            }

            auditLogRepo.save(auditLog);
        } catch (Exception e) {
            // Log error but don't fail the main operation
            System.err.println("Failed to create audit log: " + e.getMessage());
        }
    }

    public List<AuditLog> getCompanyAuditLogs(Long companyId) {
        return auditLogRepo.findByCompanyIdOrderByCreatedAtDesc(companyId);
    }

    public List<AuditLog> getAllAuditLogs() {
        return auditLogRepo.findAll();
    }

    public List<AuditLog> getAuditLogsByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return auditLogRepo.findByDateRange(startDate, endDate);
    }

    public List<AuditLog> getAuditLogsByAction(String action) {
        return auditLogRepo.findByActionOrderByCreatedAtDesc(action);
    }
}
