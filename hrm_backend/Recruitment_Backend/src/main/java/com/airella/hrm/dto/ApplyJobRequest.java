package com.airella.hrm.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplyJobRequest {

    @NotBlank(message = "Candidate name is required")
    private String candidateName;

    @NotBlank(message = "Email is required")
    @Email(message = "Please enter a valid email address")
    private String email;

    private String phone;
    private String location;
    private String education;
    private Integer experienceYears;
    private String summary;
    private List<String> skills;

    private String resumeFileName;
}
