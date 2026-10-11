package com.airella.hrm.controller;

import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.dto.AuthRequest;
import com.airella.hrm.dto.AuthResponse;
import com.airella.hrm.dto.EmployeeDTO;
import com.airella.hrm.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

/**
 * Admin authentication controller.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody AuthRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Admin login successful"));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthResponse>> getCurrentAdmin(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));
        }
        
        EmployeeDTO admin = authService.getCurrentAdmin(principal.getName());
        AuthResponse response = new AuthResponse();
        response.setId(admin.getId());
        response.setEmail(admin.getEmail());
        response.setFullName(admin.getFullName());
        response.setRole(admin.getRole());
        response.setCompanyId(admin.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
