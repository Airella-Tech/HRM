package com.airella.hrm.service;

import com.airella.hrm.dto.LeaveApplicationDTO;
import com.airella.hrm.dto.LeaveBalanceDTO;
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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Optional;
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
    private final LeaveTypeRepository leaveTypeRepository;
    private final EmployeeDirectory employeeDirectory;
    private final NotificationRepository notificationRepository;
    private final CompanyRepository companyRepository;
    private final ModelMapper modelMapper;
    private final AuditService auditService;

    public LeaveService(LeaveApplicationRepository leaveApplicationRepository,
                        LeaveBalanceRepository leaveBalanceRepository,
                        LeaveTypeRepository leaveTypeRepository,
                        EmployeeDirectory employeeDirectory,
                        NotificationRepository notificationRepository,
                        CompanyRepository companyRepository,
                        ModelMapper modelMapper,
                        AuditService auditService) {
        this.leaveApplicationRepository = leaveApplicationRepository;
        this.leaveBalanceRepository = leaveBalanceRepository;
        this.leaveTypeRepository = leaveTypeRepository;
        this.employeeDirectory = employeeDirectory;
        this.notificationRepository = notificationRepository;
        this.companyRepository = companyRepository;
        this.modelMapper = modelMapper;
        this.auditService = auditService;
    }

    public LeaveApplicationDTO applyLeave(LeaveApplicationDTO dto, Long employeeId) {
        Employee employee = employeeDirectory.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", employeeId));
        LeaveType leaveType = leaveTypeRepository.findById(dto.getLeaveTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("LeaveType", "id", dto.getLeaveTypeId()));

        int numberOfDays = calculateWorkingDays(dto.getStartDate(), dto.getEndDate());

        List<LeaveApplication> overlapping = leaveApplicationRepository.findOverlappingLeaves(
                employeeId, dto.getStartDate(), dto.getEndDate());
        if (!overlapping.isEmpty()) {
            throw new BusinessException("Leave request overlaps with existing approved leave");
        }

        int currentYear = LocalDate.now().getYear();
        Optional<LeaveBalance> balanceOpt = leaveBalanceRepository.findByUserIdAndLeaveTypeIdAndYear(
                employeeId, dto.getLeaveTypeId(), currentYear);

        if (balanceOpt.isPresent()) {
            LeaveBalance balance = balanceOpt.get();
            if (balance.getRemainingDays() < numberOfDays) {
                throw new BusinessException("Insufficient leave balance. Available: " + balance.getRemainingDays() + " days");
            }
        } else {
            createLeaveBalance(employee, leaveType, currentYear);
        }

        LeaveApplication leave = new LeaveApplication();
        leave.setUserId(employee.getId());
        leave.setCompanyId(employee.getCompany().getId());
        leave.setLeaveType(leaveType);
        leave.setStartDate(dto.getStartDate());
        leave.setEndDate(dto.getEndDate());
        leave.setNumberOfDays(numberOfDays);
        leave.setReason(dto.getReason());
        leave.setStatus(LeaveApplication.LeaveStatus.PENDING);

        LeaveApplication saved = leaveApplicationRepository.save(leave);
        createNotification(employee.getCompany().getId(), null, "New Leave Request",
                employee.getFullName() + " has applied for " + leaveType.getName(),
                Notification.NotificationType.LEAVE_APPROVAL);
        auditService.logAction("APPLY_LEAVE", "LeaveApplication", saved.getId(),
                "Applied for leave", employee.getCompany().getId());
        log.info("Employee {} applied for {} leave ({} days)", employeeId, leaveType.getName(), numberOfDays);
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
                leave.getUserId(), leave.getLeaveType().getId(), currentYear)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveBalance not found"));

        balance.setUsedDays(balance.getUsedDays() + leave.getNumberOfDays());
        balance.setRemainingDays(balance.getTotalDays() - balance.getUsedDays());
        leaveBalanceRepository.save(balance);

        LeaveApplication saved = leaveApplicationRepository.save(leave);
        createNotification(leave.getCompanyId(), leave.getUserId(),
                "Leave Approved", "Your leave from " + leave.getStartDate() + " to " + leave.getEndDate() + " has been approved",
                Notification.NotificationType.LEAVE_APPROVAL);
        auditService.logAction("APPROVE_LEAVE", "LeaveApplication", saved.getId(),
                "Approved leave application", leave.getCompanyId());
        return convertToDTO(saved);
    }

    public LeaveApplicationDTO rejectLeave(Long leaveId, String reason, Long approverId) {
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
        createNotification(leave.getCompanyId(), leave.getUserId(),
                "Leave Rejected", "Your leave request has been rejected. Reason: " + reason,
                Notification.NotificationType.LEAVE_REJECTION);
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
        return leaveApplicationRepository.findByUserId(employeeId).stream().collect(Collectors.collectingAndThen(Collectors.toList(), this::toDTOs));
    }

    @Transactional(readOnly = true)
    public List<LeaveApplicationDTO> getPendingLeaves(Long companyId) {
        return leaveApplicationRepository.findByCompanyIdAndStatus(companyId, LeaveApplication.LeaveStatus.PENDING).stream().collect(Collectors.collectingAndThen(Collectors.toList(), this::toDTOs));
    }

    @Transactional(readOnly = true)
    public List<LeaveBalanceDTO> getEmployeeLeaveBalances(Long employeeId) {
        int currentYear = LocalDate.now().getYear();
        List<LeaveBalance> balances = leaveBalanceRepository.findByUserIdAndYear(employeeId, currentYear);

        if (balances.isEmpty()) {
            Employee employee = employeeDirectory.findById(employeeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", employeeId));
            initializeLeaveBalances(employee, currentYear);
            balances = leaveBalanceRepository.findByUserIdAndYear(employeeId, currentYear);
        }

        Map<Long, Employee> people = employeeDirectory.mapByIds(balances.stream().map(LeaveBalance::getUserId).toList());
        return balances.stream().map(b -> convertBalanceToDTO(b, people.get(b.getUserId()))).collect(Collectors.toList());
    }

    // ── Private helpers ──────────────────────────────────────────

    private void initializeLeaveBalances(Employee employee, int year) {
        List<LeaveType> leaveTypes = leaveTypeRepository.findByActive(true);
        for (LeaveType leaveType : leaveTypes) {
            createLeaveBalance(employee, leaveType, year);
        }
    }

    private void createLeaveBalance(Employee employee, LeaveType leaveType, int year) {
        LeaveBalance balance = new LeaveBalance();
        balance.setUserId(employee.getId());
        balance.setCompanyId(employee.getCompany().getId());
        balance.setLeaveType(leaveType);
        balance.setYear(year);
        balance.setTotalDays(leaveType.getDefaultDaysPerYear());
        balance.setUsedDays(0);
        balance.setRemainingDays(leaveType.getDefaultDaysPerYear());
        leaveBalanceRepository.save(balance);
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
        }
        if (leave.getLeaveType() != null) {
            dto.setLeaveTypeId(leave.getLeaveType().getId());
            dto.setLeaveTypeName(leave.getLeaveType().getName());
        }
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
        if (balance.getLeaveType() != null) {
            dto.setLeaveTypeId(balance.getLeaveType().getId());
            dto.setLeaveTypeName(balance.getLeaveType().getName());
        }
        return dto;
    }

    /** HR may only act on leave requests of their own company; any other reads as not found. */
    private void assertSameCompany(LeaveApplication leave, Employee hr) {
        if (hr.getRole() == Employee.Role.ADMIN) return;
        if (hr.getCompany() == null || !hr.getCompany().getId().equals(leave.getCompanyId())) {
            throw new ResourceNotFoundException("LeaveApplication", "id", leave.getId());
        }
    }
}
