package com.airella.hrm.controller;

import com.airella.hrm.dto.AllowanceRequestDTO;
import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.model.Employee;
import com.airella.hrm.service.AllowanceRequestClient;
import com.airella.hrm.service.AuthService;
import com.airella.hrm.service.SalaryConfigService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * HR review of employees' allowance requests (stored by Employee_Backend). Approving one is
 * followed in the UI by adding it to the employee's individual allowances (additional_payments).
 */
@RestController
@RequestMapping("/api/hr/allowance-requests")
@PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
public class AllowanceRequestController {

    private final AllowanceRequestClient allowanceRequestClient;
    private final AuthService authService;
    private final SalaryConfigService salaryConfigService;

    public AllowanceRequestController(AllowanceRequestClient allowanceRequestClient, AuthService authService,
                                      SalaryConfigService salaryConfigService) {
        this.allowanceRequestClient = allowanceRequestClient;
        this.authService = authService;
        this.salaryConfigService = salaryConfigService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AllowanceRequestDTO>>> getRequests() {
        Employee hr = authService.getCurrentEmployee();
        List<AllowanceRequestDTO> requests = allowanceRequestClient.getRequests(hr);
        Set<Long> added = salaryConfigService.getAddedRequestIds(hr.getCompany().getId());
        requests.forEach(r -> r.setAddedToPay(r.getId() != null && added.contains(r.getId())));
        return ResponseEntity.ok(ApiResponse.success(requests));
    }

    @GetMapping("/{id}/document")
    public ResponseEntity<byte[]> getDocument(@PathVariable Long id) {
        Employee hr = authService.getCurrentEmployee();
        AllowanceRequestDTO request = allowanceRequestClient.getRequest(id, hr);
        byte[] pdf = allowanceRequestClient.getDocument(id);
        String fileName = request.getDocumentName() == null ? "document.pdf" : request.getDocumentName();
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(fileName, StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(pdf);
    }

    /** Body (optional): { "comment": "..." } */
    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<AllowanceRequestDTO>> approve(@PathVariable Long id,
                                                                    @RequestBody(required = false) Map<String, String> body) {
        Employee hr = authService.getCurrentEmployee();
        AllowanceRequestDTO reviewed = allowanceRequestClient.review(id, "APPROVED", body == null ? null : body.get("comment"), hr);
        // Approving adds the allowance to the employee's pay right away (no second "Save" step)
        salaryConfigService.addApprovedRequest(reviewed, hr);
        reviewed.setAddedToPay(true);
        return ResponseEntity.ok(ApiResponse.success(reviewed, "Allowance request approved and added to the employee's pay"));
    }

    /** Adds an already approved request to the employee's pay (e.g. one approved before this was automatic). */
    @PostMapping("/{id}/add-to-pay")
    public ResponseEntity<ApiResponse<AllowanceRequestDTO>> addToPay(@PathVariable Long id) {
        Employee hr = authService.getCurrentEmployee();
        AllowanceRequestDTO request = allowanceRequestClient.getRequest(id, hr);
        salaryConfigService.addApprovedRequest(request, hr);
        request.setAddedToPay(true);
        return ResponseEntity.ok(ApiResponse.success(request, "Allowance added to the employee's pay"));
    }

    /** Body: { "comment": "reason for rejecting" } */
    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<AllowanceRequestDTO>> reject(@PathVariable Long id,
                                                                   @RequestBody(required = false) Map<String, String> body) {
        Employee hr = authService.getCurrentEmployee();
        AllowanceRequestDTO reviewed = allowanceRequestClient.review(id, "REJECTED", body == null ? null : body.get("comment"), hr);
        return ResponseEntity.ok(ApiResponse.success(reviewed, "Allowance request rejected"));
    }
}
