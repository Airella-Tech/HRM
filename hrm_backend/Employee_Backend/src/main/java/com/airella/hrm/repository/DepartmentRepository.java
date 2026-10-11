package com.airella.hrm.repository;

import com.airella.hrm.model.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long> {
    List<Department> findByCompanyId(Long companyId);
    List<Department> findByCompanyIdAndActive(Long companyId, Boolean active);
    Optional<Department> findByCompanyIdAndName(Long companyId, String name);
    List<Department> findByCompanyIdAndNameIgnoreCase(Long companyId, String name);
}
