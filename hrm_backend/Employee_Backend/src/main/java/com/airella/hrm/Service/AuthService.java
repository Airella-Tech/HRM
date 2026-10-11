package com.airella.hrm.service;

import com.airella.hrm.config.AuthenticatedUser;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.Employee;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Resolves the logged-in user for this service. Login, registration and passwords
 * are handled only by User_Backend; this service trusts the JWT it issues and reads
 * the person from User_Backend (there is no local employees table).
 */
@Service
public class AuthService {

    private final EmployeeDirectory employeeDirectory;

    public AuthService(EmployeeDirectory employeeDirectory) {
        this.employeeDirectory = employeeDirectory;
    }

    public Employee getCurrentEmployee() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName() == null ? "" : authentication.getName().trim().toLowerCase();
        Long userId = authentication.getPrincipal() instanceof AuthenticatedUser user ? user.userId() : null;

        return (userId != null ? employeeDirectory.findById(userId) : java.util.Optional.<Employee>empty())
                .or(() -> employeeDirectory.findByEmailIgnoreCase(email))
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "email", email));
    }
}
