package com.affin.hrm.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private Integer id;
    private String fullName;
    private String email;
    private String password;
    private String nic;
    private LocalDate dob;
    private String address;
    private String gender;
    private String department;
    private String role;
    private String employeeId;
}
