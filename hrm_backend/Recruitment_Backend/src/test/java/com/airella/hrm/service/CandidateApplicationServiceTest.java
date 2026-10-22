package com.airella.hrm.service;

import com.airella.hrm.dto.ApplyJobRequest;
import com.airella.hrm.dto.CandidateApplicationDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.model.*;
import com.airella.hrm.repository.CandidateApplicationDocumentRepository;
import com.airella.hrm.repository.CandidateApplicationRepository;
import com.airella.hrm.repository.JobVacancyRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CandidateApplicationServiceTest {

    @Mock
    private CandidateApplicationRepository applicationRepo;

    @Mock
    private CandidateApplicationDocumentRepository documentRepo;

    @Mock
    private JobVacancyRepository vacancyRepo;

    @Mock
    private AuthService authService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private CandidateApplicationService service;

    private JobVacancy sampleVacancy;
    private byte[] samplePdfBytes;

    @BeforeEach
    void setUp() throws IOException {
        sampleVacancy = new JobVacancy();
        sampleVacancy.setId(10L);
        sampleVacancy.setTitle("QA Automation Engineer");
        sampleVacancy.setStatus(VacancyStatus.PUBLISHED);
        sampleVacancy.setDeadline(LocalDate.now().plusDays(30));
        sampleVacancy.setCompanyRef("PV 20261234");
        sampleVacancy.setRequiredSkills(Set.of("Selenium", "Java", "TestNG"));

        // Create a real minimal PDF with searchable text using PDFBox
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                cs.showText("John Doe - Senior QA Automation Engineer with Selenium and Java experience");
                cs.endText();
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            samplePdfBytes = baos.toByteArray();
        }
    }

    @Test
    void submitApplication_validPdf_storesInDatabaseAndExtractsText() {
        when(vacancyRepo.findById(10L)).thenReturn(Optional.of(sampleVacancy));
        when(applicationRepo.existsByEmailIgnoreCaseAndVacancyIdAndCreatedAtGreaterThanEqual(
                anyString(), eq(10L), any(LocalDateTime.class))).thenReturn(false);

        when(applicationRepo.save(any(CandidateApplication.class))).thenAnswer(invocation -> {
            CandidateApplication a = invocation.getArgument(0);
            a.setId(101L);
            return a;
        });

        MockMultipartFile file = new MockMultipartFile(
                "resume", "John_Doe_CV.pdf", "application/pdf", samplePdfBytes);

        ApplyJobRequest req = ApplyJobRequest.builder()
                .candidateName("John Doe")
                .email("john.doe@example.com")
                .phone("0771234567")
                .education("BSc in Computer Science")
                .experienceYears(4)
                .summary("Experienced test automation engineer")
                .skills(List.of("Selenium", "Java"))
                .build();

        CandidateApplicationDTO dto = service.submitApplication(10L, "PV 20261234", req, file);

        assertNotNull(dto);
        assertEquals(101L, dto.getId());
        assertEquals("John Doe", dto.getCandidateName());
        assertNotNull(dto.getTrackingCode());
        assertTrue(dto.getTrackingCode().startsWith("APP-"));

        // Verify PDF text was extracted via PDFBox
        assertNotNull(dto.getResumeText());
        assertTrue(dto.getResumeText().contains("John Doe") || dto.getResumeText().contains("QA"));

        // Verify CandidateApplicationDocument was saved to the separate database table
        ArgumentCaptor<CandidateApplicationDocument> docCaptor = ArgumentCaptor.forClass(CandidateApplicationDocument.class);
        verify(documentRepo).save(docCaptor.capture());
        CandidateApplicationDocument savedDoc = docCaptor.getValue();

        assertEquals(101L, savedDoc.getApplicationId());
        assertEquals("John_Doe_CV.pdf", savedDoc.getFileName());
        assertEquals("application/pdf", savedDoc.getContentType());
        assertArrayEquals(samplePdfBytes, savedDoc.getData());
    }

    @Test
    void submitApplication_duplicateWithin90Days_throwsBusinessException() {
        when(vacancyRepo.findById(10L)).thenReturn(Optional.of(sampleVacancy));
        when(applicationRepo.existsByEmailIgnoreCaseAndVacancyIdAndCreatedAtGreaterThanEqual(
                eq("john.doe@example.com"), eq(10L), any(LocalDateTime.class))).thenReturn(true);

        MockMultipartFile file = new MockMultipartFile(
                "resume", "John_Doe_CV.pdf", "application/pdf", samplePdfBytes);

        ApplyJobRequest req = ApplyJobRequest.builder()
                .candidateName("John Doe")
                .email("john.doe@example.com")
                .build();

        BusinessException ex = assertThrows(BusinessException.class, () ->
                service.submitApplication(10L, "PV 20261234", req, file));

        assertTrue(ex.getMessage().contains("already applied"));
        verify(documentRepo, never()).save(any());
        verify(applicationRepo, never()).save(any());
    }

    @Test
    void submitApplication_missingOrInvalidFile_throwsBusinessException() {
        when(vacancyRepo.findById(10L)).thenReturn(Optional.of(sampleVacancy));
        when(applicationRepo.existsByEmailIgnoreCaseAndVacancyIdAndCreatedAtGreaterThanEqual(
                anyString(), eq(10L), any(LocalDateTime.class))).thenReturn(false);

        MockMultipartFile invalidFile = new MockMultipartFile(
                "resume", "notes.txt", "text/plain", "This is plain text".getBytes());

        ApplyJobRequest req = ApplyJobRequest.builder()
                .candidateName("Alice")
                .email("alice@example.com")
                .build();

        BusinessException ex = assertThrows(BusinessException.class, () ->
                service.submitApplication(10L, "PV 20261234", req, invalidFile));

        assertTrue(ex.getMessage().contains("PDF"));
        verify(documentRepo, never()).save(any());
    }
}
