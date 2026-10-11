package com.airella.hrm.config;

import com.airella.hrm.DTO.RegisterRequest;
import com.airella.hrm.service.AuthService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Seeds hardcoded default Admin/HR/Employee accounts on startup so a fresh
 * database always has a way to log in. Skips accounts that already exist.
 */
@Component
public class DefaultAccountSeeder implements CommandLineRunner {

    private final AuthService authService;

    public DefaultAccountSeeder(AuthService authService) {
        this.authService = authService;
    }

    @Override
    public void run(String... args) {
        seed("System Admin", "admin@hrm.local", "Admin@123", "ADMIN", "Administration");
        seed("HR Manager", "hr@hrm.local", "Hr@12345", "HR_MANAGER", "Human Resources");
        seed("Default Employee", "employee@hrm.local", "Employee@123", "EMPLOYEE", "General");
    }

    private void seed(String fullName, String email, String password, String role, String department) {
        if (authService.checkUserExists(email)) {
            return;
        }

        RegisterRequest request = new RegisterRequest();
        request.setFullName(fullName);
        request.setEmail(email);
        request.setPassword(password);
        request.setRole(role);
        request.setDepartment(department);
        request.setJoiningDate(LocalDate.now());
        request.setGender("OTHER");

        try {
            authService.register(request);
            System.out.println("[SEED] Created default " + role + " account: " + email);
        } catch (Exception e) {
            System.err.println("[SEED] Failed to create default " + role + " account (" + email + "): " + e.getMessage());
        }
    }
}
