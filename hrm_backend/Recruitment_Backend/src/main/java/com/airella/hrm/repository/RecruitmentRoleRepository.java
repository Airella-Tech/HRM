package com.airella.hrm.repository;

import com.airella.hrm.model.RecruitmentRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecruitmentRoleRepository extends JpaRepository<RecruitmentRole, Long> {

    List<RecruitmentRole> findByCompanyId(Long companyId);

    List<RecruitmentRole> findByCompanyIdOrderByRoleNameAsc(Long companyId);

    Optional<RecruitmentRole> findByIdAndCompanyId(Long id, Long companyId);

    Optional<RecruitmentRole> findByCompanyIdAndRoleName(Long companyId, String roleName);

    boolean existsByCompanyIdAndRoleNameIgnoreCase(Long companyId, String roleName);

    boolean existsByCompanyIdAndRoleNameIgnoreCaseAndIdNot(Long companyId, String roleName, Long id);
}
