package com.airella.hrm.repository;

import com.airella.hrm.model.RecruitmentPermission;
import com.airella.hrm.model.UserRoleAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRoleAssignmentRepository extends JpaRepository<UserRoleAssignment, Long> {

    List<UserRoleAssignment> findByRoleId(Long roleId);

    Optional<UserRoleAssignment> findByUserIdAndRoleId(Long userId, Long roleId);

    boolean existsByUserIdAndRoleId(Long userId, Long roleId);

    long countByRoleId(Long roleId);

    /** Every permission a user gets from all of their roles. */
    @Query("select distinct p from UserRoleAssignment a join a.role r join r.permissions p where a.userId = :userId")
    List<RecruitmentPermission> findPermissionsByUserId(@Param("userId") Long userId);

    @Query("select r.name from UserRoleAssignment a join a.role r where a.userId = :userId order by r.name")
    List<String> findRoleNamesByUserId(@Param("userId") Long userId);
}