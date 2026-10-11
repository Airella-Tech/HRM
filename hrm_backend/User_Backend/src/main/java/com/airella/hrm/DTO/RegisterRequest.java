package com.airella.hrm.DTO;

import lombok.Data;

import java.time.LocalDate;

@Data
public class RegisterRequest {
    private String fullName;
    private String email;
    private String password;
    private String employeeId;
    private String nic;
    private LocalDate dob;
    private String address;
    private String phone;
    private String gender;
    private String role;
    private String department;
    private String designation;
    private String employmentType;
    private LocalDate joiningDate;
}
