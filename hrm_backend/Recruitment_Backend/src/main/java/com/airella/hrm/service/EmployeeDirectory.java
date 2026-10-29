package com.airella.hrm.service;

import com.airella.hrm.dto.UserSummaryDTO;
import com.airella.hrm.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Looks people up in User_Backend (the only store of users).
 * Recruitment_Backend keeps no copy of employees; it references a person by user id.
 */
@Service
public class EmployeeDirectory {

    private static final Logger log = LoggerFactory.getLogger(EmployeeDirectory.class);
    private static final ParameterizedTypeReference<List<UserSummaryDTO>> USER_LIST = new ParameterizedTypeReference<>() {};

    private final RestTemplate restTemplate;

    @Value("${service.user-url:http://localhost:5004}")
    private String userServiceUrl;

    public EmployeeDirectory(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public Optional<UserSummaryDTO> findById(Long userId) {
        if (userId == null) return Optional.empty();
        return fetchOne(url("/" + userId).build().toUri());
    }

    public Optional<UserSummaryDTO> findByEmailIgnoreCase(String email) {
        if (email == null || email.isBlank()) return Optional.empty();
        return fetchOne(url("/by-email").queryParam("email", email.trim()).build().toUri());
    }

    /** userId -> user for the given ids (missing users are simply absent). Handy for showing interviewer names. */
    public Map<Long, UserSummaryDTO> mapByIds(Collection<Long> userIds) {
        List<Long> ids = userIds.stream().filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) return Map.of();
        java.net.URI uri = url("/by-ids").queryParam("ids", ids.toArray()).build().toUri();
        return fetchList(uri).stream()
                .collect(Collectors.toMap(UserSummaryDTO::getId, Function.identity(), (a, b) -> a));
    }

    /** Everyone in one company, identified by its registration number (the companyRef) or company name. */
    public List<UserSummaryDTO> findByCompanyRef(String companyRef) {
        if (companyRef == null || companyRef.isBlank()) return List.of();
        java.net.URI uri = url("/by-company")
                .queryParam("registrationNumber", companyRef.trim())
                .queryParam("companyName", companyRef.trim())
                .build()
                .toUri();
        return fetchList(uri);
    }

    // ── User_Backend calls ───────────────────────────────────────

    private UriComponentsBuilder url(String path) {
        return UriComponentsBuilder.fromHttpUrl(userServiceUrl + "/api/internal/users" + path);
    }

    private Optional<UserSummaryDTO> fetchOne(java.net.URI uri) {
        try {
            return Optional.ofNullable(restTemplate.getForObject(uri, UserSummaryDTO.class));
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        } catch (Exception e) {
            log.error("User_Backend lookup failed ({}): {}", uri, e.getMessage());
            throw new BusinessException("User service is unavailable. Please try again later.");
        }
    }

    private List<UserSummaryDTO> fetchList(java.net.URI uri) {
        try {
            List<UserSummaryDTO> body = restTemplate.exchange(uri, HttpMethod.GET, null, USER_LIST).getBody();
            return body != null ? body : List.of();
        } catch (Exception e) {
            log.error("User_Backend lookup failed ({}): {}", uri, e.getMessage());
            throw new BusinessException("User service is unavailable. Please try again later.");
        }
    }
}