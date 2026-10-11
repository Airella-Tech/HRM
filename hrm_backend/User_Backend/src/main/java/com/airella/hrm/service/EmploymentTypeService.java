package com.airella.hrm.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.ArrayList;
import java.util.List;

/**
 * Employment types are defined by HR and stored in HR_Backend (hrm_db_hr.employment_types).
 * This checks a submitted value against that list before it is saved on the user.
 */
@Service
public class EmploymentTypeService {

    @Autowired
    private RestTemplate restTemplate;

    @Value("${service.hr-url:http://localhost:5005}")
    private String hrServiceUrl;

    /**
     * Returns the employment type exactly as HR named it, or null when blank.
     * A value equal to {@code currentValue} is kept as-is, so editing an employee
     * whose stored type predates HR's list doesn't force a change.
     *
     * @throws IllegalArgumentException when the value isn't one of HR's employment types,
     *                                  or HR's list can't be read
     */
    public String resolve(String value, String currentValue) {
        if (value == null || value.isBlank()) return null;
        String v = value.trim();
        if (currentValue != null && currentValue.equalsIgnoreCase(v)) return currentValue;

        List<String> allowed = fetchHrEmploymentTypes();
        return allowed.stream()
                .filter(t -> t.equalsIgnoreCase(v))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(allowed.isEmpty()
                        ? "No employment types are set up yet. Add them in HR > Leave Management > Add Employment Type."
                        : "Invalid employment type '" + v + "'. Allowed: " + String.join(", ", allowed)));
    }

    /** Reads the caller's company's employment types from HR_Backend, forwarding the caller's own token. */
    private List<String> fetchHrEmploymentTypes() {
        HttpHeaders headers = new HttpHeaders();
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            String auth = attrs.getRequest().getHeader(HttpHeaders.AUTHORIZATION);
            if (auth != null) headers.set(HttpHeaders.AUTHORIZATION, auth);
        }
        try {
            JsonNode body = restTemplate.exchange(hrServiceUrl + "/api/hr/employment-types",
                    HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class).getBody();
            List<String> names = new ArrayList<>();
            if (body != null && body.path("data").isArray()) {
                body.path("data").forEach(t -> names.add(t.path("name").asText()));
            }
            return names;
        } catch (Exception e) {
            throw new IllegalArgumentException(
                    "Could not check the employment type against HR's list (HR service unavailable or not signed in as HR)");
        }
    }
}
