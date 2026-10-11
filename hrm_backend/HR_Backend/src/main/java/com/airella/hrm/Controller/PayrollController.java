package com.airella.hrm.controller;

import com.airella.hrm.dto.*;
import com.airella.hrm.model.*;
import com.airella.hrm.service.EmployeeDirectory;
import com.airella.hrm.service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/hr")
@PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
public class PayrollController {

    private static final Logger log = LoggerFactory.getLogger(PayrollController.class);

    private final RestTemplate restTemplate;
    private final AuthService authService;
    private final EmployeeDirectory employeeDirectory;

    @Value("${service.employee-url:http://localhost:5006}")
    private String employeeServiceUrl;

    public PayrollController(RestTemplate restTemplate, AuthService authService, EmployeeDirectory employeeDirectory) {
        this.restTemplate = restTemplate;
        this.authService = authService;
        this.employeeDirectory = employeeDirectory;
    }

    @GetMapping("/salaries")
    public ResponseEntity<ApiResponse<List<SalaryDTO>>> getCompanySalaries() {
        Set<Long> userIds = companyUserIds(authService.getCurrentEmployee());
        if (userIds.isEmpty()) return ResponseEntity.ok(ApiResponse.success(Collections.emptyList()));
        try {
            String url = UriComponentsBuilder.fromHttpUrl(employeeServiceUrl + "/api/internal/salaries")
                    .queryParam("userIds", userIds.toArray()).toUriString();
            ResponseEntity<List<SalaryDTO>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET, null,
                    new ParameterizedTypeReference<List<SalaryDTO>>() {});
            return ResponseEntity.ok(ApiResponse.success(response.getBody()));
        } catch (Exception e) {
            log.error("Failed to fetch salaries from Employee backend: {}", e.getMessage());
            return ResponseEntity.ok(ApiResponse.success(Collections.emptyList()));
        }
    }

    @GetMapping("/salaries/employee/{id}")
    public ResponseEntity<ApiResponse<SalaryDTO>> getEmployeeSalary(@PathVariable Long id) {
        if (!companyUserIds(authService.getCurrentEmployee()).contains(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("Salary structure not found"));
        }
        try {
            SalaryDTO salary = restTemplate.getForObject(
                    employeeServiceUrl + "/api/internal/salaries/employee/" + id, SalaryDTO.class);
            return ResponseEntity.ok(ApiResponse.success(salary));
        } catch (Exception e) {
            log.error("Failed to fetch salary for employee {} from Employee backend: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("Salary structure not found"));
        }
    }

    @PostMapping("/salaries")
    public ResponseEntity<ApiResponse<SalaryDTO>> saveSalary(@RequestBody SalaryDTO dto) {
        if (!companyUserIds(authService.getCurrentEmployee()).contains(dto.getEmployeeId())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("Employee not found"));
        }
        try {
            HttpEntity<SalaryDTO> entity = new HttpEntity<>(dto);
            ResponseEntity<SalaryDTO> response = restTemplate.exchange(
                    employeeServiceUrl + "/api/internal/salaries",
                    HttpMethod.POST, entity, SalaryDTO.class);
            return ResponseEntity.ok(ApiResponse.success(response.getBody(), "Salary saved successfully"));
        } catch (Exception e) {
            log.error("Failed to save salary in Employee backend: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to save salary"));
        }
    }

    @PostMapping("/payroll/generate")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> generatePayroll(@RequestParam Integer month, @RequestParam Integer year) {
        Employee hr = authService.getCurrentEmployee();
        Long companyId = hr.getCompany().getId();
        try {
            String url = employeeServiceUrl + "/api/internal/payroll/generate?companyId=" + companyId + "&month=" + month + "&year=" + year;
            // Company and employee ids differ between the databases, so the employees are sent by email
            List<String> emails = employeeDirectory.findByCompanyIdAndStatus(companyId, Employee.EmployeeStatus.ACTIVE).stream()
                    .map(Employee::getEmail)
                    .collect(Collectors.toList());
            if (emails.isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("No active employees found in your company."));
            }
            // Generating looks each employee up in two other services, so it needs far longer than the default 10s
            org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(5000);
            factory.setReadTimeout(180_000);
            RestTemplate slow = new RestTemplate(factory);
            java.util.Map<?, ?> body = slow.postForObject(url, emails, java.util.Map.class);
            List<?> generated = body != null && body.get("generated") instanceof List<?> g ? g : List.of();
            List<?> skipped = body != null && body.get("skipped") instanceof List<?> sk ? sk : List.of();

            java.util.Map<String, Object> data = new java.util.HashMap<>();
            data.put("generated", generated.size());
            data.put("skipped", skipped);
            String msg = "Payslips generated for " + month + "/" + year + ": " + generated.size() + " sent"
                    + (skipped.isEmpty() ? "" : ", " + skipped.size() + " skipped");
            return ResponseEntity.ok(ApiResponse.success(data, msg));
        } catch (Exception e) {
            log.error("Failed to generate payroll in Employee backend: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to generate payroll: " + e.getMessage()));
        }
    }

    /**
     * Sends one employee's payslip for the month: the Employee backend creates / refreshes it from
     * the current pay sheet, makes it visible on the employee's Payslip page and notifies them.
     */
    @PostMapping("/payroll/send")
    public ResponseEntity<ApiResponse<PayslipDTO>> sendPayslip(@RequestBody java.util.Map<String, Object> body) {
        Employee hr = authService.getCurrentEmployee();
        String email = body.get("email") == null ? "" : String.valueOf(body.get("email")).trim();
        boolean inCompany = employeeDirectory.findByCompanyId(hr.getCompany().getId()).stream()
                .anyMatch(e -> e.getEmail() != null && e.getEmail().equalsIgnoreCase(email));
        if (email.isEmpty() || !inCompany) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("Employee not found"));
        }
        try {
            PayslipDTO sent = restTemplate.postForObject(employeeServiceUrl + "/api/internal/payroll/send", body, PayslipDTO.class);
            return ResponseEntity.ok(ApiResponse.success(sent, "Payslip sent"));
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            log.warn("Employee backend refused payslip send for {}: {}", email, e.getResponseBodyAsString());
            String msg = "Failed to send payslip";
            try {
                com.fasterxml.jackson.databind.JsonNode n = new com.fasterxml.jackson.databind.ObjectMapper().readTree(e.getResponseBodyAsString());
                if (n.hasNonNull("message")) msg = n.get("message").asText();
            } catch (Exception ignored) { /* keep the generic message */ }
            return ResponseEntity.badRequest().body(ApiResponse.error(msg));
        } catch (Exception e) {
            log.error("Failed to send payslip via Employee backend: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to send payslip: " + e.getMessage()));
        }
    }

    /** User ids of everyone in the HR user's company — the only salaries they may see or change. */
    private Set<Long> companyUserIds(Employee hr) {
        return employeeDirectory.findByCompanyId(hr.getCompany().getId()).stream()
                .map(Employee::getId)
                .collect(Collectors.toSet());
    }
}
