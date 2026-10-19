
import React, { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";

// ======================================================
// TEMPORARY PERMISSION DATA
// Replace with the backend API when it is ready.
// ======================================================

const permissionCategories = {
  "Job Vacancies": [
    { id: "VACANCY_VIEW", label: "View Vacancies" },
    { id: "VACANCY_CREATE", label: "Create Vacancies" },
    { id: "VACANCY_EDIT", label: "Edit Vacancies" },
    { id: "VACANCY_DELETE", label: "Delete Vacancies" },
    { id: "VACANCY_APPROVE", label: "Approve Vacancies" },
    { id: "VACANCY_PUBLISH", label: "Publish Vacancies" },
  ],
  "Candidate Applications": [
    { id: "APPLICATION_VIEW", label: "View Applications" },
    { id: "APPLICATION_SCREEN", label: "Screen Applications" },
    { id: "APPLICATION_SHORTLIST", label: "Shortlist Candidates" },
    { id: "CANDIDATE_VIEW", label: "View Candidate Records" },
    { id: "RESUME_DOWNLOAD", label: "Download Resumes" },
  ],
  Interviews: [
    { id: "INTERVIEW_VIEW", label: "View Interviews" },
    { id: "INTERVIEW_SCHEDULE", label: "Schedule Interviews" },
    { id: "INTERVIEW_ASSIGN", label: "Assign Interviewers" },
    { id: "INTERVIEW_EVALUATE", label: "Evaluate Candidates" },
  ],
  "Job Offers": [
    { id: "OFFER_VIEW", label: "View Job Offers" },
    { id: "OFFER_CREATE", label: "Create Job Offers" },
    { id: "OFFER_MANAGE", label: "Manage Job Offers" },
  ],
  Administration: [
    { id: "RECRUITMENT_ROLE_VIEW", label: "View Recruitment Roles" },
    { id: "RECRUITMENT_ROLE_ADMIN", label: "Manage Roles & Permissions" },
    { id: "REPORT_VIEW", label: "View Recruitment Reports" },
  ],
};

const allPermissions = Object.values(permissionCategories).flat();

const getPermissionLabel = (permissionId) =>
  allPermissions.find((permission) => permission.id === permissionId)?.label ??
  permissionId;

// ======================================================
// TEMPORARY ROLE DATA
// ======================================================

const initialRoles = [
  {
    id: 1,
    name: "Recruitment Manager",
    description:
      "Manage recruitment activities, vacancies, applications, and interviews.",
    type: "System Default",
    permissionIds: [
      "VACANCY_VIEW",
      "VACANCY_CREATE",
      "VACANCY_EDIT",
      "VACANCY_DELETE",
      "VACANCY_APPROVE",
      "VACANCY_PUBLISH",
      "APPLICATION_VIEW",
      "APPLICATION_SCREEN",
      "APPLICATION_SHORTLIST",
      "CANDIDATE_VIEW",
      "RESUME_DOWNLOAD",
      "INTERVIEW_VIEW",
      "INTERVIEW_SCHEDULE",
      "INTERVIEW_ASSIGN",
      "INTERVIEW_EVALUATE",
      "OFFER_VIEW",
      "OFFER_CREATE",
      "OFFER_MANAGE",
      "REPORT_VIEW",
    ],
  },
  {
    id: 2,
    name: "Interviewer",
    description:
      "Review assigned candidates and provide interview evaluations.",
    type: "System Default",
    permissionIds: [
      "APPLICATION_VIEW",
      "CANDIDATE_VIEW",
      "INTERVIEW_VIEW",
      "INTERVIEW_EVALUATE",
    ],
  },
  {
    id: 3,
    name: "Recruitment Assistant",
    description:
      "Support vacancy management and candidate application reviews.",
    type: "Custom",
    permissionIds: [
      "VACANCY_VIEW",
      "VACANCY_CREATE",
      "APPLICATION_VIEW",
      "APPLICATION_SCREEN",
      "CANDIDATE_VIEW",
      "INTERVIEW_VIEW",
    ],
  },
];

// ======================================================
// TEMPORARY EMPLOYEE DATA
// ======================================================

const initialEmployees = [
  {
    id: 101,
    name: "Kasun Perera",
    email: "kasun@example.com",
    department: "Human Resources",
    designation: "HR Manager",
    systemRole: "HR_MANAGER",
  },
  {
    id: 102,
    name: "Nimali Silva",
    email: "nimali@example.com",
    department: "Engineering",
    designation: "Software Engineer",
    systemRole: "EMPLOYEE",
  },
  {
    id: 103,
    name: "Amal Fernando",
    email: "amal@example.com",
    department: "Human Resources",
    designation: "HR Executive",
    systemRole: "EMPLOYEE",
  },
  {
    id: 104,
    name: "Tharushi Jayawardena",
    email: "tharushi@example.com",
    department: "Engineering",
    designation: "Technical Lead",
    systemRole: "ADMIN",
  },
  {
    id: 105,
    name: "Dilshan Kumara",
    email: "dilshan@example.com",
    department: "Human Resources",
    designation: "Recruiter",
    systemRole: "EMPLOYEE",
  },
  {
    id: 106,
    name: "Hiruni Peris",
    email: "hiruni@example.com",
    department: "Operations",
    designation: "Operations Executive",
    systemRole: "EMPLOYEE",
  },
  {
    id: 107,
    name: "Sachin Wijesinghe",
    email: "sachin@example.com",
    department: "Engineering",
    designation: "QA Engineer",
    systemRole: "EMPLOYEE",
  },
  {
    id: 108,
    name: "Piumi Senanayake",
    email: "piumi@example.com",
    department: "Human Resources",
    designation: "HR Coordinator",
    systemRole: "HR_MANAGER",
  },
];

const initialAssignments = [
  { employeeId: 101, roleIds: [1] },
  { employeeId: 102, roleIds: [2] },
  { employeeId: 103, roleIds: [3, 2] },
  { employeeId: 104, roleIds: [2] },
  { employeeId: 105, roleIds: [1, 3] },
  { employeeId: 106, roleIds: [2] },
  { employeeId: 107, roleIds: [] },
  { employeeId: 108, roleIds: [] },
];

const systemRoleStyles = {
  EMPLOYEE: "bg-slate-100 text-slate-600",
  HR_MANAGER: "bg-amber-50 text-amber-700",
  ADMIN: "bg-purple-50 text-purple-700",
};

// ======================================================
// SMALL REUSABLE COMPONENTS
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
          <p className={`text-sm font-bold ${style.title}`}>
            {toast.title}
          </p>
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

const ConfirmationModal = ({
  confirmation,
  onCancel,
  onConfirm,
}) => {
  if (!confirmation) return null;

  const isDelete = confirmation.action === "delete-role";

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
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
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              {isDelete ? <Trash2 size={23} /> : <Shield size={23} />}
            </div>

            <div className="min-w-0 flex-1">
              <h2
                id="confirmation-title"
                className="text-lg font-bold text-slate-800"
              >
                {isDelete
                  ? "Delete Recruitment Role?"
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
                      {confirmation.role.name}
                    </span>
                    ? This action cannot be undone.
                  </>
                ) : (
                  <>
                    Remove the{" "}
                    <span className="font-semibold text-slate-800">
                      {confirmation.role.name}
                    </span>{" "}
                    role from{" "}
                    <span className="font-semibold text-slate-800">
                      {confirmation.employee.name}
                    </span>
                    ?
                  </>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={onCancel}
              aria-label="Close confirmation"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-2"
          >
            {isDelete ? <Trash2 size={16} /> : <X size={16} />}
            {isDelete ? "Delete Role" : "Remove Role"}
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
  const [activeTab, setActiveTab] = useState("roles");
  const [search, setSearch] = useState("");
  const [roles, setRoles] = useState(initialRoles);
  const [employees] = useState(initialEmployees);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Role form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [formError, setFormError] = useState("");

  // Assignment form
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentEmployeeId, setAssignmentEmployeeId] = useState("");
  const [selectedAssignmentRoleIds, setSelectedAssignmentRoleIds] =
    useState([]);
  const [assignmentError, setAssignmentError] = useState("");

  // Other modals and notifications
  const [previewRole, setPreviewRole] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

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
    }, 4000);
  };

  const closeToast = () => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    setToast(null);
  };

  // ====================================================
  // HELPERS
  // ====================================================

  const getEmployeeRoleIds = (employeeId) =>
    assignments.find((item) => item.employeeId === employeeId)?.roleIds ?? [];

  const getRoleById = (roleId) =>
    roles.find((role) => role.id === roleId);

  const rolesWithAssignments = roles.map((role) => ({
    ...role,
    permissionCount: role.permissionIds.length,
    assignedUsers: assignments.filter((assignment) =>
      assignment.roleIds.includes(role.id)
    ).length,
  }));

  const totalAssignedUsers = assignments.filter(
    (assignment) => assignment.roleIds.length > 0
  ).length;

  const filteredRoles = rolesWithAssignments.filter((role) => {
    const searchText = search.trim().toLowerCase();

    return (
      role.name.toLowerCase().includes(searchText) ||
      role.description.toLowerCase().includes(searchText) ||
      role.permissionIds.some((permissionId) =>
        permissionId.toLowerCase().includes(searchText)
      )
    );
  });

  const filteredEmployees = employees.filter((employee) => {
    const searchText = assignmentSearch.trim().toLowerCase();
    const roleIds = getEmployeeRoleIds(employee.id);
    const employeeRoles = roleIds
      .map((roleId) => getRoleById(roleId)?.name ?? "")
      .join(" ");

    const matchesSearch = [
      employee.name,
      employee.email,
      employee.department,
      employee.designation,
      employee.systemRole,
      employeeRoles,
    ].some((value) => value.toLowerCase().includes(searchText));

    const matchesRole =
      roleFilter === "all" || roleIds.includes(Number(roleFilter));

    return matchesSearch && matchesRole;
  });

  // ====================================================
  // CREATE / EDIT ROLE
  // ====================================================

  const closeRoleModal = () => {
    setShowCreateModal(false);
    setEditingRoleId(null);
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissions([]);
    setFormError("");
  };

  const openCreateModal = () => {
    setEditingRoleId(null);
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissions([]);
    setFormError("");
    setShowCreateModal(true);
  };

  const openEditModal = (role) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description);
    setSelectedPermissions([...role.permissionIds]);
    setFormError("");
    setShowCreateModal(true);
  };

  const togglePermission = (permissionId) => {
    setSelectedPermissions((current) =>
      current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId]
    );
    setFormError("");
  };

  const handleSelectAll = (permissions) => {
    const ids = permissions.map((permission) => permission.id);
    const allSelected = ids.every((id) =>
      selectedPermissions.includes(id)
    );

    setSelectedPermissions((current) =>
      allSelected
        ? current.filter((id) => !ids.includes(id))
        : [...new Set([...current, ...ids])]
    );

    setFormError("");
  };

  const handleSaveRole = (event) => {
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

    const duplicate = roles.some(
      (role) =>
        role.name.toLowerCase() === name.toLowerCase() &&
        role.id !== editingRoleId
    );

    if (duplicate) {
      setFormError("A role with this name already exists.");
      return;
    }

    if (editingRoleId !== null) {
      setRoles((current) =>
        current.map((role) =>
          role.id === editingRoleId
            ? {
                ...role,
                name,
                description,
                permissionIds: [...selectedPermissions],
              }
            : role
        )
      );

      closeRoleModal();
      showToast(
        "success",
        "Role updated",
        `"${name}" has been updated successfully.`
      );
    } else {
      setRoles((current) => [
        ...current,
        {
          id: Date.now(),
          name,
          description,
          type: "Custom",
          permissionIds: [...selectedPermissions],
        },
      ]);

      closeRoleModal();
      showToast(
        "success",
        "Role created",
        `"${name}" has been created successfully.`
      );
    }
  };

  const handleDeleteRole = (role) => {
    if (role.type === "System Default") {
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
        "Remove this role from all employees before deleting it."
      );
      return;
    }

    setConfirmation({ action: "delete-role", role });
  };

  // ====================================================
  // EMPLOYEE ASSIGNMENTS
  // ====================================================

  const closeAssignmentModal = () => {
    setShowAssignmentModal(false);
    setAssignmentEmployeeId("");
    setSelectedAssignmentRoleIds([]);
    setAssignmentError("");
  };

  const openAssignmentModal = (employee = null) => {
    setAssignmentError("");

    if (employee) {
      setAssignmentEmployeeId(String(employee.id));
      setSelectedAssignmentRoleIds([...getEmployeeRoleIds(employee.id)]);
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

  const handleSaveAssignment = (event) => {
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

    const employeeExists = employees.some(
      (employee) => employee.id === employeeId
    );

    const validRoleIds = selectedAssignmentRoleIds.filter((roleId) =>
      roles.some((role) => role.id === roleId)
    );

    if (!employeeExists || validRoleIds.length === 0) {
      setAssignmentError("Select a valid employee and recruitment role.");
      return;
    }

    const employee = employees.find((item) => item.id === employeeId);
    const wasAssigned = assignments.some(
      (item) => item.employeeId === employeeId
    );

    setAssignments((current) => {
      const existing = current.find(
        (item) => item.employeeId === employeeId
      );

      if (existing) {
        return current.map((item) =>
          item.employeeId === employeeId
            ? { ...item, roleIds: [...validRoleIds] }
            : item
        );
      }

      return [
        ...current,
        { employeeId, roleIds: [...validRoleIds] },
      ];
    });

    closeAssignmentModal();

    showToast(
      "success",
      wasAssigned ? "Assignments updated" : "Roles assigned",
      `Recruitment roles have been saved for ${employee?.name ?? "the employee"}.`
    );
  };

  const handleRemoveEmployeeRole = (employee, role) => {
    setConfirmation({
      action: "remove-employee-role",
      employee,
      role,
    });
  };

  const handleConfirmAction = () => {
    if (!confirmation) return;

    if (confirmation.action === "delete-role") {
      const role = confirmation.role;

      // Re-check assignment status before deleting.
      const isAssigned = assignments.some((assignment) =>
        assignment.roleIds.includes(role.id)
      );

      if (role.type === "System Default" || isAssigned) {
        setConfirmation(null);
        showToast(
          "error",
          "Unable to delete role",
          role.type === "System Default"
            ? "System default roles cannot be deleted."
            : "This role is currently assigned to an employee."
        );
        return;
      }

      setRoles((current) =>
        current.filter((item) => item.id !== role.id)
      );

      setPreviewRole((current) =>
        current?.id === role.id ? null : current
      );

      setConfirmation(null);
      showToast(
        "success",
        "Role deleted",
        `"${role.name}" has been deleted successfully.`
      );
      return;
    }

    if (confirmation.action === "remove-employee-role") {
      const { employee, role } = confirmation;

      setAssignments((current) =>
        current.map((assignment) =>
          assignment.employeeId === employee.id
            ? {
                ...assignment,
                roleIds: assignment.roleIds.filter(
                  (roleId) => roleId !== role.id
                ),
              }
            : assignment
        )
      );

      setConfirmation(null);
      showToast(
        "success",
        "Role removed",
        `"${role.name}" has been removed from ${employee.name}.`
      );
    }
  };

  // ====================================================
  // EFFECTIVE PERMISSION PREVIEW
  // ====================================================

  const selectedAssignmentRoles = selectedAssignmentRoleIds
    .map((roleId) => roles.find((role) => role.id === roleId))
    .filter(Boolean);

  const effectivePermissionIds = [
    ...new Set(
      selectedAssignmentRoles.flatMap((role) => role.permissionIds)
    ),
  ];

  const selectedEmployee = employees.find(
    (employee) => employee.id === Number(assignmentEmployeeId)
  );

  // ====================================================
  // PAGE UI
  // ====================================================

  return (
    <PageLayout
      role="hr"
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
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
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
                                role.type === "System Default"
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-violet-50 text-violet-700"
                              }`}
                            >
                              {role.type === "System Default" && (
                                <LockKeyhole size={12} />
                              )}
                              {role.type === "System Default"
                                ? "System Default"
                                : "Custom Role"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          title={
                            role.type === "System Default"
                              ? "Edit system default role"
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
                        {role.permissionIds.slice(0, 4).map((permissionId) => (
                          <span
                            key={permissionId}
                            className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600"
                          >
                            {permissionId}
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
                            role.type === "System Default" ||
                            role.assignedUsers > 0
                          }
                          title={
                            role.type === "System Default"
                              ? "System default roles cannot be deleted"
                              : role.assignedUsers > 0
                                ? `Remove this role from ${role.assignedUsers} assigned employee(s) first`
                                : "Delete role"
                          }
                          aria-label={`Delete ${role.name}`}
                          onClick={() => handleDeleteRole(role)}
                          className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                        >
                          {role.type === "System Default" ? (
                            <LockKeyhole size={17} />
                          ) : (
                            <Trash2 size={17} />
                          )}
                        </button>
                      </div>

                      {role.type !== "System Default" &&
                        role.assignedUsers > 0 && (
                          <p className="mt-2 text-xs text-amber-700">
                            This role is assigned to {role.assignedUsers}{" "}
                            employee(s). Remove those assignments before
                            deleting it.
                          </p>
                        )}
                    </article>
                  ))}

                  {filteredRoles.length === 0 && (
                    <div className="col-span-full rounded-xl border border-dashed border-slate-200 py-12 text-center">
                      <Search
                        className="mx-auto text-slate-300"
                        size={28}
                      />
                      <p className="mt-3 font-medium text-slate-700">
                        No roles found
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Try another search term.
                      </p>
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
                      onChange={(event) => setRoleFilter(event.target.value)}
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
                          const roleIds = getEmployeeRoleIds(employee.id);
                          const employeeRoles = roleIds
                            .map((roleId) => getRoleById(roleId))
                            .filter(Boolean);
                          const hasRecruitmentAccess =
                            employeeRoles.length > 0;

                          return (
                            <tr
                              key={employee.id}
                              className="align-top transition hover:bg-slate-50"
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-start gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700">
                                    {employee.name
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
                                        systemRoleStyles[employee.systemRole] ??
                                        "bg-slate-100 text-slate-600"
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
                                        {role.name}
                                        <button
                                          type="button"
                                          title={`Remove ${role.name} from ${employee.name}`}
                                          aria-label={`Remove ${role.name} from ${employee.name}`}
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
                                  onClick={() => openAssignmentModal(employee)}
                                  disabled={roles.length === 0}
                                  className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {hasRecruitmentAccess ? (
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
                                  No employees found
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

                <p className="text-xs leading-5 text-slate-400">
                  Demo data only. Assignment changes are kept in React state
                  and reset when this page is refreshed.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* =========================================
            CREATE / EDIT ROLE MODAL
        ========================================= */}
        {showCreateModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeRoleModal();
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
                      : "Create Recruitment Role"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Define the role and select the permissions it needs.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeRoleModal}
                  aria-label="Close role form"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={19} />
                </button>
              </div>

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
                  value={roleDescription}
                  onChange={(event) => setRoleDescription(event.target.value)}
                  placeholder="Describe this role's responsibilities..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

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
                    ([category, permissions]) => {
                      const allSelected = permissions.every((permission) =>
                        selectedPermissions.includes(permission.id)
                      );
                      const someSelected = permissions.some((permission) =>
                        selectedPermissions.includes(permission.id)
                      );

                      return (
                        <section
                          key={category}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-700">
                                {category}
                              </h4>
                              {someSelected && (
                                <p className="mt-1 text-xs text-slate-400">
                                  {
                                    permissions.filter((permission) =>
                                      selectedPermissions.includes(
                                        permission.id
                                      )
                                    ).length
                                  }{" "}
                                  of {permissions.length} selected
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectAll(permissions)}
                              className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              {allSelected ? "Deselect All" : "Select All"}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {permissions.map((permission) => (
                              <label
                                key={permission.id}
                                className="flex cursor-pointer items-start gap-2 text-sm text-slate-600"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.includes(
                                    permission.id
                                  )}
                                  onChange={() =>
                                    togglePermission(permission.id)
                                  }
                                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-indigo-600"
                                />
                                <span>{permission.label}</span>
                              </label>
                            ))}
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
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    !roleName.trim() || selectedPermissions.length === 0
                  }
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editingRoleId !== null ? "Save Changes" : "Create Role"}
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
              if (event.target === event.currentTarget) {
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
                  aria-label="Close assignment form"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
                    <option key={employee.id} value={String(employee.id)}>
                      {employee.name} — {employee.email}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEmployee && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    {selectedEmployee.name
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">
                      {selectedEmployee.name}
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

                {roles.length > 0 ? (
                  <div className="space-y-2">
                    {rolesWithAssignments.map((role) => {
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
                              {role.type === "System Default" && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                  System Default
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
                    No recruitment roles are available. Create a role first.
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
                      {effectivePermissionIds.map((permissionId) => (
                        <span
                          key={permissionId}
                          className="rounded-md border border-emerald-100 bg-white px-2 py-1 text-xs text-emerald-800"
                          title={getPermissionLabel(permissionId)}
                        >
                          {permissionId}
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
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    !assignmentEmployeeId ||
                    selectedAssignmentRoleIds.length === 0 ||
                    roles.length === 0
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserPlus size={15} />
                  Save Assignment
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
                    <h2
                      id="permission-preview-title"
                      className="text-xl font-bold text-slate-800"
                    >
                      {previewRole.name}
                    </h2>
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
                  ([category, permissions]) => {
                    const rolePermissions = permissions.filter((permission) =>
                      previewRole.permissionIds.includes(permission.id)
                    );

                    if (rolePermissions.length === 0) return null;

                    return (
                      <section
                        key={category}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-slate-800">
                            {category}
                          </h3>
                          <span className="text-xs text-slate-400">
                            {rolePermissions.length} selected
                          </span>
                        </div>
                        <div className="space-y-2">
                          {rolePermissions.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-start gap-2 text-sm"
                            >
                              <CheckCircle2
                                size={16}
                                className="mt-0.5 shrink-0 text-emerald-600"
                              />
                              <div>
                                <p className="font-medium text-slate-700">
                                  {permission.label}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {permission.id}
                                </p>
                              </div>
                            </div>
                          ))}
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
          onCancel={() => setConfirmation(null)}
          onConfirm={handleConfirmAction}
        />
      </div>
    </PageLayout>
  );
};

export default RecruitmentRolesPermissions;
