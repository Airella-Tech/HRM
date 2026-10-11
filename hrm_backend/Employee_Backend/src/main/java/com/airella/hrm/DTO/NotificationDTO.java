package com.airella.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for Notification data.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {

    private Long id;
    private String title;
    private String message;
    private String type;
    private Boolean isRead;
    private String createdAt;

    /** LEAVE_REQUEST, ALLOWANCE_REQUEST, LEAVE_APPROVED, BIRTHDAY ... (see Notification.category) */
    private String category;
    /** Route to open when clicked; null for notifications that do not navigate (birthdays). */
    private String link;
    private Long refId;

    // Birthday details
    private String subjectName;
    private String subjectEmployeeCode;
    private String subjectDepartment;
    private String subjectJobRole;
}
