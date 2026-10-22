package com.airella.hrm.repository;

import com.airella.hrm.model.RecruitmentPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface RecruitmentPermissionRepository extends JpaRepository<RecruitmentPermission, Long> {

    Optional<RecruitmentPermission> findByPermissionCode(String permissionCode);

    boolean existsByPermissionCode(String permissionCode);

    List<RecruitmentPermission> findByPermissionCodeIn(Collection<String> permissionCodes);

    List<RecruitmentPermission> findAllByOrderByCategoryAscPermissionCodeAsc();
}
