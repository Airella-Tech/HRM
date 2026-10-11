package com.airella.hrm.service;

import com.airella.hrm.dto.LeaveEntitlementDTO;
import com.airella.hrm.dto.PaySheetDTO;
import com.airella.hrm.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.List;

/**
 * Reads data owned by HR_Backend. Leave types and how much of each a job role gets live in
 * hrm_db_hr; this service only keeps the leave type ids (and a name snapshot) on applications and balances.
 */
@Service
public class HrServiceClient {

    private static final Logger log = LoggerFactory.getLogger(HrServiceClient.class);

    private final RestClient restClient;

    public HrServiceClient(@Value("${service.hr-url:http://localhost:5005}") String hrServiceUrl) {
        this.restClient = RestClient.create(hrServiceUrl);
    }

    /** Leave HR has assigned to the employee's job role and employment type. Employee ids differ per database, so it is sent by email. */
    public List<LeaveEntitlementDTO> getLeaveEntitlements(String email) {
        if (email == null || email.isBlank()) {
            return List.of();
        }
        try {
            List<LeaveEntitlementDTO> entitlements = restClient.get()
                    .uri(uri -> uri.path("/api/internal/leave-entitlements").queryParam("email", email).build())
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<LeaveEntitlementDTO>>() {});
            return entitlements != null ? entitlements : List.of();
        } catch (Exception e) {
            log.warn("Could not load leave entitlements from HR_Backend for {}: {}", email, e.getMessage());
            throw new BusinessException("Leave details are unavailable right now. Please try again shortly.");
        }
    }

    /**
     * The employee's pay sheet: their job role's basic payment and their individual allowances /
     * deductions, both owned by HR_Backend. Sent by email since employee ids differ per database.
     */
    /**
     * The employee's pay sheet for payroll generation. Empty when HR_Backend does not know the
     * employee; any other failure is thrown so a payslip is never generated from missing data.
     */
    public java.util.Optional<PaySheetDTO> findPaySheet(String email) {
        if (email == null || email.isBlank()) {
            return java.util.Optional.empty();
        }
        try {
            return java.util.Optional.ofNullable(restClient.get()
                    .uri(uri -> uri.path("/api/internal/pay-sheet").queryParam("email", email).build())
                    .retrieve()
                    .body(PaySheetDTO.class));
        } catch (HttpClientErrorException.NotFound e) {
            return java.util.Optional.empty();
        } catch (Exception e) {
            log.warn("Could not load pay sheet from HR_Backend for {}: {}", email, e.getMessage());
            throw new BusinessException("Salary details are unavailable from HR right now. Please try again shortly.");
        }
    }

    public PaySheetDTO getPaySheet(String email) {
        if (email == null || email.isBlank()) {
            throw new BusinessException("Your account has no email, so your salary cannot be looked up.");
        }
        try {
            return restClient.get()
                    .uri(uri -> uri.path("/api/internal/pay-sheet").queryParam("email", email).build())
                    .retrieve()
                    .body(PaySheetDTO.class);
        } catch (HttpClientErrorException.NotFound e) {
            throw new BusinessException("Your salary details have not been set up by HR yet.");
        } catch (Exception e) {
            log.warn("Could not load pay sheet from HR_Backend for {}: {}", email, e.getMessage());
            throw new BusinessException("Salary details are unavailable right now. Please try again shortly.");
        }
    }
}
