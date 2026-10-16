package com.airella.hrm.repository;

import com.airella.hrm.model.UserRecruitmentRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRecruitmentRoleRepository extends JpaRepository<UserRecruitmentRole, Long> {
    List<UserRecruitmentRole> findByCompanyIdAndUserId(Long companyId, Long userId);
    List<UserRecruitmentRole> findByCompanyId(Long companyId);
    Optional<UserRecruitmentRole> findByCompanyIdAndUserIdAndRoleId(Long companyId, Long userId, Long roleId);
    void deleteByCompanyIdAndUserIdAndRoleId(Long companyId, Long userId, Long roleId);
}
