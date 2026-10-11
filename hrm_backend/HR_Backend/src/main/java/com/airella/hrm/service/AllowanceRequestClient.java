package com.airella.hrm.service;

import com.airella.hrm.dto.AllowanceRequestDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.Employee;
import com.airella.hrm.service.EmployeeDirectory;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Allowance requests live in Employee_Backend (hrm_db_employee.allowance_requests). HR reads and
 * reviews them through its internal API, limited to the HR user's own company: the company's
 * employee emails are sent with every search, and single requests are checked against them.
 */
@Service
public class AllowanceRequestClient {

    private static final Logger log = LoggerFactory.getLogger(AllowanceRequestClient.class);

    private final RestTemplate restTemplate;
    private final EmployeeDirectory employeeDirectory;
    private final AuditService auditService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${service.employee-url:http://localhost:5006}")
    private String employeeServiceUrl;

    @Value("${service.user-url:http://localhost:5004}")
    private String userServiceUrl;

    public AllowanceRequestClient(RestTemplate restTemplate, EmployeeDirectory employeeDirectory,
                                  AuditService auditService) {
        this.restTemplate = restTemplate;
        this.employeeDirectory = employeeDirectory;
        this.auditService = auditService;
    }

    public List<AllowanceRequestDTO> getRequests(Employee hr) {
        List<String> emails = List.copyOf(companyEmails(hr));
        try {
            List<AllowanceRequestDTO> requests = restTemplate.exchange(
                    base() + "/search", HttpMethod.POST, new HttpEntity<>(emails),
                    new ParameterizedTypeReference<List<AllowanceRequestDTO>>() {}).getBody();
            return requests != null ? requests : List.of();
        } catch (Exception e) {
            throw failure("load allowance requests", e);
        }
    }

    /** The request, after checking it belongs to an employee of the HR user's company. */
    public AllowanceRequestDTO getRequest(Long id, Employee hr) {
        return checkCompany(id, hr);
    }

    /** The PDF of a request already checked with {@link #getRequest}. */
    public byte[] getDocument(Long id) {
        try {
            return restTemplate.getForObject(base() + "/" + id + "/document", byte[].class);
        } catch (Exception e) {
            throw failure("load the document", e);
        }
    }

    /** status: APPROVED or REJECTED; a comment is required to reject. */
    public AllowanceRequestDTO review(Long id, String status, String comment, Employee hr) {
        checkCompany(id, hr);
        AllowanceRequestDTO.ReviewRequest body = new AllowanceRequestDTO.ReviewRequest();
        body.setStatus(status);
        body.setComment(comment);
        body.setReviewedByName(hr.getFullName());
        AllowanceRequestDTO reviewed;
        try {
            reviewed = restTemplate.postForObject(base() + "/" + id + "/review", body, AllowanceRequestDTO.class);
        } catch (Exception e) {
            throw failure("update the request", e);
        }
        try {
            auditService.logAction("REVIEW_ALLOWANCE_REQUEST", "AllowanceRequest", id,
                    status + " allowance request " + id + (reviewed != null ? " of " + reviewed.getEmployeeEmail() : ""),
                    hr.getCompany().getId());
        } catch (Exception ignored) {
            // auditing must never block the actual change
        }
        return reviewed;
    }

    // ── helpers ──────────────────────────────────────────────────

    private String base() {
        return employeeServiceUrl + "/api/internal/allowance-requests";
    }

    /**
     * Emails of the HR user's company employees: the company's employees in User_Backend
     * (hrm_db_user, the source of truth — some employees are not synced into hrm_db_hr) plus
     * those in hrm_db_hr. User_Backend is asked with the HR user's own token, so it applies its
     * own company scoping.
     */
    private Set<String> companyEmails(Employee hr) {
        Set<String> emails = employeeDirectory.findByCompanyId(hr.getCompany().getId()).stream()
                .map(Employee::getEmail)
                .filter(e -> e != null && !e.isBlank())
                .map(e -> e.trim().toLowerCase(Locale.ROOT))
                .collect(Collectors.toCollection(HashSet::new));
        emails.addAll(userServiceCompanyEmails());
        return emails;
    }

    private Set<String> userServiceCompanyEmails() {
        String authorization = currentAuthorizationHeader();
        if (authorization == null) {
            return Set.of();
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.AUTHORIZATION, authorization);
            JsonNode body = restTemplate.exchange(userServiceUrl + "/api/hr/employees", HttpMethod.GET,
                    new HttpEntity<>(headers), JsonNode.class).getBody();
            Set<String> emails = new HashSet<>();
            if (body != null && body.path("data").isArray()) {
                for (JsonNode employee : body.path("data")) {
                    String email = employee.path("email").asText("");
                    if (!email.isBlank()) emails.add(email.trim().toLowerCase(Locale.ROOT));
                }
            }
            return emails;
        } catch (Exception e) {
            log.warn("Could not load company employees from User backend, using hrm_db_hr only: {}", e.getMessage());
            return Set.of();
        }
    }

    private static String currentAuthorizationHeader() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            String header = attrs.getRequest().getHeader(HttpHeaders.AUTHORIZATION);
            return header != null && header.startsWith("Bearer ") ? header : null;
        }
        return null;
    }

    private AllowanceRequestDTO checkCompany(Long id, Employee hr) {
        AllowanceRequestDTO request;
        try {
            request = restTemplate.getForObject(base() + "/" + id, AllowanceRequestDTO.class);
        } catch (HttpClientErrorException.NotFound e) {
            throw new ResourceNotFoundException("AllowanceRequest", "id", id);
        } catch (Exception e) {
            throw failure("load the request", e);
        }
        String email = request == null || request.getEmployeeEmail() == null
                ? "" : request.getEmployeeEmail().trim().toLowerCase(Locale.ROOT);
        if (!companyEmails(hr).contains(email)) {
            throw new ResourceNotFoundException("AllowanceRequest", "id", id);
        }
        return request;
    }

    /** Passes on Employee_Backend's own message for rule violations (e.g. "already approved"). */
    private RuntimeException failure(String action, Exception e) {
        if (e instanceof HttpClientErrorException http) {
            try {
                JsonNode body = objectMapper.readTree(http.getResponseBodyAsString());
                if (body.hasNonNull("message")) {
                    return new BusinessException(body.get("message").asText());
                }
            } catch (Exception ignored) {
                // fall through to the generic message
            }
        }
        log.error("Could not {} in Employee backend: {}", action, e.getMessage());
        return new BusinessException("Could not " + action + " right now. Please try again shortly.");
    }
}
