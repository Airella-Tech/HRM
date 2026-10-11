package com.airella.hrm.controller;

import com.airella.hrm.dto.*;
import com.airella.hrm.model.Company;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.repository.CompanyRepository;
import com.airella.hrm.service.EmployeeDirectory;
import com.airella.hrm.repository.AttendanceRepository;
import com.airella.hrm.repository.LeaveApplicationRepository;
import com.airella.hrm.model.Employee;
import com.airella.hrm.model.LeaveApplication;
import com.airella.hrm.service.*;
import jakarta.validation.Valid;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Admin controller — system-wide operations: companies, system users, dashboard stats.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final CompanyRepository companyRepository;
    private final EmployeeDirectory employeeDirectory;
    private final EmployeeService employeeService;
    private final AttendanceRepository attendanceRepository;
    private final LeaveApplicationRepository leaveApplicationRepository;
    private final AuditService auditService;
    private final ModelMapper modelMapper;

    public AdminController(CompanyRepository companyRepository,
                           EmployeeDirectory employeeDirectory,
                           EmployeeService employeeService,
                           AttendanceRepository attendanceRepository,
                           LeaveApplicationRepository leaveApplicationRepository,
                           AuditService auditService,
                           ModelMapper modelMapper) {
        this.companyRepository = companyRepository;
        this.employeeDirectory = employeeDirectory;
        this.employeeService = employeeService;
        this.attendanceRepository = attendanceRepository;
        this.leaveApplicationRepository = leaveApplicationRepository;
        this.auditService = auditService;
        this.modelMapper = modelMapper;
    }

    // ── Dashboard ────────────────────────────────────────────────

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<DashboardStatsDTO>> getDashboardStats() {
        DashboardStatsDTO stats = new DashboardStatsDTO();
        stats.setTotalEmployees((long) employeeDirectory.findAll().size());
        stats.setPresentToday(attendanceRepository.countPresentByCompanyIdAndDate(null, LocalDate.now()));
        stats.setPendingLeaves(leaveApplicationRepository.countByCompanyIdAndStatus(null, LeaveApplication.LeaveStatus.PENDING));
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    // ── Company Management ───────────────────────────────────────

    @GetMapping("/companies")
    public ResponseEntity<ApiResponse<List<CompanyDTO>>> getAllCompanies() {
        List<CompanyDTO> companies = companyRepository.findAll().stream()
                .map(c -> modelMapper.map(c, CompanyDTO.class))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(companies));
    }

    @PostMapping("/companies")
    public ResponseEntity<ApiResponse<CompanyDTO>> createCompany(@Valid @RequestBody CompanyDTO dto) {
        Company company = new Company();
        company.setCompanyName(dto.getCompanyName());
        company.setRegistrationNumber(dto.getRegistrationNumber());
        company.setEmail(dto.getEmail());
        company.setPhone(dto.getPhone());
        company.setAddress(dto.getAddress());
        company.setWebsite(dto.getWebsite());
        company.setStatus(Company.CompanyStatus.PENDING);

        Company saved = companyRepository.save(company);
        auditService.logAction("CREATE_COMPANY", "Company", saved.getId(),
                "Created company: " + saved.getCompanyName(), saved.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(modelMapper.map(saved, CompanyDTO.class), "Company created"));
    }

    @PostMapping("/companies/{id}/approve")
    public ResponseEntity<ApiResponse<CompanyDTO>> approveCompany(@PathVariable Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));
        company.setStatus(Company.CompanyStatus.APPROVED);
        Company saved = companyRepository.save(company);
        auditService.logAction("APPROVE_COMPANY", "Company", saved.getId(),
                "Approved company: " + saved.getCompanyName(), saved.getId());
        return ResponseEntity.ok(ApiResponse.success(modelMapper.map(saved, CompanyDTO.class), "Company approved"));
    }

    @PostMapping("/companies/{id}/reject")
    public ResponseEntity<ApiResponse<CompanyDTO>> rejectCompany(@PathVariable Long id, @RequestParam String reason) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));
        company.setStatus(Company.CompanyStatus.REJECTED);
        company.setRejectionReason(reason);
        Company saved = companyRepository.save(company);
        auditService.logAction("REJECT_COMPANY", "Company", saved.getId(),
                "Rejected company: " + saved.getCompanyName(), saved.getId());
        return ResponseEntity.ok(ApiResponse.success(modelMapper.map(saved, CompanyDTO.class), "Company rejected"));
    }

    // ── System Users ─────────────────────────────────────────────

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<EmployeeDTO>>> getAllUsers() {
        List<EmployeeDTO> users = employeeDirectory.findAll().stream()
                .map(e -> {
                    EmployeeDTO dto = new EmployeeDTO();
                    dto.setId(e.getId());
                    dto.setEmployeeId(e.getEmployeeId());
                    dto.setFullName(e.getFullName());
                    dto.setEmail(e.getEmail());
                    dto.setDesignation(e.getDesignation());
                    dto.setJoiningDate(e.getJoiningDate());
                    dto.setTerminationDate(e.getTerminationDate());
                    if (e.getRole() != null) dto.setRole(e.getRole().name());
                    if (e.getStatus() != null) dto.setStatus(e.getStatus().name());
                    try {
                        if (e.getCompany() != null) {
                            dto.setCompanyId(e.getCompany().getId());
                            dto.setCompanyName(e.getCompany().getCompanyName());
                        }
                    } catch (Exception ex) {
                        // ignore lazy proxy exception
                    }
                    return dto;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(users));
    }
}
