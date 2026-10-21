package com.airella.hrm.controller;

import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.dto.PublicVacancyDTO;
import com.airella.hrm.service.CareersService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Public endpoints (no login). Security allows /api/careers/** without a token. */
@RestController
@RequestMapping("/api/careers/jobs")
public class CareersController {

    private final CareersService careersService;

    public CareersController(CareersService careersService) {
        this.careersService = careersService;
    }

    // "company" is checked in the service, so a missing value gives a clear 400 message.

    @GetMapping
    public ResponseEntity<ApiResponse<List<PublicVacancyDTO>>> list(
            @RequestParam(required = false) String company,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String jobType,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.success(careersService.listOpen(company, department, jobType, search)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PublicVacancyDTO>> get(@PathVariable Long id,
                                                             @RequestParam(required = false) String company) {
        return ResponseEntity.ok(ApiResponse.success(careersService.getOpen(id, company)));
    }
}