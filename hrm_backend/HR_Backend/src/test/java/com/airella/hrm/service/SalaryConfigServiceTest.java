package com.airella.hrm.service;

import com.airella.hrm.dto.AdditionalPaymentDTO;
import com.airella.hrm.dto.BasicPaymentDTO;
import com.airella.hrm.dto.PaySheetDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.model.*;
import com.airella.hrm.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SalaryConfigServiceTest {

    private BasicPaymentRepository basicRepo;
    private AdditionalPaymentRepository additionalRepo;
    private JobRoleRepository jobRoleRepo;
    private EmploymentTypeRepository employmentTypeRepo;
    private EmployeeDirectory employeeDirectory;
    private SalaryConfigService service;

    private Company company;
    private Department engineering;
    private JobRole engineer;
    private EmploymentType fullTime;
    private EmploymentType intern;
    private Employee hr;

    @BeforeEach
    void setUp() {
        basicRepo = mock(BasicPaymentRepository.class);
        additionalRepo = mock(AdditionalPaymentRepository.class);
        jobRoleRepo = mock(JobRoleRepository.class);
        employmentTypeRepo = mock(EmploymentTypeRepository.class);
        employeeDirectory = mock(EmployeeDirectory.class);
        service = new SalaryConfigService(basicRepo, additionalRepo, jobRoleRepo, employmentTypeRepo,
                employeeDirectory, mock(AuditService.class));

        company = new Company();
        company.setId(1L);
        engineering = new Department();
        engineering.setId(10L);
        engineering.setName("Engineering");
        engineering.setCompany(company);
        engineer = new JobRole();
        engineer.setId(100L);
        engineer.setJobTitle("Software Engineer");
        engineer.setDepartment(engineering);
        fullTime = employmentType(5L, "Full-Time");
        intern = employmentType(6L, "Internship");
        hr = new Employee();
        hr.setId(99L);
        hr.setFullName("HR Person");
        hr.setEmail("hr@acme.test");
        hr.setCompany(company);

        when(jobRoleRepo.findById(100L)).thenReturn(Optional.of(engineer));
        when(employmentTypeRepo.findByCompanyIdAndActive(1L, true)).thenReturn(List.of(fullTime, intern));
        when(basicRepo.findByJobRoleIdAndEmploymentTypeId(anyLong(), anyLong())).thenReturn(Optional.empty());
        when(basicRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(additionalRepo.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
    }

    private EmploymentType employmentType(Long id, String name) {
        EmploymentType t = new EmploymentType();
        t.setId(id);
        t.setName(name);
        t.setCompany(company);
        return t;
    }

    private BasicPaymentDTO row(Long employmentTypeId, String basic, String allowance, String deduction) {
        BasicPaymentDTO r = new BasicPaymentDTO();
        r.setEmploymentTypeId(employmentTypeId);
        r.setPeriod("MONTHLY");
        r.setBasicSalary(basic == null ? null : new BigDecimal(basic));
        r.setAllowance(allowance == null ? null : new BigDecimal(allowance));
        r.setDeduction(deduction == null ? null : new BigDecimal(deduction));
        return r;
    }

    private BasicPaymentDTO.SaveRequest request(BasicPaymentDTO... rows) {
        BasicPaymentDTO.SaveRequest req = new BasicPaymentDTO.SaveRequest();
        req.setJobRoleId(100L);
        req.setPayments(new ArrayList<>(List.of(rows)));
        return req;
    }

    private BasicPayment payment(Long id, EmploymentType type, String basic, String allowance, String deduction) {
        BasicPayment p = new BasicPayment();
        p.setId(id);
        p.setCompany(company);
        p.setDepartment(engineering);
        p.setJobRole(engineer);
        p.setEmploymentType(type);
        p.setPeriod(BasicPayment.Period.MONTHLY);
        p.setBasicSalary(new BigDecimal(basic));
        p.setAllowance(new BigDecimal(allowance));
        p.setDeduction(new BigDecimal(deduction));
        p.setTotalSalary(new BigDecimal(basic).add(new BigDecimal(allowance)).subtract(new BigDecimal(deduction)));
        return p;
    }

    private PaySheetDTO.EmployeeRef ref(String email, String dept, String designation, String type) {
        PaySheetDTO.EmployeeRef r = new PaySheetDTO.EmployeeRef();
        r.setEmail(email);
        r.setFullName(email);
        r.setDepartmentName(dept);
        r.setDesignation(designation);
        r.setEmploymentType(type);
        return r;
    }

    @Test
    void saveBasicPayments_worksOutTotalSalary() {
        List<BasicPaymentDTO> saved = service.saveBasicPayments(request(row(5L, "100000", "15000", "5000")), hr);

        assertEquals(1, saved.size());
        assertEquals(0, new BigDecimal("110000").compareTo(saved.get(0).getTotalSalary()));
        assertEquals("Full-Time", saved.get(0).getEmploymentTypeName());
        assertEquals("Software Engineer", saved.get(0).getJobRoleTitle());
    }

    @Test
    void saveBasicPayments_blankAllowanceAndDeductionAreZero() {
        List<BasicPaymentDTO> saved = service.saveBasicPayments(request(row(5L, "80000", null, null)), hr);
        assertEquals(0, new BigDecimal("80000").compareTo(saved.get(0).getTotalSalary()));
    }

    @Test
    void saveBasicPayments_updatesExistingRowInsteadOfDuplicating() {
        BasicPayment existing = payment(7L, fullTime, "50000", "0", "0");
        when(basicRepo.findByJobRoleIdAndEmploymentTypeId(100L, 5L)).thenReturn(Optional.of(existing));

        List<BasicPaymentDTO> saved = service.saveBasicPayments(request(row(5L, "60000", "0", "0")), hr);

        assertEquals(7L, saved.get(0).getId());
        assertEquals(0, new BigDecimal("60000").compareTo(existing.getBasicSalary()));
    }

    @Test
    void saveBasicPayments_rejectsInvalidRows() {
        assertThrows(BusinessException.class, () -> service.saveBasicPayments(request(row(5L, null, "0", "0")), hr));
        assertThrows(BusinessException.class, () -> service.saveBasicPayments(request(row(5L, "1000", "0", "2000")), hr));
        assertThrows(BusinessException.class, () -> service.saveBasicPayments(request(row(5L, "1000", "-1", "0")), hr));
        assertThrows(BusinessException.class, () -> service.saveBasicPayments(request(row(null, "1000", "0", "0")), hr));
        assertThrows(BusinessException.class,
                () -> service.saveBasicPayments(request(row(5L, "1000", "0", "0"), row(5L, "2000", "0", "0")), hr));
        verify(basicRepo, never()).save(argThat(p -> p.getBasicSalary().compareTo(new BigDecimal("2000")) == 0));
    }

    @Test
    void paySheet_matchesJobRoleAndEmploymentTypeAndAddsIndividualItems() {
        when(basicRepo.findByCompanyIdOrderByUpdatedAtDesc(1L)).thenReturn(List.of(
                payment(1L, fullTime, "100000", "10000", "5000"),
                payment(2L, intern, "30000", "0", "0")));
        AdditionalPayment fuel = new AdditionalPayment(1L, company, "ann@acme.test", "SE001", "Ann", null, "Fuel",
                AdditionalPayment.Type.ALLOWANCE, new BigDecimal("8000"), null, null, null, null);
        AdditionalPayment advance = new AdditionalPayment(2L, company, "ann@acme.test", "SE001", "Ann", null, "Advance",
                AdditionalPayment.Type.DEDUCTION, new BigDecimal("3000"), null, null, null, null);
        when(additionalRepo.findByCompanyIdOrderByIdAsc(1L)).thenReturn(List.of(fuel, advance));

        List<PaySheetDTO> sheets = service.getPaySheets(1L, List.of(
                ref("Ann@acme.test", "engineering", " software  engineer ", "full-time"),
                ref("bob@acme.test", "Engineering", "Software Engineer", "Internship"),
                ref("cat@acme.test", "Engineering", "Designer", "Full-Time")));

        PaySheetDTO ann = sheets.get(0);
        assertTrue(ann.isConfigured());
        assertEquals(1L, ann.getBasicPaymentId());
        assertEquals(0, new BigDecimal("18000").compareTo(ann.getTotalAllowance()));
        assertEquals(0, new BigDecimal("8000").compareTo(ann.getTotalDeduction()));
        assertEquals(0, new BigDecimal("110000").compareTo(ann.getNetTotal()));
        assertEquals(2, ann.getAdditionalItems().size());

        PaySheetDTO bob = sheets.get(1);
        assertEquals(2L, bob.getBasicPaymentId());
        assertEquals(0, new BigDecimal("30000").compareTo(bob.getNetTotal()));
        assertTrue(bob.getAdditionalItems().isEmpty());

        PaySheetDTO cat = sheets.get(2);
        assertFalse(cat.isConfigured());
        assertEquals(0, BigDecimal.ZERO.compareTo(cat.getNetTotal()));
    }

    @Test
    void paySheet_fallsBackToSameTitleInOtherDepartmentWhenNoExactDepartmentMatch() {
        when(basicRepo.findByCompanyIdOrderByUpdatedAtDesc(1L)).thenReturn(List.of(payment(1L, fullTime, "100000", "0", "0")));
        when(additionalRepo.findByCompanyIdOrderByIdAsc(1L)).thenReturn(List.of());

        PaySheetDTO sheet = service.getPaySheets(1L,
                List.of(ref("x@acme.test", "Finance", "Software Engineer", "Full-Time"))).get(0);

        assertTrue(sheet.isConfigured());
        assertEquals(1L, sheet.getBasicPaymentId());
    }

    @Test
    void saveAdditionalPayments_replacesEmployeeItems() {
        AdditionalPaymentDTO allowance = new AdditionalPaymentDTO();
        allowance.setName("  Fuel   allowance ");
        allowance.setType("allowance");
        allowance.setAmount(new BigDecimal("8000"));
        AdditionalPaymentDTO.SaveRequest req = new AdditionalPaymentDTO.SaveRequest();
        req.setEmployeeEmail(" Ann@Acme.test ");
        req.setEmployeeName("Ann");
        req.setItems(List.of(allowance));

        List<AdditionalPaymentDTO> saved = service.saveAdditionalPayments(req, hr);

        verify(additionalRepo).saveAll(anyList());
        assertEquals(1, saved.size());
        assertEquals("Fuel allowance", saved.get(0).getName());
        assertEquals("ALLOWANCE", saved.get(0).getType());
        assertEquals("ann@acme.test", saved.get(0).getEmployeeEmail());
    }

    @Test
    void saveAdditionalPayments_emptyListClearsAndInvalidRowsAreRejected() {
        AdditionalPayment existing = new AdditionalPayment();
        existing.setId(5L);
        existing.setCompany(company);
        existing.setEmployeeEmail("ann@acme.test");
        existing.setName("Old allowance");
        existing.setType(AdditionalPayment.Type.ALLOWANCE);
        existing.setAmount(BigDecimal.TEN);
        when(additionalRepo.findByCompanyIdAndEmployeeEmailIgnoreCaseOrderByIdAsc(1L, "ann@acme.test"))
                .thenReturn(List.of(existing));

        AdditionalPaymentDTO.SaveRequest clear = new AdditionalPaymentDTO.SaveRequest();
        clear.setEmployeeEmail("ann@acme.test");
        assertTrue(service.saveAdditionalPayments(clear, hr).isEmpty());
        verify(additionalRepo).deleteAll(List.of(existing));

        AdditionalPaymentDTO bad = new AdditionalPaymentDTO();
        bad.setName("Bonus");
        bad.setType("BONUS");
        bad.setAmount(BigDecimal.TEN);
        AdditionalPaymentDTO.SaveRequest req = new AdditionalPaymentDTO.SaveRequest();
        req.setEmployeeEmail("ann@acme.test");
        req.setItems(List.of(bad));
        assertThrows(BusinessException.class, () -> service.saveAdditionalPayments(req, hr));
    }
}
