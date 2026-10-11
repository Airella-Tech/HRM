package com.airella.hrm.service;

import com.airella.hrm.config.JwtUtil;
import com.airella.hrm.DTO.AuthRequest;
import com.airella.hrm.DTO.AuthResponse;
import com.airella.hrm.DTO.RegisterRequest;
import com.airella.hrm.Model.Employee;
import com.airella.hrm.Model.User;
import com.airella.hrm.Model.Company;
import com.airella.hrm.Model.Department;
import com.airella.hrm.Model.SessionLog;
import com.airella.hrm.Repo.CompanyRepo;
import com.airella.hrm.Repo.DepartmentRepo;
import com.airella.hrm.Repo.EmployeeRepo;
import com.airella.hrm.Repo.UserRepo;
import com.airella.hrm.Repo.SessionLogRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class AuthService {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private EmployeeRepo employeeRepo;

        @Autowired
        private UserRepo userRepo;

        @Autowired
        private CompanyRepo companyRepo;

        @Autowired
        private DepartmentRepo departmentRepo;

        @Autowired
        private SessionLogRepo sessionLogRepo;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private EmploymentTypeService employmentTypeService;

    private static final String DEFAULT_COMPANY_NAME = "Default Company";
        private static final String DEFAULT_COMPANY_REG = "DEFAULT-REG-0001";

        private static final java.util.Map<String, String> ROLE_EMPLOYEE_ID_PREFIX = java.util.Map.of(
                        "EMPLOYEE", "EMP",
                        "HR_MANAGER", "HR",
                        "ADMIN", "SA"
        );

    public AuthResponse login(AuthRequest request) {
                String normalizedEmail = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
                String rawPassword = request.getPassword() == null ? "" : request.getPassword();
                System.out.println("[AUTH_SERVICE] Login attempt for: " + normalizedEmail);

                // Legacy module support: migrate legacy user if needed
                migrateLegacyUserIfNeeded(normalizedEmail, rawPassword);

                // Backward-compatibility: if password stored in DB is plain text, upgrade it to BCrypt before authenticating
                employeeRepo.findByEmailIgnoreCase(normalizedEmail).ifPresent(employee -> {
                        String stored = employee.getPassword();
                        if (stored != null
                                        && !isBcryptHash(stored)
                                        && stored.equals(rawPassword)) {
                                employee.setPassword(passwordEncoder.encode(rawPassword));
                                employeeRepo.save(employee);
                                System.out.println("[AUTH_SERVICE] Upgraded plain-text password to BCrypt for: " + normalizedEmail);
                        }
                });

                Authentication authentication = authenticationManager.authenticate(
                                new UsernamePasswordAuthenticationToken(normalizedEmail, rawPassword)
                );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        Employee employee = employeeRepo.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String jwt = jwtUtil.generateToken(authentication, employee.getId());

        try {
            SessionLog session = new SessionLog();
            session.setUserId(employee.getId());
            session.setLoginTime(LocalDateTime.now());
            session.setDeviceType("React Web / Flutter Mobile");
            session.setStatus(true);
            sessionLogRepo.save(session);
        } catch (Exception e) {
            System.err.println("[SESSION LOG ERROR] " + e.getMessage());
        }

        return new AuthResponse(
                jwt,
                employee.getEmail(),
                employee.getFullName(),
                employee.getRole().name(),
                employee.getCompany() != null ? employee.getCompany().getId() : null,
                employee.getId(),
                Boolean.TRUE.equals(employee.getMustChangePassword())
        );
    }

        private void migrateLegacyUserIfNeeded(String normalizedEmail, String rawPassword) {
                // If an employee already exists, no migration needed.
                if (employeeRepo.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
                        return;
                }

                User legacyUser = userRepo.findByEmailIgnoreCase(normalizedEmail).orElse(null);
                if (legacyUser == null) {
                        return;
                }

                String legacyStoredPassword = legacyUser.getPassword();
                if (legacyStoredPassword == null) {
                        return;
                }

                boolean passwordMatches;
                if (isBcryptHash(legacyStoredPassword)) {
                        passwordMatches = passwordEncoder.matches(rawPassword, legacyStoredPassword);
                } else {
                        passwordMatches = legacyStoredPassword.equals(rawPassword);
                }

                if (!passwordMatches) {
                        return;
                }

                Company company = companyRepo.findByRegistrationNumber(DEFAULT_COMPANY_REG)
                                .orElseGet(() -> {
                                        Company newCompany = new Company();
                                        newCompany.setCompanyName(DEFAULT_COMPANY_NAME);
                                        newCompany.setRegistrationNumber(DEFAULT_COMPANY_REG);
                                        newCompany.setStatus(Company.CompanyStatus.APPROVED);
                                        return companyRepo.save(newCompany);
                                });

                Department department = departmentRepo.findByCompanyIdAndName(company.getId(), "General")
                                .orElseGet(() -> {
                                        Department newDept = new Department();
                                        newDept.setName("General");
                                        newDept.setDescription("General Department");
                                        newDept.setCompany(company);
                                        return departmentRepo.save(newDept);
                                });

                Employee employee = new Employee();
                employee.setFullName(legacyUser.getFullName() != null ? legacyUser.getFullName() : "User");
                employee.setEmail(normalizedEmail);
                employee.setEmployeeId(legacyUser.getEmployeeId() != null ? legacyUser.getEmployeeId() : "EMP-" + System.currentTimeMillis());
                employee.setNic(legacyUser.getNic());
                employee.setDob(legacyUser.getDob());
                employee.setAddress(legacyUser.getAddress());
                employee.setCompany(company);
                employee.setDepartment(department);

                // Normalize legacy role values (often stored as 'admin'/'hr'/'employee')
                employee.setRole(mapLegacyRole(legacyUser.getRole()));
                employee.setStatus(Employee.EmployeeStatus.ACTIVE);
                employee.setJoiningDate(java.time.LocalDate.now());

                // Always store BCrypt in the new system
                employee.setPassword(passwordEncoder.encode(rawPassword));

                employeeRepo.save(employee);
        }

        private Employee.Role mapLegacyRole(String role) {
                if (role == null) return Employee.Role.EMPLOYEE;
                String normalized = role.trim().toUpperCase().replace("-", "_").replace(" ", "_");
                return switch (normalized) {
                        case "ADMIN" -> Employee.Role.ADMIN;
                        case "HR", "HR_MANAGER", "HRMANAGER" -> Employee.Role.HR_MANAGER;
                        case "EMPLOYEE", "USER" -> Employee.Role.EMPLOYEE;
                        default -> {
                                try {
                                        yield Employee.Role.valueOf(normalized);
                                } catch (Exception ignored) {
                                        yield Employee.Role.EMPLOYEE;
                                }
                        }
                };
        }

    public Employee getCurrentEmployee() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
                String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
                return employeeRepo.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

        public Employee register(RegisterRequest request) {
                String normalizedEmail = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();

                if (employeeRepo.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
                        throw new RuntimeException("Employee with email already exists");
                }

                if (request.getEmployeeId() != null && employeeRepo.findByEmployeeId(request.getEmployeeId()).isPresent()) {
                        throw new RuntimeException("Employee ID already exists");
                }

                // The new account always joins the creator's company, so each company's
                // HR managers only ever add people to their own company.
                Employee creator = null;
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
                        String authEmail = auth.getName() != null ? auth.getName().trim().toLowerCase() : "";
                        creator = employeeRepo.findByEmailIgnoreCase(authEmail).orElse(null);
                }
                if (creator != null && creator.getCompany() == null) {
                        throw new RuntimeException("Your account is not linked to a company");
                }
                Company company = creator != null ? creator.getCompany() : null;

                // Only the built-in seeding runs without a logged-in creator; it uses the default company.
                if (company == null) {
                        company = companyRepo.findByRegistrationNumber(DEFAULT_COMPANY_REG)
                                        .orElseGet(() -> {
                                                Company newCompany = new Company();
                                                newCompany.setCompanyName(DEFAULT_COMPANY_NAME);
                                                newCompany.setRegistrationNumber(DEFAULT_COMPANY_REG);
                                                newCompany.setStatus(Company.CompanyStatus.APPROVED);
                                                return companyRepo.save(newCompany);
                                        });
                }

                final Company finalCompany = company;

                String deptName = (request.getDepartment() == null || request.getDepartment().isBlank())
                                ? "General" : request.getDepartment().trim();

                Department department = departmentRepo.findByCompanyIdAndName(finalCompany.getId(), deptName)
                                .orElseGet(() -> {
                                        Department newDept = new Department();
                                        newDept.setName(deptName);
                                        newDept.setDescription(deptName + " Department");
                                        newDept.setCompany(finalCompany);
                                        return departmentRepo.save(newDept);
                                });

                Employee.Role resolvedRole = Employee.Role.EMPLOYEE;
                if (request.getRole() != null) {
                        String normalizedRole = request.getRole().trim().toUpperCase()
                                        .replace("-", "_")
                                        .replace(" ", "_");
                        try {
                                resolvedRole = Employee.Role.valueOf(normalizedRole);
                        } catch (Exception ignored) {
                                resolvedRole = Employee.Role.EMPLOYEE;
                        }
                }
                // HR managers add employees and other HR managers; only an administrator can add an administrator
                if (creator != null && resolvedRole == Employee.Role.ADMIN && creator.getRole() != Employee.Role.ADMIN) {
                        throw new RuntimeException("Only an administrator can create administrator accounts");
                }

                Employee employee = new Employee();
                employee.setFullName(request.getFullName());
                employee.setEmail(normalizedEmail);
                employee.setPassword(passwordEncoder.encode(request.getPassword()));
                employee.setEmployeeId(request.getEmployeeId() != null && !request.getEmployeeId().isBlank()
                                ? request.getEmployeeId()
                                : generateEmployeeId(employeeIdPrefixForRole(resolvedRole.name())));
                employee.setNic(request.getNic());
                employee.setDob(request.getDob());
                employee.setAddress(request.getAddress());
                employee.setPhone(request.getPhone());
                employee.setDesignation(request.getDesignation());
                employee.setEmploymentType(employmentTypeService.resolve(request.getEmploymentType(), null));
                employee.setJoiningDate(request.getJoiningDate() != null ? request.getJoiningDate() : java.time.LocalDate.now());
                employee.setCompany(company);
                employee.setDepartment(department);

                if (request.getGender() != null) {
                        try {
                                employee.setGender(Employee.Gender.valueOf(request.getGender().trim().toUpperCase()));
                        } catch (Exception ignored) {
                                employee.setGender(Employee.Gender.OTHER);
                        }
                } else {
                        employee.setGender(Employee.Gender.OTHER);
                }

                employee.setRole(resolvedRole);
                employee.setStatus(Employee.EmployeeStatus.ACTIVE);
                Employee savedEmployee = employeeRepo.save(employee);
                
                // Sync employee to legacy users table in hrm_db_user
                syncUserTable(savedEmployee);
                
                return savedEmployee;
        }

        public void syncUserTable(Employee employee) {
                if (employee == null || employee.getEmail() == null) return;
                try {
                        String normalizedEmail = employee.getEmail().trim().toLowerCase();
                        User user = userRepo.findByEmailIgnoreCase(normalizedEmail).orElseGet(() -> {
                                User u = new User();
                                u.setEmail(normalizedEmail);
                                return u;
                        });

                        if (employee.getFullName() != null) user.setFullName(employee.getFullName());
                        if (employee.getPassword() != null && !employee.getPassword().isBlank()) {
                                user.setPassword(employee.getPassword());
                        }
                        if (employee.getEmployeeId() != null) user.setEmployeeId(employee.getEmployeeId());
                        if (employee.getNic() != null) user.setNic(employee.getNic());
                        if (employee.getDob() != null) user.setDob(employee.getDob());
                        if (employee.getAddress() != null) user.setAddress(employee.getAddress());
                        if (employee.getGender() != null) user.setGender(employee.getGender().name());
                        if (employee.getRole() != null) user.setRole(employee.getRole().name());
                        if (employee.getDepartment() != null && employee.getDepartment().getName() != null) {
                                user.setDepartment(employee.getDepartment().getName());
                        }

                        userRepo.save(user);
                        System.out.println("[USER_DB SYNC] Updated users table for: " + normalizedEmail);
                } catch (Exception e) {
                        System.err.println("[USER_DB SYNC ERROR] Failed to update users table for " + employee.getEmail() + ": " + e.getMessage());
                }
        }

        private boolean isBcryptHash(String value) {
                if (value == null) return false;
                String v = value.trim();
                return v.startsWith("$2a$") || v.startsWith("$2b$") || v.startsWith("$2y$");
        }

        private String employeeIdPrefixForRole(String role) {
                String normalizedRole = role == null ? "" : role.trim().toUpperCase().replace("-", "_").replace(" ", "_");
                return ROLE_EMPLOYEE_ID_PREFIX.getOrDefault(normalizedRole, "EMP");
        }

        private int nextEmployeeIdNumber(String prefix) {
                return employeeRepo.findByEmployeeIdStartingWith(prefix + "-").stream()
                                .map(Employee::getEmployeeId)
                                .map(id -> id.substring(prefix.length() + 1))
                                .filter(suffix -> suffix.matches("\\d+"))
                                .mapToInt(Integer::parseInt)
                                .max()
                                .orElse(0) + 1;
        }

        /** Next free employee number for a role, e.g. HR-004. */
        public String generateEmployeeIdForRole(String role) {
                return generateEmployeeId(employeeIdPrefixForRole(role));
        }

        private String generateEmployeeId(String prefix) {
                return prefix + "-" + String.format("%03d", nextEmployeeIdNumber(prefix));
        }

        public java.util.Map<String, Object> getNextEmployeeId(String role) {
                String prefix = employeeIdPrefixForRole(role);
                int nextNumber = nextEmployeeIdNumber(prefix);
                String formattedNumber = String.format("%03d", nextNumber);

                java.util.Map<String, Object> result = new java.util.HashMap<>();
                result.put("prefix", prefix);
                result.put("nextNumber", nextNumber);
                result.put("formattedNumber", formattedNumber);
                result.put("suggestedId", prefix + "-" + formattedNumber);
                return result;
        }

        public boolean checkUserExists(String email) {
                String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
                return employeeRepo.findByEmailIgnoreCase(normalizedEmail).isPresent();
        }

        public boolean checkLegacyUserExists(String email) {
                String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
                return userRepo.findByEmailIgnoreCase(normalizedEmail).isPresent();
        }

        @org.springframework.transaction.annotation.Transactional
        public void syncAllEmployees() {
                 System.out.println("[SYNC] Starting sync of all employees to the legacy users table...");
                 employeeRepo.findAll().forEach(employee -> {
                         try {
                                 syncUserTable(employee);
                         } catch (Exception e) {
                                 System.err.println("[SYNC ERROR] Failed to sync employee: " + employee.getEmail() + " Error: " + e.getMessage());
                         }
                 });
         }

         public String forgotPassword(String email) {
                 String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
                 Employee employee = employeeRepo.findByEmailIgnoreCase(normalizedEmail)
                         .orElseThrow(() -> new RuntimeException("Employee not found with email: " + email));
                 String token = UUID.randomUUID().toString();
                 employee.setResetPasswordToken(token);
                 employee.setResetPasswordTokenExpiry(LocalDateTime.now().plusHours(1)); // 1 hour expiry
                 employeeRepo.save(employee);
                 
                 // Mock Link logged to console
                 String resetLink = "http://localhost:5173/reset-password?token=" + token;
                 System.out.println("[FORGOT_PASSWORD] Generated password reset link: " + resetLink);
                 return token;
         }

         public void resetPassword(String token, String newPassword) {
                 Employee employee = employeeRepo.findByResetPasswordToken(token)
                         .orElseThrow(() -> new RuntimeException("Invalid or expired reset token"));
                 
                 if (employee.getResetPasswordTokenExpiry().isBefore(LocalDateTime.now())) {
                         throw new RuntimeException("Reset token has expired");
                 }
                 
                 employee.setPassword(passwordEncoder.encode(newPassword));
                 employee.setResetPasswordToken(null);
                 employee.setResetPasswordTokenExpiry(null);
                 Employee saved = employeeRepo.save(employee);
                 
                 // Also update in User table if legacy user exists
                 userRepo.findByEmailIgnoreCase(saved.getEmail()).ifPresent(user -> {
                         user.setPassword(passwordEncoder.encode(newPassword));
                         userRepo.save(user);
                 });
         }

         public void changePassword(String email, String oldPassword, String newPassword) {
                 String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
                 Employee employee = employeeRepo.findByEmailIgnoreCase(normalizedEmail)
                         .orElseThrow(() -> new RuntimeException("Employee not found with email: " + email));

                 if (!passwordEncoder.matches(oldPassword, employee.getPassword())) {
                     throw new RuntimeException("Current temporary password is invalid");
                 }

                 employee.setPassword(passwordEncoder.encode(newPassword));
                 employee.setMustChangePassword(false);
                 Employee saved = employeeRepo.save(employee);

                 userRepo.findByEmailIgnoreCase(saved.getEmail()).ifPresent(user -> {
                         user.setPassword(passwordEncoder.encode(newPassword));
                         userRepo.save(user);
                 });
         }

         public void logout(Long userId) {
                 sessionLogRepo.findFirstByUserIdAndStatusTrueOrderByIdDesc(userId).ifPresent(session -> {
                         session.setLogoutTime(LocalDateTime.now());
                         session.setStatus(false);
                         sessionLogRepo.save(session);
                         System.out.println("[LOGOUT] Session closed for user ID: " + userId);
                 });
         }

         public boolean validateSession(Long userId) {
                 return sessionLogRepo.findFirstByUserIdAndStatusTrueOrderByIdDesc(userId)
                         .map(SessionLog::getStatus)
                         .orElse(false);
         }
}
