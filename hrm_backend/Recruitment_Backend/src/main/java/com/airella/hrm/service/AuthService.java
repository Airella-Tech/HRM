package com.airella.hrm.service;

import com.airella.hrm.config.AuthenticatedUser;
import com.airella.hrm.dto.UserSummaryDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Resolves the logged-in user. Login and passwords are handled only by User_Backend;
 * this service trusts the JWT it issues and reads the person from User_Backend.
 */
@Service
public class AuthService {

    private final EmployeeDirectory employeeDirectory;

    public AuthService(EmployeeDirectory employeeDirectory) {
        this.employeeDirectory = employeeDirectory;
    }

    /** The logged-in HR manager / admin. */
    public UserSummaryDTO getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName() == null ? "" : authentication.getName().trim().toLowerCase();
        Long userId = authentication.getPrincipal() instanceof AuthenticatedUser user ? user.userId() : null;

        return (userId != null ? employeeDirectory.findById(userId) : java.util.Optional.<UserSummaryDTO>empty())
                .or(() -> employeeDirectory.findByEmailIgnoreCase(email))
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    /**
     * The company key used to scope all recruitment data (the company's registration number,
     * or its name if there is no registration number). Use this instead of a company id.
     */
    public String getCurrentCompanyRef() {
        UserSummaryDTO user = getCurrentUser();
        if (user.getCompanyRegistrationNumber() != null && !user.getCompanyRegistrationNumber().isBlank()) {
            return user.getCompanyRegistrationNumber();
        }
        if (user.getCompanyName() != null && !user.getCompanyName().isBlank()) {
            return user.getCompanyName();
        }
        throw new BusinessException("Your account is not linked to a company.");
    }

    public Long getCurrentCompanyId() {
        return resolveCompanyId(null);
    }

    public boolean isSystemAdmin() {
        UserSummaryDTO user = getCurrentUser();
        return "ADMIN".equalsIgnoreCase(user.getRole());
    }

    public Long resolveCompanyId(Long requestedCompanyId) {
        UserSummaryDTO user = getCurrentUser();
        if ("ADMIN".equalsIgnoreCase(user.getRole()) && requestedCompanyId != null) {
            return requestedCompanyId;
        }
        if (user.getCompanyId() != null) {
            return user.getCompanyId();
        }
        if (requestedCompanyId != null) {
            return requestedCompanyId;
        }
        throw new BusinessException("Your account is not linked to a company.");
    }
}