package com.airella.hrm.Repo;

import com.airella.hrm.Model.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DepartmentRepo extends JpaRepository<Department, Long> {
    List<Department> findByCompanyId(Long companyId);
    List<Department> findByCompanyIdAndActive(Long companyId, Boolean active);
    Optional<Department> findByCompanyIdAndName(Long companyId, String name);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Department d SET d.manager = null WHERE d.manager.id = :employeeId")
    void clearManager(@org.springframework.data.repository.query.Param("employeeId") Long employeeId);
}
