package com.airella.hrm.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {
    private Long id;
    private Long employeeId;
    private String employeeName;
    private Long companyId;
    private String title;
    private String message;
    private String type;
    private Boolean isRead;
    private String createdAt;
}
