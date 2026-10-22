import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  BriefcaseBusiness,
  Settings2,
  LockKeyhole,
  X,
  UserPlus,
  Mail,
  Filter,
  UserRound,
  Building2,
  Eye,
  CheckCircle2,
  CircleUserRound,
  Shield,
  AlertCircle,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";

// Strips the "400: " style status prefix from API errors for user-friendly display.
const cleanError = (error) =>
  String(error?.message || "")
    .replace(/^\d{3}:\s*/, "")
    .trim();

// Human-friendly permission display labels for HR users.
const PERMISSION_FRIENDLY_LABELS = {
  // Vacancy Management
  VACANCY_CREATE: "Create Vacancies",
  VACANCY_APPROVE: "Approve Vacancies",
  VACANCY_PUBLISH: "Publish & Close Vacancies",
  VACANCY_VIEW: "View Vacancies",
  VACANCY_EDIT: "Edit Vacancies",
  VACANCY_DELETE: "Delete Vacancies",

  // Candidate Applications
  APPLICATION_VIEW: "View Applications",
  APPLICATION_SCREEN: "Review Applications",
  APPLICATION_SHORTLIST: "Shortlist Candidates",
  CANDIDATE_VIEW: "View Candidate Records",
  RESUME_DOWNLOAD: "Download Resumes",

  // Interviews & Evaluations
  INTERVIEW_SCHEDULE: "Schedule Interviews",
  INTERVIEW_ASSIGN: "Assign Interviewers",
  INTERVIEW_EVALUATE: "Evaluate Interviews",
  INTERVIEW_VIEW: "View Interviews",

  // Job Offers
  OFFER_CREATE: "Create Job Offers",
  OFFER_MANAGE: "Manage Job Offers",
  OFFER_VIEW: "View Job Offers",

  // Roles & Administration
  RECRUITMENT_ROLE_VIEW: "View Recruitment Roles",
  RECRUITMENT_ROLE_ADMIN: "Manage Roles & Permissions",
  REPORT_VIEW: "View Recruitment Reports",
};

// Converts any unconfigured raw key (e.g. OFFER_APPROVE) into readable words ("Offer Approve").
const formatPermissionFallback = (rawKey) => {
  if (!rawKey) return "";
  return String(rawKey)
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Returns a clear, human-friendly permission label. Never outputs raw uppercase underscore keys.
const getFriendlyPermissionLabel = (permissionCode, backendPerm = null) => {
  if (PERMISSION_FRIENDLY_LABELS[permissionCode]) {
    return PERMISSION_FRIENDLY_LABELS[permissionCode];
  }
  if (backendPerm?.label) {
    return backendPerm.label;
  }
  return formatPermissionFallback(permissionCode);
};

// Category friendly labels.
const CATEGORY_FRIENDLY_LABELS = {
  VACANCY: "Job Vacancies",
  APPLICATION: "Candidate Applications",
  INTERVIEW: "Interviews & Evaluations",
  OFFER: "Job Offers",
  SETTINGS: "Role & Permission Management",
  ADMINISTRATION: "Role & Permission Management",
};

const getCategoryLabel = (category) => {
  if (!category) return "General";
  const upper = String(category).toUpperCase();
  if (CATEGORY_FRIENDLY_LABELS[upper]) {
    return CATEGORY_FRIENDLY_LABELS[upper];
  }
  return formatPermissionFallback(category);
};

// System role badge styling consistent with HRM design system.
const systemRoleStyles = {
  EMPLOYEE: "bg-slate-100 text-slate-600",
  HR_MANAGER: "bg-amber-50 text-amber-700",
  ADMIN: "bg-purple-50 text-purple-700",
};

// Normalizes backend RecruitmentRoleDTO into a consistent object structure.
const normalizeRole = (r) => {
  if (!r) return null;
  const permissions = r.permissions || [];
  const permissionIds = permissions.map((p) =>
    typeof p === "string" ? p : p.permissionCode
  );

  return {
    ...r,
    id: r.id,
    name: r.roleName || r.name || "",
    roleName: r.roleName || r.name || "",
    description: r.description || "",
    type: r.isSystemDefault ? "System Default" : "Custom",
    isSystemDefault: Boolean(r.isSystemDefault),
    permissions,
    permissionIds,
    permissionCount: permissions.length,
    assignedUsers: r.assignedUsersCount ?? r.assignedUsers ?? 0,
    assignedUsersCount: r.assignedUsersCount ?? r.assignedUsers ?? 0,
  };
};

// Normalizes backend UserRecruitmentAssignmentDTO into a consistent employee structure.
const normalizeEmployee = (emp) => {
  if (!emp) return null;
  // Exclude system administrators from recruitment role assignments
  if (emp.systemRole === "ADMIN" || emp.role === "ADMIN") return null;
  const rawRoles = emp.recruitmentRoles || [];
  const normalizedRoles = rawRoles.map(normalizeRole).filter(Boolean);

  return {
    ...emp,
    id: emp.userId,
    userId: emp.userId,
    name: emp.fullName || emp.name || "",
    fullName: emp.fullName || emp.name || "",
    email: emp.email || "",
    department: emp.departmentName || emp.department || "General",
    departmentName: emp.departmentName || emp.department || "General",
    designation: emp.designation || "Staff",
    systemRole: emp.systemRole || "EMPLOYEE",
    recruitmentRoles: normalizedRoles,
    roleIds: normalizedRoles.map((r) => r.id),
    effectivePermissions: Array.isArray(emp.effectivePermissions)
      ? emp.effectivePermissions
      : Array.from(emp.effectivePermissions || []),
  };
};

// ======================================================
// REUSABLE TOAST & MODAL COMPONENTS
// ======================================================

const ToastNotification = ({ toast, onClose }) => {
  if (!toast) return null;

  const styles = {
    success: {
      container: "border-emerald-200 bg-white",
      icon: "bg-emerald-50 text-emerald-600",
      title: "text-emerald-800",
      symbol: <CheckCircle2 size={21} />,
    },
    error: {
      container: "border-rose-200 bg-white",
      icon: "bg-rose-50 text-rose-600",
      title: "text-rose-800",
      symbol: <AlertCircle size={21} />,
    },
    info: {
      container: "border-indigo-200 bg-white",
      icon: "bg-indigo-50 text-indigo-600",
      title: "text-indigo-800",
      symbol: <Info size={21} />,
    },
  };

  const style = styles[toast.type] ?? styles.info;

  return (
    <div
      className="fixed right-4 top-4 z-[200] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-top-2 duration-200"
      role={toast.type === "error" ? "alert" : "status"}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
    >
      <div
        className={`flex items-start gap-3 rounded-2xl border p-4 shadow-xl ${style.container}`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
        >
          {style.symbol}
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${style.title}`}>{toast.title}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            {toast.message}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={17} />
        </button>
      </div>
    </div>
  );
};

const ConfirmationModal = ({ confirmation, loading, onCancel, onConfirm }) => {
  if (!confirmation) return null;

  const isDelete = confirmation.action === "delete-role";
  const isRemoveEmployeeRole = confirmation.action === "remove-employee-role";
  const isSwitchTemplate = confirmation.action === "switch-role-template";

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-description"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                isDelete
                  ? "bg-rose-50 text-rose-600"
                  : isSwitchTemplate
                    ? "bg-indigo-50 text-indigo-600"
                    : "bg-amber-50 text-amber-600"
              }`}
            >
              {isDelete ? (
                <Trash2 size={23} />
              ) : isSwitchTemplate ? (
                <AlertCircle size={23} />
              ) : (
                <Shield size={23} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h2
                id="confirmation-title"
                className="text-lg font-bold text-slate-800"
              >
                {isDelete
                  ? "Delete Recruitment Role?"
                  : isSwitchTemplate
                    ? "Discard Unsaved Changes?"
                    : "Remove Recruitment Access?"}
              </h2>

              <p
                id="confirmation-description"
                className="mt-2 text-sm leading-6 text-slate-500"
              >
                {isDelete ? (
                  <>
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-slate-800">
                      {confirmation.role.name || confirmation.role.roleName}
                    </span>
                    ? This action cannot be undone.
                  </>
                ) : isSwitchTemplate ? (
                  <>
                    You have made changes to the current role. Selecting another
                    role template will discard those modifications. Do you want to
                    continue?
                  </>
                ) : (
                  <>
                    Remove the{" "}
                    <span className="font-semibold text-slate-800">
                      {confirmation.role.name || confirmation.role.roleName}
                    </span>{" "}
                    role from{" "}
                    <span className="font-semibold text-slate-800">
                      {confirmation.employee.name ||
                        confirmation.employee.fullName}
                    </span>
                    ?
                  </>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              aria-label="Close confirmation"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            {isSwitchTemplate ? "Keep Editing" : "Cancel"}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
              isDelete || isRemoveEmployeeRole
                ? "bg-rose-600 hover:bg-rose-700 focus:ring-rose-300"
                : "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-300"
            }`}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isDelete ? (
              <Trash2 size={16} />
            ) : isSwitchTemplate ? (
              <CheckCircle2 size={16} />
            ) : (
              <X size={16} />
            )}
            {loading
              ? "Processing..."
              : isDelete
                ? "Delete Role"
                : isSwitchTemplate
                  ? "Discard & Switch"
                  : "Remove Role"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ======================================================
// MAIN COMPONENT
// ======================================================

const RecruitmentRolesPermissions = () => {
  const navigate = useNavigate();

  // Navigation and active tab
  const [activeTab, setActiveTab] = useState("roles");

  // Real backend data: roles stores custom company-created roles only
  const [roles, setRoles] = useState([]);
  const [defaultTemplates, setDefaultTemplates] = useState([]);
  const [permissionCategories, setPermissionCategories] = useState({});
  const [employees, setEmployees] = useState([]);

  // Loading & error state
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Search & filter state
  const [search, setSearch] = useState("");
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Role create / edit modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [selectedDefaultRoleId, setSelectedDefaultRoleId] = useState("");
  const [isClonedCustomRole, setIsClonedCustomRole] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState({
    name: "",
    description: "",
    permissionIds: [],
  });
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [formError, setFormError] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  // Assignment modal state
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentEmployeeId, setAssignmentEmployeeId] = useState("");
  const [selectedAssignmentRoleIds, setSelectedAssignmentRoleIds] = useState([]);
  const [assignmentError, setAssignmentError] = useState("");
  const [savingAssignment, setSavingAssignment] = useState(false);

  // Other modals and notifications
  const [previewRole, setPreviewRole] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const showToast = (type, title, message) => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    setToast({ type, title, message });

    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 4500);
  };

  const closeToast = () => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    setToast(null);
  };

  // ---------------------------------------------------------
  // INITIAL DATA LOADING & AUTH CHECK
  // ---------------------------------------------------------

  const loadAllData = async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const [customRolesRes, defaultTemplatesRes, permsRes, usersRes, _myAccessRes] = await Promise.all([
        recruitmentApi.getRoles("", true), // customOnly = true: only company custom roles
        recruitmentApi.getDefaultRoleTemplates().catch(async (err) => {
          // If a race condition occurred during initial role template seeding, retry once
          if (String(err?.message || "").includes("409") || String(err?.message || "").includes("conflict")) {
            return await recruitmentApi.getDefaultRoleTemplates();
          }
          throw err;
        }),
        recruitmentApi.getPermissionsByCategory(),
        recruitmentApi.getCompanyUsersWithRoles(),
        recruitmentApi.getMyAccess().catch(() => null),
      ]);

      const rawCustomRoles = customRolesRes?.data || [];
      const normalizedCustom = rawCustomRoles
        .map(normalizeRole)
        .filter((r) => r && !r.isSystemDefault);
      setRoles(normalizedCustom);

      const rawDefaults = defaultTemplatesRes?.data || [];
      const normalizedDefaults = rawDefaults
        .map(normalizeRole)
        .filter((r) => r && r.isSystemDefault);
      setDefaultTemplates(normalizedDefaults);

      const rawPerms = permsRes?.data || {};
      setPermissionCategories(rawPerms);

      const rawUsers = usersRes?.data || [];
      setEmployees(rawUsers.map(normalizeEmployee).filter(Boolean));
    } catch (err) {
      console.error("Failed to load recruitment data:", err);
      const cleaned = cleanError(err);
      setFetchError(
        cleaned || "Failed to load recruitment data. Please check if the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!token || !storedUser) {
      navigate("/login");
      return;
    }

    let parsedUser;
    try {
      parsedUser = JSON.parse(storedUser);
    } catch (error) {
      console.error("Invalid user data in storage:", error);
      navigate("/login");
      return;
    }

    const isSystemAdminOrHR = parsedUser.role === "HR_MANAGER" || parsedUser.role === "ADMIN";

    // HR Managers and Admins always have full access
    if (isSystemAdminOrHR) {
      loadAllData();
      return;
    }

    // For employees, check recruitment role management permission via getMyAccess API
    recruitmentApi
      .getMyAccess()
      .then((res) => {
        const access = res?.data?.data ?? res?.data ?? res;
        const perms = Array.isArray(access?.permissions) ? access.permissions : [];
        const canManage =
          access?.fullAccess === true ||
          perms.includes("RECRUITMENT_ROLE_ADMIN") ||
          perms.includes("MANAGE_ROLES_PERMISSIONS");

        if (!canManage) {
          navigate("/unauthorized");
          return;
        }

        loadAllData();
      })
      .catch((err) => {
        console.error("Failed to verify role management permission:", err);
        navigate("/unauthorized");
      });
  }, [navigate]);

  // ---------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------

  const allPermissions = Object.values(permissionCategories).flat();

  const getPermissionLabel = (permissionCode) => {
    const perm = allPermissions.find((p) => (p.permissionCode || p.id) === permissionCode);
    return getFriendlyPermissionLabel(permissionCode, perm);
  };

  const getEmployeeRoleIds = (employeeId) => {
    const emp = employees.find((item) => (item.userId || item.id) === employeeId);
    return (emp?.recruitmentRoles || []).map((r) => r.id);
  };

  const allAssignableRoles = [...roles, ...defaultTemplates];

  const selectedDefaultRole = defaultTemplates.find(
    (role) => String(role.id) === String(selectedDefaultRoleId)
  );

  const rolesWithAssignments = roles.map((role) => ({
    ...role,
    permissionCount: (role.permissionIds || []).length,
    assignedUsers: role.assignedUsers ?? 0,
  }));

  const allAssignableRolesWithAssignments = allAssignableRoles.map((role) => ({
    ...role,
    permissionCount: (role.permissionIds || []).length,
    assignedUsers: role.assignedUsers ?? 0,
  }));

  const totalAssignedUsers = employees.filter(
    (emp) => emp.recruitmentRoles && emp.recruitmentRoles.some((r) => !r.isSystemDefault)
  ).length;

  const filteredRoles = rolesWithAssignments.filter((role) => {
    const searchText = search.trim().toLowerCase();
    if (!searchText) return true;

    return (
      (role.name || "").toLowerCase().includes(searchText) ||
      (role.description || "").toLowerCase().includes(searchText) ||
      (role.permissionIds || []).some((permissionCode) => {
        const friendly = getFriendlyPermissionLabel(permissionCode).toLowerCase();
        return (
          permissionCode.toLowerCase().includes(searchText) ||
          friendly.includes(searchText)
        );
      })
    );
  });

  const filteredEmployees = employees.filter((employee) => {
    const searchText = assignmentSearch.trim().toLowerCase();
    const roleIds = getEmployeeRoleIds(employee.userId || employee.id);
    const employeeRoles = (employee.recruitmentRoles || [])
      .map((r) => r.name || r.roleName)
      .join(" ");

    const matchesSearch =
      !searchText ||
      [
        employee.name,
        employee.email,
        employee.department,
        employee.designation,
        employee.systemRole,
        employeeRoles,
      ].some((value) => (value || "").toLowerCase().includes(searchText));

    const matchesRole =
      roleFilter === "all" || roleIds.includes(Number(roleFilter));

    return matchesSearch && matchesRole;
  });

  // ---------------------------------------------------------
  // CREATE / EDIT ROLE HANDLERS
  // ---------------------------------------------------------

  const isFormDirty = () => {
    const currentName = roleName.trim();
    const currentDesc = roleDescription.trim();
    const snapName = (initialSnapshot.name || "").trim();
    const snapDesc = (initialSnapshot.description || "").trim();

    if (currentName !== snapName || currentDesc !== snapDesc) {
      return true;
    }

    const snapPerms = initialSnapshot.permissionIds || [];
    if (selectedPermissions.length !== snapPerms.length) {
      return true;
    }

    const permSet = new Set(selectedPermissions);
    return !snapPerms.every((code) => permSet.has(code));
  };

  const closeRoleModal = () => {
    if (savingRole) return;
    setShowCreateModal(false);
    setEditingRoleId(null);
    setSelectedDefaultRoleId("");
    setIsClonedCustomRole(false);
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissions([]);
    setFormError("");
    setInitialSnapshot({ name: "", description: "", permissionIds: [] });
  };

  const openCreateModal = () => {
    setEditingRoleId(null);
    setSelectedDefaultRoleId("");
    setIsClonedCustomRole(false);
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissions([]);
    setFormError("");
    setInitialSnapshot({ name: "", description: "", permissionIds: [] });
    setShowCreateModal(true);
  };

  const openEditModal = (role) => {
    setEditingRoleId(role.id);
    setSelectedDefaultRoleId("");
    setIsClonedCustomRole(false);
    const rName = role.name || role.roleName || "";
    const rDesc = role.description || "";
    const rPerms = [...(role.permissionIds || [])];
    setRoleName(rName);
    setRoleDescription(rDesc);
    setSelectedPermissions(rPerms);
    setFormError("");
    setInitialSnapshot({
      name: rName,
      description: rDesc,
      permissionIds: rPerms,
    });
    setShowCreateModal(true);
  };

  const applyDefaultRoleSelection = (nextRoleId) => {
    if (!nextRoleId) {
      // User selected "Create from scratch"
      setSelectedDefaultRoleId("");
      setIsClonedCustomRole(false);
      setEditingRoleId(null);
      setRoleName("");
      setRoleDescription("");
      setSelectedPermissions([]);
      setFormError("");
      setInitialSnapshot({ name: "", description: "", permissionIds: [] });
      return;
    }

    const template = defaultTemplates.find((r) => String(r.id) === String(nextRoleId));
    if (!template) return;

    setSelectedDefaultRoleId(String(template.id));
    setIsClonedCustomRole(true);
    setEditingRoleId(null); // Drafting a new custom role; NEVER sets editingRoleId on template
    setRoleName(`${template.name} (Custom)`);
    setRoleDescription(template.description || "");
    setSelectedPermissions([...template.permissionIds]);
    setFormError("");
    setInitialSnapshot({
      name: `${template.name} (Custom)`,
      description: template.description || "",
      permissionIds: [...template.permissionIds],
    });
  };

  const handleSelectDefaultRole = (nextRoleId) => {
    if (nextRoleId === selectedDefaultRoleId) return;

    if (isFormDirty()) {
      setConfirmation({
        action: "switch-role-template",
        targetRoleId: nextRoleId,
      });
      return;
    }

    applyDefaultRoleSelection(nextRoleId);
  };

  const togglePermission = (permissionCode) => {
    setSelectedPermissions((current) =>
      current.includes(permissionCode)
        ? current.filter((id) => id !== permissionCode)
        : [...current, permissionCode]
    );
    setFormError("");
  };

  const handleSelectAll = (categoryPermCodes) => {
    const allSelected =
      categoryPermCodes.length > 0 &&
      categoryPermCodes.every((code) => selectedPermissions.includes(code));

    setSelectedPermissions((current) =>
      allSelected
        ? current.filter((code) => !categoryPermCodes.includes(code))
        : [...new Set([...current, ...categoryPermCodes])]
    );

    setFormError("");
  };

  const handleSaveRole = async (event) => {
    event.preventDefault();

    const name = roleName.trim();
    const description = roleDescription.trim();

    if (!name) {
      setFormError("Role name is required.");
      return;
    }

    if (name.length > 50) {
      setFormError("Role name must not exceed 50 characters.");
      return;
    }

    if (selectedPermissions.length === 0) {
      setFormError("Select at least one permission.");
      return;
    }

    setSavingRole(true);
    setFormError("");

    try {
      if (editingRoleId !== null) {
        // Updating existing role (custom or system default)
        await recruitmentApi.updateRole(editingRoleId, {
          roleName: name,
          description,
          permissionCodes: selectedPermissions,
        });

        showToast(
          "success",
          "Role updated",
          `"${name}" has been updated successfully.`
        );
      } else {
        // Creating new custom role
        await recruitmentApi.createRole({
          roleName: name,
          description,
          permissionCodes: selectedPermissions,
        });

        showToast(
          "success",
          "Role created",
          `"${name}" has been created successfully.`
        );
      }

      closeRoleModal();

      // Refresh custom company roles from backend to get fresh counts and database state
      const rolesRes = await recruitmentApi.getRoles("", true);
      const rawCustom = rolesRes?.data || [];
      setRoles(rawCustom.map(normalizeRole).filter((r) => r && !r.isSystemDefault));
    } catch (err) {
      console.error("Failed to save recruitment role:", err);
      // Clean backend validation error without clearing form input
      setFormError(
        cleanError(err) || "Failed to save role. Please check the inputs."
      );
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = (role) => {
    if (role.isSystemDefault || role.type === "System Default") {
      showToast(
        "error",
        "Action not allowed",
        "System default roles cannot be deleted."
      );
      return;
    }

    if (role.assignedUsers > 0) {
      showToast(
        "error",
        "Role is assigned",
        `Cannot delete role "${role.name}" because it is currently assigned to ${role.assignedUsers} employee(s). Please remove assignments first.`
      );
      return;
    }

    setConfirmation({ action: "delete-role", role });
  };

  // ---------------------------------------------------------
  // EMPLOYEE ASSIGNMENTS HANDLERS
  // ---------------------------------------------------------

  const closeAssignmentModal = () => {
    if (savingAssignment) return;
    setShowAssignmentModal(false);
    setAssignmentEmployeeId("");
    setSelectedAssignmentRoleIds([]);
    setAssignmentError("");
  };

  const openAssignmentModal = (employee = null) => {
    setAssignmentError("");

    if (employee) {
      const empId = employee.userId || employee.id;
      setAssignmentEmployeeId(String(empId));
      setSelectedAssignmentRoleIds([...getEmployeeRoleIds(empId)]);
    } else {
      setAssignmentEmployeeId("");
      setSelectedAssignmentRoleIds([]);
    }

    setShowAssignmentModal(true);
  };

  const toggleAssignmentRole = (roleId) => {
    setSelectedAssignmentRoleIds((current) =>
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId]
    );
    setAssignmentError("");
  };

  const handleSaveAssignment = async (event) => {
    event.preventDefault();

    const employeeId = Number(assignmentEmployeeId);

    if (!employeeId) {
      setAssignmentError("Please select an employee.");
      return;
    }

    if (selectedAssignmentRoleIds.length === 0) {
      setAssignmentError("Select at least one recruitment role.");
      return;
    }

    const employee = employees.find(
      (emp) => (emp.userId || emp.id) === employeeId
    );

    setSavingAssignment(true);
    setAssignmentError("");

    try {
      // Backend updateUserRoles replaces the user's role list with the selected set
      await recruitmentApi.updateUserRoles(
        employeeId,
        selectedAssignmentRoleIds
      );

      closeAssignmentModal();

      showToast(
        "success",
        "Assignments updated",
        `Recruitment roles have been saved for ${employee?.name || employee?.fullName || "the employee"}.`
      );

      // Refresh both employee assignments and roles (assignedUsersCount updates)
      const [usersRes, rolesRes] = await Promise.all([
        recruitmentApi.getCompanyUsersWithRoles(),
        recruitmentApi.getRoles("", true),
      ]);

      setEmployees((usersRes?.data || []).map(normalizeEmployee).filter(Boolean));
      setRoles(
        (rolesRes?.data || [])
          .map(normalizeRole)
          .filter((r) => r && !r.isSystemDefault)
      );
    } catch (err) {
      console.error("Failed to save assignment:", err);
      setAssignmentError(
        cleanError(err) || "Failed to save role assignment. Please try again."
      );
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleRemoveEmployeeRole = (employee, role) => {
    setConfirmation({
      action: "remove-employee-role",
      employee,
      role,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmation) return;

    if (confirmation.action === "switch-role-template") {
      const targetRoleId = confirmation.targetRoleId;
      setConfirmation(null);
      applyDefaultRoleSelection(targetRoleId);
      return;
    }

    if (confirmation.action === "delete-role") {
      const role = confirmation.role;
      setActionLoading(true);

      try {
        await recruitmentApi.deleteRole(role.id);
        setConfirmation(null);

        showToast(
          "success",
          "Role deleted",
          `"${role.name}" has been deleted successfully.`
        );

        if (previewRole?.id === role.id) {
          setPreviewRole(null);
        }

        const rolesRes = await recruitmentApi.getRoles("", true);
        const rawCustom = rolesRes?.data || [];
        setRoles(rawCustom.map(normalizeRole).filter((r) => r && !r.isSystemDefault));
      } catch (err) {
        console.error("Failed to delete role:", err);
        setConfirmation(null);
        showToast(
          "error",
          "Unable to delete role",
          cleanError(err) || "Failed to delete role from server."
        );
      } finally {
        setActionLoading(false);
      }
      return;
    }

    if (confirmation.action === "remove-employee-role") {
      const { employee, role } = confirmation;
      setActionLoading(true);

      try {
        await recruitmentApi.removeRoleFromUser(
          employee.userId || employee.id,
          role.id
        );

        setConfirmation(null);

        showToast(
          "success",
          "Role removed",
          `"${role.name || role.roleName}" has been removed from ${employee.name || employee.fullName}.`
        );

        // Refresh both employees and roles
        const [usersRes, rolesRes] = await Promise.all([
          recruitmentApi.getCompanyUsersWithRoles(),
          recruitmentApi.getRoles("", true),
        ]);

        setEmployees((usersRes?.data || []).map(normalizeEmployee).filter(Boolean));
        setRoles(
          (rolesRes?.data || [])
            .map(normalizeRole)
            .filter((r) => r && !r.isSystemDefault)
        );
      } catch (err) {
        console.error("Failed to remove role:", err);
        setConfirmation(null);
        showToast(
          "error",
          "Unable to remove role",
          cleanError(err) || "Failed to remove role from employee."
        );
      } finally {
        setActionLoading(false);
      }
    }
  };

  // ---------------------------------------------------------
  // EFFECTIVE PERMISSION PREVIEW
  // ---------------------------------------------------------

  const selectedAssignmentRoles = selectedAssignmentRoleIds
    .map((roleId) => roles.find((role) => role.id === roleId))
    .filter(Boolean);

  const effectivePermissionIds = [
    ...new Set(
      selectedAssignmentRoles.flatMap((role) => role.permissionIds || [])
    ),
  ];

  const selectedEmployee = employees.find(
    (employee) =>
      (employee.userId || employee.id) === Number(assignmentEmployeeId)
  );

  // ======================================================
  // PAGE UI
  const storedUser = localStorage.getItem("user");
  let layoutRole = "recruiter";
  try {
    const parsed = storedUser ? JSON.parse(storedUser) : null;
    if (parsed?.role === "HR_MANAGER" || parsed?.role === "ADMIN") {
      layoutRole = "hr";
    }
  } catch {
    // Ignore — keep the default layoutRole
  }

  return (
    <PageLayout
      role={layoutRole}
      activePage="Roles & Permissions"
      title="Recruitment Roles & Permissions"
      subtitle="Manage company recruitment roles, assign permissions, and delegate hiring access to staff"
      actions={
        <button
          type="button"
          onClick={
            activeTab === "roles"
              ? openCreateModal
              : () => openAssignmentModal()
          }
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {activeTab === "roles" ? (
            <>
              <Plus size={17} />
              Create New Role
            </>
          ) : (
            <>
              <UserPlus size={17} />
              Assign Role
            </>
          )}
        </button>
      }
    >
      <ToastNotification toast={toast} onClose={closeToast} />

      <div className="space-y-6">
        {/* Page introduction */}
        <section>
          <h2 className="text-2xl font-bold text-slate-800">
            Recruitment Roles &amp; Permissions
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Manage company recruitment roles, assign permissions, and delegate
            hiring access to staff.
          </p>
        </section>

        {/* Loading state */}
        {loading ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            <h3 className="mt-4 text-base font-semibold text-slate-800">
              Loading Roles &amp; Permissions
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Connecting to Recruitment Backend and loading data...
            </p>
          </div>
        ) : fetchError ? (
          /* Error state with retry option */
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center shadow-sm">
            <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
            <h3 className="mt-3 text-lg font-bold text-rose-900">
              Failed to Load Recruitment Data
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-rose-700">
              {fetchError}
            </p>
            <button
              type="button"
              onClick={loadAllData}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
            >
              <RefreshCw size={16} />
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                  <ShieldCheck size={23} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">
                    Total Recruitment Roles
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-800">
                    {roles.length}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                  <Users size={23} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">
                    Staff with Recruitment Access
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-800">
                    {totalAssignedUsers}
                  </p>
                </div>
              </div>
            </section>

            {/* Main tabs */}
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex gap-6 overflow-x-auto border-b border-slate-100 px-5">
                <button
                  type="button"
                  onClick={() => setActiveTab("roles")}
                  className={`shrink-0 border-b-2 py-4 text-sm font-semibold transition ${
                    activeTab === "roles"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Company Roles
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("employees")}
                  className={`shrink-0 border-b-2 py-4 text-sm font-semibold transition ${
                    activeTab === "employees"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Employee Assignments
                </button>
              </div>

              <div className="p-5">
                {/* =========================================
                    COMPANY ROLES TAB
                ========================================= */}
                {activeTab === "roles" && (
                  <>
                    <div className="relative mb-5 max-w-md">
                      <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search roles, descriptions, or permissions..."
                        aria-label="Search recruitment roles"
                        className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {filteredRoles.map((role) => (
                        <article
                          key={role.id}
                          className="rounded-xl border border-slate-200 p-5 transition hover:border-indigo-200 hover:shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                                <BriefcaseBusiness size={21} />
                              </div>

                              <div className="min-w-0">
                                <h3 className="font-semibold text-slate-800">
                                  {role.name}
                                </h3>
                                <span
                                  className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                                    role.isSystemDefault
                                      ? "bg-slate-100 text-slate-600"
                                      : "bg-violet-50 text-violet-700"
                                  }`}
                                >
                                  {role.isSystemDefault && (
                                    <LockKeyhole size={12} />
                                  )}
                                  {role.isSystemDefault
                                    ? "System Default"
                                    : "Custom Role"}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              title={
                                role.isSystemDefault
                                  ? "Customize permissions for system default role"
                                  : "Edit role"
                              }
                              aria-label={`Edit ${role.name}`}
                              onClick={() => openEditModal(role)}
                              className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              <Pencil size={17} />
                            </button>
                          </div>

                          <p className="mt-4 text-sm leading-6 text-slate-500">
                            {role.description || "No description provided."}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {role.permissionIds.slice(0, 4).map((permissionCode) => (
                              <span
                                key={permissionCode}
                                className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600"
                                title={getPermissionLabel(permissionCode)}
                              >
                                {getFriendlyPermissionLabel(permissionCode)}
                              </span>
                            ))}

                            {role.permissionIds.length > 4 && (
                              <button
                                type="button"
                                onClick={() => setPreviewRole(role)}
                                className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                              >
                                +{role.permissionIds.length - 4} more
                              </button>
                            )}
                          </div>

                          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                              <button
                                type="button"
                                onClick={() => setPreviewRole(role)}
                                className="inline-flex items-center gap-1.5 font-medium transition hover:text-indigo-600"
                              >
                                <Settings2 size={14} />
                                {role.permissionCount} permissions
                                <Eye size={13} />
                              </button>

                              <span className="inline-flex items-center gap-1.5">
                                <Users size={14} />
                                {role.assignedUsers} assigned
                              </span>
                            </div>

                            <button
                              type="button"
                              disabled={
                                role.isSystemDefault || role.assignedUsers > 0
                              }
                              title={
                                role.isSystemDefault
                                  ? "System default roles cannot be deleted"
                                  : role.assignedUsers > 0
                                    ? `Cannot delete: role is assigned to ${role.assignedUsers} employee(s)`
                                    : "Delete role"
                              }
                              aria-label={`Delete ${role.name}`}
                              onClick={() => handleDeleteRole(role)}
                              className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                            >
                              {role.isSystemDefault ? (
                                <LockKeyhole size={17} />
                              ) : (
                                <Trash2 size={17} />
                              )}
                            </button>
                          </div>

                          {!role.isSystemDefault && role.assignedUsers > 0 && (
                            <p className="mt-2 text-xs text-amber-700">
                              This role is assigned to {role.assignedUsers}{" "}
                              employee(s). Remove those assignments before
                              deleting it.
                            </p>
                          )}
                        </article>
                      ))}

                      {filteredRoles.length === 0 && (
                        <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-2xs">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                            <BriefcaseBusiness size={28} />
                          </div>
                          <h3 className="mt-4 text-base font-bold text-slate-800">
                            {roles.length === 0
                              ? "No custom recruitment roles yet."
                              : "No custom roles match your search."}
                          </h3>
                          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                            {roles.length === 0
                              ? "Create a custom role or use a default role as a starting point."
                              : "Try adjusting your search criteria."}
                          </p>
                          {roles.length === 0 && (
                            <button
                              type="button"
                              onClick={openCreateModal}
                              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                            >
                              <Plus size={16} />
                              Create Role
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* =========================================
                    EMPLOYEE ASSIGNMENTS TAB
                ========================================= */}
                {activeTab === "employees" && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">
                        Employee Assignments
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Assign one or more recruitment roles to each employee.
                        Employees without a recruitment role have standard access
                        only.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="relative flex-1">
                        <Search
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="text"
                          value={assignmentSearch}
                          onChange={(event) =>
                            setAssignmentSearch(event.target.value)
                          }
                          placeholder="Search employee, email, department, or designation..."
                          aria-label="Search employees"
                          className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>

                      <div className="relative sm:w-64">
                        <Filter
                          size={17}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <select
                          value={roleFilter}
                          onChange={(event) =>
                            setRoleFilter(event.target.value)
                          }
                          aria-label="Filter employees by recruitment role"
                          className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        >
                          <option value="all">All Employees</option>
                          {rolesWithAssignments.map((role) => (
                            <option key={role.id} value={String(role.id)}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1050px] text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="px-5 py-4 font-semibold">
                                Employee
                              </th>
                              <th className="px-5 py-4 font-semibold">
                                Department &amp; Title
                              </th>
                              <th className="px-5 py-4 font-semibold">
                                Recruitment Roles
                              </th>
                              <th className="px-5 py-4 font-semibold">
                                Effective Access
                              </th>
                              <th className="px-5 py-4 text-right font-semibold">
                                Action
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {filteredEmployees.map((employee) => {
                              const employeeRoles =
                                employee.recruitmentRoles || [];
                              const hasRecruitmentAccess =
                                employeeRoles.length > 0 ||
                                employee.systemRole === "ADMIN" ||
                                employee.systemRole === "HR_MANAGER";

                              return (
                                <tr
                                  key={employee.userId || employee.id}
                                  className="align-top transition hover:bg-slate-50"
                                >
                                  <td className="px-5 py-4">
                                    <div className="flex items-start gap-3">
                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700">
                                        {(employee.name || "U")
                                          .split(" ")
                                          .map((part) => part[0])
                                          .slice(0, 2)
                                          .join("")
                                          .toUpperCase()}
                                      </div>

                                      <div className="min-w-0">
                                        <p className="font-semibold text-slate-800">
                                          {employee.name}
                                        </p>
                                        <p className="mt-1 flex items-center gap-1.5 break-all text-xs text-slate-500">
                                          <Mail size={13} className="shrink-0" />
                                          {employee.email}
                                        </p>
                                        <span
                                          className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                                            systemRoleStyles[
                                              employee.systemRole
                                            ] ?? "bg-slate-100 text-slate-600"
                                          }`}
                                        >
                                          <Shield size={11} />
                                          {employee.systemRole}
                                        </span>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-5 py-4">
                                    <p className="flex items-start gap-1.5 font-medium text-slate-700">
                                      <Building2
                                        size={14}
                                        className="mt-0.5 shrink-0 text-slate-400"
                                      />
                                      {employee.department}
                                    </p>
                                    <p className="mt-1 pl-5 text-xs text-slate-500">
                                      {employee.designation}
                                    </p>
                                  </td>

                                  <td className="px-5 py-4">
                                    {employeeRoles.length > 0 ? (
                                      <div className="flex max-w-sm flex-wrap gap-2">
                                        {employeeRoles.map((role) => (
                                          <span
                                            key={role.id}
                                            className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 py-1 pl-2.5 pr-1 text-xs font-semibold text-indigo-700"
                                          >
                                            {role.name || role.roleName}
                                            <button
                                              type="button"
                                              title={`Remove ${role.name || role.roleName} from ${employee.name}`}
                                              aria-label={`Remove ${role.name || role.roleName} from ${employee.name}`}
                                              onClick={() =>
                                                handleRemoveEmployeeRole(
                                                  employee,
                                                  role
                                                )
                                              }
                                              className="rounded-full p-0.5 transition hover:bg-indigo-200 hover:text-indigo-900"
                                            >
                                              <X size={13} />
                                            </button>
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-400">
                                        No recruitment roles assigned
                                      </span>
                                    )}
                                  </td>

                                  <td className="px-5 py-4">
                                    {hasRecruitmentAccess ? (
                                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700">
                                        <CheckCircle2 size={14} />
                                        Has Recruitment Access
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                                        <CircleUserRound size={14} />
                                        Standard Access Only
                                      </span>
                                    )}
                                  </td>

                                  <td className="px-5 py-4 text-right">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openAssignmentModal(employee)
                                      }
                                      disabled={roles.length === 0}
                                      className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {employeeRoles.length > 0 ? (
                                        <>
                                          <Pencil size={14} />
                                          Manage Roles
                                        </>
                                      ) : (
                                        <>
                                          <Plus size={14} />
                                          Assign Role
                                        </>
                                      )}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}

                            {filteredEmployees.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-5 py-14">
                                  <div className="text-center">
                                    <UserRound
                                      size={32}
                                      className="mx-auto text-slate-300"
                                    />
                                    <p className="mt-3 font-semibold text-slate-700">
                                      {employees.length === 0
                                        ? "No employees found in directory"
                                        : "No employees matched filter"}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                      Try another search term or role filter.
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-col gap-1 border-t border-slate-100 bg-white px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                          Showing {filteredEmployees.length} of {employees.length}{" "}
                          employees
                        </span>
                        <span>
                          {totalAssignedUsers} employees have recruitment access
                        </span>
                      </div>
                    </div>

                    <p className="text-xs leading-5 text-slate-500">
                      Recruitment role assignments are persisted in the database.
                      Employees with assigned roles receive appropriate
                      recruitment access in the portal.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* =========================================
            CREATE / EDIT ROLE MODAL
        ========================================= */}
        {showCreateModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !savingRole) {
                closeRoleModal();
              }
            }}
          >
            <form
              role="dialog"
              aria-modal="true"
              aria-labelledby="role-form-title"
              onSubmit={handleSaveRole}
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="role-form-title"
                    className="text-xl font-bold text-slate-800"
                  >
                    {editingRoleId !== null
                      ? "Edit Recruitment Role"
                      : selectedDefaultRoleId
                        ? "Create Custom Role from Template"
                        : "Create Recruitment Role"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {editingRoleId !== null
                      ? "Modify custom role details and assigned permissions."
                      : selectedDefaultRoleId
                        ? `Drafting a new custom company role based on "${selectedDefaultRole?.name}".`
                        : "Define role details and select permissions from the categories below."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeRoleModal}
                  disabled={savingRole}
                  aria-label="Close role form"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  <X size={19} />
                </button>
              </div>

              {/* ── Start from a default role Dropdown ── */}
              {editingRoleId === null && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="template-role-select"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Start from a default role (Optional)
                    </label>
                    {selectedDefaultRoleId && (
                      <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-full">
                        Drafting from Template
                      </span>
                    )}
                  </div>
                  <select
                    id="template-role-select"
                    value={selectedDefaultRoleId}
                    onChange={(e) => handleSelectDefaultRole(e.target.value)}
                    disabled={savingRole}
                    aria-label="Start from a default role (Optional)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Create from scratch</option>
                    {defaultTemplates.map((template) => (
                      <option key={template.id} value={String(template.id)}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Select a predefined system default role to draft a new custom role with recommended responsibilities and permissions, or select "Create from scratch" to start fresh.
                  </p>

                  {/* Banner when a default role template is selected */}
                  {selectedDefaultRole && (
                    <div className="mt-3.5 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 shadow-2xs">
                      <div className="flex items-start gap-2.5">
                        <Sparkles size={17} className="text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">
                              Template: {selectedDefaultRole.name}
                            </span>
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                              Predefined Default Template
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                            You are creating a <strong>new custom company role</strong> based on this template. The system default role remains unchanged. Enter a custom role name below, customize description and permissions as needed, and click <strong>Create Role</strong> to save.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Role Name ── */}
              <div className="mt-5">
                <label
                  htmlFor="role-name"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Role Name *
                </label>
                <input
                  id="role-name"
                  type="text"
                  required
                  maxLength={50}
                  value={roleName}
                  onChange={(event) => {
                    setRoleName(event.target.value);
                    setFormError("");
                  }}
                  placeholder="e.g. Senior Recruiter"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {roleName.length}/50
                </p>
              </div>

              {/* ── Role Description ── */}
              <div className="mt-4">
                <label
                  htmlFor="role-description"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Description
                </label>
                <textarea
                  id="role-description"
                  rows={3}
                  maxLength={255}
                  value={roleDescription}
                  onChange={(event) =>
                    setRoleDescription(event.target.value)
                  }
                  placeholder="Describe this role's responsibilities..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* ── Permissions Checklist ── */}
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-800">
                    Permissions *
                  </h3>
                  <span className="text-xs text-slate-500">
                    {selectedPermissions.length} selected
                  </span>
                </div>

                <div className="space-y-4">
                  {Object.entries(permissionCategories).map(
                    ([categoryKey, permissions]) => {
                      const categoryTitle = getCategoryLabel(categoryKey);
                      const categoryPermCodes = permissions.map(
                        (p) => p.permissionCode || p.id
                      );
                      const allSelected =
                        categoryPermCodes.length > 0 &&
                        categoryPermCodes.every((code) =>
                          selectedPermissions.includes(code)
                        );
                      const someSelected = categoryPermCodes.some((code) =>
                        selectedPermissions.includes(code)
                      );
                      const selectedCount = categoryPermCodes.filter((code) =>
                        selectedPermissions.includes(code)
                      ).length;

                      return (
                        <section
                          key={categoryKey}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-700">
                                {categoryTitle}
                              </h4>
                              {someSelected && (
                                <p className="mt-1 text-xs text-slate-400">
                                  {selectedCount} of {permissions.length} selected
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleSelectAll(categoryPermCodes)
                              }
                              className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              {allSelected ? "Deselect All" : "Select All"}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {permissions.map((permission) => {
                              const permCode =
                                permission.permissionCode || permission.id;
                              const friendlyTitle =
                                getFriendlyPermissionLabel(permCode, permission);

                              return (
                                <label
                                  key={permCode}
                                  className="flex cursor-pointer items-start gap-2.5 rounded-lg p-2 text-sm text-slate-600 transition hover:bg-slate-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedPermissions.includes(
                                      permCode
                                    )}
                                    onChange={() => togglePermission(permCode)}
                                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-indigo-600"
                                  />
                                  <div className="min-w-0">
                                    <span className="font-medium text-slate-800">
                                      {friendlyTitle}
                                    </span>
                                    {permission.description &&
                                      permission.description !== friendlyTitle && (
                                        <span className="mt-0.5 block text-xs leading-normal text-slate-500">
                                          {permission.description}
                                        </span>
                                      )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </section>
                      );
                    }
                  )}
                </div>
              </div>

              {formError && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                  {formError}
                </p>
              )}

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeRoleModal}
                  disabled={savingRole}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    savingRole ||
                    !roleName.trim() ||
                    selectedPermissions.length === 0
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingRole && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {savingRole
                    ? "Saving..."
                    : editingRoleId !== null
                      ? "Save Changes"
                      : isClonedCustomRole
                        ? "Create Custom Role"
                        : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =========================================
            ASSIGN MULTIPLE ROLES MODAL
        ========================================= */}
        {showAssignmentModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !savingAssignment) {
                closeAssignmentModal();
              }
            }}
          >
            <form
              role="dialog"
              aria-modal="true"
              aria-labelledby="assignment-modal-title"
              onSubmit={handleSaveAssignment}
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="assignment-modal-title"
                    className="text-xl font-bold text-slate-800"
                  >
                    Manage Recruitment Roles
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Select an employee and assign one or more recruitment
                    roles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAssignmentModal}
                  disabled={savingAssignment}
                  aria-label="Close assignment form"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  <X size={19} />
                </button>
              </div>

              <div>
                <label
                  htmlFor="assignment-employee"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Employee *
                </label>
                <select
                  id="assignment-employee"
                  value={assignmentEmployeeId}
                  onChange={(event) => {
                    const nextEmployeeId = event.target.value;
                    setAssignmentEmployeeId(nextEmployeeId);

                    const employeeId = Number(nextEmployeeId);
                    setSelectedAssignmentRoleIds(
                      employeeId ? [...getEmployeeRoleIds(employeeId)] : []
                    );
                    setAssignmentError("");
                  }}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select an employee</option>
                  {employees.map((employee) => (
                    <option
                      key={employee.userId || employee.id}
                      value={String(employee.userId || employee.id)}
                    >
                      {employee.name || employee.fullName} — {employee.email}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEmployee && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    {(selectedEmployee.name || selectedEmployee.fullName || "U")
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">
                      {selectedEmployee.name || selectedEmployee.fullName}
                    </p>
                    <p className="break-all text-xs text-slate-500">
                      {selectedEmployee.email}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedEmployee.department} ·{" "}
                      {selectedEmployee.designation}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-slate-700">
                    Recruitment Roles *
                  </label>
                  <span className="text-xs text-slate-500">
                    {selectedAssignmentRoleIds.length} selected
                  </span>
                </div>

                {allAssignableRoles.length > 0 ? (
                  <div className="space-y-2">
                    {allAssignableRolesWithAssignments.map((role) => {
                      const checked = selectedAssignmentRoleIds.includes(
                        role.id
                      );

                      return (
                        <label
                          key={role.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                            checked
                              ? "border-indigo-300 bg-indigo-50/70"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAssignmentRole(role.id)}
                            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-indigo-600"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                {role.name}
                              </span>
                              {role.isSystemDefault ? (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                  System Default
                                </span>
                              ) : (
                                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                                  Company Role
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {role.description}
                            </p>
                            <p className="mt-1 text-xs text-indigo-600">
                              {role.permissionCount} permissions
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
                    No recruitment roles are available.
                  </p>
                )}
              </div>

              <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                <div className="flex items-start gap-2">
                  <ShieldCheck
                    size={19}
                    className="mt-0.5 shrink-0 text-emerald-700"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-emerald-900">
                      Effective Permission Preview
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-emerald-800">
                      Combined permissions from all selected recruitment roles.
                      Duplicate permissions are counted once.
                    </p>
                  </div>
                </div>

                {effectivePermissionIds.length > 0 ? (
                  <>
                    <p className="mt-3 text-sm font-semibold text-emerald-900">
                      {effectivePermissionIds.length} unique permissions
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {effectivePermissionIds.map((permissionCode) => (
                        <span
                          key={permissionCode}
                          className="rounded-md border border-emerald-100 bg-white px-2.5 py-1 text-xs font-medium text-emerald-800"
                        >
                          {getFriendlyPermissionLabel(permissionCode)}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-xs text-emerald-800">
                    Select a recruitment role to preview its permissions.
                  </p>
                )}
              </div>

              {assignmentError && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                  {assignmentError}
                </p>
              )}

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeAssignmentModal}
                  disabled={savingAssignment}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    savingAssignment ||
                    !assignmentEmployeeId ||
                    selectedAssignmentRoleIds.length === 0 ||
                    roles.length === 0
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingAssignment ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <UserPlus size={15} />
                  )}
                  {savingAssignment ? "Saving..." : "Save Assignment"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =========================================
            PERMISSION PREVIEW MODAL
        ========================================= */}
        {previewRole && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setPreviewRole(null);
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="permission-preview-title"
              className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2
                        id="permission-preview-title"
                        className="text-xl font-bold text-slate-800"
                      >
                        {previewRole.name}
                      </h2>
                      {previewRole.isSystemDefault && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          System Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {previewRole.permissionIds.length} permissions
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewRole(null)}
                  aria-label="Close permission preview"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={19} />
                </button>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                {previewRole.description || "No description provided."}
              </p>

              <div className="mt-5 space-y-4">
                {Object.entries(permissionCategories).map(
                  ([categoryKey, permissions]) => {
                    const rolePermissions = permissions.filter((permission) =>
                      previewRole.permissionIds.includes(
                        permission.permissionCode || permission.id
                      )
                    );

                    if (rolePermissions.length === 0) return null;

                    return (
                      <section
                        key={categoryKey}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-slate-800">
                            {getCategoryLabel(categoryKey)}
                          </h3>
                          <span className="text-xs text-slate-400">
                            {rolePermissions.length} selected
                          </span>
                        </div>
                        <div className="space-y-2">
                          {rolePermissions.map((permission) => {
                            const code =
                              permission.permissionCode || permission.id;
                            const friendlyTitle =
                              getFriendlyPermissionLabel(code, permission);

                            return (
                              <div
                                key={code}
                                className="flex items-start gap-2 text-sm"
                              >
                                <CheckCircle2
                                  size={16}
                                  className="mt-0.5 shrink-0 text-emerald-600"
                                />
                                <div>
                                  <p className="font-medium text-slate-800">
                                    {friendlyTitle}
                                  </p>
                                  {permission.description &&
                                    permission.description !== friendlyTitle && (
                                      <p className="mt-0.5 text-xs text-slate-500">
                                        {permission.description}
                                      </p>
                                    )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  }
                )}
              </div>

              <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setPreviewRole(null)}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            CUSTOM CONFIRMATION MODAL
        ========================================= */}
        <ConfirmationModal
          confirmation={confirmation}
          loading={actionLoading}
          onCancel={() => setConfirmation(null)}
          onConfirm={handleConfirmAction}
        />
      </div>
    </PageLayout>
  );
};

export default RecruitmentRolesPermissions;
