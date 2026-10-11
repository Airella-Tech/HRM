package com.airella.hrm.controller;

import com.airella.hrm.dto.AllowanceRequestDTO;
import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.model.AllowanceRequestDocument;
import com.airella.hrm.model.Employee;
import com.airella.hrm.service.AllowanceRequestService;
import com.airella.hrm.service.AuthService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;

/** Employee self-service: request an allowance (with a PDF) and see the outcome of past requests. */
@RestController
@RequestMapping("/api/employee/allowance-requests")
@PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'EMPLOYEE')")
public class AllowanceRequestController {

    private final AllowanceRequestService allowanceRequestService;
    private final AuthService authService;

    public AllowanceRequestController(AllowanceRequestService allowanceRequestService, AuthService authService) {
        this.allowanceRequestService = allowanceRequestService;
        this.authService = authService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AllowanceRequestDTO>>> getMyRequests() {
        Employee employee = authService.getCurrentEmployee();
        return ResponseEntity.ok(ApiResponse.success(allowanceRequestService.getForEmployee(employee)));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AllowanceRequestDTO>> requestAllowance(
            @RequestParam("name") String name,
            @RequestParam("amount") BigDecimal amount,
            @RequestParam("description") String description,
            @RequestParam("document") MultipartFile document) {
        Employee employee = authService.getCurrentEmployee();
        AllowanceRequestDTO created = allowanceRequestService.create(employee, name, amount, description, document);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "Allowance request sent to HR"));
    }

    @GetMapping("/{id}/document")
    public ResponseEntity<byte[]> getMyDocument(@PathVariable Long id) {
        Employee employee = authService.getCurrentEmployee();
        return pdfResponse(allowanceRequestService.getDocumentForEmployee(employee, id));
    }

    static ResponseEntity<byte[]> pdfResponse(AllowanceRequestDocument doc) {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(doc.getFileName(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(doc.getData());
    }
}
