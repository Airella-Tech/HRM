package com.airella.hrm.service;

import com.airella.hrm.dto.EmployeeProfileDTO;
import com.airella.hrm.dto.NotificationDTO;
import com.airella.hrm.model.Company;
import com.airella.hrm.model.Employee;
import com.airella.hrm.model.Notification;
import com.airella.hrm.repository.CompanyRepository;
import com.airella.hrm.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Month;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service for creating and managing in-app notifications.
 * <ul>
 *   <li>HR managers are notified when an employee applies for leave or asks for an allowance, and on
 *       the birthday of every employee / HR manager of their company.</li>
 *   <li>Employees are notified when HR approves or rejects their leave or allowance request, and on
 *       their own birthday.</li>
 * </ul>
 * Notifications are stored one row per recipient (user_id), so read / delete state is per person.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    // Categories (Notification.category)
    public static final String LEAVE_REQUEST = "LEAVE_REQUEST";
    public static final String LEAVE_APPROVED = "LEAVE_APPROVED";
    public static final String LEAVE_REJECTED = "LEAVE_REJECTED";
    public static final String ALLOWANCE_REQUEST = "ALLOWANCE_REQUEST";
    public static final String ALLOWANCE_APPROVED = "ALLOWANCE_APPROVED";
    public static final String ALLOWANCE_REJECTED = "ALLOWANCE_REJECTED";
    public static final String BIRTHDAY = "BIRTHDAY";
    public static final String BIRTHDAY_WISH = "BIRTHDAY_WISH";
    public static final String PAYSLIP = "PAYSLIP";

    private final NotificationRepository notificationRepository;
    private final EmployeeDirectory employeeDirectory;
    private final CompanyRepository companyRepository;

    /** companyId -> the day birthday notifications were last generated for it (this JVM). */
    private final Map<Long, LocalDate> birthdayRunByCompany = new ConcurrentHashMap<>();

    public NotificationService(NotificationRepository notificationRepository,
                               EmployeeDirectory employeeDirectory,
                               CompanyRepository companyRepository) {
        this.notificationRepository = notificationRepository;
        this.employeeDirectory = employeeDirectory;
        this.companyRepository = companyRepository;
    }

    /**
     * Create in-app notifications for system administrators when a new company request arrives.
     */
    public void notifyAdminsForCompanyRequest(Company company) {
        try {
            String title = "New Company Registration Request";
            String message = String.format("New company application submitted by '%s' (Contact: %s, Email: %s). Status: PENDING.",
                    company.getCompanyName(),
                    company.getContactPersonName() != null ? company.getContactPersonName() : "N/A",
                    company.getEmail());

            // 1. Create system-wide admin notification entry
            Notification globalNotification = new Notification();
            globalNotification.setCompany(company);
            globalNotification.setTitle(title);
            globalNotification.setMessage(message);
            globalNotification.setType(Notification.NotificationType.GENERAL);
            globalNotification.setIsRead(false);
            notificationRepository.save(globalNotification);

            // 2. Also notify each individual ADMIN user account in DB
            List<Employee> adminUsers = employeeDirectory.findAll().stream()
                    .filter(e -> e.getRole() == Employee.Role.ADMIN).toList();
            for (Employee admin : adminUsers) {
                try {
                    Notification userNotification = new Notification();
                    userNotification.setUserId(admin.getId());
                    userNotification.setCompany(company);
                    userNotification.setTitle(title);
                    userNotification.setMessage(message);
                    userNotification.setType(Notification.NotificationType.GENERAL);
                    userNotification.setIsRead(false);
                    notificationRepository.save(userNotification);
                } catch (Exception ex) {
                    log.warn("Failed to create individual admin notification for employee ID {}: {}", admin.getId(), ex.getMessage());
                }
            }

            log.info("Created company request notifications for admin user(s)");
        } catch (Exception e) {
            log.error("Failed to create admin notification for company request {}: {}", company.getCompanyName(), e.getMessage());
        }
    }

    // ── Request notifications ────────────────────────────────────

    /**
     * Notifies every HR manager of the company (one row each, de-duplicated by category + request id).
     * Never throws: a failed notification must not block the leave / allowance request itself.
     * (If it does fail, HR still gets it the next time they open notifications — see HrNotificationSync.)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyHrManagers(Long companyId, String title, String message,
                                 String category, String link, Long refId) {
        try {
            Company company = companyId == null ? null : companyRepository.findById(companyId).orElse(null);
            List<Employee> hrManagers = employeeDirectory.findByCompanyIdAndRole(companyId, Employee.Role.HR_MANAGER).stream()
                    .filter(e -> e.getStatus() == Employee.EmployeeStatus.ACTIVE)
                    .toList();
            if (hrManagers.isEmpty()) {
                log.warn("No active HR manager found for company {} — {} #{} will reach HR when they next open notifications",
                        companyId, category, refId);
            }
            for (Employee hr : hrManagers) {
                String key = category + ":" + refId;
                if (refId != null && notificationRepository.existsByUserIdAndDedupeKey(hr.getId(), key)) continue;
                Notification n = build(company, hr.getId(), title, message, Notification.NotificationType.GENERAL, category, link, refId);
                n.setDedupeKey(key);
                notificationRepository.save(n);
            }
            log.info("{} #{}: notified {} HR manager(s) of company {}", category, refId, hrManagers.size(), companyId);
        } catch (Exception e) {
            log.error("Could not notify HR managers of company {} ({} #{}): {}", companyId, category, refId, e.toString(), e);
        }
    }

    /** Notifies one user (e.g. the employee whose request HR just approved / rejected). Never throws. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyUser(Long userId, Long companyId, String title, String message,
                           Notification.NotificationType type, String category, String link, Long refId) {
        try {
            if (userId == null) return;
            Company company = companyId == null ? null : companyRepository.findById(companyId).orElse(null);
            notificationRepository.save(build(company, userId, title, message, type, category, link, refId));
        } catch (Exception e) {
            log.warn("Could not notify user {} ({}): {}", userId, category, e.getMessage());
        }
    }

    Notification build(Company company, Long userId, String title, String message,
                               Notification.NotificationType type, String category, String link, Long refId) {
        Notification n = new Notification();
        n.setCompany(company);
        n.setUserId(userId);
        n.setTitle(title);
        n.setMessage(message.length() > 1000 ? message.substring(0, 997) + "..." : message);
        n.setType(type);
        n.setCategory(category);
        n.setLink(link);
        n.setRefId(refId);
        n.setIsRead(false);
        return n;
    }

    // ── Birthdays ────────────────────────────────────────────────

    /** Every morning, create today's birthday notifications for every company. */
    @Scheduled(cron = "0 5 0 * * *")
    public void generateBirthdaysForAllCompanies() {
        for (Company company : companyRepository.findAll()) {
            try {
                generateBirthdays(company.getId());
                birthdayRunByCompany.put(company.getId(), LocalDate.now());
            } catch (Exception e) {
                log.warn("Birthday notifications failed for company {}: {}", company.getId(), e.getMessage());
            }
        }
    }

    /**
     * Makes sure today's birthday notifications exist for the company. Called when someone opens their
     * notifications, so it also works if the server was down at midnight. Runs at most once a day per
     * company and in the background, so it never slows the request down.
     */
    public void ensureBirthdaysAsync(Long companyId) {
        if (companyId == null) return;
        LocalDate today = LocalDate.now();
        if (today.equals(birthdayRunByCompany.put(companyId, today))) return;
        CompletableFuture.runAsync(() -> {
            try {
                generateBirthdays(companyId);
            } catch (Exception e) {
                birthdayRunByCompany.remove(companyId); // try again on the next request
                log.warn("Birthday notifications failed for company {}: {}", companyId, e.getMessage());
            }
        });
    }

    /**
     * For each active person of the company whose birthday is today:
     * every other HR manager gets a BIRTHDAY notification (name, employee id, department, job role),
     * and the person gets a BIRTHDAY_WISH. Safe to call repeatedly (de-duplicated per recipient and day).
     */
    public void generateBirthdays(Long companyId) {
        LocalDate today = LocalDate.now();
        Company company = companyRepository.findById(companyId).orElse(null);
        List<Employee> people = employeeDirectory.findByCompanyIdAndStatus(companyId, Employee.EmployeeStatus.ACTIVE);
        List<Employee> hrManagers = people.stream().filter(e -> e.getRole() == Employee.Role.HR_MANAGER).toList();

        for (Employee person : people) {
            try {
                Optional<EmployeeProfileDTO> profile = employeeDirectory.findProfile(person.getId());
                LocalDate dob = profile.map(EmployeeProfileDTO::getDob).orElse(null);
                if (!isBirthday(dob, today)) continue;

                String key = "BDAY:" + person.getId() + ":" + today;
                String department = blankToDash(person.getDepartmentName());
                String jobRole = blankToDash(person.getDesignation());
                String code = blankToDash(person.getEmployeeId());

                for (Employee hr : hrManagers) {
                    if (hr.getId().equals(person.getId())) continue; // HR gets a wish instead (below)
                    if (notificationRepository.existsByUserIdAndDedupeKey(hr.getId(), key)) continue;
                    Notification n = build(company, hr.getId(),
                            "Birthday today: " + person.getFullName(),
                            person.getFullName() + " (" + code + ") from " + department + " · " + jobRole + " has a birthday today.",
                            Notification.NotificationType.GENERAL, BIRTHDAY, null, person.getId());
                    n.setDedupeKey(key);
                    n.setSubjectName(person.getFullName());
                    n.setSubjectEmployeeCode(person.getEmployeeId());
                    n.setSubjectDepartment(person.getDepartmentName());
                    n.setSubjectJobRole(person.getDesignation());
                    notificationRepository.save(n);
                }

                if (!notificationRepository.existsByUserIdAndDedupeKey(person.getId(), key)) {
                    Notification wish = build(company, person.getId(),
                            "Happy Birthday, " + firstName(person.getFullName()) + "!",
                            "Wishing you a wonderful birthday from everyone at "
                                    + (company != null && company.getCompanyName() != null ? company.getCompanyName() : "the company") + ".",
                            Notification.NotificationType.GENERAL, BIRTHDAY_WISH, null, person.getId());
                    wish.setDedupeKey(key);
                    notificationRepository.save(wish);
                }
            } catch (Exception e) {
                log.warn("Skipping birthday check for user {}: {}", person.getId(), e.getMessage());
            }
        }
    }

    /** Same month and day as today; a 29 Feb birthday is celebrated on 28 Feb in non-leap years. */
    static boolean isBirthday(LocalDate dob, LocalDate today) {
        if (dob == null) return false;
        if (dob.getMonth() == today.getMonth() && dob.getDayOfMonth() == today.getDayOfMonth()) return true;
        return dob.getMonth() == Month.FEBRUARY && dob.getDayOfMonth() == 29
                && !today.isLeapYear() && today.getMonth() == Month.FEBRUARY && today.getDayOfMonth() == 28;
    }

    private static String firstName(String fullName) {
        if (fullName == null || fullName.isBlank()) return "";
        return fullName.trim().split("\\s+")[0];
    }

    private static String blankToDash(String v) {
        return v == null || v.isBlank() ? "—" : v.trim();
    }

    // ── Mapping ──────────────────────────────────────────────────

    public static NotificationDTO toDTO(Notification n) {
        NotificationDTO dto = new NotificationDTO();
        dto.setId(n.getId());
        dto.setTitle(n.getTitle());
        dto.setMessage(n.getMessage());
        dto.setType(n.getType() != null ? n.getType().name() : null);
        dto.setIsRead(Boolean.TRUE.equals(n.getIsRead()));
        dto.setCreatedAt(n.getCreatedAt() != null ? n.getCreatedAt().toString() : null);
        dto.setCategory(n.getCategory() != null ? n.getCategory() : (n.getType() != null ? n.getType().name() : null));
        dto.setLink(n.getLink());
        dto.setRefId(n.getRefId());
        dto.setSubjectName(n.getSubjectName());
        dto.setSubjectEmployeeCode(n.getSubjectEmployeeCode());
        dto.setSubjectDepartment(n.getSubjectDepartment());
        dto.setSubjectJobRole(n.getSubjectJobRole());
        return dto;
    }
}
