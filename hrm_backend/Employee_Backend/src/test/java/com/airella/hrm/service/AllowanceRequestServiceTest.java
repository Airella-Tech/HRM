package com.airella.hrm.service;

import com.airella.hrm.dto.AllowanceRequestDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.model.AllowanceRequest;
import com.airella.hrm.model.AllowanceRequestDocument;
import com.airella.hrm.model.Company;
import com.airella.hrm.model.Employee;
import com.airella.hrm.repository.AllowanceRequestDocumentRepository;
import com.airella.hrm.repository.AllowanceRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AllowanceRequestServiceTest {

    private AllowanceRequestRepository requestRepo;
    private AllowanceRequestDocumentRepository documentRepo;
    private AllowanceRequestService service;
    private Employee employee;

    private static final byte[] PDF = "%PDF-1.4\n%fake pdf body".getBytes(StandardCharsets.US_ASCII);

    @BeforeEach
    void setUp() {
        requestRepo = mock(AllowanceRequestRepository.class);
        documentRepo = mock(AllowanceRequestDocumentRepository.class);
        service = new AllowanceRequestService(requestRepo, documentRepo, mock(NotificationService.class));
        Company company = new Company();
        company.setId(1L);
        employee = new Employee();
        employee.setId(3L);
        employee.setCompany(company);
        employee.setEmail(" Ann@Acme.Test ");
        employee.setEmployeeId("SE001");
        employee.setFullName("Ann");
        when(requestRepo.save(any())).thenAnswer(inv -> {
            AllowanceRequest r = inv.getArgument(0);
            if (r.getId() == null) r.setId(10L);
            return r;
        });
    }

    private MockMultipartFile pdf(String name, byte[] data) {
        return new MockMultipartFile("document", name, "application/pdf", data);
    }

    private AllowanceRequest pending() {
        AllowanceRequest r = new AllowanceRequest();
        r.setId(10L);
        r.setEmployeeEmail("ann@acme.test");
        r.setName("Medical");
        r.setAmount(new BigDecimal("1000.00"));
        r.setStatus(AllowanceRequest.Status.PENDING);
        return r;
    }

    private AllowanceRequestDTO.ReviewRequest review(String status, String comment) {
        AllowanceRequestDTO.ReviewRequest r = new AllowanceRequestDTO.ReviewRequest();
        r.setStatus(status);
        r.setComment(comment);
        r.setReviewedByName("HR Person");
        return r;
    }

    @Test
    void create_savesPendingRequestAndPdf() {
        AllowanceRequestDTO dto = service.create(employee, "  Medical   claim ", new BigDecimal("12500"), " Hospital bill ", pdf("bill.pdf", PDF));

        assertEquals("PENDING", dto.getStatus());
        assertEquals("Medical claim", dto.getName());
        assertEquals("ann@acme.test", dto.getEmployeeEmail());
        assertEquals("Hospital bill", dto.getDescription());
        assertEquals("bill.pdf", dto.getDocumentName());
        ArgumentCaptor<AllowanceRequestDocument> doc = ArgumentCaptor.forClass(AllowanceRequestDocument.class);
        verify(documentRepo).save(doc.capture());
        assertEquals(10L, doc.getValue().getAllowanceRequestId());
        assertArrayEquals(PDF, doc.getValue().getData());
    }

    @Test
    void create_rejectsNonPdfAndMissingFields() {
        assertThrows(BusinessException.class, () -> service.create(employee, "Medical", BigDecimal.TEN, "x",
                pdf("bill.pdf", "not a pdf".getBytes(StandardCharsets.US_ASCII))));
        assertThrows(BusinessException.class, () -> service.create(employee, "Medical", BigDecimal.TEN, "x", null));
        assertThrows(BusinessException.class, () -> service.create(employee, " ", BigDecimal.TEN, "x", pdf("a.pdf", PDF)));
        assertThrows(BusinessException.class, () -> service.create(employee, "Medical", BigDecimal.ZERO, "x", pdf("a.pdf", PDF)));
        assertThrows(BusinessException.class, () -> service.create(employee, "Medical", BigDecimal.TEN, "  ", pdf("a.pdf", PDF)));
        verify(requestRepo, never()).save(any());
    }

    @Test
    void review_rejectNeedsCommentAndIsStored() {
        when(requestRepo.findById(10L)).thenReturn(Optional.of(pending()));

        assertThrows(BusinessException.class, () -> service.review(10L, review("REJECTED", "  ")));

        AllowanceRequestDTO dto = service.review(10L, review("rejected", "No receipt"));
        assertEquals("REJECTED", dto.getStatus());
        assertEquals("No receipt", dto.getReviewComment());
        assertEquals("HR Person", dto.getReviewedByName());
        assertNotNull(dto.getReviewedAt());
    }

    @Test
    void review_approveWithoutComment() {
        when(requestRepo.findById(10L)).thenReturn(Optional.of(pending()));
        AllowanceRequestDTO dto = service.review(10L, review("APPROVED", null));
        assertEquals("APPROVED", dto.getStatus());
        assertNull(dto.getReviewComment());
    }

    @Test
    void review_onlyPendingRequestsAndValidStatus() {
        AllowanceRequest done = pending();
        done.setStatus(AllowanceRequest.Status.APPROVED);
        when(requestRepo.findById(10L)).thenReturn(Optional.of(done));
        assertThrows(BusinessException.class, () -> service.review(10L, review("REJECTED", "late")));

        when(requestRepo.findById(11L)).thenReturn(Optional.of(pending()));
        assertThrows(BusinessException.class, () -> service.review(11L, review("PENDING", null)));
        assertThrows(BusinessException.class, () -> service.review(11L, review("MAYBE", null)));
    }
}
