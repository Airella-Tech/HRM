package com.airella.hrm.service;

import com.airella.hrm.dto.*;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.RecruitmentPermission;
import com.airella.hrm.model.RecruitmentRole;
import com.airella.hrm.model.UserRecruitmentRole;
import com.airella.hrm.repository.RecruitmentPermissionRepository;
import com.airella.hrm.repository.RecruitmentRoleRepository;
import com.airella.hrm.repository.UserRecruitmentRoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class RecruitmentRoleService {

    private static final Logger log = LoggerFactory.getLogger(RecruitmentRoleService.class);

    private final RecruitmentRoleRepository roleRepo;
    private final UserRecruitmentRoleRepository userRoleRepo;
    private final RecruitmentPermissionRepository permissionRepo;
    private final EmployeeDirectory employeeDirectory;
    private final AuthService authService;
    private final AuditService auditService;
    private final org.springframework.transaction.support.TransactionTemplate transactionTemplate;
    private static final Object SEED_LOCK = new Object();

    public RecruitmentRoleService(RecruitmentRoleRepository roleRepo,
                                  UserRecruitmentRoleRepository userRoleRepo,
                                  RecruitmentPermissionRepository permissionRepo,
                                  EmployeeDirectory employeeDirectory,
                                  AuthService authService,
                                  AuditService auditService,
                                  org.springframework.transaction.PlatformTransactionManager transactionManager) {
        this.roleRepo = roleRepo;
        this.userRoleRepo = userRoleRepo;
        this.permissionRepo = permissionRepo;
        this.employeeDirectory = employeeDirectory;
        this.authService = authService;
        this.auditService = auditService;
        this.transactionTemplate = new org.springframework.transaction.support.TransactionTemplate(transactionManager);
        this.transactionTemplate.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    // ── Permissions ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<RecruitmentPermissionDTO> getAllPermissions() {
        return permissionRepo.findAllByOrderByCategoryAscPermissionCodeAsc().stream()
                .map(RecruitmentPermissionDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, List<RecruitmentPermissionDTO>> getPermissionsGroupedByCategory() {
        return getAllPermissions().stream()
                .collect(Collectors.groupingBy(RecruitmentPermissionDTO::getCategory, LinkedHashMap::new, Collectors.toList()));
    }

    // ── Roles ────────────────────────────────────────────────────

    @Transactional
    public List<RecruitmentRoleDTO> getRolesForCurrentCompany() {
        return getRolesForCurrentCompany(null, false);
    }

    public List<RecruitmentRoleDTO> getRolesForCurrentCompany(String search) {
        return getRolesForCurrentCompany(search, false);
    }

    @Transactional
    public List<RecruitmentRoleDTO> getRolesForCurrentCompany(String search, Boolean customOnly) {
        Long companyId = authService.getCurrentCompanyId();
        if (!Boolean.TRUE.equals(customOnly)) {
            ensureDefaultRolesForCompany(companyId);
        }

        List<RecruitmentRole> roles = roleRepo.findByCompanyIdOrderByRoleNameAsc(companyId);
        if (Boolean.TRUE.equals(customOnly)) {
            roles = roles.stream()
                    .filter(r -> r.getIsSystemDefault() == null || !r.getIsSystemDefault())
                    .toList();
        }

        if (search != null && !search.isBlank()) {
            String term = search.trim().toLowerCase();
            roles = roles.stream()
                    .filter(r -> r.getRoleName().toLowerCase().contains(term)
                            || (r.getDescription() != null && r.getDescription().toLowerCase().contains(term)))
                    .toList();
        }

        return roles.stream()
                .map(role -> {
                    long count = userRoleRepo.countByRoleId(role.getId());
                    return RecruitmentRoleDTO.fromEntity(role, count);
                })
                .toList();
    }

    @Transactional
    public List<RecruitmentRoleDTO> getDefaultRoleTemplatesForCurrentCompany() {
        Long companyId = authService.getCurrentCompanyId();
        ensureDefaultRolesForCompany(companyId);

        List<RecruitmentRole> roles = roleRepo.findByCompanyIdOrderByRoleNameAsc(companyId);
        return roles.stream()
                .filter(r -> Boolean.TRUE.equals(r.getIsSystemDefault()))
                .map(role -> {
                    long count = userRoleRepo.countByRoleId(role.getId());
                    return RecruitmentRoleDTO.fromEntity(role, count);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public RecruitmentRoleDTO getRoleById(Long roleId) {
        Long companyId = authService.getCurrentCompanyId();
        RecruitmentRole role = roleRepo.findByIdAndCompanyId(roleId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("RecruitmentRole", "id", roleId));

        long count = userRoleRepo.countByRoleId(role.getId());
        return RecruitmentRoleDTO.fromEntity(role, count);
    }

    public RecruitmentRoleDTO createRole(CreateRecruitmentRoleRequest request) {
        Long companyId = authService.getCurrentCompanyId();
        String roleName = request.getRoleName().trim();

        if (roleRepo.existsByCompanyIdAndRoleNameIgnoreCase(companyId, roleName)) {
            throw new BusinessException("A recruitment role named '" + roleName + "' already exists in your company.");
        }

        Set<RecruitmentPermission> permissions = resolvePermissions(request.getPermissionIds(), request.getPermissionCodes());

        RecruitmentRole role = new RecruitmentRole(companyId, roleName,
                request.getDescription() != null ? request.getDescription().trim() : null);
        role.setIsSystemDefault(false);
        role.setPermissions(permissions);

        RecruitmentRole saved = roleRepo.save(role);
        auditService.logAction("CREATE", "RecruitmentRole", saved.getId(),
                "Created recruitment role: " + saved.getRoleName(), authService.getCurrentCompanyRef());

        return RecruitmentRoleDTO.fromEntity(saved, 0);
    }

    public RecruitmentRoleDTO updateRole(Long roleId, UpdateRecruitmentRoleRequest request) {
        Long companyId = authService.getCurrentCompanyId();
        RecruitmentRole role = roleRepo.findByIdAndCompanyId(roleId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("RecruitmentRole", "id", roleId));

        if (request.getRoleName() != null && !request.getRoleName().isBlank()) {
            String newName = request.getRoleName().trim();
            if (roleRepo.existsByCompanyIdAndRoleNameIgnoreCaseAndIdNot(companyId, newName, roleId)) {
                throw new BusinessException("Another role named '" + newName + "' already exists in your company.");
            }
            role.setRoleName(newName);
        }

        if (request.getDescription() != null) {
            role.setDescription(request.getDescription().trim());
        }

        if (request.getPermissionIds() != null || request.getPermissionCodes() != null) {
            Set<RecruitmentPermission> permissions = resolvePermissions(request.getPermissionIds(), request.getPermissionCodes());
            role.setPermissions(permissions);
        }

        RecruitmentRole updated = roleRepo.save(role);
        long count = userRoleRepo.countByRoleId(updated.getId());
        auditService.logAction("UPDATE", "RecruitmentRole", updated.getId(),
                "Updated recruitment role: " + updated.getRoleName(), authService.getCurrentCompanyRef());

        return RecruitmentRoleDTO.fromEntity(updated, count);
    }

    public void deleteRole(Long roleId) {
        Long companyId = authService.getCurrentCompanyId();
        RecruitmentRole role = roleRepo.findByIdAndCompanyId(roleId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("RecruitmentRole", "id", roleId));

        if (Boolean.TRUE.equals(role.getIsSystemDefault())) {
            throw new BusinessException("System default roles cannot be deleted. You can modify their permissions instead.");
        }

        long assignedCount = userRoleRepo.countByRoleId(roleId);
        if (assignedCount > 0) {
            throw new BusinessException("Cannot delete role '" + role.getRoleName() + "' because it is currently assigned to "
                    + assignedCount + " employee(s). Please unassign the role from all employees before deleting.");
        }

        roleRepo.delete(role);
        auditService.logAction("DELETE", "RecruitmentRole", roleId,
                "Deleted recruitment role: " + role.getRoleName(), authService.getCurrentCompanyRef());
    }

    // ── User Role Assignments ─────────────────────────────────────

    @Transactional(readOnly = true)
    public List<UserRecruitmentAssignmentDTO> getCompanyUsersWithRoles() {
        Long companyId = authService.getCurrentCompanyId();
        String companyRef = authService.getCurrentCompanyRef();

        List<UserSummaryDTO> employees = employeeDirectory.findByCompanyRef(companyRef).stream()
                .filter(u -> !"ADMIN".equalsIgnoreCase(u.getRole()))
                .toList();
        if (employees.isEmpty()) {
            return List.of();
        }

        List<Long> userIds = employees.stream().map(UserSummaryDTO::getId).filter(Objects::nonNull).toList();
        List<UserRecruitmentRole> allAssignments = userRoleRepo.findByCompanyIdAndUserIdIn(companyId, userIds);

        Map<Long, List<UserRecruitmentRole>> assignmentsByUserId = allAssignments.stream()
                .collect(Collectors.groupingBy(UserRecruitmentRole::getUserId));

        Set<String> allSystemPermissionCodes = permissionRepo.findAll().stream()
                .map(RecruitmentPermission::getPermissionCode)
                .collect(Collectors.toSet());

        return employees.stream().map(emp -> {
            List<UserRecruitmentRole> userAssignments = assignmentsByUserId.getOrDefault(emp.getId(), List.of());
            List<RecruitmentRoleDTO> roles = userAssignments.stream()
                    .map(a -> RecruitmentRoleDTO.fromEntity(a.getRole()))
                    .toList();

            boolean isFullAccess = "ADMIN".equalsIgnoreCase(emp.getRole()) || "HR_MANAGER".equalsIgnoreCase(emp.getRole());
            Set<String> permissions = isFullAccess
                    ? new TreeSet<>(allSystemPermissionCodes)
                    : userAssignments.stream()
                    .flatMap(a -> a.getRole().getPermissions().stream().map(RecruitmentPermission::getPermissionCode))
                    .collect(Collectors.toCollection(TreeSet::new));

            return UserRecruitmentAssignmentDTO.builder()
                    .userId(emp.getId())
                    .employeeId(emp.getEmployeeId())
                    .fullName(emp.getFullName())
                    .email(emp.getEmail())
                    .designation(emp.getDesignation())
                    .departmentName(emp.getDepartmentName())
                    .systemRole(emp.getRole())
                    .recruitmentRoles(roles)
                    .effectivePermissions(permissions)
                    .build();
        }).toList();
    }

    @Transactional(readOnly = true)
    public UserRecruitmentAssignmentDTO getUserRoleAssignments(Long userId) {
        Long companyId = authService.getCurrentCompanyId();
        UserSummaryDTO emp = employeeDirectory.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        if ("ADMIN".equalsIgnoreCase(emp.getRole())) {
            throw new BusinessException("System administrators do not participate in employee recruitment role assignments.");
        }

        List<UserRecruitmentRole> userAssignments = userRoleRepo.findByCompanyIdAndUserId(companyId, userId);
        List<RecruitmentRoleDTO> roles = userAssignments.stream()
                .map(a -> RecruitmentRoleDTO.fromEntity(a.getRole()))
                .toList();

        boolean isFullAccess = "ADMIN".equalsIgnoreCase(emp.getRole()) || "HR_MANAGER".equalsIgnoreCase(emp.getRole());
        Set<String> permissions = isFullAccess
                ? permissionRepo.findAll().stream().map(RecruitmentPermission::getPermissionCode).collect(Collectors.toCollection(TreeSet::new))
                : userAssignments.stream()
                .flatMap(a -> a.getRole().getPermissions().stream().map(RecruitmentPermission::getPermissionCode))
                .collect(Collectors.toCollection(TreeSet::new));

        return UserRecruitmentAssignmentDTO.builder()
                .userId(emp.getId())
                .employeeId(emp.getEmployeeId())
                .fullName(emp.getFullName())
                .email(emp.getEmail())
                .designation(emp.getDesignation())
                .departmentName(emp.getDepartmentName())
                .systemRole(emp.getRole())
                .recruitmentRoles(roles)
                .effectivePermissions(permissions)
                .build();
    }

    public UserRecruitmentAssignmentDTO assignRolesToUser(AssignUserRoleRequest request) {
        Long companyId = authService.getCurrentCompanyId();
        String companyRef = authService.getCurrentCompanyRef();

        UserSummaryDTO emp = employeeDirectory.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getUserId()));
        if ("ADMIN".equalsIgnoreCase(emp.getRole())) {
            throw new BusinessException("System administrators cannot be assigned recruitment roles.");
        }

        List<RecruitmentRole> roles = roleRepo.findAllById(request.getRoleIds());
        for (RecruitmentRole role : roles) {
            if (!companyId.equals(role.getCompanyId())) {
                throw new BusinessException("Role '" + role.getRoleName() + "' does not belong to your company.");
            }
            if (!userRoleRepo.existsByCompanyIdAndUserIdAndRoleId(companyId, emp.getId(), role.getId())) {
                userRoleRepo.save(new UserRecruitmentRole(companyId, emp.getId(), role));
                auditService.logAction("ASSIGN", "UserRecruitmentRole", role.getId(),
                        "Assigned recruitment role '" + role.getRoleName() + "' to " + emp.getFullName() + " (" + emp.getEmail() + ")", companyRef);
            }
        }

        return getUserRoleAssignments(emp.getId());
    }

    public void removeRoleFromUser(Long userId, Long roleId) {
        Long companyId = authService.getCurrentCompanyId();
        String companyRef = authService.getCurrentCompanyRef();

        UserRecruitmentRole assignment = userRoleRepo.findByCompanyIdAndUserIdAndRoleId(companyId, userId, roleId)
                .orElseThrow(() -> new ResourceNotFoundException("UserRecruitmentRole", "roleId", roleId));

        userRoleRepo.delete(assignment);
        auditService.logAction("UNASSIGN", "UserRecruitmentRole", roleId,
                "Removed recruitment role '" + assignment.getRole().getRoleName() + "' from user ID " + userId, companyRef);
    }

    public UserRecruitmentAssignmentDTO updateUserRoles(Long userId, List<Long> roleIds) {
        Long companyId = authService.getCurrentCompanyId();
        String companyRef = authService.getCurrentCompanyRef();

        UserSummaryDTO emp = employeeDirectory.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        if ("ADMIN".equalsIgnoreCase(emp.getRole())) {
            throw new BusinessException("System administrators cannot be assigned recruitment roles.");
        }

        userRoleRepo.deleteByCompanyIdAndUserId(companyId, userId);
        userRoleRepo.flush();

        if (roleIds != null && !roleIds.isEmpty()) {
            List<RecruitmentRole> roles = roleRepo.findAllById(roleIds);
            for (RecruitmentRole role : roles) {
                if (!companyId.equals(role.getCompanyId())) {
                    throw new BusinessException("Role '" + role.getRoleName() + "' does not belong to your company.");
                }
                userRoleRepo.save(new UserRecruitmentRole(companyId, userId, role));
            }
        }

        auditService.logAction("UPDATE_ASSIGNMENTS", "UserRecruitmentRole", userId,
                "Updated recruitment roles for " + emp.getFullName() + " (" + emp.getEmail() + ")", companyRef);

        return getUserRoleAssignments(userId);
    }

    // ── Helper Methods ───────────────────────────────────────────

    private Set<RecruitmentPermission> resolvePermissions(Set<Long> ids, Set<String> codes) {
        Set<RecruitmentPermission> resolved = new HashSet<>();
        if (ids != null && !ids.isEmpty()) {
            resolved.addAll(permissionRepo.findAllById(ids));
        }
        if (codes != null && !codes.isEmpty()) {
            resolved.addAll(permissionRepo.findByPermissionCodeIn(codes));
        }
        return resolved;
    }

    record DefaultRoleSeed(String roleName, String description, List<String> permissions) {}

    private void ensureDefaultRolesForCompany(Long companyId) {
        if (companyId == null) return;
        synchronized (SEED_LOCK) {
            try {
                transactionTemplate.execute(status -> {
                    List<DefaultRoleSeed> defaultRoles = List.of(
                            new DefaultRoleSeed(
                                    "Job Vacancy Creator",
                                    "Creates job vacancy requests and enters vacancy details for review and approval.",
                                    List.of("VACANCY_CREATE")
                            ),
                            new DefaultRoleSeed(
                                    "Recruitment Approver",
                                    "Reviews vacancy requests and approves or rejects them before publication.",
                                    List.of("VACANCY_APPROVE", "VACANCY_PUBLISH")
                            ),
                            new DefaultRoleSeed(
                                    "Recruitment Officer",
                                    "Manages recruitment activities, reviews applications, and supports candidate screening and shortlisting.",
                                    List.of("APPLICATION_VIEW", "APPLICATION_SCREEN", "APPLICATION_SHORTLIST", "INTERVIEW_SCHEDULE")
                            ),
                            new DefaultRoleSeed(
                                    "Interviewer / Evaluator",
                                    "Reviews assigned candidates, conducts interviews, and submits interview feedback and evaluations.",
                                    List.of("APPLICATION_VIEW", "INTERVIEW_EVALUATE")
                            ),
                            new DefaultRoleSeed(
                                    "Recruitment Manager",
                                    "Oversees recruitment activities and manages recruitment responsibilities according to assigned permissions.",
                                    List.of("VACANCY_CREATE", "VACANCY_APPROVE", "VACANCY_PUBLISH", "APPLICATION_VIEW", "APPLICATION_SCREEN",
                                            "APPLICATION_SHORTLIST", "INTERVIEW_SCHEDULE", "INTERVIEW_ASSIGN",
                                            "INTERVIEW_EVALUATE", "OFFER_MANAGE", "RECRUITMENT_ROLE_ADMIN")
                            )
                    );

                    for (DefaultRoleSeed seed : defaultRoles) {
                        if (!roleRepo.existsByCompanyIdAndRoleNameIgnoreCase(companyId, seed.roleName())) {
                            List<RecruitmentPermission> perms = permissionRepo.findByPermissionCodeIn(seed.permissions());
                            RecruitmentRole r = new RecruitmentRole(companyId, seed.roleName(), seed.description());
                            r.setIsSystemDefault(true);
                            r.setPermissions(new HashSet<>(perms));
                            try {
                                roleRepo.save(r);
                                log.info("[COMPANY_SEED] Created default role '{}' for company ID {}", seed.roleName(), companyId);
                            } catch (org.springframework.dao.DataIntegrityViolationException dive) {
                                log.debug("[COMPANY_SEED] Role '{}' already exists for company ID {}", seed.roleName(), companyId);
                            }
                        }
                    }
                    return null;
                });
            } catch (Exception e) {
                log.warn("[COMPANY_SEED] Default role verification completed with note: {}", e.getMessage());
            }
        }
    }
}
