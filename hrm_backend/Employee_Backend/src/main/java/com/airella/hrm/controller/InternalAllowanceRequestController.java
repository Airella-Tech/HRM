package com.airella.hrm.controller;

import com.airella.hrm.dto.AllowanceRequestDTO;
import com.airella.hrm.service.AllowanceRequestService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Internal API for HR_Backend (service-to-service, not protected by JWT — like the other
 * /api/internal endpoints). HR_Backend checks the request belongs to its company before calling.
 */
@RestController
@RequestMapping("/api/internal/allowance-requests")
public class InternalAllowanceRequestController {

    private final AllowanceRequestService allowanceRequestService;

    public InternalAllowanceRequestController(AllowanceRequestService allowanceRequestService) {
        this.allowanceRequestService = allowanceRequestService;
    }

    /** Body: the emails of the HR company's employees. */
    @PostMapping("/search")
    public ResponseEntity<List<AllowanceRequestDTO>> search(@RequestBody List<String> emails) {
        return ResponseEntity.ok(allowanceRequestService.getForEmails(emails));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AllowanceRequestDTO> get(@PathVariable Long id) {
        return ResponseEntity.ok(allowanceRequestService.get(id));
    }

    @GetMapping("/{id}/document")
    public ResponseEntity<byte[]> getDocument(@PathVariable Long id) {
        return AllowanceRequestController.pdfResponse(allowanceRequestService.getDocument(id));
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<AllowanceRequestDTO> review(@PathVariable Long id,
                                                     @RequestBody AllowanceRequestDTO.ReviewRequest review) {
        return ResponseEntity.ok(allowanceRequestService.review(id, review));
    }
}
