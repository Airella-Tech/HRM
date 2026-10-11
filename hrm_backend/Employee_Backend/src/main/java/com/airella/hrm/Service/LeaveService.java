package com.airella.hrm.service;

import com.airella.hrm.dto.LeaveApplicationDTO;
import com.airella.hrm.dto.LeaveBalanceDTO;
import com.airella.hrm.dto.LeaveEntitlementDTO;
import com.airella.hrm.dto.LeaveTypeDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.*;
import com.airella.hrm.repository.*;
import org.modelmapper.ModelMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Leave service — handles leave applications, approvals, balances.
 */
@Service
@Transactional
public class LeaveService {

    private static final Logger log = LoggerFactory.getLogger(LeaveService.class);

    private final LeaveApplicationRepository leaveApplicationRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final HrServiceClient hrServiceClient;
    private final EmployeeDirectory employeeDirectory;
    private final NotificationRepository notificationRepository;
    private final CompanyRepository companyRepository;
    private final ModelMapper modelMapper;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public LeaveService(LeaveApplicationRepository leaveApplicationRepository,
                        LeaveBalanceRepository leaveBalanceRepository,
                        HrServiceClient hrServiceClient,
                        EmployeeDirectory employeeDirectory,
                        NotificationRepository notificationRepository,
                        CompanyRepository companyRepository,
                        ModelMapper modelMapper,
                        AuditService auditService,
                        NotificationService notificationService) {
        this.notificationService = notificationService;
        this.leaveApplicationRepository = leaveApplicationRepository;
        this.leaveBalanceRepository = leaveBalanceRepository;
        this.hrServiceClient = hrServiceClient;
        this.employeeDirectory = employeeDirectory;
        this.notificationRepository = notificationRepository;
        this.companyRepository = companyRepository;
        this.modelMapper = modelMapper;
        this.auditService = auditService;
    }

    public LeaveApplicationDTO applyLeave(LeaveApplicationDTO dto, Long employeeId) {
        Employee employee = employeeDirectory.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", employeeId));
        LeaveEntitlementDTO leaveType = hrServiceClient.getLeaveEntitlements(employee.getEmail()).stream()
                .filter(t -> t.getLeaveTypeId().equals(dto.getLeaveTypeId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("This leave type has not been assigned to your job role"));

        if (dto.getEndDate().isBefore(dto.getStartDate())) {
            throw new BusinessException("End date cannot be before start date");
        }
        int numberOfDays = calculateWorkingDays(dto.getStartDate(), dto.getEndDate());
        if (numberOfDays == 0) {
            throw new BusinessException("The selected dates fall on a weekend, so there are no working days to take as leave");
        }

        List<LeaveApplication> overlapping = leaveApplicationRepository.findOverlappingLeaves(
                employeeId, dto.getStartDate(), dto.getEndDate());
        if (!overlapping.isEmpty()) {
            throw new BusinessException("You already have a pending or approved leave on these dates");
        }

        int currentYear = LocalDate.now().getYear();
        LeaveBalance balance = currentBalance(employee, leaveType, currentYear);

        // Days already requested but not yet approved are reserved against the balance too
        int available = balance.getRemainingDays()
                - leaveApplicationRepository.sumPendingDays(employeeId, leaveType.getLeaveTypeId(), currentYear);
        if (available < numberOfDays) {
            throw new BusinessException("Insufficient " + leaveType.getLeaveTypeName() + " balance. Available: "
                    + Math.max(available, 0) + " day(s), requested: " + numberOfDays);
        }

        LeaveApplication leave = new LeaveApplication();
        leave.setUserId(employee.getId());
        leave.setCompanyId(employee.getCompany().getId());
        leave.setLeaveTypeId(leaveType.getLeaveTypeId());
        leave.setLeaveTypeName(leaveType.getLeaveTypeName());
        leave.setStartDate(dto.getStartDate());
        leave.setEndDate(dto.getEndDate());
        leave.setNumberOfDays(numberOfDays);
        leave.setReason(dto.getReason());
        leave.setStatus(LeaveApplication.LeaveStatus.PENDING);

        LeaveApplication saved = leaveApplicationRepository.save(leave);
        // Tell every HR manager of the company; clicking it opens this request on the Leave Management page
        notificationService.notifyHrManagers(employee.getCompany().getId(), "New Leave Request",
                employee.getFullName() + " (" + employee.getEmployeeId() + ") applied for " + leaveType.getLeaveTypeName()
                        + " from " + dto.getStartDate() + " to " + dto.getEndDate() + " (" + numberOfDays + " day(s))",
                NotificationService.LEAVE_REQUEST, "/hr/leave?view=" + saved.getId(), saved.getId());
        auditService.logAction("APPLY_LEAVE", "LeaveApplication", saved.getId(),
                "Applied for leave", employee.getCompany().getId());
        log.info("Employee {} applied for {} leave ({} days)", employeeId, leaveType.getLeaveTypeName(), numberOfDays);
        return convertToDTO(saved);
    }

    public LeaveApplicationDTO approveLeave(Long leaveId, Long approverId) {
        LeaveApplication leave = leaveApplicationRepository.findById(leaveId)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveApplication", "id", leaveId));
        Employee approver = employeeDirectory.findById(approverId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", approverId));
        assertSameCompany(leave, approver);

        if (leave.getStatus() != LeaveApplication.LeaveStatus.PENDING) {
            throw new BusinessException("Leave application is not in pending status");
        }

        leave.setStatus(LeaveApplication.LeaveStatus.APPROVED);
        leave.setApprovedByUserId(approver.getId());
        leave.setApprovedAt(LocalDateTime.now());

        int currentYear = LocalDate.now().getYear();
        LeaveBalance balance = leaveBalanceRepository.findByUserIdAndLeaveTypeIdAndYear(
                leave.getUserId(), leave.getLeaveTypeId(), currentYear)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveBalance not found"));

        balance.setUsedDays(balance.getUsedDays() + leave.getNumberOfDays());
        balance.setRemainingDays(balance.getTotalDays() - balance.getUsedDays());
        leaveBalanceRepository.save(balance);

        LeaveApplication saved = leaveApplicationRepository.save(leave);
        notificationService.notifyUser(leave.getUserId(), leave.getCompanyId(),
                "Leave Approved", "Your " + leave.getLeaveTypeName() + " from " + leave.getStartDate() + " to " + leave.getEndDate()
                        + " has been approved by " + approver.getFullName(),
                Notification.NotificationType.LEAVE_APPROVAL, NotificationService.LEAVE_APPROVED, "/employee/leave", leave.getId());
        auditService.logAction("APPROVE_LEAVE", "LeaveApplication", saved.getId(),
                "Approved leave application", leave.getCompanyId());
        return convertToDTO(saved);
    }

    public LeaveApplicationDTO rejectLeave(Long leaveId, String reason, Long approverId) {
        if (reason == null || reason.isBlank()) {
            throw new BusinessException("A comment is required to reject a leave request");
        }
        reason = reason.trim();
        LeaveApplication leave = leaveApplicationRepository.findById(leaveId)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveApplication", "id", leaveId));
        Employee approver = employeeDirectory.findById(approverId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", approverId));
        assertSameCompany(leave, approver);

        if (leave.getStatus() != LeaveApplication.LeaveStatus.PENDING) {
            throw new BusinessException("Leave application is not in pending status");
        }

        leave.setStatus(LeaveApplication.LeaveStatus.REJECTED);
        leave.setRejectionReason(reason);
        leave.setApprovedByUserId(approver.getId());
        leave.setApprovedAt(LocalDateTime.now());

        LeaveApplication saved = leaveApplicationRepository.save(leave);
        notificationService.notifyUser(leave.getUserId(), leave.getCompanyId(),
                "Leave Rejected", "Your " + leave.getLeaveTypeName() + " request has been rejected by " + approver.getFullName()
                        + ". Reason: " + reason,
                Notification.NotificationType.LEAVE_REJECTION, NotificationService.LEAVE_REJECTED, "/employee/leave", leave.getId());
        auditService.logAction("REJECT_LEAVE", "LeaveApplication", saved.getId(),
                "Rejected leave application", leave.getCompanyId());
        return convertToDTO(saved);
    }

    public void cancelLeave(Long leaveId, Long employeeId) {
        LeaveApplication leave = leaveApplicationRepository.findById(leaveId)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveApplication", "id", leaveId));
        if (!leave.getUserId().equals(employeeId)) {
            throw new BusinessException("Unauthorized to cancel this leave");
        }
        if (leave.getStatus() != LeaveApplication.LeaveStatus.PENDING) {
            throw new BusinessException("Only pending leave can be cancelled");
        }
        leave.setStatus(LeaveApplication.LeaveStatus.CANCELLED);
        leaveApplicationRepository.save(leave);
        auditService.logAction("CANCEL_LEAVE", "LeaveApplication", leave.getId(),
                "Cancelled leave application", leave.getCompanyId());
    }

    @Transactional(readOnly = true)
    public List<LeaveApplicationDTO> getEmployeeLeaves(Long employeeId) {
        return leaveApplicationRepository.findByUserIdOrderByCreatedAtDesc(employeeId).stream().collect(Collectors.collectingAndThen(Collectors.toList(), this::toDTOs));
    }

    /** Leave types the employee can apply for — the ones HR has assigned to their job role (hrm_db_hr). */
    @Transactional(readOnly = true)
    public List<LeaveTypeDTO> getLeaveTypes(Long employeeId) {
        Employee employee = employeeDirectory.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", employeeId));
        return hrServiceClient.getLeaveEntitlements(employee.getEmail()).stream()
                .map(e -> new LeaveTypeDTO(e.getLeaveTypeId(), e.getLeaveTypeName(), null, e.getDaysPerYear(), false, 0, true))
                .collect(Collectors.toList());
    }

    /** Every leave request in the company, newest first — the HR leave management table. */
    @Transactional(readOnly = true)
    public List<LeaveApplicationDTO> getCompanyLeaves(Long companyId) {
        return toDTOs(leaveApplicationRepository.findByCompanyIdOrderByCreatedAtDesc(companyId));
    }

    @Transactional(readOnly = true)
    public List<LeaveApplicationDTO> getPendingLeaves(Long companyId) {
        return leaveApplicationRepository.findByCompanyIdAndStatus(companyId, LeaveApplication.LeaveStatus.PENDING).stream().collect(Collectors.collectingAndThen(Collectors.toList(), this::toDTOs));
    }

    // Count of employees on an APPROVED leave that covers the given date —
    // powers the "On Leave Today" stat card on the HR Attendance page.
    @Transactional(readOnly = true)
    public long getOnLeaveCount(Long companyId, LocalDate date) {
        return leaveApplicationRepository.countApprovedOnDate(companyId, date);
    }

    /**
     * This year's balance for every leave type assigned to the employee's job role. Totals follow HR's
     * current assignment, so a change on the HR side shows up here for everyone in that job role.
     * Balances of leave types no longer assigned are kept (with their used days) but not shown.
     */
    public List<LeaveBalanceDTO> getEmployeeLeaveBalances(Long employeeId) {
        int currentYear = LocalDate.now().getYear();
        Employee employee = employeeDirectory.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", employeeId));
        return hrServiceClient.getLeaveEntitlements(employee.getEmail()).stream()
                .map(entitlement -> currentBalance(employee, entitlement, currentYear))
                .sorted(Comparator.comparing(LeaveBalance::getLeaveTypeId))
                .map(b -> convertBalanceToDTO(b, employee))
                .collect(Collectors.toList());
    }

    // ── Private helpers ──────────────────────────────────────────

    /** The employee's balance for the year, created if missing, with its total set to HR's current assignment. */
    private LeaveBalance currentBalance(Employee employee, LeaveEntitlementDTO entitlement, int year) {
        LeaveBalance balance = leaveBalanceRepository
                .findByUserIdAndLeaveTypeIdAndYear(employee.getId(), entitlement.getLeaveTypeId(), year)
                .orElseGet(() -> {
                    LeaveBalance b = new LeaveBalance();
                    b.setUserId(employee.getId());
                    b.setCompanyId(employee.getCompany().getId());
                    b.setLeaveTypeId(entitlement.getLeaveTypeId());
                    b.setYear(year);
                    b.setUsedDays(0);
                    return b;
                });
        int total = entitlement.getDaysPerYear() != null ? entitlement.getDaysPerYear() : 0;
        balance.setLeaveTypeName(entitlement.getLeaveTypeName());
        balance.setTotalDays(total);
        balance.setRemainingDays(total - balance.getUsedDays());
        return leaveBalanceRepository.save(balance);
    }

    /** HR may only act on leave requests of their own company; any other reads as not found. */
    private void assertSameCompany(LeaveApplication leave, Employee hr) {
        if (hr.getRole() == Employee.Role.ADMIN) return;
        if (hr.getCompany() == null || !hr.getCompany().getId().equals(leave.getCompanyId())) {
            throw new ResourceNotFoundException("LeaveApplication", "id", leave.getId());
        }
    }

    private int calculateWorkingDays(LocalDate startDate, LocalDate endDate) {
        int workingDays = 0;
        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            if (current.getDayOfWeek() != DayOfWeek.SATURDAY && current.getDayOfWeek() != DayOfWeek.SUNDAY) {
                workingDays++;
            }
            current = current.plusDays(1);
        }
        return workingDays;
    }

    private void createNotification(Long companyId, Long userId, String title,
                                    String message, Notification.NotificationType type) {
        Notification notification = new Notification();
        notification.setCompany(companyId != null ? companyRepository.findById(companyId).orElse(null) : null);
        notification.setUserId(userId);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setIsRead(false);
        notificationRepository.save(notification);
    }

    private LeaveApplicationDTO convertToDTO(LeaveApplication leave) {
        return toDTOs(List.of(leave)).get(0);
    }

    /** Converts a list with one User_Backend lookup for everyone in it (applicants and approvers). */
    private List<LeaveApplicationDTO> toDTOs(List<LeaveApplication> leaves) {
        Set<Long> ids = new HashSet<>();
        leaves.forEach(l -> { ids.add(l.getUserId()); ids.add(l.getApprovedByUserId()); });
        Map<Long, Employee> people = employeeDirectory.mapByIds(ids);
        return leaves.stream().map(l -> convertToDTO(l, people)).collect(Collectors.toList());
    }

    private LeaveApplicationDTO convertToDTO(LeaveApplication leave, Map<Long, Employee> people) {
        LeaveApplicationDTO dto = modelMapper.map(leave, LeaveApplicationDTO.class);
        dto.setEmployeeId(leave.getUserId());
        Employee employee = people.get(leave.getUserId());
        if (employee != null) {
            dto.setEmployeeName(employee.getFullName());
            dto.setEmployeeIdNumber(employee.getEmployeeId());
            dto.setDepartmentName(employee.getDepartmentName());
        }
        dto.setLeaveTypeId(leave.getLeaveTypeId());
        dto.setLeaveTypeName(leave.getLeaveTypeName());
        if (leave.getStatus() != null) dto.setStatus(leave.getStatus().name());
        if (leave.getApprovedByUserId() != null) {
            dto.setApprovedBy(leave.getApprovedByUserId());
            Employee approver = people.get(leave.getApprovedByUserId());
            if (approver != null) dto.setApprovedByName(approver.getFullName());
        }
        return dto;
    }

    private LeaveBalanceDTO convertBalanceToDTO(LeaveBalance balance, Employee employee) {
        LeaveBalanceDTO dto = modelMapper.map(balance, LeaveBalanceDTO.class);
        dto.setEmployeeId(balance.getUserId());
        if (employee != null) {
            dto.setEmployeeName(employee.getFullName());
        }
        dto.setLeaveTypeId(balance.getLeaveTypeId());
        dto.setLeaveTypeName(balance.getLeaveTypeName());
        return dto;
    }
}
