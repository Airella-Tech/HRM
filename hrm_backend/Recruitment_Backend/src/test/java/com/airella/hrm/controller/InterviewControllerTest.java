
package com.airella.hrm.controller;

import com.airella.hrm.config.JwtUtil;
import com.airella.hrm.dto.InterviewDTO;
import com.airella.hrm.dto.InterviewRequestDTO;
import com.airella.hrm.dto.InterviewStatusUpdateDTO;
import com.airella.hrm.dto.InterviewerAssignmentRequestDTO;
import com.airella.hrm.dto.InterviewRoundDecisionDTO;
import com.airella.hrm.dto.InterviewRoundDecisionRequestDTO;
import com.airella.hrm.service.InterviewService;
import com.airella.hrm.service.InterviewRoundDecisionService;
import com.airella.hrm.service.PermissionService;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(InterviewController.class)
@AutoConfigureMockMvc(addFilters = false)
class InterviewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private InterviewService interviewService;

    @MockBean
    private InterviewRoundDecisionService decisionService;

    @MockBean(name = "perm")
    private PermissionService permissionService;

    @MockBean
    private JwtUtil jwtUtil;

    private InterviewDTO interviewDTO;
    private InterviewRequestDTO requestDTO;

    @BeforeEach
    void setUp() {

        when(permissionService.has(any(String.class)))
                .thenReturn(true);

        when(permissionService.canUpdateInterviewStatus(
                eq(1L), any(String.class)))
                .thenReturn(true);

        interviewDTO = new InterviewDTO(
                1L,
                10L,
                "Test Candidate",
                "candidate@example.com",
                20L,
                "Software Engineer",
                "Technical Interview",
                LocalDate.of(2026, 11, 10),
                LocalTime.of(10, 0),
                60,
                "Test Interviewer",
                "Online",
                "https://meet.example.com/interview",
                null,
                "Scheduled",
                "Not sent",
                "Test interview notes",
                5L,
                LocalDateTime.of(2026, 10, 21, 10, 0),
                LocalDateTime.of(2026, 10, 21, 10, 0)
        );

        requestDTO = new InterviewRequestDTO(
                10L,
                "Test Candidate",
                "candidate@example.com",
                20L,
                "Software Engineer",
                "Technical Interview",
                LocalDate.of(2026, 11, 10),
                LocalTime.of(10, 0),
                60,
                "Test Interviewer",
                "Online",
                "https://meet.example.com/interview",
                null,
                "Test interview notes"
        );
    }

    // ------------------------------------------------------------
    // CREATE INTERVIEW
    // ------------------------------------------------------------

    @Test
    void createShouldReturnCreated() throws Exception {

        when(interviewService.create(any(InterviewRequestDTO.class)))
                .thenReturn(interviewDTO);

        mockMvc.perform(post("/api/recruitment/interviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))

                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.applicationId").value(10))
                .andExpect(jsonPath("$.data.candidateName")
                        .value("Test Candidate"));

        verify(interviewService)
                .create(any(InterviewRequestDTO.class));
    }

    // ------------------------------------------------------------
    // GET ALL INTERVIEWS
    // ------------------------------------------------------------

    @Test
    void listShouldReturnInterviews() throws Exception {

        when(interviewService.list(
                eq("Scheduled"),
                eq(LocalDate.of(2026, 11, 10))))
                .thenReturn(List.of(interviewDTO));

        mockMvc.perform(get("/api/recruitment/interviews")
                        .param("status", "Scheduled")
                        .param("date", "2026-11-10"))

                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].status")
                        .value("Scheduled"));

        verify(interviewService).list(
                "Scheduled",
                LocalDate.of(2026, 11, 10));
    }

    // ------------------------------------------------------------
    // GET ASSIGNED INTERVIEWS
    // ------------------------------------------------------------

    @Test
    void assignedToMeShouldReturnAssignedInterviews()
            throws Exception {

        when(interviewService.getMyAssignedInterviews())
                .thenReturn(List.of(interviewDTO));

        mockMvc.perform(get(
                        "/api/recruitment/interviews/assigned-to-me"))

                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(1));

        verify(interviewService).getMyAssignedInterviews();
    }

    // ------------------------------------------------------------
    // GET SINGLE INTERVIEW
    // ------------------------------------------------------------

    @Test
    void getShouldReturnInterview() throws Exception {

        when(interviewService.get(1L))
                .thenReturn(interviewDTO);

        mockMvc.perform(get("/api/recruitment/interviews/1"))

                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.candidateEmail")
                        .value("candidate@example.com"));

        verify(interviewService).get(1L);
    }

    // ------------------------------------------------------------
    // UPDATE / RESCHEDULE INTERVIEW
    // ------------------------------------------------------------

    @Test
    void updateShouldReturnUpdatedInterview() throws Exception {

        when(interviewService.update(
                eq(1L),
                any(InterviewRequestDTO.class)))
                .thenReturn(interviewDTO);

        mockMvc.perform(put("/api/recruitment/interviews/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))

                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1));

        verify(interviewService).update(
                eq(1L),
                any(InterviewRequestDTO.class));
    }

    // ------------------------------------------------------------
    // UPDATE INTERVIEW STATUS
    // ------------------------------------------------------------

    @Test
    void updateStatusShouldReturnSuccess() throws Exception {

        when(interviewService.updateStatus(1L, "Completed"))
                .thenReturn(interviewDTO);

        mockMvc.perform(patch(
                        "/api/recruitment/interviews/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new InterviewStatusUpdateDTO("Completed"))))

                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message")
                        .value("Interview status updated successfully"));

        verify(interviewService)
                .updateStatus(1L, "Completed");
    }

    // ------------------------------------------------------------
    // ASSIGN / REPLACE INTERVIEWERS
    // ------------------------------------------------------------

    @Test
    void assignInterviewersShouldReturnSuccess()
            throws Exception {

        List<Long> employeeIds = List.of(101L, 102L);

        when(interviewService.assignInterviewers(1L, employeeIds))
                .thenReturn(interviewDTO);

        mockMvc.perform(put(
                        "/api/recruitment/interviews/1/assign-interviewers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new InterviewerAssignmentRequestDTO(
                                        employeeIds))))

                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1));

        verify(interviewService)
                .assignInterviewers(1L, employeeIds);
    }

    // ------------------------------------------------------------
    // GET MANAGER DECISION
    // ------------------------------------------------------------

    @Test
    void getDecisionShouldReturnManagerDecision()
            throws Exception {

        InterviewRoundDecisionDTO decisionDTO =
                org.mockito.Mockito.mock(InterviewRoundDecisionDTO.class);

        when(decisionService.getDecision(1L))
                .thenReturn(decisionDTO);

        mockMvc.perform(get(
                        "/api/recruitment/interviews/1/decision"))

                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message")
                        .value("Interview decision retrieved successfully"));

        verify(decisionService).getDecision(1L);
    }

    // ------------------------------------------------------------
    // SUBMIT MANAGER DECISION
    // ------------------------------------------------------------

    @Test
    void makeDecisionShouldReturnSuccess()
            throws Exception {

        InterviewRoundDecisionDTO decisionResponse =
                org.mockito.Mockito.mock(
                        InterviewRoundDecisionDTO.class);

        when(decisionService.makeDecision(
                eq(1L),
                any(InterviewRoundDecisionRequestDTO.class)))
                .thenReturn(decisionResponse);

        // Use real JSON instead of serializing a Mockito mock.
        // The request DTO requires a non-empty "decision" field.
        String decisionRequestJson = """
                {
                    "decision": "APPROVED"
                }
                """;

        mockMvc.perform(post(
                        "/api/recruitment/interviews/1/decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(decisionRequestJson))

                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message")
                        .value("Interview decision submitted successfully"));

        verify(decisionService).makeDecision(
                eq(1L),
                any(InterviewRoundDecisionRequestDTO.class));
    }

    // ------------------------------------------------------------
    // DELETE INTERVIEW
    // ------------------------------------------------------------

    @Test
    void deleteShouldReturnSuccess() throws Exception {

        doNothing().when(interviewService).delete(1L);

        mockMvc.perform(delete("/api/recruitment/interviews/1"))

                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message")
                        .value("Interview deleted successfully"));

        verify(interviewService).delete(1L);
    }
}
