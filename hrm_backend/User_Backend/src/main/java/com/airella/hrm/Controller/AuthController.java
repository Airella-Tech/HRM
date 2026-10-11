package com.airella.hrm.Controller;

import com.airella.hrm.DTO.ApiResponse;
import com.airella.hrm.DTO.AuthRequest;
import com.airella.hrm.DTO.AuthResponse;
import com.airella.hrm.DTO.RegisterRequest;
import com.airella.hrm.service.AuthService;
import com.airella.hrm.config.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody AuthRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(ApiResponse.success(response, "Login successful"));
        } catch (Exception e) {
            // Log the full error for debugging
            e.printStackTrace();
            String errorMsg = e.getMessage();
            if (errorMsg == null || errorMsg.contains("Bad credentials")) {
                errorMsg = "Invalid email or password. Please check your credentials and try again.";
            }
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(errorMsg));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<?>> getCurrentUser() {
        try {
            var employee = authService.getCurrentEmployee();
            return ResponseEntity.ok(ApiResponse.success(employee, "User details retrieved"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve user: " + e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<?>> register(@Valid @RequestBody RegisterRequest request) {
        try {
            var employee = authService.register(request);

            // Return a flat summary, NOT the JPA entity. The entity holds lazy Hibernate proxies
            // (department.company, ...) that Jackson cannot serialize, which made the response
            // fail with a 500 *after* the employee had already been saved.
            Map<String, Object> summary = new HashMap<>();
            summary.put("id", employee.getId());
            summary.put("employeeId", employee.getEmployeeId());
            summary.put("fullName", employee.getFullName());
            summary.put("email", employee.getEmail());
            summary.put("role", employee.getRole() != null ? employee.getRole().name() : null);
            summary.put("status", employee.getStatus() != null ? employee.getStatus().name() : null);
            return ResponseEntity.ok(ApiResponse.success(summary, "Registration successful"));
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            String cause = String.valueOf(e.getMostSpecificCause() != null ? e.getMostSpecificCause().getMessage() : e.getMessage()).toLowerCase();
            String msg = cause.contains("email") ? "Employee with email already exists"
                    : cause.contains("employee_id") || cause.contains("employeeid") ? "Employee ID already exists"
                    : "Could not save employee: conflicts with existing data";
            return ResponseEntity.badRequest().body(ApiResponse.error("Registration failed: " + msg));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Registration failed: " + e.getMessage()));
        }
    }

    @GetMapping("/next-employee-id/{role}")
    public ResponseEntity<ApiResponse<?>> nextEmployeeId(@PathVariable String role) {
        try {
            var result = authService.getNextEmployeeId(role);
            return ResponseEntity.ok(ApiResponse.success(result, "Next employee ID generated"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to generate employee ID: " + e.getMessage()));
        }
    }

    @GetMapping("/check-user/{email}")
    public ResponseEntity<ApiResponse<?>> checkUserExists(@PathVariable String email) {
        try {
            boolean exists = authService.checkUserExists(email);
            return ResponseEntity.ok(ApiResponse.success(exists, exists ? "User exists" : "User not found"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Error checking user: " + e.getMessage()));
        }
    }

    @GetMapping("/debug-user/{email}")
    public ResponseEntity<ApiResponse<?>> debugUser(@PathVariable String email) {
        try {
            Map<String, Object> info = new HashMap<>();
            info.put("normalizedEmail", email == null ? "" : email.trim().toLowerCase());
            info.put("existsInEmployees", authService.checkUserExists(email));
            info.put("existsInLegacyUsers", authService.checkLegacyUserExists(email));
            return ResponseEntity.ok(ApiResponse.success(info, "Debug info"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Debug failed: " + e.getMessage()));
        }
    }

    @PostMapping("/sync-all")
    public ResponseEntity<ApiResponse<String>> syncAll() {
        try {
            authService.syncAllEmployees();
            return ResponseEntity.ok(ApiResponse.success("Triggered sync for all employees successfully", "Sync completed"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Sync failed: " + e.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<String>> forgotPassword(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String token = authService.forgotPassword(email);
            return ResponseEntity.ok(ApiResponse.success(token, "Password reset link sent successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<String>> resetPassword(@RequestBody Map<String, String> body) {
        try {
            String token = body.get("token");
            String password = body.get("password");
            authService.resetPassword(token, password);
            return ResponseEntity.ok(ApiResponse.success(null, "Password reset successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(@RequestBody Map<String, String> body) {
        try {
            var employee = authService.getCurrentEmployee();
            String oldPassword = body.get("oldPassword");
            String newPassword = body.get("newPassword");
            authService.changePassword(employee.getEmail(), oldPassword, newPassword);
            return ResponseEntity.ok(ApiResponse.success(null, "Password changed successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(@RequestBody Map<String, String> body) {
        try {
            String token = body.get("token");
            String email = jwtUtil.getEmailFromToken(token);
            boolean isValid = jwtUtil.validateToken(token);
            if (!isValid) {
                return ResponseEntity.status(401).body(ApiResponse.error("Invalid token"));
            }
            String newToken = jwtUtil.generateTokenFromEmail(email);
            AuthResponse response = new AuthResponse();
            response.setToken(newToken);
            response.setEmail(email);
            return ResponseEntity.ok(ApiResponse.success(response, "Token refreshed successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to refresh token: " + e.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout(@RequestParam Long userId) {
        try {
            authService.logout(userId);
            return ResponseEntity.ok(ApiResponse.success(null, "Logout successful"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/session")
    public ResponseEntity<ApiResponse<Boolean>> validateSession(@RequestParam Long userId) {
        try {
            boolean active = authService.validateSession(userId);
            return ResponseEntity.ok(ApiResponse.success(active, active ? "Session active" : "No active session"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}