package com.airella.hrm.service;

import com.airella.hrm.dto.EmployeeProfileDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.model.Company;
import com.airella.hrm.model.Department;
import com.airella.hrm.model.Employee;
import com.airella.hrm.repository.CompanyRepository;
import com.airella.hrm.repository.DepartmentRepository;
import lombok.Data;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Looks people up in User_Backend (hrm_db_user.employees), the only table of users.
 * Employee_Backend keeps no copy; its records reference a person by user_id.
 */
@Service
public class EmployeeDirectory {

    private static final Logger log = LoggerFactory.getLogger(EmployeeDirectory.class);
    private static final ParameterizedTypeReference<List<UserSummary>> USER_LIST = new ParameterizedTypeReference<>() {};

    private final RestTemplate restTemplate;
    private final CompanyRepository companyRepository;
    private final DepartmentRepository departmentRepository;

    @Value("${service.user-url:http://localhost:5004}")
    private String userServiceUrl;

    public EmployeeDirectory(RestTemplateBuilder restTemplateBuilder,
                             CompanyRepository companyRepository,
                             DepartmentRepository departmentRepository) {
        this.restTemplate = restTemplateBuilder
                .connectTimeout(java.time.Duration.ofSeconds(5))
                .readTimeout(java.time.Duration.ofSeconds(10))
                .build();
        this.companyRepository = companyRepository;
        this.departmentRepository = departmentRepository;
    }

    public Optional<Employee> findById(Long userId) {
        if (userId == null) return Optional.empty();
        return fetchOne(url("/" + userId).toUriString()).map(this::toEmployee);
    }

    public Optional<Employee> findByEmailIgnoreCase(String email) {
        if (email == null || email.isBlank()) return Optional.empty();
        return fetchOne(url("/by-email").queryParam("email", email.trim()).encode().toUriString()).map(this::toEmployee);
    }

    public List<Employee> findAll() {
        return toEmployees(fetchList(url("").toUriString()));
    }

    public List<Employee> findAllById(Collection<Long> userIds) {
        List<Long> ids = userIds.stream().filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) return List.of();
        return toEmployees(fetchList(url("/by-ids").queryParam("ids", ids.toArray()).toUriString()));
    }

    /** userId → Employee for the given ids (missing users are simply absent). */
    public Map<Long, Employee> mapByIds(Collection<Long> userIds) {
        return findAllById(userIds).stream().collect(Collectors.toMap(Employee::getId, Function.identity(), (a, b) -> a));
    }

    /** Everyone in this database's company {@code companyId}. */
    public List<Employee> findByCompanyId(Long companyId) {
        Company company = companyRepository.findById(companyId).orElse(null);
        if (company == null) return List.of();
        String uri = url("/by-company")
                .queryParamIfPresent("registrationNumber", Optional.ofNullable(company.getRegistrationNumber()))
                .queryParamIfPresent("companyName", Optional.ofNullable(company.getCompanyName()))
                .encode().toUriString();
        return toEmployees(fetchList(uri));
    }

    public List<Employee> findByCompanyIdAndStatus(Long companyId, Employee.EmployeeStatus status) {
        return findByCompanyId(companyId).stream().filter(e -> e.getStatus() == status).toList();
    }

    public List<Employee> findByCompanyIdAndRole(Long companyId, Employee.Role role) {
        return findByCompanyId(companyId).stream().filter(e -> e.getRole() == role).toList();
    }

    public long countByCompanyIdAndStatus(Long companyId, Employee.EmployeeStatus status) {
        return findByCompanyIdAndStatus(companyId, status).size();
    }

    /** Everyone whose department (by name) is this database's department {@code departmentId}. */
    public List<Employee> findByDepartmentId(Long departmentId) {
        Department department = departmentRepository.findById(departmentId).orElse(null);
        if (department == null || department.getCompany() == null) return List.of();
        return findByCompanyId(department.getCompany().getId()).stream()
                .filter(e -> e.getDepartment() != null && departmentId.equals(e.getDepartment().getId()))
                .toList();
    }

    public long countByDepartmentId(Long departmentId) {
        return findByDepartmentId(departmentId).size();
    }

    /** The user's own profile, with personal details, from User_Backend. */
    public Optional<EmployeeProfileDTO> findProfile(Long userId) {
        if (userId == null) return Optional.empty();
        String uri = url("/" + userId + "/profile").toUriString();
        try {
            return Optional.ofNullable(restTemplate.getForObject(uri, EmployeeProfileDTO.class));
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        } catch (Exception e) {
            log.error("User_Backend profile lookup failed ({}): {}", uri, e.getMessage());
            throw new BusinessException("User service is unavailable. Please try again later.");
        }
    }

    /** Saves the user's personal details in User_Backend and returns the updated profile. */
    public Optional<EmployeeProfileDTO> updateProfile(Long userId, EmployeeProfileDTO.UpdateRequest request) {
        String uri = url("/" + userId + "/profile").toUriString();
        try {
            return Optional.ofNullable(restTemplate.exchange(uri, HttpMethod.PUT, new HttpEntity<>(request),
                    EmployeeProfileDTO.class).getBody());
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        } catch (Exception e) {
            log.error("User_Backend profile update failed ({}): {}", uri, e.getMessage());
            throw new BusinessException("Could not save your profile. Please try again later.");
        }
    }

    // ── User_Backend calls ───────────────────────────────────────

    private UriComponentsBuilder url(String path) {
        return UriComponentsBuilder.fromHttpUrl(userServiceUrl + "/api/internal/users" + path);
    }

    private Optional<UserSummary> fetchOne(String uri) {
        try {
            return Optional.ofNullable(restTemplate.getForObject(uri, UserSummary.class));
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        } catch (Exception e) {
            log.error("User_Backend lookup failed ({}): {}", uri, e.getMessage());
            throw new BusinessException("User service is unavailable. Please try again later.");
        }
    }

    private List<UserSummary> fetchList(String uri) {
        try {
            List<UserSummary> body = restTemplate.exchange(uri, HttpMethod.GET, null, USER_LIST).getBody();
            return body != null ? body : List.of();
        } catch (Exception e) {
            log.error("User_Backend lookup failed ({}): {}", uri, e.getMessage());
            throw new BusinessException("User service is unavailable. Please try again later.");
        }
    }

    // ── Mapping to this database's company / department ─────────

    private List<Employee> toEmployees(List<UserSummary> users) {
        Map<String, Company> companies = new HashMap<>();
        Map<String, Department> departments = new HashMap<>();
        return users.stream().map(u -> toEmployee(u, companies, departments)).toList();
    }

    private Employee toEmployee(UserSummary u) {
        return toEmployee(u, new HashMap<>(), new HashMap<>());
    }

    private Employee toEmployee(UserSummary u, Map<String, Company> companies, Map<String, Department> departments) {
        Employee e = new Employee();
        e.setId(u.getId());
        e.setEmployeeId(u.getEmployeeId());
        e.setFullName(u.getFullName());
        e.setEmail(u.getEmail());
        e.setDesignation(u.getDesignation());
        e.setEmploymentType(u.getEmploymentType());
        e.setJoiningDate(u.getJoiningDate());
        e.setTerminationDate(u.getTerminationDate());
        e.setDepartmentName(u.getDepartmentName());
        e.setRole(parse(Employee.Role.class, u.getRole(), Employee.Role.EMPLOYEE));
        e.setStatus(parse(Employee.EmployeeStatus.class, u.getStatus(), Employee.EmployeeStatus.ACTIVE));

        Company company = companies.computeIfAbsent(
                u.getCompanyRegistrationNumber() + "|" + u.getCompanyName(),
                k -> resolveCompany(u.getCompanyRegistrationNumber(), u.getCompanyName()));
        e.setCompany(company);
        if (company != null && u.getDepartmentName() != null && !u.getDepartmentName().isBlank()) {
            String name = u.getDepartmentName().trim();
            e.setDepartment(departments.computeIfAbsent(company.getId() + "|" + name.toLowerCase(),
                    k -> departmentRepository.findByCompanyIdAndNameIgnoreCase(company.getId(), name)
                            .stream().findFirst().orElse(null)));
        }
        return e;
    }

    /** This database's company matching User_Backend's, created if an approved company hasn't been synced yet. */
    private Company resolveCompany(String registrationNumber, String companyName) {
        if (registrationNumber == null && companyName == null) return null;
        Optional<Company> found = Optional.empty();
        if (registrationNumber != null && !registrationNumber.isBlank()) {
            found = companyRepository.findByRegistrationNumber(registrationNumber);
        }
        if (found.isEmpty() && companyName != null && !companyName.isBlank()) {
            found = companyRepository.findByCompanyName(companyName);
        }
        return found.orElseGet(() -> {
            Company c = new Company();
            c.setCompanyName(companyName != null ? companyName : registrationNumber);
            c.setRegistrationNumber(registrationNumber != null ? registrationNumber : "REG-" + companyName);
            c.setStatus(Company.CompanyStatus.APPROVED);
            log.info("Created local company '{}' for users from User_Backend", c.getCompanyName());
            return companyRepository.save(c);
        });
    }

    private static <E extends Enum<E>> E parse(Class<E> type, String value, E fallback) {
        if (value == null) return fallback;
        try {
            return Enum.valueOf(type, value.trim().toUpperCase());
        } catch (Exception e) {
            return fallback;
        }
    }

    /** Shape of User_Backend's /api/internal/users responses. */
    @Data
    static class UserSummary {
        private Long id;
        private String employeeId;
        private String fullName;
        private String email;
        private String role;
        private String status;
        private String designation;
        private String employmentType;
        private LocalDate joiningDate;
        private LocalDate terminationDate;
        private String departmentName;
        private String companyName;
        private String companyRegistrationNumber;
    }
}