package com.airella.hrm.repository;

import com.airella.hrm.model.JobRoleLeaveAllocation;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JobRoleLeaveAllocationRepository extends JpaRepository<JobRoleLeaveAllocation, Long> {

    @EntityGraph(attributePaths = {"department", "jobRole", "employmentType", "leaveType"})
    List<JobRoleLeaveAllocation> findByCompanyIdOrderByUpdatedAtDesc(Long companyId);

    @EntityGraph(attributePaths = {"department", "jobRole", "employmentType", "leaveType"})
    List<JobRoleLeaveAllocation> findByCompanyIdAndDepartmentIdOrderByUpdatedAtDesc(Long companyId, Long departmentId);

    Optional<JobRoleLeaveAllocation> findByJobRoleIdAndEmploymentTypeIdAndLeaveTypeId(
            Long jobRoleId, Long employmentTypeId, Long leaveTypeId);

    long countByEmploymentTypeId(Long employmentTypeId);

    long countByLeaveTypeId(Long leaveTypeId);
}
