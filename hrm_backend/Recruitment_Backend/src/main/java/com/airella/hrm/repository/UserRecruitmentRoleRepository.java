package com.airella.hrm.repository;

import com.airella.hrm.model.UserRecruitmentRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRecruitmentRoleRepository extends JpaRepository<UserRecruitmentRole, Long> {
    List<UserRecruitmentRole> findByCompanyIdAndUserId(Long companyId, Long userId);
    List<UserRecruitmentRole> findByCompanyId(Long companyId);
    List<UserRecruitmentRole> findByUserId(Long userId);
    Optional<UserRecruitmentRole> findByCompanyIdAndUserIdAndRoleId(Long companyId, Long userId, Long roleId);
    void deleteByCompanyIdAndUserIdAndRoleId(Long companyId, Long userId, Long roleId);

    @Query("select distinct p.permissionCode from UserRecruitmentRole ur join ur.role r join r.permissions p where ur.userId = :userId")
    List<String> findPermissionCodesByUserId(@Param("userId") Long userId);

    @Query("select r.roleName from UserRecruitmentRole ur join ur.role r where ur.userId = :userId order by r.roleName")
    List<String> findRoleNamesByUserId(@Param("userId") Long userId);
}
