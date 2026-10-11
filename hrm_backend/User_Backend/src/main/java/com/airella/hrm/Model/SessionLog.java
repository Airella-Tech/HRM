package com.airella.hrm.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "session_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SessionLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private LocalDateTime loginTime;
    private LocalDateTime logoutTime;
    private String deviceType;
    private Boolean status;
}
