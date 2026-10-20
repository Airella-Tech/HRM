package com.airella.hrm.Controller;

import com.airella.hrm.DTO.UserProfileDTO;
import com.airella.hrm.DTO.UserSummaryDTO;
import com.airella.hrm.Model.Company;
import com.airella.hrm.Model.Employee;
import com.airella.hrm.Repo.CompanyRepo;
import com.airella.hrm.Repo.EmployeeRepo;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * Service-to-service user lookups. hrm_db_user is the only store of users; HR_Backend,
 * Employee_Backend and Admin_Backend read people from here instead of keeping their own copy.
 */
@RestController
@RequestMapping("/api/internal/users")
@Transactional(readOnly = true)
public class InternalUserController {

    private final EmployeeRepo employeeRepo;
    private final CompanyRepo companyRepo;

    public InternalUserController(EmployeeRepo employeeRepo, CompanyRepo companyRepo) {
        this.employeeRepo = employeeRepo;
        this.companyRepo = companyRepo;
    }

    @GetMapping
    public List<UserSummaryDTO> all() {
        return employeeRepo.findAll().stream().map(this::toSummary).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserSummaryDTO> byId(@PathVariable Long id) {
        return ResponseEntity.of(employeeRepo.findById(id).map(this::toSummary));
    }

    @GetMapping("/by-email")
    public ResponseEntity<UserSummaryDTO> byEmail(@RequestParam String email) {
        return ResponseEntity.of(employeeRepo.findByEmailIgnoreCase(email.trim()).map(this::toSummary));
    }

    @GetMapping("/by-ids")
    public List<UserSummaryDTO> byIds(@RequestParam List<Long> ids) {
        return employeeRepo.findAllById(ids).stream().map(this::toSummary).toList();
    }

    /** Users of one company, identified by registration number (preferred) or name — company ids differ per database. */
    @GetMapping("/by-company")
    public List<UserSummaryDTO> byCompany(@RequestParam(required = false) String registrationNumber,
                                          @RequestParam(required = false) String companyName) {
        Optional<Company> company = Optional.empty();
        if (registrationNumber != null && !registrationNumber.isBlank()) {
            company = companyRepo.findByRegistrationNumber(registrationNumber.trim());
        }
        if (company.isEmpty() && companyName != null && !companyName.isBlank()) {
            company = companyRepo.findByCompanyName(companyName.trim());
        }
        return company.map(c -> employeeRepo.findByCompanyId(c.getId()).stream().map(this::toSummary).toList())
                .orElse(List.of());
    }

    /** The user's own profile with personal details — Employee_Backend's profile page. */
    @GetMapping("/{id}/profile")
    public ResponseEntity<UserProfileDTO> profile(@PathVariable Long id) {
        return ResponseEntity.of(employeeRepo.findById(id).map(this::toProfile));
    }

    /** Saves the personal details an employee edits on their profile page (via Employee_Backend). */
    @PutMapping("/{id}/profile")
    @Transactional
    public ResponseEntity<UserProfileDTO> updateProfile(@PathVariable Long id,
                                                        @RequestBody UserProfileDTO.UpdateRequest request) {
        return ResponseEntity.of(employeeRepo.findById(id).map(e -> {
            e.setPhone(blankToNull(request.getPhone()));
            e.setAddress(blankToNull(request.getAddress()));
            e.setDob(request.getDob());
            String gender = blankToNull(request.getGender());
            e.setGender(gender == null ? null : Employee.Gender.valueOf(gender.toUpperCase()));
            e.setEmergencyContactName(blankToNull(request.getEmergencyContactName()));
            e.setEmergencyContactPhone(blankToNull(request.getEmergencyContactPhone()));
            e.setEmergencyContactRelation(blankToNull(request.getEmergencyContactRelation()));
            return toProfile(employeeRepo.save(e));
        }));
    }

    /** Used by Admin_Backend's system-users page. */
    @PutMapping("/{id}/role")
    @Transactional
    public ResponseEntity<UserSummaryDTO> updateRole(@PathVariable Long id, @RequestParam String role) {
        return ResponseEntity.of(employeeRepo.findById(id).map(e -> {
            e.setRole(Employee.Role.valueOf(role.trim().toUpperCase()));
            return toSummary(employeeRepo.save(e));
        }));
    }

    /** Used by Admin_Backend's system-users page. */
    @PutMapping("/{id}/status")
    @Transactional
    public ResponseEntity<UserSummaryDTO> updateStatus(@PathVariable Long id, @RequestParam String status) {
        return ResponseEntity.of(employeeRepo.findById(id).map(e -> {
            e.setStatus(Employee.EmployeeStatus.valueOf(status.trim().toUpperCase()));
            return toSummary(employeeRepo.save(e));
        }));
    }

    private UserProfileDTO toProfile(Employee e) {
        UserProfileDTO dto = new UserProfileDTO();
        dto.setId(e.getId());
        dto.setEmployeeId(e.getEmployeeId());
        dto.setFullName(e.getFullName());
        dto.setEmail(e.getEmail());
        dto.setRole(e.getRole() != null ? e.getRole().name() : null);
        dto.setStatus(e.getStatus() != null ? e.getStatus().name() : null);
        dto.setDesignation(e.getDesignation());
        dto.setEmploymentType(e.getEmploymentType());
        dto.setJoiningDate(e.getJoiningDate());
        if (e.getDepartment() != null) dto.setDepartmentName(e.getDepartment().getName());
        if (e.getCompany() != null) {
            dto.setCompanyName(e.getCompany().getCompanyName());
            dto.setCompanyRegistrationNumber(e.getCompany().getRegistrationNumber());
        }
        dto.setNic(e.getNic());
        dto.setDob(e.getDob());
        dto.setGender(e.getGender() != null ? e.getGender().name() : null);
        dto.setPhone(e.getPhone());
        dto.setAddress(e.getAddress());
        dto.setEmergencyContactName(e.getEmergencyContactName());
        dto.setEmergencyContactPhone(e.getEmergencyContactPhone());
        dto.setEmergencyContactRelation(e.getEmergencyContactRelation());
        return dto;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private UserSummaryDTO toSummary(Employee e) {
        UserSummaryDTO dto = new UserSummaryDTO();
        dto.setId(e.getId());
        dto.setEmployeeId(e.getEmployeeId());
        dto.setFullName(e.getFullName());
        dto.setEmail(e.getEmail());
        dto.setRole(e.getRole() != null ? e.getRole().name() : null);
        dto.setStatus(e.getStatus() != null ? e.getStatus().name() : null);
        dto.setDesignation(e.getDesignation());
        dto.setEmploymentType(e.getEmploymentType());
        dto.setJoiningDate(e.getJoiningDate());
        dto.setTerminationDate(e.getTerminationDate());
        if (e.getDepartment() != null) dto.setDepartmentName(e.getDepartment().getName());
        if (e.getCompany() != null) {
            dto.setCompanyId(e.getCompany().getId());
            dto.setCompanyName(e.getCompany().getCompanyName());
            dto.setCompanyRegistrationNumber(e.getCompany().getRegistrationNumber());
        }
        return dto;
    }
}
