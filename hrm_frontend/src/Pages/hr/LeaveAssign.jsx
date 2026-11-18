import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  Search,
  Filter,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { hrApi } from "../../services/api";

// Server errors come back as "400: <reason>"; show just the reason
const errorText = (error, fallback) =>
  (error?.message || fallback).replace(/^\d{3}:\s*/, "");

const PERIODS = [
  { value: "ANNUAL", label: "Annual" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "WEEKLY", label: "Weekly" },
];
const periodLabel = (p) => PERIODS.find((x) => x.value === p)?.label || p;

const newRow = () => ({
  key: `${Date.now()}-${Math.random()}`,
  employmentTypeId: "",
  leaveTypeId: "",
  period: "ANNUAL",
  days: "",
});

// Pre-fills a row from an existing allocation so the edit form opens with its current values
const rowFromAllocation = (a) => ({
  key: `${Date.now()}-${Math.random()}`,
  employmentTypeId:
    a.employmentTypeId != null ? String(a.employmentTypeId) : "",
  leaveTypeId: a.leaveTypeId != null ? String(a.leaveTypeId) : "",
  period: a.period || "ANNUAL",
  days: a.days != null ? String(a.days) : "",
});

const fieldCls =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white transition-colors";

const LeaveAssign = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employmentTypes, setEmploymentTypes] = useState([]);
  const [history, setHistory] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [message, setMessage] = useState("");
  const [allocationToDelete, setAllocationToDelete] = useState(null);

  // popup state
  const [activeRole, setActiveRole] = useState(null);
  const [rows, setRows] = useState([newRow()]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  // set when the popup was opened via the Edit action on a specific allocation row,
  // so Save can update that exact row instead of adding a new one
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // History table controls
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState("departmentName");
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const ROWS_PER_PAGE = 8;

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
      const [deptRes, typeRes, empTypeRes] = await Promise.all([
        hrApi.getDepartments(),
        hrApi.getLeaveTypes(),
        hrApi.getEmploymentTypes(),
      ]);
      setDepartments((deptRes.data || []).filter((d) => d.active !== false));
      setLeaveTypes(typeRes.data || []);
      setEmploymentTypes(empTypeRes.data || []);
    } catch (e) {
      setPageError(errorText(e, "Failed to load departments and leave types"));
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (deptId) => {
    try {
      const res = await hrApi.getLeaveAllocations(deptId || null);
      setHistory(res.data || []);
    } catch (e) {
      setPageError(errorText(e, "Failed to load assigned leaves"));
    }
  };

  const department = useMemo(
    () => departments.find((d) => String(d.id) === String(departmentId)),
    [departments, departmentId],
  );
  const jobRoles = department?.jobRoles || [];

  const openRole = (role) => {
    setActiveRole(role);
    setRows([newRow()]);
    setEditingAllocation(null);
    setFormError("");
  };

  // Opens the same assign popup but pre-filled with one existing allocation's data
  const openEditAllocation = (a) => {
    if (String(a.departmentId) !== String(departmentId))
      setDepartmentId(String(a.departmentId));
    setActiveRole({ id: a.jobRoleId, jobTitle: a.jobRoleTitle });
    setRows([rowFromAllocation(a)]);
    setEditingAllocation(a);
    setFormError("");
  };

  const closeModal = () => {
    if (!saving) {
      setActiveRole(null);
      setEditingAllocation(null);
    }
  };

  const updateRow = (key, field, value) =>
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
  const removeRow = (key) =>
    setRows((prev) =>
      prev.length > 1 ? prev.filter((r) => r.key !== key) : prev,
    );

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFormError("");

      // If editing a row and the employment type / leave type changed, the update-in-place
      // upsert on the backend would leave the original row behind, so remove it first.
      if (editingAllocation) {
        const row = rows[0];
        const changedCombo =
          String(row.employmentTypeId) !==
            String(editingAllocation.employmentTypeId) ||
          String(row.leaveTypeId) !== String(editingAllocation.leaveTypeId);
        if (changedCombo) {
          await hrApi.deleteLeaveAllocation(editingAllocation.id);
        }
      }

      const res = await hrApi.saveLeaveAllocations(
        activeRole.id,
        rows.map((r) => ({
          employmentTypeId: r.employmentTypeId
            ? Number(r.employmentTypeId)
            : null,
          leaveTypeId: r.leaveTypeId ? Number(r.leaveTypeId) : null,
          period: r.period,
          days: r.days === "" ? null : Number(r.days),
        })),
      );
      setActiveRole(null);
      setEditingAllocation(null);
      setMessage(
        `✓ ${editingAllocation ? "Leave updated for" : (res.message || "Leaves assigned") + " to"} ${activeRole.jobTitle}`,
      );
      setTimeout(() => setMessage(""), 3000);
      loadHistory(departmentId);
    } catch (e2) {
      setFormError(errorText(e2, "Failed to assign leaves"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAllocation = async () => {
    if (!allocationToDelete) return;

    const a = allocationToDelete;

    try {
      setDeletingId(a.id);
      setPageError("");

      const res = await hrApi.deleteLeaveAllocation(a.id);

      setMessage(`✓ ${res.message || "Leave entitlement removed"}`);
      setTimeout(() => setMessage(""), 3000);

      setAllocationToDelete(null);
      await loadHistory(departmentId);
    } catch (e) {
      setPageError(errorText(e, "Failed to remove leave entitlement"));
    } finally {
      setDeletingId(null);
    }
  };

  // What this role already has, shown in the popup so HR doesn't re-enter it by mistake
  const roleAssigned = activeRole
    ? history.filter((a) => a.jobRoleId === activeRole.id)
    : [];

  // Search and filter history records
  const filteredHistory = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return history.filter((a) => {
      const matchesSearch =
        !search ||
        [
          a.departmentName,
          a.jobRoleTitle,
          a.employmentTypeName,
          a.leaveTypeName,
          a.createdByName,
          periodLabel(a.period),
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(search),
        );

      const matchesPeriod = periodFilter === "ALL" || a.period === periodFilter;

      return matchesSearch && matchesPeriod;
    });
  }, [history, searchTerm, periodFilter]);

  // Sort filtered records
  const sortedHistory = useMemo(() => {
    return [...filteredHistory].sort((a, b) => {
      const aValue = a[sortKey] ?? "";
      const bValue = b[sortKey] ?? "";

      const comparison =
        sortKey === "days"
          ? Number(aValue) - Number(bValue)
          : String(aValue).localeCompare(String(bValue), undefined, {
              numeric: true,
              sensitivity: "base",
            });

      return sortDir === "asc" ? comparison : -comparison;
    });
  }, [filteredHistory, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(sortedHistory.length / ROWS_PER_PAGE),
  );

  const paginatedHistory = sortedHistory.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE,
  );

  // Reset pagination when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, periodFilter, departmentId]);

  // Column sorting
  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  if (!user) return null;

  return (
    <PageLayout
      role="hr"
      activePage="Leave Management"
      title="Assign Leaves for Job Roles"
      subtitle="Set how much of each leave type a job role gets"
      actions={
        <button
          onClick={() => navigate("/hr/leave")}
          className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <ArrowLeft size={16} /> Back to Leave Management
        </button>
      }
    >
      <div className="space-y-6">
        {message && (
          <div className="p-4 rounded-xl text-emerald-700 bg-emerald-50 border border-emerald-200 text-sm font-medium">
            {message}
          </div>
        )}
        {pageError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {pageError}
          </div>
        )}

        {/* Department picker */}
        <div className="bg-gradient-to-r from-sky-700 to-sky-600 rounded-2xl shadow-md border border-sky-700 p-5">
          <label className="block text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Building2 size={16} className="text-white" /> Department
          </label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            disabled={loading}
            className="w-full md:w-96 border border-white/30 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-white/50 bg-white shadow-sm"
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
          {!loading && leaveTypes.length === 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mt-4">
              No leave types yet.{" "}
              <button
                onClick={() => navigate("/hr/leave/types")}
                className="font-semibold underline"
              >
                Add leave types
              </button>{" "}
              before assigning leaves.
            </p>
          )}
          {!loading && employmentTypes.length === 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mt-4">
              No employment types yet.{" "}
              <button
                onClick={() => navigate("/hr/leave/employment-types")}
                className="font-semibold underline"
              >
                Add employment types
              </button>{" "}
              before assigning leaves.
            </p>
          )}
        </div>

        {/* Job roles of the selected department */}
        {department && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <Briefcase size={18} className="text-sky-600" /> Job roles in{" "}
              {department.name}
            </h2>
            {jobRoles.length === 0 ? (
              <p className="text-sm text-slate-500">
                This department has no job roles yet. Add them on the
                Departments page.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {jobRoles.map((role) => {
                  const count = history.filter(
                    (a) => a.jobRoleId === role.id,
                  ).length;
                  return (
                    <button
                      key={role.id}
                      onClick={() => openRole(role)}
                      className="flex items-center justify-between text-left bg-white border border-sky-100 hover:border-sky-400 hover:bg-sky-50 rounded-xl px-4 py-4 shadow-sm hover:shadow-md transition-all group"
                    >
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">
                          {role.jobTitle}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {count
                            ? `${count} leave(s) assigned`
                            : "No leaves assigned"}
                        </p>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-slate-400 group-hover:text-sky-600"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* History */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
          <div className="px-5 py-5 border-b border-slate-200 bg-slate-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <History size={18} className="text-sky-600" />
                  Assigned Leave History
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {department ? department.name : "All departments"} ·{" "}
                  {sortedHistory.length} record(s) found
                </p>
              </div>

              <span className="inline-flex items-center rounded-full bg-sky-50 text-sky-700 px-3 py-1.5 text-xs font-semibold w-fit">
                {history.length} Total Allocations
              </span>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <div className="relative flex-1">
                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search department, job role, leave type..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
                />
              </div>

              <div className="relative sm:w-48">
                <Filter
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value)}
                  className="w-full appearance-none pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                >
                  <option value="ALL">All Periods</option>
                  <option value="ANNUAL">Annual</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </div>

              {(searchTerm || periodFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setPeriodFilter("ALL");
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-sky-600 to-sky-700 text-white text-xs border-b border-sky-500">
                  {[
                    { label: "Department", key: "departmentName" },
                    { label: "Job Role", key: "jobRoleTitle" },
                    { label: "Employment Type", key: "employmentTypeName" },
                    { label: "Leave Type", key: "leaveTypeName" },
                    { label: "Period", key: "period" },
                    { label: "No. of Leaves", key: "days" },
                    { label: "Assigned By", key: "createdByName" },
                    { label: "Last Updated", key: "updatedAt" },
                    { label: "Actions", key: null },
                  ].map((column) => (
                    <th
                      key={column.label}
                      className="px-5 py-3.5 text-left font-semibold whitespace-nowrap"
                    >
                      {column.key ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          className="inline-flex items-center gap-1.5 hover:text-sky-100 transition-colors"
                        >
                          {column.label}
                          {sortKey === column.key ? (
                            sortDir === "asc" ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )
                          ) : (
                            <ArrowUpDown size={13} className="opacity-40" />
                          )}
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedHistory.map((a, i) => (
                  <tr
                    key={a.id}
                    className={`hover:bg-sky-50/60 transition-colors ${i % 2 === 1 ? "bg-slate-50/40" : "bg-white"}`}
                  >
                    <td className="px-5 py-3 text-gray-600">
                      {a.departmentName}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {a.jobRoleTitle}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {a.employmentTypeName}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {a.leaveTypeName}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {periodLabel(a.period)}
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-800">
                      {a.days}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {a.createdByName || "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                      {a.updatedAt
                        ? a.updatedAt.replace("T", " ").slice(0, 16)
                        : "—"}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditAllocation(a)}
                          title="Edit"
                          className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllocationToDelete(a)}
                          disabled={deletingId === a.id}
                          title="Delete"
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedHistory.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-14 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mb-3">
                          <History size={25} className="text-sky-600" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">
                          {searchTerm || periodFilter !== "ALL"
                            ? "No matching allocations found"
                            : "No leaves assigned yet"}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {searchTerm || periodFilter !== "ALL"
                            ? "Try changing your search or filter."
                            : "Assigned leave allocations will appear here."}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {sortedHistory.length > ROWS_PER_PAGE && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-500">
                Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}–
                {Math.min(currentPage * ROWS_PER_PAGE, sortedHistory.length)} of{" "}
                {sortedHistory.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-slate-600 px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assign popup */}
      {activeRole && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-5 bg-sky-700 text-white rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold">
                  {editingAllocation ? "Edit Leave" : "Assign Leaves"} ·{" "}
                  {activeRole.jobTitle}
                </h3>
                <p className="text-white/80 text-xs">{department?.name}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 hover:bg-white/20 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 bg-slate-50/70">
              {roleAssigned.length > 0 && (
                <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <span className="font-semibold text-slate-700">
                    Already assigned:{" "}
                  </span>
                  {roleAssigned
                    .map(
                      (a) =>
                        `${a.leaveTypeName} (${a.employmentTypeName}) ${a.days}/${periodLabel(a.period).toLowerCase()}`,
                    )
                    .join(" · ")}
                  <span className="block mt-1 text-slate-500">
                    Assigning the same employment type and leave type again
                    updates it.
                  </span>
                </div>
              )}

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
                        Leave Type *
                      </th>
                      <th className="text-left px-2 py-2 font-semibold">
                        Period *
                      </th>
                      <th className="text-left px-2 py-2 font-semibold">
                        No. of Leaves *
                      </th>
                      {!editingAllocation && <th className="w-10" />}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.key}>
                        <td className="px-2 py-2 font-medium text-slate-800 whitespace-nowrap">
                          {activeRole.jobTitle}
                        </td>
                        <td className="px-2 py-2 min-w-[210px]">
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
                        <td className="px-2 py-2 min-w-[170px]">
                          <select
                            required
                            value={row.leaveTypeId}
                            onChange={(e) =>
                              updateRow(row.key, "leaveTypeId", e.target.value)
                            }
                            className={fieldCls}
                          >
                            <option value="">Select</option>
                            {leaveTypes.map((t) => (
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
                        <td className="px-2 py-2 min-w-[110px]">
                          <input
                            required
                            type="number"
                            min="0.5"
                            max="366"
                            step="0.5"
                            value={row.days}
                            onChange={(e) =>
                              updateRow(row.key, "days", e.target.value)
                            }
                            placeholder="e.g. 14"
                            className={fieldCls}
                          />
                        </td>
                        {!editingAllocation && (
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => removeRow(row.key)}
                              disabled={rows.length === 1}
                              title="Remove row"
                              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                            >
                              <X size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!editingAllocation && (
                <button
                  type="button"
                  onClick={() => setRows((prev) => [...prev, newRow()])}
                  className="w-full border-2 border-dashed border-sky-200 hover:border-sky-400 hover:bg-sky-50 text-sky-700 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus size={16} strokeWidth={2.5} /> Add another row
                </button>
              )}

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  saving ||
                  leaveTypes.length === 0 ||
                  employmentTypes.length === 0
                }
                className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors"
              >
                <Save size={16} />{" "}
                {saving
                  ? "Saving..."
                  : editingAllocation
                    ? "Update Leave"
                    : "Assign Leaves"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {allocationToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-4">
                <Trash2 size={26} className="text-red-600" />
              </div>

              <h3 className="text-lg font-bold text-slate-800">
                Remove Leave Allocation?
              </h3>

              <p className="text-sm text-slate-500 mt-2">
                Are you sure you want to remove
                <span className="font-semibold text-slate-700">
                  {" "}
                  {allocationToDelete.leaveTypeName}
                </span>{" "}
                for
                <span className="font-semibold text-slate-700">
                  {" "}
                  {allocationToDelete.employmentTypeName}
                </span>{" "}
                from
                <span className="font-semibold text-slate-700">
                  {" "}
                  {allocationToDelete.jobRoleTitle}
                </span>
                ?
              </p>

              <p className="text-xs text-red-500 mt-3">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-center gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setAllocationToDelete(null)}
                disabled={deletingId !== null}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteAllocation}
                disabled={deletingId !== null}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-sm disabled:opacity-60 transition-colors"
              >
                {deletingId !== null ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default LeaveAssign;
