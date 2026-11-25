package com.airella.hrm.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String type = "Bearer";
    private String email;
    private String fullName;
    private String role;
    private Long companyId;
    private Long employeeId;
    private boolean mustChangePassword;

    public AuthResponse(String token, String email, String fullName, String role, Long companyId, Long employeeId) {
        this(token, email, fullName, role, companyId, employeeId, false);
    }

    public AuthResponse(String token, String email, String fullName, String role, Long companyId, Long employeeId, boolean mustChangePassword) {
        this.token = token;
        this.email = email;
        this.fullName = fullName;
        this.role = role;
        this.companyId = companyId;
        this.employeeId = employeeId;
        this.mustChangePassword = mustChangePassword;
    }
}
