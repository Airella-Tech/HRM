package com.airella.hrm.service;

import com.airella.hrm.DTO.LeaveApplicationDTO;
import com.airella.hrm.DTO.LeaveBalanceDTO;
import com.airella.hrm.Model.*;
import com.airella.hrm.Repo.*;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class LeaveService {

    @Autowired
    private LeaveApplicationRepo leaveApplicationRepo;

    @Autowired
    private LeaveBalanceRepo leaveBalanceRepo;

    @Autowired
    private LeaveTypeRepo leaveTypeRepo;

    @Autowired
    private EmployeeRepo employeeRepo;

    @Autowired
    private NotificationRepo notificationRepo;

    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private AuditService auditService;

    public LeaveApplicationDTO applyLeave(LeaveApplicationDTO dto, Long employeeId) {
        Employee employee = employeeRepo.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        LeaveType leaveType = leaveTypeRepo.findById(dto.getLeaveTypeId())
                .orElseThrow(() -> new RuntimeException("Leave type not found"));

        // Calculate number of days
        int numberOfDays = calculateWorkingDays(dto.getStartDate(), dto.getEndDate());

        // Check for overlapping leaves
        List<LeaveApplication> overlappingLeaves = leaveApplicationRepo.findOverlappingLeaves(
                employeeId, dto.getStartDate(), dto.getEndDate());
        if (!overlappingLeaves.isEmpty()) {
            throw new RuntimeException("Leave request overlaps with existing approved leave");
        }

        // Check leave balance
        int currentYear = LocalDate.now().getYear();
        Optional<LeaveBalance> balanceOpt = leaveBalanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear(
                employeeId, dto.getLeaveTypeId(), currentYear);

        if (balanceOpt.isPresent()) {
            LeaveBalance balance = balanceOpt.get();
            if (balance.getRemainingDays() < numberOfDays) {
                throw new RuntimeException("Insufficient leave balance. Available: " + 
                        balance.getRemainingDays() + " days");
            }
        } else {
            // Create leave balance if not exists
            createLeaveBalance(employee, leaveType, currentYear);
        }

        // Create leave application
        LeaveApplication leave = new LeaveApplication();
        leave.setEmployee(employee);
        leave.setLeaveType(leaveType);
        leave.setStartDate(dto.getStartDate());
        leave.setEndDate(dto.getEndDate());
        leave.setNumberOfDays(numberOfDays);
        leave.setReason(dto.getReason());
        leave.setStatus(LeaveApplication.LeaveStatus.PENDING);

        LeaveApplication savedLeave = leaveApplicationRepo.save(leave);

        // Send notification to HR
        createNotification(employee.getCompany(), null, "New Leave Request", 
                employee.getFullName() + " has applied for " + leaveType.getName(), 
                Notification.NotificationType.LEAVE_APPROVAL);

        auditService.logAction("APPLY_LEAVE", "LeaveApplication", savedLeave.getId(), 
                "Applied for leave", employee.getCompany().getId());

        return convertToDTO(savedLeave);
    }

    public LeaveApplicationDTO approveLeave(Long leaveId, Long approverId) {
        LeaveApplication leave = leaveApplicationRepo.findById(leaveId)
                .orElseThrow(() -> new RuntimeException("Leave application not found"));

        Employee approver = employeeRepo.findById(approverId)
                .orElseThrow(() -> new RuntimeException("Approver not found"));

        if (leave.getStatus() != LeaveApplication.LeaveStatus.PENDING) {
            throw new RuntimeException("Leave application is not in pending status");
        }

        leave.setStatus(LeaveApplication.LeaveStatus.APPROVED);
        leave.setApprovedBy(approver);
        leave.setApprovedAt(LocalDateTime.now());

        // Deduct from leave balance
        int currentYear = LocalDate.now().getYear();
        LeaveBalance balance = leaveBalanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear(
                leave.getEmployee().getId(), leave.getLeaveType().getId(), currentYear)
                .orElseThrow(() -> new RuntimeException("Leave balance not found"));

        balance.setUsedDays(balance.getUsedDays() + leave.getNumberOfDays());
        balance.setRemainingDays(balance.getTotalDays() - balance.getUsedDays());
        leaveBalanceRepo.save(balance);

        LeaveApplication savedLeave = leaveApplicationRepo.save(leave);

        // Send notification to employee
        createNotification(leave.getEmployee().getCompany(), leave.getEmployee(), 
                "Leave Approved", "Your leave request from " + leave.getStartDate() + 
                " to " + leave.getEndDate() + " has been approved", 
                Notification.NotificationType.LEAVE_APPROVAL);

        auditService.logAction("APPROVE_LEAVE", "LeaveApplication", savedLeave.getId(), 
                "Approved leave application", leave.getEmployee().getCompany().getId());

        return convertToDTO(savedLeave);
    }

    public LeaveApplicationDTO rejectLeave(Long leaveId, String reason, Long approverId) {
        LeaveApplication leave = leaveApplicationRepo.findById(leaveId)
                .orElseThrow(() -> new RuntimeException("Leave application not found"));

        Employee approver = employeeRepo.findById(approverId)
                .orElseThrow(() -> new RuntimeException("Approver not found"));

        if (leave.getStatus() != LeaveApplication.LeaveStatus.PENDING) {
            throw new RuntimeException("Leave application is not in pending status");
        }

        leave.setStatus(LeaveApplication.LeaveStatus.REJECTED);
        leave.setRejectionReason(reason);
        leave.setApprovedBy(approver);
        leave.setApprovedAt(LocalDateTime.now());

        LeaveApplication savedLeave = leaveApplicationRepo.save(leave);

        // Send notification to employee
        createNotification(leave.getEmployee().getCompany(), leave.getEmployee(), 
                "Leave Rejected", "Your leave request from " + leave.getStartDate() + 
                " to " + leave.getEndDate() + " has been rejected. Reason: " + reason, 
                Notification.NotificationType.LEAVE_REJECTION);

        auditService.logAction("REJECT_LEAVE", "LeaveApplication", savedLeave.getId(), 
                "Rejected leave application", leave.getEmployee().getCompany().getId());

        return convertToDTO(savedLeave);
    }

    public void cancelLeave(Long leaveId, Long employeeId) {
        LeaveApplication leave = leaveApplicationRepo.findById(leaveId)
                .orElseThrow(() -> new RuntimeException("Leave application not found"));

        if (!leave.getEmployee().getId().equals(employeeId)) {
            throw new RuntimeException("Unauthorized to cancel this leave");
        }

        if (leave.getStatus() != LeaveApplication.LeaveStatus.PENDING) {
            throw new RuntimeException("Only pending leave can be cancelled");
        }

        leave.setStatus(LeaveApplication.LeaveStatus.CANCELLED);
        leaveApplicationRepo.save(leave);

        auditService.logAction("CANCEL_LEAVE", "LeaveApplication", leave.getId(), 
                "Cancelled leave application", leave.getEmployee().getCompany().getId());
    }

    public List<LeaveApplicationDTO> getEmployeeLeaves(Long employeeId) {
        List<LeaveApplication> leaves = leaveApplicationRepo.findByEmployeeId(employeeId);
        return leaves.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<LeaveApplicationDTO> getPendingLeaves(Long companyId) {
        List<LeaveApplication> leaves = leaveApplicationRepo.findByCompanyIdAndStatus(
                companyId, LeaveApplication.LeaveStatus.PENDING);
        return leaves.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<LeaveBalanceDTO> getEmployeeLeaveBalances(Long employeeId) {
        int currentYear = LocalDate.now().getYear();
        List<LeaveBalance> balances = leaveBalanceRepo.findByEmployeeIdAndYear(employeeId, currentYear);
        
        // If no balances exist, create them
        if (balances.isEmpty()) {
            Employee employee = employeeRepo.findById(employeeId)
                    .orElseThrow(() -> new RuntimeException("Employee not found"));
            initializeLeaveBalances(employee, currentYear);
            balances = leaveBalanceRepo.findByEmployeeIdAndYear(employeeId, currentYear);
        }
        
        return balances.stream()
                .map(this::convertBalanceToDTO)
                .collect(Collectors.toList());
    }

    private void initializeLeaveBalances(Employee employee, int year) {
        List<LeaveType> leaveTypes;
        if (employee.getCompany() != null) {
            // Get both system-wide and company-specific leave types
            leaveTypes = leaveTypeRepo.findByActive(true);
        } else {
            leaveTypes = leaveTypeRepo.findByCompanyIdIsNullAndActive(true);
        }

        for (LeaveType leaveType : leaveTypes) {
            createLeaveBalance(employee, leaveType, year);
        }
    }

    private void createLeaveBalance(Employee employee, LeaveType leaveType, int year) {
        LeaveBalance balance = new LeaveBalance();
        balance.setEmployee(employee);
        balance.setLeaveType(leaveType);
        balance.setYear(year);
        balance.setTotalDays(leaveType.getDefaultDaysPerYear());
        balance.setUsedDays(0);
        balance.setRemainingDays(leaveType.getDefaultDaysPerYear());
        leaveBalanceRepo.save(balance);
    }

    private int calculateWorkingDays(LocalDate startDate, LocalDate endDate) {
        int workingDays = 0;
        LocalDate current = startDate;
        
        while (!current.isAfter(endDate)) {
            // Exclude weekends (Saturday and Sunday)
            if (current.getDayOfWeek() != DayOfWeek.SATURDAY && 
                current.getDayOfWeek() != DayOfWeek.SUNDAY) {
                workingDays++;
            }
            current = current.plusDays(1);
        }
        
        return workingDays;
    }

    private void createNotification(Company company, Employee employee, String title, 
                                   String message, Notification.NotificationType type) {
        Notification notification = new Notification();
        notification.setCompany(company);
        notification.setEmployee(employee);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setIsRead(false);
        notificationRepo.save(notification);
    }

    private LeaveApplicationDTO convertToDTO(LeaveApplication leave) {
        LeaveApplicationDTO dto = modelMapper.map(leave, LeaveApplicationDTO.class);
        
        if (leave.getEmployee() != null) {
            dto.setEmployeeId(leave.getEmployee().getId());
            dto.setEmployeeName(leave.getEmployee().getFullName());
            dto.setEmployeeIdNumber(leave.getEmployee().getEmployeeId());
        }
        
        if (leave.getLeaveType() != null) {
            dto.setLeaveTypeId(leave.getLeaveType().getId());
            dto.setLeaveTypeName(leave.getLeaveType().getName());
        }
        
        if (leave.getStatus() != null) {
            dto.setStatus(leave.getStatus().name());
        }
        
        if (leave.getApprovedBy() != null) {
            dto.setApprovedBy(leave.getApprovedBy().getId());
            dto.setApprovedByName(leave.getApprovedBy().getFullName());
        }
        
        return dto;
    }

    private LeaveBalanceDTO convertBalanceToDTO(LeaveBalance balance) {
        LeaveBalanceDTO dto = modelMapper.map(balance, LeaveBalanceDTO.class);
        
        if (balance.getEmployee() != null) {
            dto.setEmployeeId(balance.getEmployee().getId());
            dto.setEmployeeName(balance.getEmployee().getFullName());
        }
        
        if (balance.getLeaveType() != null) {
            dto.setLeaveTypeId(balance.getLeaveType().getId());
            dto.setLeaveTypeName(balance.getLeaveType().getName());
        }
        
        return dto;
    }
}
