package com.airella.hrm.controller;

import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.dto.WorkLocationDTO;
import com.airella.hrm.model.Employee;
import com.airella.hrm.service.AuthService;
import com.airella.hrm.service.WorkLocationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * HR-defined work locations, shown on the Employees page and selected when adding
 * or editing an employee.
 */
@RestController
@RequestMapping("/api/hr")
@PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
public class WorkLocationController {

    private final WorkLocationService workLocationService;
    private final AuthService authService;

    public WorkLocationController(WorkLocationService workLocationService, AuthService authService) {
        this.workLocationService = workLocationService;
        this.authService = authService;
    }

    @GetMapping("/work-locations")
    public ResponseEntity<ApiResponse<List<WorkLocationDTO>>> getWorkLocations() {
        Employee hr = authService.getCurrentEmployee();
        return ResponseEntity.ok(ApiResponse.success(workLocationService.getWorkLocations(hr.getCompany().getId())));
    }

    /** Body: { "names": ["Head Office", "Remote", ...] } */
    @PostMapping("/work-locations")
    public ResponseEntity<ApiResponse<List<WorkLocationDTO>>> createWorkLocations(@RequestBody Map<String, List<String>> body) {
        Employee hr = authService.getCurrentEmployee();
        List<WorkLocationDTO> created = workLocationService.createWorkLocations(body.get("names"), hr);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, created.size() + " work location(s) added"));
    }

    /** Body: { "name": "Head Office" } */
    @PutMapping("/work-locations/{id}")
    public ResponseEntity<ApiResponse<WorkLocationDTO>> updateWorkLocation(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        Employee hr = authService.getCurrentEmployee();
        WorkLocationDTO updated = workLocationService.updateWorkLocation(id, body.get("name"), hr);
        return ResponseEntity.ok(ApiResponse.success(updated, "Work location updated successfully"));
    }

    @DeleteMapping("/work-locations/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteWorkLocation(@PathVariable Long id) {
        Employee hr = authService.getCurrentEmployee();
        workLocationService.deleteWorkLocation(id, hr);
        return ResponseEntity.ok(ApiResponse.success(null, "Work location deleted successfully"));
    }
}
