package com.airella.hrm.controller;

import com.airella.hrm.dto.AdditionalPaymentDTO;
import com.airella.hrm.dto.ApiResponse;
import com.airella.hrm.dto.BasicPaymentDTO;
import com.airella.hrm.dto.PaySheetDTO;
import com.airella.hrm.model.Employee;
import com.airella.hrm.service.AuthService;
import com.airella.hrm.service.EmployeeDirectory;
import com.airella.hrm.service.SalaryConfigService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * HR salary configuration: job role salaries (basic payments), individual allowances /
 * deductions (additional payments) and the resulting pay sheet of each employee.
 */
@RestController
@RequestMapping("/api/hr")
@PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
public class SalaryConfigController {

    private final SalaryConfigService salaryConfigService;
    private final AuthService authService;
    private final EmployeeDirectory employeeDirectory;

    public SalaryConfigController(SalaryConfigService salaryConfigService, AuthService authService,
                                  EmployeeDirectory employeeDirectory) {
        this.salaryConfigService = salaryConfigService;
        this.authService = authService;
        this.employeeDirectory = employeeDirectory;
    }

    @GetMapping("/basic-payments")
    public ResponseEntity<ApiResponse<List<BasicPaymentDTO>>> getBasicPayments(
            @RequestParam(required = false) Long departmentId) {
        Employee hr = authService.getCurrentEmployee();
        return ResponseEntity.ok(ApiResponse.success(
                salaryConfigService.getBasicPayments(hr.getCompany().getId(), departmentId)));
    }

    @PostMapping("/basic-payments")
    public ResponseEntity<ApiResponse<List<BasicPaymentDTO>>> saveBasicPayments(
            @RequestBody BasicPaymentDTO.SaveRequest request) {
        Employee hr = authService.getCurrentEmployee();
        List<BasicPaymentDTO> saved = salaryConfigService.saveBasicPayments(request, hr);
        return ResponseEntity.ok(ApiResponse.success(saved, saved.size() + " salary row(s) saved"));
    }

    @DeleteMapping("/basic-payments/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBasicPayment(@PathVariable Long id) {
        Employee hr = authService.getCurrentEmployee();
        salaryConfigService.deleteBasicPayment(id, hr);
        return ResponseEntity.ok(ApiResponse.success(null, "Salary row deleted successfully"));
    }

    @GetMapping("/additional-payments")
    public ResponseEntity<ApiResponse<List<AdditionalPaymentDTO>>> getAdditionalPayments(
            @RequestParam(required = false) String employeeEmail) {
        Employee hr = authService.getCurrentEmployee();
        return ResponseEntity.ok(ApiResponse.success(
                salaryConfigService.getAdditionalPayments(hr.getCompany().getId(), employeeEmail)));
    }

    @PostMapping("/additional-payments")
    public ResponseEntity<ApiResponse<List<AdditionalPaymentDTO>>> saveAdditionalPayments(
            @RequestBody AdditionalPaymentDTO.SaveRequest request) {
        Employee hr = authService.getCurrentEmployee();
        List<AdditionalPaymentDTO> saved = salaryConfigService.saveAdditionalPayments(request, hr);
        return ResponseEntity.ok(ApiResponse.success(saved, saved.size() + " allowance/deduction(s) saved"));
    }

    /** Body: the employees to work pay sheets out for, with their details from the user database. */
    @PostMapping("/payroll/sheet")
    public ResponseEntity<ApiResponse<List<PaySheetDTO>>> getPaySheets(
            @RequestBody List<PaySheetDTO.EmployeeRef> employees) {
        Employee hr = authService.getCurrentEmployee();
        Long companyId = hr.getCompany().getId();
        // The employee list comes from User_Backend (the same list the Employees page shows). Salaries are
        // looked up only in this company's basic_payments / additional_payments, so nothing from another
        // company can leak; employees must not be dropped just because the company matching differs.
        List<PaySheetDTO.EmployeeRef> ownEmployees = employees == null ? List.of() : employees.stream()
                .filter(ref -> ref.getEmail() != null && !ref.getEmail().isBlank())
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(
                salaryConfigService.getPaySheets(companyId, ownEmployees)));
    }
}
