package com.airella.hrm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TrackApplicationRequest {

    @NotBlank(message = "Tracking code is required")
    private String trackingCode;

    @NotBlank(message = "Email address is required")
    private String email;
}
