package com.airella.hrm.repository;

import com.airella.hrm.model.Department;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long> {

    @EntityGraph(attributePaths = {"jobRoles"})
    List<Department> findByCompanyId(Long companyId);

    @EntityGraph(attributePaths = {"jobRoles"})
    List<Department> findByCompanyIdAndActive(Long companyId, Boolean active);

    Optional<Department> findByCompanyIdAndName(Long companyId, String name);

    List<Department> findByCompanyIdAndNameIgnoreCase(Long companyId, String name);

    @EntityGraph(attributePaths = {"jobRoles"})
    Optional<Department> findWithDetailsById(Long id);
}
