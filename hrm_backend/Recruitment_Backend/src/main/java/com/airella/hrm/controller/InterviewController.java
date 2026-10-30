
package com.airella.hrm.controller;

import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.dto.InterviewDTO;
import com.airella.hrm.dto.InterviewRequestDTO;
import com.airella.hrm.dto.InterviewerAssignmentRequestDTO;
import com.airella.hrm.dto.InterviewStatusUpdateDTO;
import com.airella.hrm.service.InterviewService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/recruitment/interviews")
public class InterviewController {

    private static final String CAN_VIEW_INTERVIEWS =
            "@perm.has('INTERVIEW_SCHEDULE')";

    private final InterviewService interviewService;

    public InterviewController(InterviewService interviewService) {
        this.interviewService = interviewService;
    }

    // Create a new interview.
    @PostMapping
    @PreAuthorize("@perm.has('INTERVIEW_SCHEDULE')")
    public ResponseEntity<ApiResponse<InterviewDTO>> create(
            @Valid @RequestBody InterviewRequestDTO request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        interviewService.create(request),
                        "Interview scheduled successfully"
                ));
    }

    // Get all interviews, optionally filtered by status or date.
    @GetMapping
    @PreAuthorize(CAN_VIEW_INTERVIEWS)
    public ResponseEntity<ApiResponse<List<InterviewDTO>>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) LocalDate date) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        interviewService.list(status, date)
                )
        );
    }

    // Get interviews assigned to the logged-in interviewer.
    @GetMapping("/assigned-to-me")
    @PreAuthorize("@perm.has('INTERVIEW_EVALUATE')")
    public ResponseEntity<ApiResponse<List<InterviewDTO>>> getMyAssignedInterviews() {

        return ResponseEntity.ok(
                ApiResponse.success(
                        interviewService.getMyAssignedInterviews(),
                        "Assigned interviews retrieved successfully"
                )
        );
    }

    // Get one interview.
    @GetMapping("/{id}")
    @PreAuthorize(
            "@perm.has('INTERVIEW_SCHEDULE') or " +
                    "(@perm.has('INTERVIEW_EVALUATE') and " +
                    "@perm.isAssignedToInterview(#id))"
    )
    public ResponseEntity<ApiResponse<InterviewDTO>> get(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        interviewService.get(id)
                )
        );
    }

    // Update or reschedule an interview.
    @PutMapping("/{id}")
    @PreAuthorize("@perm.has('INTERVIEW_SCHEDULE')")
    public ResponseEntity<ApiResponse<InterviewDTO>> update(
            @PathVariable Long id,
            @Valid @RequestBody InterviewRequestDTO request) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        interviewService.update(id, request),
                        "Interview updated successfully"
                )
        );
    }

    // Change only the interview status.
    // Does not require candidate name or other interview fields.
    @PatchMapping("/{id}/status")
    @PreAuthorize("@perm.has('INTERVIEW_SCHEDULE')")
    public ResponseEntity<ApiResponse<InterviewDTO>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody InterviewStatusUpdateDTO request) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        interviewService.updateStatus(
                                id,
                                request.status()
                        ),
                        "Interview status updated successfully"
                )
        );
    }

    // Assign or replace interviewers.
    @PutMapping("/{id}/assign-interviewers")
    @PreAuthorize("@perm.has('INTERVIEW_SCHEDULE')")
    public ResponseEntity<ApiResponse<InterviewDTO>> assignInterviewers(
            @PathVariable Long id,
            @Valid @RequestBody InterviewerAssignmentRequestDTO request) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        interviewService.assignInterviewers(
                                id,
                                request.employeeIds()
                        ),
                        "Interviewers assigned successfully"
                )
        );
    }

    // Delete an interview.
    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.has('INTERVIEW_SCHEDULE')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id) {

        interviewService.delete(id);

        return ResponseEntity.ok(
                ApiResponse.success(
                        null,
                        "Interview deleted successfully"
                )
        );
    }
}
