package com.airella.hrm.model;

import lombok.*;

import java.time.LocalDate;

/**
 * Read-only view of a user, loaded from User_Backend (hrm_db_user.employees is the only
 * table of people). Not stored in this database: records here reference a person by
 * {@code user_id}, which is this object's {@link #getId()}.
 * <p>
 * {@link #getCompany()} and {@link #getDepartment()} are this database's own company and
 * department rows, matched by registration number / name (ids differ per database).
 */
@Getter
@Setter
@NoArgsConstructor
@ToString(exclude = {"company", "department"})
@EqualsAndHashCode(of = "id")
public class Employee {

    /** The user's id in User_Backend. */
    private Long id;
    private String employeeId;
    private String fullName;
    private String email;
    private Company company;
    private Department department;
    private String departmentName;
    private Role role = Role.EMPLOYEE;
    private String designation;
    private String employmentType;
    private LocalDate joiningDate;
    private LocalDate terminationDate;
    private EmployeeStatus status = EmployeeStatus.ACTIVE;

    /** Same as {@link #getId()}: the User_Backend id records here store as user_id. */
    public Long getUserId() {
        return id;
    }

    public enum Role {
        ADMIN, HR_MANAGER, EMPLOYEE
    }

    public enum EmployeeStatus {
        ACTIVE, INACTIVE, TERMINATED
    }
}
