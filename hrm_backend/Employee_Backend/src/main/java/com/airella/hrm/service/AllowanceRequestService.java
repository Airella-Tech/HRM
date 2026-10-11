package com.airella.hrm.service;

import com.airella.hrm.dto.AllowanceRequestDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.AllowanceRequest;
import com.airella.hrm.model.AllowanceRequestDocument;
import com.airella.hrm.model.Employee;
import com.airella.hrm.repository.AllowanceRequestDocumentRepository;
import com.airella.hrm.repository.AllowanceRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Allowance requests: employees ask for an allowance with a supporting PDF, HR approves or
 * rejects it (through HR_Backend's internal calls), and the employee sees the outcome.
 */
@Service
@Transactional
public class AllowanceRequestService {

    private static final Logger log = LoggerFactory.getLogger(AllowanceRequestService.class);

    public static final long MAX_DOCUMENT_BYTES = 5L * 1024 * 1024;
    private static final BigDecimal MAX_AMOUNT = new BigDecimal("999999999");
    private static final int MAX_NAME_LENGTH = 100;
    private static final int MAX_TEXT_LENGTH = 1000;

    private final AllowanceRequestRepository requestRepository;
    private final AllowanceRequestDocumentRepository documentRepository;
    private final NotificationService notificationService;

    public AllowanceRequestService(AllowanceRequestRepository requestRepository,
                                   AllowanceRequestDocumentRepository documentRepository,
                                   NotificationService notificationService) {
        this.requestRepository = requestRepository;
        this.documentRepository = documentRepository;
        this.notificationService = notificationService;
    }

    // ── Employee ─────────────────────────────────────────────────

    public AllowanceRequestDTO create(Employee employee, String name, BigDecimal amount, String description,
                                      MultipartFile document) {
        String cleanName = name == null ? "" : name.trim().replaceAll("\\s+", " ");
        if (cleanName.isEmpty()) {
            throw new BusinessException("Enter the allowance name");
        }
        if (cleanName.length() > MAX_NAME_LENGTH) {
            throw new BusinessException("Allowance name must be at most " + MAX_NAME_LENGTH + " characters");
        }
        if (amount == null || amount.signum() <= 0) {
            throw new BusinessException("Amount must be more than 0");
        }
        if (amount.compareTo(MAX_AMOUNT) > 0) {
            throw new BusinessException("Amount is too large");
        }
        String cleanDescription = description == null ? "" : description.trim();
        if (cleanDescription.isEmpty()) {
            throw new BusinessException("Enter a description");
        }
        if (cleanDescription.length() > MAX_TEXT_LENGTH) {
            throw new BusinessException("Description must be at most " + MAX_TEXT_LENGTH + " characters");
        }
        byte[] pdf = readPdf(document);

        AllowanceRequest request = new AllowanceRequest();
        request.setUserId(employee.getId());
        request.setCompanyId(employee.getCompany().getId());
        request.setEmployeeEmail(employee.getEmail().trim().toLowerCase(Locale.ROOT));
        request.setEmployeeCode(employee.getEmployeeId());
        request.setEmployeeName(employee.getFullName());
        request.setName(cleanName);
        request.setAmount(amount.setScale(2, RoundingMode.HALF_UP));
        request.setDescription(cleanDescription);
        request.setDocumentName(fileName(document));
        request.setDocumentSize((long) pdf.length);
        request.setStatus(AllowanceRequest.Status.PENDING);
        AllowanceRequest saved = requestRepository.save(request);

        AllowanceRequestDocument doc = new AllowanceRequestDocument();
        doc.setAllowanceRequestId(saved.getId());
        doc.setFileName(saved.getDocumentName());
        doc.setContentType("application/pdf");
        doc.setData(pdf);
        documentRepository.save(doc);

        log.info("{} requested allowance '{}' ({})", employee.getEmail(), cleanName, saved.getAmount());

        // Tell every HR manager; clicking it opens this request on the Payroll > Allowance Requests page
        notificationService.notifyHrManagers(employee.getCompany().getId(), "New Allowance Request",
                employee.getFullName() + " (" + employee.getEmployeeId() + ") requested " + cleanName
                        + " allowance of Rs." + saved.getAmount().toPlainString(),
                NotificationService.ALLOWANCE_REQUEST, "/hr/payroll/allowance-requests?view=" + saved.getId(), saved.getId());
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<AllowanceRequestDTO> getForEmployee(Employee employee) {
        return requestRepository.findByUserIdOrderByCreatedAtDesc(employee.getId()).stream()
                .map(AllowanceRequestService::toDTO)
                .collect(Collectors.toList());
    }

    /** The PDF of one of the employee's own requests. */
    @Transactional(readOnly = true)
    public AllowanceRequestDocument getDocumentForEmployee(Employee employee, Long requestId) {
        AllowanceRequest request = requestRepository.findById(requestId)
                .filter(r -> employee.getId().equals(r.getUserId()))
                .orElseThrow(() -> new ResourceNotFoundException("AllowanceRequest", "id", requestId));
        return document(request.getId());
    }

    // ── HR (internal calls from HR_Backend) ──────────────────────

    /** Requests of the given employees (HR_Backend sends its company's employee emails). */
    @Transactional(readOnly = true)
    public List<AllowanceRequestDTO> getForEmails(Collection<String> emails) {
        List<String> normalized = emails == null ? List.of() : emails.stream()
                .filter(e -> e != null && !e.isBlank())
                .map(e -> e.trim().toLowerCase(Locale.ROOT))
                .distinct()
                .collect(Collectors.toList());
        if (normalized.isEmpty()) return List.of();
        return requestRepository.findByEmployeeEmailInOrderByCreatedAtDesc(normalized).stream()
                .map(AllowanceRequestService::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AllowanceRequestDTO get(Long requestId) {
        return toDTO(find(requestId));
    }

    @Transactional(readOnly = true)
    public AllowanceRequestDocument getDocument(Long requestId) {
        return document(find(requestId).getId());
    }

    /** Approves or rejects a pending request. Rejecting needs a comment. */
    public AllowanceRequestDTO review(Long requestId, AllowanceRequestDTO.ReviewRequest review) {
        AllowanceRequest request = find(requestId);
        if (request.getStatus() != AllowanceRequest.Status.PENDING) {
            throw new BusinessException("This request was already " + request.getStatus().name().toLowerCase(Locale.ROOT));
        }
        AllowanceRequest.Status status;
        try {
            status = AllowanceRequest.Status.valueOf(review.getStatus() == null ? "" : review.getStatus().trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Choose approve or reject");
        }
        if (status == AllowanceRequest.Status.PENDING) {
            throw new BusinessException("Choose approve or reject");
        }
        String comment = review.getComment() == null ? "" : review.getComment().trim();
        if (status == AllowanceRequest.Status.REJECTED && comment.isEmpty()) {
            throw new BusinessException("Enter a comment explaining why the request is rejected");
        }
        if (comment.length() > MAX_TEXT_LENGTH) {
            throw new BusinessException("Comment must be at most " + MAX_TEXT_LENGTH + " characters");
        }

        request.setStatus(status);
        request.setReviewComment(comment.isEmpty() ? null : comment);
        request.setReviewedByName(review.getReviewedByName());
        request.setReviewedAt(LocalDateTime.now());
        log.info("Allowance request {} of {} {} by {}", requestId, request.getEmployeeEmail(), status, review.getReviewedByName());
        AllowanceRequest saved = requestRepository.save(request);

        // Tell the employee the outcome
        String by = review.getReviewedByName() == null || review.getReviewedByName().isBlank() ? "HR" : review.getReviewedByName();
        boolean approved = status == AllowanceRequest.Status.APPROVED;
        notificationService.notifyUser(saved.getUserId(), saved.getCompanyId(),
                approved ? "Allowance Approved" : "Allowance Rejected",
                approved
                        ? "Your " + saved.getName() + " allowance request (Rs." + saved.getAmount().toPlainString() + ") was approved by " + by
                                + (comment.isEmpty() ? "" : ". Comment: " + comment)
                        : "Your " + saved.getName() + " allowance request (Rs." + saved.getAmount().toPlainString() + ") was rejected by " + by
                                + ". Reason: " + comment,
                com.airella.hrm.model.Notification.NotificationType.GENERAL,
                approved ? NotificationService.ALLOWANCE_APPROVED : NotificationService.ALLOWANCE_REJECTED,
                "/employee/payslip", saved.getId());
        return toDTO(saved);
    }

    // ── helpers ──────────────────────────────────────────────────

    private AllowanceRequest find(Long requestId) {
        return requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("AllowanceRequest", "id", requestId));
    }

    private AllowanceRequestDocument document(Long requestId) {
        return documentRepository.findByAllowanceRequestId(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("AllowanceRequestDocument", "requestId", requestId));
    }

    /** Reads the upload and checks it really is a PDF (by its %PDF header, not just the name). */
    private static byte[] readPdf(MultipartFile document) {
        if (document == null || document.isEmpty()) {
            throw new BusinessException("Attach a PDF document");
        }
        if (document.getSize() > MAX_DOCUMENT_BYTES) {
            throw new BusinessException("The PDF must be 5 MB or smaller");
        }
        byte[] data;
        try {
            data = document.getBytes();
        } catch (IOException e) {
            throw new BusinessException("Could not read the uploaded file");
        }
        boolean isPdf = data.length >= 5 && data[0] == '%' && data[1] == 'P' && data[2] == 'D' && data[3] == 'F' && data[4] == '-';
        if (!isPdf) {
            throw new BusinessException("Only PDF files can be attached");
        }
        return data;
    }

    private static String fileName(MultipartFile document) {
        String original = document.getOriginalFilename();
        String name = original == null ? "" : original.replaceAll("[\\\\/]", "_").trim();
        if (name.isEmpty()) name = "document.pdf";
        if (!name.toLowerCase(Locale.ROOT).endsWith(".pdf")) name = name + ".pdf";
        return name.length() > 200 ? name.substring(name.length() - 200) : name;
    }

    public static AllowanceRequestDTO toDTO(AllowanceRequest r) {
        AllowanceRequestDTO dto = new AllowanceRequestDTO();
        dto.setId(r.getId());
        dto.setEmployeeEmail(r.getEmployeeEmail());
        dto.setEmployeeCode(r.getEmployeeCode());
        dto.setEmployeeName(r.getEmployeeName());
        dto.setName(r.getName());
        dto.setAmount(r.getAmount());
        dto.setDescription(r.getDescription());
        dto.setDocumentName(r.getDocumentName());
        dto.setDocumentSize(r.getDocumentSize());
        dto.setStatus(r.getStatus().name());
        dto.setReviewComment(r.getReviewComment());
        dto.setReviewedByName(r.getReviewedByName());
        dto.setReviewedAt(r.getReviewedAt());
        dto.setCreatedAt(r.getCreatedAt());
        dto.setUpdatedAt(r.getUpdatedAt());
        return dto;
    }
}
