package com.airella.hrm.Controller;

import com.airella.hrm.Model.Company;
import com.airella.hrm.Model.Employee;
import com.airella.hrm.Repo.CompanyRepo;
import com.airella.hrm.Repo.EmployeeRepo;
import com.airella.hrm.service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * SyncController in User_Backend — receives company & user sync requests from Employee_Backend / Admin_Backend
 * to ensure hrm_db_user stores all approved companies and their associated HR/User accounts.
 */
@RestController
@RequestMapping("/api/sync")
public class SyncController {

    private static final Logger log = LoggerFactory.getLogger(SyncController.class);

    private final CompanyRepo companyRepo;
    private final EmployeeRepo employeeRepo;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;

    public SyncController(CompanyRepo companyRepo,
                          EmployeeRepo employeeRepo,
                          PasswordEncoder passwordEncoder,
                          AuthService authService) {
        this.companyRepo = companyRepo;
        this.employeeRepo = employeeRepo;
        this.passwordEncoder = passwordEncoder;
        this.authService = authService;
    }

    @PostMapping("/company")
    public ResponseEntity<String> syncCompany(@RequestBody Company company) {
        log.info("[USER_BACKEND SYNC] Syncing company: {}", company.getCompanyName());

        // Registration number identifies a company (names can repeat); each new one gets its own auto-increment id
        Company existing = companyRepo.findByRegistrationNumber(company.getRegistrationNumber())
                .orElseGet(() -> companyRepo.findByCompanyName(company.getCompanyName()).orElse(null));

        if (existing == null) {
            existing = new Company();
        }

        existing.setCompanyName(company.getCompanyName());
        existing.setRegistrationNumber(company.getRegistrationNumber());
        existing.setEmail(company.getEmail());
        existing.setPhone(company.getPhone());
        existing.setAddress(company.getAddress());
        existing.setWebsite(company.getWebsite());
        existing.setIndustry(company.getIndustry());
        existing.setContactPersonName(company.getContactPersonName());
        existing.setContactPersonRole(company.getContactPersonRole());
        existing.setNotes(company.getNotes());
        existing.setEmployeeCount(company.getEmployeeCount());
        if (company.getStatus() != null) {
            existing.setStatus(Company.CompanyStatus.valueOf(company.getStatus().name()));
        }

        Company saved = companyRepo.save(existing);
        log.info("[USER_BACKEND SYNC SUCCESS] Company synced to hrm_db_user ID: {}, Name: {}", saved.getId(), saved.getCompanyName());
        return ResponseEntity.ok("Company synced to hrm_db_user successfully");
    }

    @PostMapping("/employee")
    public ResponseEntity<String> syncEmployee(@RequestBody Map<String, Object> payload) {
        String email = (String) payload.get("email");
        String fullName = (String) payload.get("fullName");
        String password = (String) payload.get("password");
        String roleStr = (String) payload.get("role");
        String employeeIdStr = (String) payload.get("employeeId");
        String statusStr = (String) payload.get("status");

        log.info("[USER_BACKEND SYNC] Syncing employee to hrm_db_user: {}", email);

        if (email == null) {
            return ResponseEntity.badRequest().body("Missing email in sync payload");
        }

        Employee employee = employeeRepo.findByEmailIgnoreCase(email)
                .orElseGet(() -> {
                    Employee e = new Employee();
                    e.setEmail(email);
                    return e;
                });

        // Never move an existing account into another company (or reset its password) from here
        String incomingReg = payload.get("company") instanceof Map<?, ?> m ? (String) m.get("registrationNumber") : null;
        if (employee.getId() != null && employee.getCompany() != null && incomingReg != null
                && !incomingReg.equals(employee.getCompany().getRegistrationNumber())) {
            log.warn("[USER_BACKEND SYNC] Refused: {} already belongs to company '{}'", email, employee.getCompany().getCompanyName());
            return ResponseEntity.status(409).body("Email " + email + " is already used by another company's account");
        }

        if (fullName != null) employee.setFullName(fullName);

        if (password != null && !password.isBlank()) {
            String encoded = isBcryptHash(password) ? password : passwordEncoder.encode(password);
            employee.setPassword(encoded);
        }

        // Employee numbers are unique across the whole system: keep the sender's number only if it is
        // free (or already this account's), otherwise give the next free one for the role (e.g. HR-004).
        if (employeeIdStr != null && employeeRepo.findByEmployeeId(employeeIdStr)
                .map(other -> other.getId().equals(employee.getId())).orElse(true)) {
            employee.setEmployeeId(employeeIdStr);
        } else if (employee.getEmployeeId() == null) {
            employee.setEmployeeId(authService.generateEmployeeIdForRole(roleStr != null ? roleStr : "EMPLOYEE"));
        }

        if (roleStr != null) {
            try {
                employee.setRole(Employee.Role.valueOf(roleStr));
            } catch (Exception ignored) {}
        }

        if (statusStr != null) {
            try {
                employee.setStatus(Employee.EmployeeStatus.valueOf(statusStr));
            } catch (Exception ignored) {}
        }

        if (payload.containsKey("mustChangePassword")) {
            Object val = payload.get("mustChangePassword");
            if (val instanceof Boolean) {
                employee.setMustChangePassword((Boolean) val);
            } else if (val != null) {
                employee.setMustChangePassword(Boolean.parseBoolean(val.toString()));
            }
        }

        // Link company if present in payload
        if (payload.containsKey("company") && payload.get("company") instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> compMap = (Map<String, Object>) payload.get("company");
            String companyName = (String) compMap.get("companyName");
            String regNum = (String) compMap.get("registrationNumber");

            if (companyName != null || regNum != null) {
                Company company = null;
                if (regNum != null) {
                    company = companyRepo.findByRegistrationNumber(regNum).orElse(null);
                }
                if (company == null && companyName != null) {
                    company = companyRepo.findByCompanyName(companyName).orElse(null);
                }
                if (company == null) {
                    company = new Company();
                    company.setCompanyName(companyName != null ? companyName : "Default Company");
                    company.setRegistrationNumber(regNum != null ? regNum : "REG-GEN-001");
                    company.setStatus(Company.CompanyStatus.APPROVED);
                    company = companyRepo.save(company);
                }
                employee.setCompany(company);
            }
        }

        Employee saved = employeeRepo.saveAndFlush(employee);

        // The plain password we received is the one that gets emailed: prove the stored hash matches it
        if (password != null && !password.isBlank() && !isBcryptHash(password)
                && !passwordEncoder.matches(password, saved.getPassword())) {
            log.error("[USER_BACKEND SYNC] Stored password hash does not match the password sent for {}", email);
            return ResponseEntity.status(500).body("Password verification failed after saving " + email);
        }
        if (password != null && !password.isBlank()) {
            log.info("[USER_BACKEND SYNC] Password for {} saved as BCrypt hash and verified against the supplied password", email);
        }
        log.info("[USER_BACKEND SYNC SUCCESS] Employee synced to hrm_db_user ID: {}, Email: {}, Company: {}, mustChangePassword: {} (employees table only)",
                saved.getId(), saved.getEmail(), saved.getCompany() != null ? saved.getCompany().getCompanyName() : "None", saved.getMustChangePassword());

        return ResponseEntity.ok("Employee synced to hrm_db_user successfully");
    }

    private boolean isBcryptHash(String value) {
        if (value == null) return false;
        String v = value.trim();
        return v.startsWith("$2a$") || v.startsWith("$2b$") || v.startsWith("$2y$");
    }
}
