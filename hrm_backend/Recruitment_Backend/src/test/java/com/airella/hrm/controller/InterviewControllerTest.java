package com.airella.hrm.controller;

import com.airella.hrm.config.JwtUtil;
import com.airella.hrm.dto.InterviewDTO;
import com.airella.hrm.dto.InterviewRequestDTO;
import com.airella.hrm.dto.InterviewStatusUpdateDTO;
import com.airella.hrm.dto.InterviewerAssignmentRequestDTO;
import com.airella.hrm.service.InterviewService;
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

    @MockBean(name = "perm")
    private PermissionService permissionService;

    @MockBean
    private JwtUtil jwtUtil;

    private InterviewDTO interviewDTO;
    private InterviewRequestDTO requestDTO;

    @BeforeEach
    void setUp() {
        when(permissionService.has(any(String.class))).thenReturn(true);

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

        verify(interviewService).create(any(InterviewRequestDTO.class));
    }

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
                .andExpect(jsonPath("$.data[0].status").value("Scheduled"));

        verify(interviewService).list(
                "Scheduled",
                LocalDate.of(2026, 11, 10));
    }

    @Test
    void assignedToMeShouldReturnAssignedInterviews() throws Exception {
        when(interviewService.getMyAssignedInterviews())
                .thenReturn(List.of(interviewDTO));

        mockMvc.perform(get(
                        "/api/recruitment/interviews/assigned-to-me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(1));

        verify(interviewService).getMyAssignedInterviews();
    }

    @Test
    void getShouldReturnInterview() throws Exception {
        when(interviewService.get(1L)).thenReturn(interviewDTO);

        mockMvc.perform(get("/api/recruitment/interviews/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.candidateEmail")
                        .value("candidate@example.com"));

        verify(interviewService).get(1L);
    }

    @Test
    void updateShouldReturnUpdatedInterview() throws Exception {
        when(interviewService.update(
                eq(1L), any(InterviewRequestDTO.class)))
                .thenReturn(interviewDTO);

        mockMvc.perform(put("/api/recruitment/interviews/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1));

        verify(interviewService).update(
                eq(1L), any(InterviewRequestDTO.class));
    }

    @Test
    void updateStatusShouldReturnSuccess() throws Exception {
        mockMvc.perform(patch("/api/recruitment/interviews/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new InterviewStatusUpdateDTO("Completed"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(interviewService).updateStatus(1L, "Completed");
    }

    @Test
    void assignInterviewersShouldReturnSuccess() throws Exception {
        List<Long> employeeIds = List.of(101L, 102L);

        mockMvc.perform(put(
                        "/api/recruitment/interviews/1/assign-interviewers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new InterviewerAssignmentRequestDTO(employeeIds))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(interviewService).assignInterviewers(1L, employeeIds);
    }

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