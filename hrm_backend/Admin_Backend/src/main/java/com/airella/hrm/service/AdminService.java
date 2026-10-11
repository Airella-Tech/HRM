package com.airella.hrm.service;

import com.airella.hrm.dto.CompanyDTO;
import com.airella.hrm.dto.CompanyRequestDTO;
import com.airella.hrm.dto.DashboardStatsDTO;
import com.airella.hrm.dto.EmployeeDTO;
import com.airella.hrm.model.AuditLog;
import com.airella.hrm.model.Company;
import com.airella.hrm.model.SystemConfiguration;
import com.airella.hrm.repository.AuditLogRepository;
import com.airella.hrm.repository.CompanyRepository;
import com.airella.hrm.repository.SystemConfigurationRepository;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Admin service — owns Company requests and AuditLogs in hrm_db_admin.
 * Provisions HR Manager accounts to User_Backend upon approval and syncs companies across services.
 */
@Service
@Transactional
public class AdminService {

    private static final Logger log = LoggerFactory.getLogger(AdminService.class);

    private final RestTemplate restTemplate;
    private final AuditLogRepository auditLogRepository;
    private final SystemConfigurationRepository systemConfigurationRepository;
    private final CompanyRepository companyRepository;
    private final EmailService emailService;

    @Value("${service.user-url:http://localhost:5004}")
    private String userServiceUrl;

    @Value("${service.hr-url:http://localhost:5005}")
    private String hrServiceUrl;

    @Value("${service.employee-url:http://localhost:5006}")
    private String employeeServiceUrl;

    public AdminService(RestTemplate restTemplate,
                        AuditLogRepository auditLogRepository,
                        SystemConfigurationRepository systemConfigurationRepository,
                        CompanyRepository companyRepository,
                        EmailService emailService) {
        this.restTemplate = restTemplate;
        this.auditLogRepository = auditLogRepository;
        this.systemConfigurationRepository = systemConfigurationRepository;
        this.companyRepository = companyRepository;
        this.emailService = emailService;
    }

    // ── Public Registration Request ──────────────────────────────

    public CompanyDTO submitPublicCompanyRequest(CompanyRequestDTO requestDTO) {
        log.info("Submitting public company registration request for: {}", requestDTO.getCompanyName());

        companyRepository.findByRegistrationNumber(requestDTO.getRegistrationNumber())
                .ifPresent(c -> {
                    throw new IllegalArgumentException("Company with registration number '" + requestDTO.getRegistrationNumber() + "' already exists.");
                });

        Company company = new Company();
        company.setCompanyName(requestDTO.getCompanyName());
        company.setRegistrationNumber(requestDTO.getRegistrationNumber());
        company.setEmail(requestDTO.getEmail());
        company.setPhone(requestDTO.getPhone());
        company.setAddress(requestDTO.getAddress());
        company.setWebsite(requestDTO.getWebsite());
        company.setIndustry(requestDTO.getIndustry());
        company.setEmployeeCount(requestDTO.getEmployeeCount());
        company.setContactPersonName(requestDTO.getContactPersonName());
        company.setContactPersonRole(requestDTO.getContactPersonRole());
        company.setNotes(requestDTO.getNotes());
        company.setStatus(Company.CompanyStatus.PENDING);

        Company saved = companyRepository.save(company);
        logAction("PUBLIC_COMPANY_REQUEST", "Company", saved.getId(),
                "Submitted company registration request for: " + saved.getCompanyName());

        // Send confirmation email
        try {
            emailService.sendRequestReceivedEmail(saved.getEmail(), saved.getContactPersonName(), saved.getCompanyName());
        } catch (Exception e) {
            log.warn("Failed to send request received email for company {}: {}", saved.getCompanyName(), e.getMessage());
        }

        return mapToDTO(saved);
    }

    // ── Dashboard Statistics ─────────────────────────────────────

    @Transactional(readOnly = true)
    public DashboardStatsDTO getDashboardStats() {
        DashboardStatsDTO stats = new DashboardStatsDTO();
        try {
            long totalCompanies = companyRepository.countByStatus(Company.CompanyStatus.APPROVED);
            long pendingCompanies = companyRepository.countByStatus(Company.CompanyStatus.PENDING);
            stats.setTotalCompanies(totalCompanies);
            stats.setPendingCompanies(pendingCompanies);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    employeeServiceUrl + "/api/internal/stats",
                    HttpMethod.GET, null,
                    new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> data = response.getBody();
            if (data != null) {
                stats.setTotalEmployees(toLong(data.get("totalEmployees")));
                stats.setTotalDepartments(toLong(data.get("totalDepartments")));
                stats.setPresentToday(toLong(data.get("presentToday")));
                stats.setPendingLeaves(toLong(data.get("pendingLeaves")));
            }
        } catch (Exception e) {
            log.error("Failed to get employee/department stats from Employee service: {}", e.getMessage());
        }
        return stats;
    }

    @Transactional(readOnly = true)
    public DashboardStatsDTO getCompanyDashboardStats(Long companyId) {
        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    employeeServiceUrl + "/api/internal/stats/company/" + companyId,
                    HttpMethod.GET, null,
                    new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> data = response.getBody();
            if (data == null) return new DashboardStatsDTO();

            DashboardStatsDTO stats = new DashboardStatsDTO();
            stats.setTotalEmployees(toLong(data.get("totalEmployees")));
            stats.setPresentToday(toLong(data.get("presentToday")));
            stats.setPendingLeaves(toLong(data.get("pendingLeaves")));
            return stats;
        } catch (Exception e) {
            log.error("Failed to get company stats from Employee service: {}", e.getMessage());
            return new DashboardStatsDTO();
        }
    }

    // ── Company Management (owned by hrm_db_admin) ───────────────

    @Transactional(readOnly = true)
    public List<CompanyDTO> getAllCompanies() {
        return companyRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CompanyDTO getCompanyById(Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));
        return mapToDTO(company);
    }

    public CompanyDTO createCompany(CompanyDTO dto) {
        Company company = new Company();
        company.setCompanyName(dto.getCompanyName());
        company.setRegistrationNumber(dto.getRegistrationNumber());
        company.setEmail(dto.getEmail());
        company.setPhone(dto.getPhone());
        company.setAddress(dto.getAddress());
        company.setWebsite(dto.getWebsite());
        company.setIndustry(dto.getIndustry());
        company.setContactPersonName(dto.getContactPersonName());
        company.setContactPersonRole(dto.getContactPersonRole());
        company.setNotes(dto.getNotes());
        company.setEmployeeCount((int) dto.getEmployeeCount());
        company.setStatus(Company.CompanyStatus.APPROVED);

        Company saved = companyRepository.save(company);
        logAction("CREATE_COMPANY", "Company", saved.getId(), "Created company: " + saved.getCompanyName());
        syncCompanyToBackends(saved);
        return mapToDTO(saved);
    }

    public CompanyDTO updateCompany(Long id, CompanyDTO dto) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));

        company.setCompanyName(dto.getCompanyName());
        company.setEmail(dto.getEmail());
        company.setPhone(dto.getPhone());
        company.setAddress(dto.getAddress());
        company.setWebsite(dto.getWebsite());
        company.setIndustry(dto.getIndustry());
        company.setContactPersonName(dto.getContactPersonName());
        company.setContactPersonRole(dto.getContactPersonRole());
        company.setNotes(dto.getNotes());
        company.setEmployeeCount((int) dto.getEmployeeCount());
        if (dto.getStatus() != null) {
            try {
                company.setStatus(Company.CompanyStatus.valueOf(dto.getStatus()));
            } catch (Exception ignored) {}
        }

        Company updated = companyRepository.save(company);
        logAction("UPDATE_COMPANY", "Company", id, "Updated company: " + updated.getCompanyName());
        syncCompanyToBackends(updated);
        return mapToDTO(updated);
    }

    public CompanyDTO approveCompany(Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));

        Company.CompanyStatus previousStatus = company.getStatus();
        String previousRejection = company.getRejectionReason();
        String tempPassword = generateTempPassword();

        // 1. Mark approved and make sure the company exists in User_Backend first —
        //    the HR account row in hrm_db_user.employees needs a company to belong to.
        company.setStatus(Company.CompanyStatus.APPROVED);
        company.setRejectionReason(null);
        Company updated = companyRepository.save(company);

        String syncError = syncCompanyToUserBackend(updated);
        if (syncError != null) {
            throw new BusinessException("Could not approve '" + updated.getCompanyName()
                    + "': the User service did not accept the company (" + syncError + ").");
        }

        // 2. Create the HR Manager login (hrm_db_user.employees only), mustChangePassword = true.
        //    If this fails nothing is emailed, the company stays PENDING and the admin can retry.
        String provisionError = provisionHRManagerUser(updated, tempPassword);
        if (provisionError != null) {
            // Undo the company status we already pushed to User_Backend
            updated.setStatus(previousStatus);
            updated.setRejectionReason(previousRejection);
            syncCompanyToUserBackend(updated);
            throw new BusinessException("Could not create the HR Manager account for '"
                    + updated.getCompanyName() + "': " + provisionError);
        }

        // 3. Keep HR_Backend / Employee_Backend copies of the company in step (best effort)
        syncCompanyToBackends(updated);

        // 4. Email the HR account email + temporary password to the company's contact email
        emailService.sendApprovalEmail(updated.getEmail(), updated.getContactPersonName(), updated.getCompanyName(), tempPassword);

        // 5. Audit
        logAction("APPROVE_COMPANY", "Company", id, "Approved company '" + updated.getCompanyName() + "' and provisioned HR Manager account " + updated.getEmail());

        return mapToDTO(updated);
    }

    public CompanyDTO rejectCompany(Long id, String reason) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));

        String rejectionReason = (reason != null && !reason.trim().isEmpty()) ? reason : "Application did not meet requirements.";
        company.setStatus(Company.CompanyStatus.REJECTED);
        company.setRejectionReason(rejectionReason);
        Company updated = companyRepository.save(company);

        logAction("REJECT_COMPANY", "Company", id, "Rejected company '" + updated.getCompanyName() + "'. Reason: " + rejectionReason);
        emailService.sendRejectionEmail(updated.getEmail(), updated.getContactPersonName(), updated.getCompanyName(), rejectionReason);

        syncCompanyToBackends(updated);
        return mapToDTO(updated);
    }

    public CompanyDTO suspendCompany(Long id, String reason) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));

        company.setStatus(Company.CompanyStatus.SUSPENDED);
        Company updated = companyRepository.save(company);

        logAction("SUSPEND_COMPANY", "Company", id, "Suspended company '" + updated.getCompanyName() + "'. Reason: " + reason);
        syncCompanyToBackends(updated);
        return mapToDTO(updated);
    }

    // ── Inter-Service Sync & Provisioning Helpers ────────────────

    private Map<String, Object> buildCompanyPayload(Company company) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", company.getId());
        payload.put("companyName", company.getCompanyName());
        payload.put("registrationNumber", company.getRegistrationNumber());
        payload.put("email", company.getEmail());
        payload.put("phone", company.getPhone());
        payload.put("address", company.getAddress());
        payload.put("website", company.getWebsite());
        payload.put("industry", company.getIndustry());
        payload.put("contactPersonName", company.getContactPersonName());
        payload.put("contactPersonRole", company.getContactPersonRole());
        payload.put("employeeCount", company.getEmployeeCount());
        payload.put("status", company.getStatus() != null ? company.getStatus().name() : "APPROVED");
        payload.put("rejectionReason", company.getRejectionReason());
        return payload;
    }

    /** Pushes the company to User_Backend (hrm_db_user.companies); returns null on success, otherwise the reason. */
    private String syncCompanyToUserBackend(Company company) {
        try {
            restTemplate.postForObject(userServiceUrl + "/api/sync/company", buildCompanyPayload(company), String.class);
            log.info("Synced company {} to User backend", company.getCompanyName());
            return null;
        } catch (Exception e) {
            String reason = describeRemoteError(e);
            log.error("Failed to sync company {} to User backend: {}", company.getCompanyName(), reason);
            return reason;
        }
    }

    private String describeRemoteError(Exception e) {
        if (e instanceof HttpStatusCodeException http) {
            String body = http.getResponseBodyAsString();
            return "HTTP " + http.getStatusCode().value() + (body != null && !body.isBlank() ? " - " + body : "");
        }
        if (e instanceof ResourceAccessException) {
            return "User service is not reachable at " + userServiceUrl + " (is it running?)";
        }
        return e.getMessage();
    }

    private void syncCompanyToBackends(Company company) {
        if (company == null) return;
        Map<String, Object> payload = buildCompanyPayload(company);

        // Sync to User_Backend
        syncCompanyToUserBackend(company);

        // Sync to HR_Backend
        try {
            restTemplate.postForObject(hrServiceUrl + "/api/sync/company", payload, Object.class);
            log.info("Synced company {} to HR backend", company.getCompanyName());
        } catch (Exception e) {
            log.error("Failed to sync company {} to HR backend: {}", company.getCompanyName(), e.getMessage());
        }

        // Sync to Employee_Backend
        try {
            restTemplate.postForObject(employeeServiceUrl + "/api/sync/company", payload, Object.class);
            log.info("Synced company {} to Employee backend", company.getCompanyName());
        } catch (Exception e) {
            log.error("Failed to sync company {} to Employee backend: {}", company.getCompanyName(), e.getMessage());
        }
    }

    /** Creates the company's HR Manager login in User_Backend; returns null on success, otherwise the reason. */
    private String provisionHRManagerUser(Company company, String tempPassword) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("email", company.getEmail());
            payload.put("fullName", company.getContactPersonName() != null ? company.getContactPersonName() : company.getCompanyName() + " HR Manager");
            payload.put("password", tempPassword);
            payload.put("role", "HR_MANAGER");
            payload.put("employeeId", "HR-" + String.format("%03d", company.getId()));
            payload.put("status", "ACTIVE");
            payload.put("mustChangePassword", true);

            Map<String, Object> compMap = new HashMap<>();
            compMap.put("id", company.getId());
            compMap.put("companyName", company.getCompanyName());
            compMap.put("registrationNumber", company.getRegistrationNumber());
            payload.put("company", compMap);

            restTemplate.postForObject(userServiceUrl + "/api/sync/employee", payload, String.class);
            log.info("Provisioned HR Manager account for company: {} with email: {}", company.getCompanyName(), company.getEmail());
            return null;
        } catch (Exception e) {
            String reason = describeRemoteError(e);
            log.error("Failed to provision HR Manager account for company {}: {}", company.getCompanyName(), reason);
            return reason;
        }
    }

    /**
     * One random password per approval. This exact string is (a) sent to User_Backend, which stores
     * only its BCrypt hash in hrm_db_user.employees, and (b) put in the approval email.
     * Format: 12 chars, e.g. "kT7@mQ4xRb2N" (no look-alike characters such as 0/O or 1/l/I).
     */
    private String generateTempPassword() {
        SecureRandom rnd = new SecureRandom();
        String upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        String lower = "abcdefghijkmnpqrstuvwxyz";
        String digits = "23456789";
        String special = "@#$%&*";
        List<Character> chars = new ArrayList<>();
        for (int i = 0; i < 4; i++) chars.add(upper.charAt(rnd.nextInt(upper.length())));
        for (int i = 0; i < 4; i++) chars.add(lower.charAt(rnd.nextInt(lower.length())));
        for (int i = 0; i < 3; i++) chars.add(digits.charAt(rnd.nextInt(digits.length())));
        chars.add(special.charAt(rnd.nextInt(special.length())));
        Collections.shuffle(chars, rnd);
        StringBuilder sb = new StringBuilder();
        for (char c : chars) sb.append(c);
        return sb.toString();
    }

    /**
     * Re-issues the HR Manager login for an already APPROVED company: new password is saved
     * (hashed) in hrm_db_user.employees and the same password is emailed.
     */
    public CompanyDTO resendHrCredentials(Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));
        if (company.getStatus() != Company.CompanyStatus.APPROVED) {
            throw new BusinessException("Only approved companies have an HR account. Approve the company first.");
        }
        String tempPassword = generateTempPassword();

        String syncError = syncCompanyToUserBackend(company);
        if (syncError != null) {
            throw new BusinessException("Could not reach the User service: " + syncError);
        }
        String provisionError = provisionHRManagerUser(company, tempPassword);
        if (provisionError != null) {
            throw new BusinessException("Could not reset the HR Manager account for '"
                    + company.getCompanyName() + "': " + provisionError);
        }
        emailService.sendApprovalEmail(company.getEmail(), company.getContactPersonName(), company.getCompanyName(), tempPassword);
        logAction("RESEND_HR_CREDENTIALS", "Company", id, "Re-issued HR Manager credentials for '" + company.getCompanyName() + "'");
        return mapToDTO(company);
    }

    private CompanyDTO mapToDTO(Company company) {
        if (company == null) return null;
        CompanyDTO dto = new CompanyDTO();
        dto.setId(company.getId());
        dto.setCompanyName(company.getCompanyName());
        dto.setRegistrationNumber(company.getRegistrationNumber());
        dto.setEmail(company.getEmail());
        dto.setPhone(company.getPhone());
        dto.setAddress(company.getAddress());
        dto.setWebsite(company.getWebsite());
        dto.setIndustry(company.getIndustry());
        dto.setContactPersonName(company.getContactPersonName());
        dto.setContactPersonRole(company.getContactPersonRole());
        dto.setNotes(company.getNotes());
        dto.setStatus(company.getStatus() != null ? company.getStatus().name() : "PENDING");
        dto.setRejectionReason(company.getRejectionReason());
        dto.setEmployeeCount(company.getEmployeeCount() != null ? company.getEmployeeCount() : 0);
        dto.setCreatedAt(company.getCreatedAt() != null ? company.getCreatedAt().toString() : null);
        return dto;
    }

    // ── System User Management (lists via Employee_Backend, changes in User_Backend) ──

    @Transactional(readOnly = true)
    public List<EmployeeDTO> getAllSystemUsers() {
        try {
            ResponseEntity<List<EmployeeDTO>> response = restTemplate.exchange(
                    employeeServiceUrl + "/api/internal/employees",
                    HttpMethod.GET, null,
                    new ParameterizedTypeReference<List<EmployeeDTO>>() {});
            return response.getBody() != null ? response.getBody() : Collections.emptyList();
        } catch (Exception e) {
            log.error("Failed to get system users from Employee service: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    @Transactional(readOnly = true)
    public List<EmployeeDTO> getUsersByCompany(Long companyId) {
        try {
            ResponseEntity<List<EmployeeDTO>> response = restTemplate.exchange(
                    employeeServiceUrl + "/api/internal/employees/company/" + companyId,
                    HttpMethod.GET, null,
                    new ParameterizedTypeReference<List<EmployeeDTO>>() {});
            return response.getBody() != null ? response.getBody() : Collections.emptyList();
        } catch (Exception e) {
            log.error("Failed to get users by company from Employee service: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    @Transactional(readOnly = true)
    public List<EmployeeDTO> getAdminUsers() {
        try {
            ResponseEntity<List<EmployeeDTO>> response = restTemplate.exchange(
                    employeeServiceUrl + "/api/internal/employees/admins",
                    HttpMethod.GET, null,
                    new ParameterizedTypeReference<List<EmployeeDTO>>() {});
            return response.getBody() != null ? response.getBody() : Collections.emptyList();
        } catch (Exception e) {
            log.error("Failed to get admin users from Employee service: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    public EmployeeDTO updateUserRole(Long userId, String role) {
        ResponseEntity<EmployeeDTO> response = restTemplate.exchange(
                userServiceUrl + "/api/internal/users/" + userId + "/role?role=" + role,
                HttpMethod.PUT, null, EmployeeDTO.class);
        logAction("UPDATE_USER_ROLE", "Employee", userId, "Changed role to " + role);
        return response.getBody();
    }

    public EmployeeDTO updateUserStatus(Long userId, String status) {
        ResponseEntity<EmployeeDTO> response = restTemplate.exchange(
                userServiceUrl + "/api/internal/users/" + userId + "/status?status=" + status,
                HttpMethod.PUT, null, EmployeeDTO.class);
        logAction("UPDATE_USER_STATUS", "Employee", userId, "Changed status to " + status);
        return response.getBody();
    }

    // ── Audit Logs (Admin's own DB) ──────────────────────────────

    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogs() {
        return auditLogRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return auditLogRepository.findByDateRange(startDate, endDate);
    }

    // ── System Configuration (Admin's own DB) ────────────────────

    @Transactional(readOnly = true)
    public List<SystemConfiguration> getAllConfigurations() {
        return systemConfigurationRepository.findAll();
    }

    public SystemConfiguration getConfiguration(String key) {
        return systemConfigurationRepository.findByConfigKey(key)
                .orElseThrow(() -> new ResourceNotFoundException("SystemConfiguration", "key", key));
    }

    public SystemConfiguration updateConfiguration(String key, String value) {
        SystemConfiguration config = systemConfigurationRepository.findByConfigKey(key)
                .orElseGet(() -> {
                    SystemConfiguration newConfig = new SystemConfiguration();
                    newConfig.setConfigKey(key);
                    return newConfig;
                });
        config.setConfigValue(value);
        SystemConfiguration saved = systemConfigurationRepository.save(config);
        logAction("UPDATE_CONFIG", "SystemConfiguration", saved.getId(), "Updated config: " + key);
        return saved;
    }

    // ── Private Helpers ──────────────────────────────────────────

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void logAction(String action, String entity, Long entityId, String description) {
        try {
            AuditLog auditLog = new AuditLog();
            auditLog.setAction(action);
            auditLog.setEntity(entity != null ? entity : "SYSTEM");
            auditLog.setEntityType(entity != null ? entity : "SYSTEM");
            auditLog.setEntityId(entityId);
            auditLog.setDescription(description);
            auditLog.setPerformedBy("ADMIN");
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to create audit log: {}", e.getMessage());
        }
    }

    private long toLong(Object value) {
        if (value == null) return 0L;
        if (value instanceof Number) return ((Number) value).longValue();
        try { return Long.parseLong(value.toString()); } catch (NumberFormatException e) { return 0L; }
    }
}
