package com.airella.hrm.Repo;

import com.airella.hrm.Model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepo extends JpaRepository<Employee, Long> {
    Optional<Employee> findByEmail(String email);
    Optional<Employee> findByEmailIgnoreCase(String email);
    Optional<Employee> findByEmployeeId(String employeeId);
    List<Employee> findByCompanyId(Long companyId);
    List<Employee> findByCompanyIdAndStatus(Long companyId, Employee.EmployeeStatus status);
    List<Employee> findByDepartmentId(Long departmentId);
    List<Employee> findByCompanyIdAndRole(Long companyId, Employee.Role role);
    Optional<Employee> findByResetPasswordToken(String token);
    List<Employee> findByEmployeeIdStartingWith(String prefix);
    long countByDepartmentId(Long departmentId);
}
