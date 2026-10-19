package com.airella.hrm.repository;

import com.airella.hrm.model.RecruitmentRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecruitmentRoleRepository extends JpaRepository<RecruitmentRole, Long> {
    List<RecruitmentRole> findByCompanyId(Long companyId);
    Optional<RecruitmentRole> findByCompanyIdAndRoleName(Long companyId, String roleName);
    boolean existsByCompanyIdAndRoleName(Long companyId, String roleName);
}
