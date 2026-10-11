package com.airella.hrm.controller;

import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.dto.CompanyDTO;
import com.airella.hrm.dto.CompanyRequestDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.model.Company;
import com.airella.hrm.repository.CompanyRepository;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.airella.hrm.service.NotificationService;

/**
 * Public controller for unauthenticated prospective company requests.
 */
@RestController
@RequestMapping("/api/public/companies")
public class PublicCompanyController {

    private static final Logger log = LoggerFactory.getLogger(PublicCompanyController.class);

    private final CompanyRepository companyRepository;
    private final NotificationService notificationService;

    public PublicCompanyController(CompanyRepository companyRepository,
                                   NotificationService notificationService) {
        this.companyRepository = companyRepository;
        this.notificationService = notificationService;
    }

    /**
     * Public endpoint to submit a company registration request.
     */
    @PostMapping("/request")
    public ResponseEntity<ApiResponse<CompanyDTO>> requestCompanyRegistration(
            @Valid @RequestBody CompanyRequestDTO dto) {

        log.info("Received public company registration request for company: {}", dto.getCompanyName());

        if (companyRepository.existsByCompanyName(dto.getCompanyName())) {
            throw new BusinessException("A company with the name '" + dto.getCompanyName() + "' already exists or is pending review.");
        }

        if (companyRepository.existsByRegistrationNumber(dto.getRegistrationNumber())) {
            throw new BusinessException("A company with registration number '" + dto.getRegistrationNumber() + "' is already registered.");
        }

        Company company = new Company();
        company.setCompanyName(dto.getCompanyName());
        company.setRegistrationNumber(dto.getRegistrationNumber());
        company.setEmail(dto.getEmail());
        company.setPhone(dto.getPhone());
        company.setAddress(dto.getAddress());
        company.setWebsite(dto.getWebsite());
        company.setIndustry(dto.getIndustry());
        company.setContactPersonName(dto.getContactPersonName());
        company.setContactPersonRole(dto.getContactPersonRole());
        company.setNotes(dto.getNotes());
        company.setEmployeeCount(dto.getEmployeeCount());
        company.setStatus(Company.CompanyStatus.PENDING);

        Company saved = companyRepository.save(company);
        log.info("Company registration request saved with ID: {}, Status: PENDING", saved.getId());

        // Trigger in-app notification for system admins
        notificationService.notifyAdminsForCompanyRequest(saved);

        CompanyDTO responseDto = mapToDTO(saved);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(responseDto, "Your company registration request has been submitted successfully. Our admin team will review your application and notify you via email."));
    }

    private CompanyDTO mapToDTO(Company c) {
        CompanyDTO dto = new CompanyDTO();
        dto.setId(c.getId());
        dto.setCompanyName(c.getCompanyName());
        dto.setRegistrationNumber(c.getRegistrationNumber());
        dto.setEmail(c.getEmail());
        dto.setPhone(c.getPhone());
        dto.setAddress(c.getAddress());
        dto.setWebsite(c.getWebsite());
        dto.setIndustry(c.getIndustry());
        dto.setContactPersonName(c.getContactPersonName());
        dto.setContactPersonRole(c.getContactPersonRole());
        dto.setNotes(c.getNotes());
        dto.setStatus(c.getStatus().name());
        dto.setEmployeeCount(c.getEmployeeCount() != null ? c.getEmployeeCount() : 0);
        if (c.getCreatedAt() != null) {
            dto.setCreatedAt(c.getCreatedAt().toString());
        }
        return dto;
    }
}
