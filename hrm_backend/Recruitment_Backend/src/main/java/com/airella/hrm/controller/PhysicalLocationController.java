
package com.airella.hrm.controller;

import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.dto.PhysicalLocationDTO;
import com.airella.hrm.dto.PhysicalLocationRequestDTO;
import com.airella.hrm.service.PhysicalLocationService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recruitment/physical-locations")
public class PhysicalLocationController {

    private static final String CAN_VIEW =
            "@perm.isFullAccess() or @perm.hasRecruitmentAccess()";

    private static final String CAN_MANAGE =
            "@perm.hasAny('INTERVIEW_SCHEDULE', 'INTERVIEW_ASSIGN')";

    private final PhysicalLocationService locationService;

    public PhysicalLocationController(
            PhysicalLocationService locationService) {

        this.locationService = locationService;
    }

    // CREATE
    @PostMapping
    @PreAuthorize(CAN_MANAGE)
    public ResponseEntity<ApiResponse<PhysicalLocationDTO>> create(
            @Valid @RequestBody PhysicalLocationRequestDTO request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        locationService.create(request),
                        "Physical location created successfully"
                ));
    }

    // GET ALL
    @GetMapping
    @PreAuthorize(CAN_VIEW)
    public ResponseEntity<ApiResponse<List<PhysicalLocationDTO>>> list(
            @RequestParam(required = false) String status) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        locationService.list(status)
                )
        );
    }

    // GET ONE
    @GetMapping("/{id}")
    @PreAuthorize(CAN_VIEW)
    public ResponseEntity<ApiResponse<PhysicalLocationDTO>> get(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        locationService.get(id)
                )
        );
    }

    // UPDATE
    @PutMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    public ResponseEntity<ApiResponse<PhysicalLocationDTO>> update(
            @PathVariable Long id,
            @Valid @RequestBody PhysicalLocationRequestDTO request) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        locationService.update(id, request),
                        "Physical location updated successfully"
                )
        );
    }

    // DEACTIVATE
    @DeleteMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id) {

        locationService.delete(id);

        return ResponseEntity.ok(
                ApiResponse.success(
                        null,
                        "Physical location deactivated successfully"
                )
        );
    }
}
