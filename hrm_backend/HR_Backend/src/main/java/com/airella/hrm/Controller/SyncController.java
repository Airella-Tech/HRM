package com.airella.hrm.controller;

import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.model.Company;
import com.airella.hrm.repository.CompanyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Sync controller — receives company data pushed from Admin_Backend.
 * People are not synced here: they live only in User_Backend and are read from there.
 * This endpoint is intentionally unauthenticated for inter-service communication.
 * In production, secure this with an API key or service mesh.
 */
@RestController
@RequestMapping("/api/sync")
public class SyncController {

    private static final Logger log = LoggerFactory.getLogger(SyncController.class);

    private final CompanyRepository companyRepository;

    public SyncController(CompanyRepository companyRepository) {
        this.companyRepository = companyRepository;
    }

    @PostMapping("/company")
    public ResponseEntity<ApiResponse<String>> syncCompany(@RequestBody Company company) {
        log.info("Received sync request for company: {}", company.getCompanyName());
        Company existing = companyRepository.findByRegistrationNumber(company.getRegistrationNumber()).orElse(null);
        if (existing != null) {
            existing.setCompanyName(company.getCompanyName());
            existing.setEmail(company.getEmail());
            existing.setPhone(company.getPhone());
            existing.setAddress(company.getAddress());
            existing.setWebsite(company.getWebsite());
            existing.setStatus(company.getStatus());
            existing.setRejectionReason(company.getRejectionReason());
            companyRepository.save(existing);
            log.info("Company updated successfully: {}", company.getCompanyName());
        } else {
            // The incoming id belongs to the sender's database; let this one assign its own.
            company.setId(null);
            companyRepository.save(company);
            log.info("Company created successfully: {}", company.getCompanyName());
        }
        return ResponseEntity.ok(ApiResponse.success("Company synced: " + company.getCompanyName(),
                "Sync completed successfully"));
    }
}
