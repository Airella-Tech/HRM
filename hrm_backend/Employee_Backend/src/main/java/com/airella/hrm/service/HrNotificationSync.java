package com.airella.hrm.service;

import com.airella.hrm.model.AllowanceRequest;
import com.airella.hrm.model.Employee;
import com.airella.hrm.model.LeaveApplication;
import com.airella.hrm.model.Notification;
import com.airella.hrm.repository.AllowanceRequestRepository;
import com.airella.hrm.repository.CompanyRepository;
import com.airella.hrm.repository.LeaveApplicationRepository;
import com.airella.hrm.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Safety net that guarantees an HR manager sees every PENDING leave and allowance request of their
 * company in their notifications, even if the notification could not be created when the employee
 * applied (e.g. the user service was briefly down) or the request was made before notifications existed.
 * Called whenever HR loads their notifications; it only does work when something is missing.
 */
@Service
public class HrNotificationSync {

    private static final Logger log = LoggerFactory.getLogger(HrNotificationSync.class);

    private final NotificationRepository notificationRepository;
    private final LeaveApplicationRepository leaveRepository;
    private final AllowanceRequestRepository allowanceRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeDirectory employeeDirectory;
    private final NotificationService notificationService;

    public HrNotificationSync(NotificationRepository notificationRepository,
                              LeaveApplicationRepository leaveRepository,
                              AllowanceRequestRepository allowanceRepository,
                              CompanyRepository companyRepository,
                              EmployeeDirectory employeeDirectory,
                              NotificationService notificationService) {
        this.notificationRepository = notificationRepository;
        this.leaveRepository = leaveRepository;
        this.allowanceRepository = allowanceRepository;
        this.companyRepository = companyRepository;
        this.employeeDirectory = employeeDirectory;
        this.notificationService = notificationService;
    }

    /** @return true if any notification was created */
    public boolean sync(Employee hr, List<Notification> existing) {
        if (hr.getRole() != Employee.Role.HR_MANAGER || hr.getCompany() == null) return false;
        Long companyId = hr.getCompany().getId();

        Set<String> have = new HashSet<>();
        for (Notification n : existing) {
            if (n.getRefId() != null && n.getCategory() != null) have.add(n.getCategory() + ":" + n.getRefId());
        }

        List<LeaveApplication> leaves = leaveRepository.findByCompanyIdAndStatus(companyId, LeaveApplication.LeaveStatus.PENDING).stream()
                .filter(l -> !have.contains(NotificationService.LEAVE_REQUEST + ":" + l.getId())).toList();
        List<AllowanceRequest> allowances = allowanceRepository.findByCompanyIdAndStatus(companyId, AllowanceRequest.Status.PENDING).stream()
                .filter(a -> !have.contains(NotificationService.ALLOWANCE_REQUEST + ":" + a.getId())).toList();
        if (leaves.isEmpty() && allowances.isEmpty()) return false;

        var company = companyRepository.findById(companyId).orElse(null);
        Map<Long, Employee> people = employeeDirectory.mapByIds(leaves.stream().map(LeaveApplication::getUserId).toList());
        int created = 0;

        for (LeaveApplication l : leaves) {
            Employee who = people.get(l.getUserId());
            String name = who != null ? who.getFullName() + " (" + who.getEmployeeId() + ")" : "An employee";
            Notification n = notificationService.build(company, hr.getId(), "New Leave Request",
                    name + " applied for " + l.getLeaveTypeName() + " from " + l.getStartDate() + " to " + l.getEndDate()
                            + " (" + l.getNumberOfDays() + " day(s))",
                    Notification.NotificationType.GENERAL, NotificationService.LEAVE_REQUEST,
                    "/hr/leave?view=" + l.getId(), l.getId());
            n.setDedupeKey(NotificationService.LEAVE_REQUEST + ":" + l.getId());
            notificationRepository.save(n);
            created++;
        }
        for (AllowanceRequest a : allowances) {
            String name = (a.getEmployeeName() != null ? a.getEmployeeName() : a.getEmployeeEmail())
                    + (a.getEmployeeCode() != null ? " (" + a.getEmployeeCode() + ")" : "");
            Notification n = notificationService.build(company, hr.getId(), "New Allowance Request",
                    name + " requested " + a.getName() + " allowance of Rs." + a.getAmount().toPlainString(),
                    Notification.NotificationType.GENERAL, NotificationService.ALLOWANCE_REQUEST,
                    "/hr/payroll/allowance-requests?view=" + a.getId(), a.getId());
            n.setDedupeKey(NotificationService.ALLOWANCE_REQUEST + ":" + a.getId());
            notificationRepository.save(n);
            created++;
        }
        log.info("Created {} missing request notification(s) for HR manager {}", created, hr.getId());
        return created > 0;
    }
}
