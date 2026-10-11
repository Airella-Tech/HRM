package com.airella.hrm.controller;

import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.dto.AuthResponse;
import com.airella.hrm.model.Employee;
import com.airella.hrm.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Current-user info. Login, registration and passwords are handled only by User_Backend.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthResponse>> getCurrentUser() {
        Employee employee = authService.getCurrentEmployee();
        AuthResponse response = new AuthResponse();
        response.setId(employee.getId());
        response.setEmail(employee.getEmail());
        response.setFullName(employee.getFullName());
        response.setRole(employee.getRole().name());
        response.setCompanyId(employee.getCompany() != null ? employee.getCompany().getId() : null);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
