package com.airella.hrm.repository;

import com.airella.hrm.model.UserRecruitmentRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRecruitmentRoleRepository extends JpaRepository<UserRecruitmentRole, Long> {

    List<UserRecruitmentRole> findByCompanyIdAndUserId(Long companyId, Long userId);

    List<UserRecruitmentRole> findByCompanyId(Long companyId);

    List<UserRecruitmentRole> findByUserId(Long userId);

    List<UserRecruitmentRole> findByCompanyIdAndUserIdIn(Long companyId, Collection<Long> userIds);

    Optional<UserRecruitmentRole> findByCompanyIdAndUserIdAndRoleId(Long companyId, Long userId, Long roleId);

    boolean existsByCompanyIdAndUserIdAndRoleId(Long companyId, Long userId, Long roleId);

    long countByRoleId(Long roleId);

    @Modifying
    void deleteByCompanyIdAndUserIdAndRoleId(Long companyId, Long userId, Long roleId);

    @Modifying
    void deleteByCompanyIdAndUserId(Long companyId, Long userId);

    @Query("select distinct p.permissionCode from UserRecruitmentRole ur join ur.role r join r.permissions p where ur.userId = :userId")
    List<String> findPermissionCodesByUserId(@Param("userId") Long userId);

    @Query("select r.roleName from UserRecruitmentRole ur join ur.role r where ur.userId = :userId order by r.roleName")
    List<String> findRoleNamesByUserId(@Param("userId") Long userId);
    
    @Query("select distinct ur.userId from UserRecruitmentRole ur join ur.role r join r.permissions p where ur.companyId = :companyId and p.permissionCode = :code")
    List<Long> findUserIdsByCompanyIdAndPermissionCode(@Param("companyId") Long companyId, @Param("code") String code);
}
