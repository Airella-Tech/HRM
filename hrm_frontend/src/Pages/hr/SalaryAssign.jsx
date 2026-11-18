import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  X,
  Save,
  Building2,
  Briefcase,
  History,
  ChevronRight,
  Pencil,
  Trash2,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { hrApi } from "../../services/api";

// Server errors come back as "400: <reason>"; show just the reason
const errorText = (error, fallback) =>
  (error?.message || fallback).replace(/^\d{3}:\s*/, "");

const PERIODS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "ANNUAL", label: "Annual" },
];
const periodLabel = (p) => PERIODS.find((x) => x.value === p)?.label || p;

const num = (v) => (v === "" || v == null || isNaN(Number(v)) ? 0 : Number(v));
const money = (v) =>
  `Rs.${num(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const rowTotal = (r) =>
  num(r.basicSalary) + num(r.allowance) - num(r.deduction);

const newRow = () => ({
  key: `${Date.now()}-${Math.random()}`,
  employmentTypeId: "",
  period: "MONTHLY",
  basicSalary: "",
  allowance: "",
  deduction: "",
});

const fieldCls =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 bg-slate-50 focus:bg-white transition-all";
const SalaryAssign = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // A row chosen with the edit button on the Payroll page: opened as soon as the salaries have loaded
  const pendingEdit = useRef(location.state?.editRow || null);
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [employmentTypes, setEmploymentTypes] = useState([]);
  const [history, setHistory] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [message, setMessage] = useState("");

  // popup state
  const [activeRole, setActiveRole] = useState(null);
  const [rows, setRows] = useState([newRow()]);
  const [removedIds, setRemovedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (!s) {
      navigate("/login");
      return;
    }
    const u = JSON.parse(s);
    if (u.role !== "HR_MANAGER" && u.role !== "ADMIN") {
      navigate("/unauthorized");
      return;
    }
    setUser(u);
    loadReferenceData();
  }, [navigate]);

  useEffect(() => {
    if (user) loadHistory(departmentId);
  }, [user, departmentId]);

  const loadReferenceData = async () => {
    try {
      setLoading(true);
      const [deptRes, empTypeRes] = await Promise.all([
        hrApi.getDepartments(),
        hrApi.getEmploymentTypes(),
      ]);
      setDepartments((deptRes.data || []).filter((d) => d.active !== false));
      setEmploymentTypes(empTypeRes.data || []);
    } catch (e) {
      setPageError(
        errorText(e, "Failed to load departments and employment types"),
      );
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (deptId) => {
    try {
      const res = await hrApi.getBasicPayments(deptId || null);
      setHistory(res.data || []);
    } catch (e) {
      setPageError(errorText(e, "Failed to load job role salaries"));
    }
  };

  // ---------------------------------------------------------
  // SORTING
  // ---------------------------------------------------------

  const handleSort = (key) => {
    setSortConfig((previous) => ({
      key,
      direction:
        previous.key === key && previous.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown size={14} className="ml-1 inline-block" />;
    }

    return sortConfig.direction === "asc" ? (
      <ArrowUp size={14} className="ml-1 inline-block" />
    ) : (
      <ArrowDown size={14} className="ml-1 inline-block" />
    );
  };

  const department = useMemo(
    () => departments.find((d) => String(d.id) === String(departmentId)),
    [departments, departmentId],
  );
  const jobRoles = department?.jobRoles || [];

  const sortedHistory = useMemo(() => {
    if (!sortConfig.key) return history;

    return [...history].sort((a, b) => {
      let valueA;
      let valueB;

      switch (sortConfig.key) {
        case "department":
          valueA = a.departmentName || "";
          valueB = b.departmentName || "";
          break;

        case "jobRole":
          valueA = a.jobRoleTitle || "";
          valueB = b.jobRoleTitle || "";
          break;

        case "employmentType":
          valueA = a.employmentTypeName || "";
          valueB = b.employmentTypeName || "";
          break;

        case "period":
          valueA = periodLabel(a.period) || "";
          valueB = periodLabel(b.period) || "";
          break;

        case "basic":
          valueA = num(a.basicSalary);
          valueB = num(b.basicSalary);
          break;

        case "allowance":
          valueA = num(a.allowance);
          valueB = num(b.allowance);
          break;

        case "deduction":
          valueA = num(a.deduction);
          valueB = num(b.deduction);
          break;

        case "totalSalary":
          valueA = num(a.totalSalary);
          valueB = num(b.totalSalary);
          break;

        case "employees":
          valueA = num(a.employeeCount);
          valueB = num(b.employeeCount);
          break;

        case "setBy":
          valueA = a.createdByName || "";
          valueB = b.createdByName || "";
          break;

        case "lastUpdated":
          valueA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          valueB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          break;

        default:
          return 0;
      }

      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortConfig.direction === "asc"
          ? valueA - valueB
          : valueB - valueA;
      }

      return sortConfig.direction === "asc"
        ? String(valueA).localeCompare(String(valueB), undefined, {
          sensitivity: "base",
        })
        : String(valueB).localeCompare(String(valueA), undefined, {
          sensitivity: "base",
        });
    });
  }, [history, sortConfig]);

  // The popup starts with what the role already has, so HR edits it instead of re-entering it
  const openRole = useCallback(
    (role) => {
      const existing = history.filter((p) => p.jobRoleId === role.id);
      setActiveRole(role);
      setRemovedIds([]);
      setRows(
        existing.length
          ? existing.map((p) => ({
            key: `existing-${p.id}`,
            employmentTypeId: String(p.employmentTypeId),
            period: p.period,
            basicSalary: String(p.basicSalary ?? ""),
            allowance: String(p.allowance ?? ""),
            deduction: String(p.deduction ?? ""),
          }))
          : [newRow()],
      );
      setFormError("");
    },
    [history]
  );

  // Opened from a row in the history table below: switches to that row's department first so the
  // job role picker and popup header line up with what's being edited.
  const editHistoryRow = useCallback(
    (row) => {
      setDepartmentId(String(row.departmentId));
      openRole({ id: row.jobRoleId, jobTitle: row.jobRoleTitle });
    },
    [openRole]
  );

  useEffect(() => {
    if (pendingEdit.current && history.length > 0) {
      const row =
        history.find((h) => h.id === pendingEdit.current.id) ||
        pendingEdit.current;
      pendingEdit.current = null;
      editHistoryRow(row);
      // Clear the navigation state so a refresh does not re-open the popup
      navigate(location.pathname, { replace: true, state: null });
    }
}, [history, editHistoryRow, location.pathname, navigate]);

const deleteHistoryRow = async (row) => {
  try {
    setDeletingId(row.id);
    await hrApi.deleteBasicPayment(row.id);
    setConfirmDeleteId(null);
    setMessage(
      `✓ Salary row deleted for ${row.jobRoleTitle} (${row.employmentTypeName})`,
    );
    setTimeout(() => setMessage(""), 3000);
    loadHistory(departmentId);
  } catch (e) {
    setPageError(errorText(e, "Failed to delete salary row"));
  } finally {
    setDeletingId(null);
  }
};

const closeModal = () => {
  if (!saving) setActiveRole(null);
};

const updateRow = (key, field, value) =>
  setRows((prev) =>
    prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
  );
const removeRow = (key) =>
  setRows((prev) => {
    if (prev.length === 1) return prev;
    const row = prev.find((r) => r.key === key);
    // Removing a row that already exists in the database queues it for deletion on save,
    // rather than just hiding it locally and leaving the old row behind.
    if (row && row.key.startsWith("existing-")) {
      setRemovedIds((ids) => [
        ...ids,
        Number(row.key.replace("existing-", "")),
      ]);
    }
    return prev.filter((r) => r.key !== key);
  });

const handleSave = async (e) => {
  e.preventDefault();
  const negative = rows.findIndex((r) => rowTotal(r) < 0);
  if (negative >= 0) {
    setFormError(
      `Row ${negative + 1}: deduction cannot be more than basic salary + allowance`,
    );
    return;
  }
  try {
    setSaving(true);
    setFormError("");
    const res = await hrApi.saveBasicPayments(
      activeRole.id,
      rows.map((r) => ({
        employmentTypeId: r.employmentTypeId
          ? Number(r.employmentTypeId)
          : null,
        period: r.period,
        basicSalary: r.basicSalary === "" ? null : Number(r.basicSalary),
        allowance: num(r.allowance),
        deduction: num(r.deduction),
      })),
    );
    // Apply any deletions queued by removing an existing row above
    for (const id of removedIds) {
      await hrApi.deleteBasicPayment(id);
    }
    setActiveRole(null);
    setRemovedIds([]);
    setMessage(
      `✓ ${res.message || "Salaries saved"} for ${activeRole.jobTitle}. All ${activeRole.jobTitle} employees are updated.`,
    );
    setTimeout(() => setMessage(""), 4000);
    loadHistory(departmentId);
  } catch (e2) {
    setFormError(errorText(e2, "Failed to save salaries"));
  } finally {
    setSaving(false);
  }
};

if (!user) return null;

return (
  <PageLayout
    role="hr"
    activePage="Payroll"
    title="Add Salaries for Job Roles"
    subtitle="Set the basic salary, allowance and deduction each job role gets"
    actions={
      <button
        onClick={() => navigate("/hr/payslip")}
        className="inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200"
      >
        <ArrowLeft size={16} /> Back to Payroll
      </button>
    }
  >
    <div className="space-y-6">
      {message && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
          <Save size={18} className="shrink-0" />
          {message}
        </div>
      )}
      {pageError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {pageError}
        </div>
      )}

      {/* Department picker */}
      <div className="bg-gradient-to-br from-sky-700 via-sky-600 to-sky-800 rounded-2xl shadow-sm p-5 relative overflow-hidden">
        <div className="absolute -right-8 -top-10 w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute right-20 -bottom-16 w-32 h-32 rounded-full bg-white/10" />

        <div className="relative z-10">
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm font-bold text-white">
              <Building2 size={18} />
              Select Department
            </label>
            <p className="text-xs text-sky-100 mt-1">
              Choose a department to view and manage its job role salary
              structures.
            </p>
          </div>

          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            disabled={loading}
            className="w-full md:max-w-md border border-white/30 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 bg-white shadow-sm focus:outline-none focus:ring-4 focus:ring-white/20 transition-all disabled:opacity-60"
          >
            <option value="">
              {loading ? "Loading departments..." : "Select a department"}
            </option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {!loading && employmentTypes.length === 0 && (
            <p className="text-sm text-amber-100 bg-white/10 border border-white/20 rounded-xl px-4 py-3 mt-4">
              No employment types yet.{" "}
              <button
                onClick={() => navigate("/hr/leave/employment-types")}
                className="font-semibold underline hover:text-white"
              >
                Add employment types
              </button>{" "}
              before adding salaries.
            </p>
          )}
        </div>
      </div>

      {/* Job roles of the selected department */}
      {department && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Briefcase size={18} className="text-sky-600" />
                Job Roles
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Select a job role to configure its salary structure
              </p>
            </div>

            <span className="px-3 py-1.5 rounded-full bg-sky-50 border border-sky-100 text-sky-700 text-xs font-bold">
              {jobRoles.length} Roles
            </span>
          </div>

          {jobRoles.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              This department has no job roles yet. Add them on the
              Departments page.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {jobRoles.map((role) => {
                const count = history.filter(
                  (p) => p.jobRoleId === role.id,
                ).length;

                return (
                  <button
                    key={role.id}
                    onClick={() => openRole(role)}
                    className="flex items-center justify-between gap-3 text-left bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50/60 rounded-xl p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
                  >
                    <div>
                      <p className="font-bold text-slate-800 text-sm group-hover:text-sky-700 transition-colors">
                        {role.jobTitle}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {count
                          ? `${count} salary row(s) configured`
                          : "No salary configured"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${count
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                          }`}
                      >
                        {count ? "Configured" : "Pending"}
                      </span>
                      <ChevronRight
                        size={16}
                        className="text-slate-400 group-hover:text-sky-600 transition-colors"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History size={18} className="text-sky-600" /> Job Role Salary
            History
            <span className="text-xs font-normal text-gray-400">
              {department ? `· ${department.name}` : "· all departments"}
            </span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-sky-700 to-sky-600 text-white text-xs">
                {[
                  { label: "Department", key: "department" },
                  { label: "Job Role", key: "jobRole" },
                  { label: "Employment Type", key: "employmentType" },
                  { label: "Period", key: "period" },
                  { label: "Basic", key: "basic" },
                  { label: "Allowance", key: "allowance" },
                  { label: "Deduction", key: "deduction" },
                  { label: "Total Salary", key: "totalSalary" },
                  { label: "Employees", key: "employees" },
                  { label: "Set By", key: "setBy" },
                  { label: "Last Updated", key: "lastUpdated" },
                  { label: "Actions", key: null },
                ].map((h) => (
                  <th
                    key={h.label}
                    className="px-5 py-3.5 text-left font-semibold whitespace-nowrap"
                  >
                    {h.key ? (
                      <button
                        type="button"
                        onClick={() => handleSort(h.key)}
                        className="inline-flex items-center hover:text-sky-100 transition-colors"
                      >
                        {h.label}
                        {getSortIcon(h.key)}
                      </button>
                    ) : (
                      h.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedHistory.map((p, i) => (
                <tr
                  key={p.id}
                  className={`hover:bg-sky-50/70 transition-colors ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}
                >
                  <td className="px-5 py-3 text-gray-600">
                    {p.departmentName}
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-800">
                    {p.jobRoleTitle}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {p.employmentTypeName}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {periodLabel(p.period)}
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-800 whitespace-nowrap">
                    {money(p.basicSalary)}
                  </td>
                  <td className="px-5 py-3 text-emerald-600 font-semibold whitespace-nowrap">
                    +{money(p.allowance)}
                  </td>
                  <td className="px-5 py-3 text-red-600 font-semibold whitespace-nowrap">
                    -{money(p.deduction)}
                  </td>
                  <td className="px-5 py-3 font-bold text-sky-700 whitespace-nowrap">
                    {money(p.totalSalary)}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {p.employeeCount ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {p.createdByName || "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                    {p.updatedAt
                      ? p.updatedAt.replace("T", " ").slice(0, 16)
                      : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {confirmDeleteId === p.id ? (
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <button
                          onClick={() => deleteHistoryRow(p)}
                          disabled={deletingId === p.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                        >
                          {deletingId === p.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}{" "}
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={deletingId === p.id}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold disabled:opacity-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          onClick={() => editHistoryRow(p)}
                          title="Edit this salary row"
                          className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(p.id)}
                          title="Delete this salary row"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="text-center py-10 text-gray-400"
                  >
                    No job role salaries added yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Assign salaries popup */}
    {activeRole && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <form
          onSubmit={handleSave}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"
        >
          <div className="flex items-center justify-between p-5 bg-gradient-to-r from-sky-700 to-sky-600 text-white rounded-t-2xl">
            <div>
              <h3 className="text-lg font-bold">
                Assign Salaries · {activeRole.jobTitle}
              </h3>
              <p className="text-sky-100 text-xs">
                {department?.name} · applies to every employee with this job
                role and employment type
              </p>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="p-1.5 hover:bg-white/20 rounded-xl"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
                    <th className="text-left px-2 py-2 font-semibold">
                      Job Role
                    </th>
                    <th className="text-left px-2 py-2 font-semibold">
                      Employment Type *
                    </th>
                    <th className="text-left px-2 py-2 font-semibold">
                      Period *
                    </th>
                    <th className="text-left px-2 py-2 font-semibold">
                      Basic *
                    </th>
                    <th className="text-left px-2 py-2 font-semibold">
                      Allowance
                    </th>
                    <th className="text-left px-2 py-2 font-semibold">
                      Deduction
                    </th>
                    <th className="text-right px-2 py-2 font-semibold">
                      Total Salary
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const total = rowTotal(row);
                    return (
                      <tr key={row.key}>
                        <td className="px-2 py-2 font-medium text-slate-800 whitespace-nowrap">
                          {activeRole.jobTitle}
                        </td>
                        <td className="px-2 py-2 min-w-[190px]">
                          <select
                            required
                            value={row.employmentTypeId}
                            onChange={(e) =>
                              updateRow(
                                row.key,
                                "employmentTypeId",
                                e.target.value,
                              )
                            }
                            className={fieldCls}
                          >
                            <option value="">Select</option>
                            {employmentTypes.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2 min-w-[120px]">
                          <select
                            required
                            value={row.period}
                            onChange={(e) =>
                              updateRow(row.key, "period", e.target.value)
                            }
                            className={fieldCls}
                          >
                            {PERIODS.map((p) => (
                              <option key={p.value} value={p.value}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2 min-w-[130px]">
                          <input
                            required
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={row.basicSalary}
                            onChange={(e) =>
                              updateRow(
                                row.key,
                                "basicSalary",
                                e.target.value,
                              )
                            }
                            placeholder="e.g. 100000"
                            className={fieldCls}
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[120px]">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.allowance}
                            onChange={(e) =>
                              updateRow(row.key, "allowance", e.target.value)
                            }
                            placeholder="0"
                            className={fieldCls}
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[120px]">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.deduction}
                            onChange={(e) =>
                              updateRow(row.key, "deduction", e.target.value)
                            }
                            placeholder="0"
                            className={fieldCls}
                          />
                        </td>
                        <td
                          className={`px-2 py-2 text-right font-bold whitespace-nowrap ${total < 0 ? "text-red-600" : "text-sky-700"}`}
                        >
                          {money(total)}
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => removeRow(row.key)}
                            disabled={rows.length === 1}
                            title="Remove row"
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                          >
                            <X size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, newRow()])}
              className="w-full border-2 border-dashed border-sky-200 hover:border-sky-400 hover:bg-sky-50 text-sky-700 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={16} strokeWidth={2.5} /> Add another employment type
            </button>

            <p className="text-xs text-slate-500">
              Total Salary = Basic + Allowance − Deduction. Saving an
              employment type that is already set for this job role updates
              it.
            </p>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {formError}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 p-5 border-t border-slate-200 bg-slate-50/70">
            <button
              type="button"
              onClick={closeModal}
              className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || employmentTypes.length === 0}
              className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all"
            >
              <Save size={16} /> {saving ? "Saving..." : "Save Salaries"}
            </button>
          </div>
        </form>
      </div>
    )}
  </PageLayout>
);
};

export default SalaryAssign;
