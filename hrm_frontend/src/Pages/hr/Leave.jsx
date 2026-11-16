import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  X,
  Plus,
  Briefcase,
  Tag,
  Users,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ClipboardList,
  CalendarClock,
  CalendarCheck,
  CalendarX,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { NameListModal } from "../../components/NameListModal";
import { hrApi } from "../../services/api";

const LeaveManagement = ({ role = "hr" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const handledNavKey = useRef(null);
  const reloadedForNav = useRef(null);
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewingRequest, setViewingRequest] = useState(null);
  const [showLeaveTypes, setShowLeaveTypes] = useState(false);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (s) {
      const u = JSON.parse(s);
      const allowed =
        role === "admin"
          ? u.role === "ADMIN"
          : u.role === "HR_MANAGER" || u.role === "ADMIN";
      if (!allowed) {
        navigate("/unauthorized");
        return;
      }
      setUser(u);
    } else navigate("/login");
  }, [navigate, role]);

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [actingId, setActingId] = useState(null);
  // Leave being rejected — HR must give a comment, which the employee sees on their Leave page
  const [rejecting, setRejecting] = useState(null);
  const [rejectComment, setRejectComment] = useState("");
  const [rejectError, setRejectError] = useState("");

  // API rows (Employee_Backend LeaveApplicationDTO) -> the shape this table renders
  const toRow = (l) => ({
    id: l.id,
    empId: l.employeeIdNumber || "—",
    name: l.employeeName || "—",
    department: l.departmentName || "—",
    leaveType: l.leaveTypeName || "—",
    startDate: l.startDate,
    endDate: l.endDate,
    days: l.numberOfDays,
    reason: l.reason || "",
    appliedOn: l.createdAt ? l.createdAt.split("T")[0] : "—",
    status: l.status
      ? l.status.charAt(0) + l.status.slice(1).toLowerCase()
      : "",
    rejectionReason: l.rejectionReason,
    reviewedBy: l.approvedByName,
  });

  const flash = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 3500);
  };
  // Server errors come back as "400: <reason>"; show just the reason
  const errorText = (e, fallback) =>
    (e?.message || fallback).replace(/^\d{3}:\s*/, "");

  const loadLeaves = async () => {
    try {
      setLoading(true);
      const res = await hrApi.getLeaveRequests();
      setLeaveRequests((res.data || []).map(toRow));
    } catch (e) {
      flash("✗ " + errorText(e, "Failed to load leave requests"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadLeaves();
  }, [user]);

  // Arriving from a notification (/hr/leave?view=<id>): open that request's form, so HR can approve or reject it.
  useEffect(() => {
    const viewId = new URLSearchParams(location.search).get("view");
    if (!user || !viewId || loading || handledNavKey.current === location.key)
      return;
    const found = leaveRequests.find((r) => String(r.id) === viewId);
    if (found) {
      handledNavKey.current = location.key;
      setViewingRequest(found);
    } else if (reloadedForNav.current !== location.key) {
      reloadedForNav.current = location.key; // brand-new request: refresh the list once and look again
      loadLeaves();
    } else {
      handledNavKey.current = location.key;
      flash("✗ That leave request could not be found");
    }
  }, [user, loading, leaveRequests, location.key, location.search]);

  const stats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter((r) => r.status === "Pending").length,
    approved: leaveRequests.filter((r) => r.status === "Approved").length,
    rejected: leaveRequests.filter((r) => r.status === "Rejected").length,
  };

  const filtered = leaveRequests.filter(
    (r) =>
      (r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.empId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.leaveType.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterStatus === "all" ||
        r.status.toLowerCase() === filterStatus.toLowerCase()),
  );

  // SORTING
  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedFiltered = [...filtered].sort((a, b) => {
    if (!sortKey) return 0;

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

  const handleApprove = async (id) => {
    try {
      setActingId(id);
      const res = await hrApi.approveLeave(id);
      setLeaveRequests((prev) =>
        prev.map((r) => (r.id === id ? toRow(res.data) : r)),
      );
      setViewingRequest(null);
      flash("✓ Leave approved");
    } catch (e) {
      flash("✗ " + errorText(e, "Failed to approve leave"));
    } finally {
      setActingId(null);
    }
  };

  const openReject = (r) => {
    setRejecting(r);
    setRejectComment("");
    setRejectError("");
  };

  const handleReject = async (e) => {
    e.preventDefault();
    const comment = rejectComment.trim();
    if (!comment) {
      setRejectError("Please add a comment explaining the rejection");
      return;
    }
    const id = rejecting.id;
    try {
      setActingId(id);
      const res = await hrApi.rejectLeave(id, comment);
      setLeaveRequests((prev) =>
        prev.map((r) => (r.id === id ? toRow(res.data) : r)),
      );
      setRejecting(null);
      setViewingRequest(null);
      flash("✓ Leave rejected");
    } catch (err) {
      setRejectError(errorText(err, "Failed to reject leave"));
    } finally {
      setActingId(null);
    }
  };

  const isHR = role === "hr";

  const statusBadge = (s) =>
    ({
      Approved: "bg-emerald-100 text-emerald-700",
      Rejected: "bg-red-100 text-red-700",
      Pending: "bg-amber-100 text-amber-700",
    })[s] || "bg-slate-100 text-slate-600";

  const accentFrom = isHR
    ? "from-primary-500 to-primary-700"
    : "from-indigo-500 to-violet-600";

  if (!user) return null;
  return (
    <PageLayout
      role={role}
      activePage={role === "admin" ? "Leave" : "Leave Management"}
      title={role === "admin" ? "System-Wide Leave" : "Leave Management"}
      subtitle="Approve and manage employee leave requests"
      actions={
        role === "hr" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLeaveTypes(true)}
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors duration-200"
            >
              <Plus size={17} strokeWidth={2.5} /> Add Leave Types
            </button>
            <button
              onClick={() => navigate("/hr/leave/assign")}
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors duration-200"
            >
              <Briefcase size={17} strokeWidth={2.5} /> Assign Leaves for Job
              Roles
            </button>
          </div>
        )
      }
    >
      <div className="space-y-6">
        {message && (
          <div
            className={`p-4 rounded-xl text-white text-sm font-medium ${message.startsWith("✓") ? "bg-emerald-500" : "bg-red-500"}`}
          >
            {message}
          </div>
        )}

        {/* Leave Management Introduction */}
        {isHR && (
          <div className="relative overflow-hidden rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-100 via-primary-50 to-white p-6 sm:p-7">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-200/40" />
            <div className="absolute -bottom-12 right-28 h-32 w-32 rounded-full bg-primary-100/70" />

            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-sm">
                  <FileText size={27} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                      Leave Management
                    </h2>
                    <span className="rounded-full border border-primary-200 bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
                      HR Workspace
                    </span>
                  </div>

                  <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
                    Review employee leave requests, manage approvals, and keep
                    track of leave activities across your organization.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3 rounded-xl border border-primary-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Total Requests
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {stats.total}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUMMARY METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              label: "Total Requests",
              value: stats.total,
              description: "All submitted leave requests",
              icon: <ClipboardList size={21} />,
              filter: "all",
              color: "bg-primary-600",
            },
            {
              label: "Pending Requests",
              value: stats.pending,
              description: "Waiting for HR approval",
              icon: <CalendarClock size={21} />,
              filter: "pending",
              color: "bg-primary-500",
            },
            {
              label: "Approved Requests",
              value: stats.approved,
              description: "Successfully approved",
              icon: <CalendarCheck size={21} />,
              filter: "approved",
              color: "bg-primary-700",
            },
            {
              label: "Rejected Requests",
              value: stats.rejected,
              description: "Requests not approved",
              icon: <CalendarX size={21} />,
              filter: "rejected",
              color: "bg-primary-800",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={
                isHR
                  ? `${s.color} relative overflow-hidden rounded-2xl p-5 text-white shadow-sm transition-all duration-200 hover:shadow-md`
                  : `bg-gradient-to-br ${
                      s.filter === "all"
                        ? "from-indigo-400 to-violet-500"
                        : s.filter === "pending"
                          ? "from-amber-400 to-orange-500"
                          : s.filter === "approved"
                            ? "from-emerald-400 to-teal-500"
                            : "from-red-400 to-rose-500"
                    } p-6 rounded-2xl text-white hover:-translate-y-1 transition-all duration-300`
              }
            >
              {isHR ? (
                <button
                  type="button"
                  onClick={() => setFilterStatus(s.filter)}
                  className="relative z-10 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-xl"
                  title={`Show ${s.label.toLowerCase()}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
                        {s.label}
                      </p>
                      <p className="mt-2 text-3xl sm:text-4xl font-bold text-white">
                        {s.value}
                      </p>
                      <p className="mt-1 text-xs text-white/75">
                        {s.description}
                      </p>
                    </div>

                    <div className="h-11 w-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center text-white">
                      {s.icon}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-3">
                    <span className="text-xs font-semibold text-white/90">
                      {filterStatus === s.filter
                        ? "Currently viewing"
                        : "View requests"}
                    </span>
                    <span className="text-lg text-white/80">→</span>
                  </div>
                </button>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm mb-2 text-white/80">{s.label}</p>
                    <p className="text-3xl sm:text-4xl font-bold text-white">
                      {s.value}
                    </p>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center text-white">
                    {s.icon}
                  </div>
                </div>
              )}

              {isHR && (
                <>
                  <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 pointer-events-none" />
                  <div className="absolute -right-2 -bottom-12 h-24 w-24 rounded-full bg-white/5 pointer-events-none" />
                </>
              )}
            </div>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Search and Filter
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Find leave requests by employee details or request status.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, ID, department, or leave type..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"
              />
            </div>

            <div className="relative md:w-52">
              <Filter
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full appearance-none pl-10 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
        {/* Table */}
        <div
          className={`bg-white overflow-hidden ${
            isHR
              ? "rounded-2xl border border-slate-200 shadow-sm"
              : "rounded-2xl shadow-sm border border-slate-100"
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className={`text-xs ${
                    isHR
                      ? "bg-primary-50 border-b border-primary-100 text-primary-800"
                      : `bg-gradient-to-r ${accentFrom} text-white`
                  }`}
                >
                  {[
                    { label: "Emp ID", key: "empId" },
                    { label: "Employee", key: "name" },
                    { label: "Dept", key: "department" },
                    { label: "Leave Type", key: "leaveType" },
                    { label: "Duration", key: "startDate" },
                    { label: "Days", key: "days" },
                    { label: "Applied", key: "appliedOn" },
                    { label: "Status", key: "status" },
                    { label: "Actions", key: null },
                  ].map((column) => (
                    <th
                      key={column.label}
                      className="px-5 py-4 text-left font-semibold whitespace-nowrap"
                    >
                      {column.key ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          className={`inline-flex items-center gap-1.5 transition-colors ${
                            isHR
                              ? "hover:text-primary-600"
                              : "hover:text-white/70"
                          }`}
                        >
                          {column.label}

                          {sortKey === column.key ? (
                            sortDir === "asc" ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )
                          ) : (
                            <ArrowUpDown size={13} className="opacity-50" />
                          )}
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody
                className={`divide-y ${isHR ? "divide-slate-100" : "divide-slate-50"}`}
              >
               {sortedFiltered.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`transition-colors ${
                      isHR
                        ? `hover:bg-primary-50/50 ${i % 2 === 1 ? "bg-slate-50/40" : "bg-white"}`
                        : `hover:bg-teal-50/40 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`
                    }`}
                  >
                    <td className="px-5 py-3.5 font-mono font-semibold text-slate-700">
                      {r.empId}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      {r.name}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {r.department}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {r.leaveType}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {r.startDate} → {r.endDate}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">
                      {r.days}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {r.appliedOn}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(r.status)}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setViewingRequest(r)}
                          className={`flex items-center gap-1 font-semibold text-xs transition-colors ${
                            isHR
                              ? "text-primary-600 hover:text-primary-800"
                              : "text-teal-600 hover:text-teal-800"
                          }`}
                        >
                          <Eye size={13} /> View
                        </button>
                        {r.status === "Pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(r.id)}
                              disabled={actingId === r.id}
                              className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-semibold text-xs disabled:opacity-50"
                            >
                              <CheckCircle size={13} /> Approve
                            </button>
                            <button
                              onClick={() => openReject(r)}
                              disabled={actingId === r.id}
                              className="flex items-center gap-1 text-red-600 hover:text-red-800 font-semibold text-xs disabled:opacity-50"
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {loading && (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-10 text-slate-400"
                    >
                      Loading leave requests…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-10 text-slate-400"
                    >
                      No leave requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {viewingRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`bg-white shadow-2xl w-full max-w-xl ${
              isHR ? "rounded-2xl border border-slate-200" : "rounded-2xl"
            }`}
          >
            <div
              className={`flex items-center justify-between p-6 ${
                isHR ? "bg-primary-600" : `bg-gradient-to-r ${accentFrom}`
              } text-white rounded-t-2xl`}
            >
              <h3 className="text-xl font-bold">Leave Request Details</h3>
              <button
                onClick={() => setViewingRequest(null)}
                className="p-1.5 hover:bg-white/20 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Employee ID", viewingRequest.empId],
                  ["Name", viewingRequest.name],
                  ["Department", viewingRequest.department],
                  ["Leave Type", viewingRequest.leaveType],
                  ["Start Date", viewingRequest.startDate],
                  ["End Date", viewingRequest.endDate],
                  ["Total Days", `${viewingRequest.days} day(s)`],
                  ["Applied On", viewingRequest.appliedOn],
                ].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-xs text-slate-400 mb-0.5">{l}</p>
                    <p className="font-semibold text-slate-800">{v}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-graygray-400 mb-1">Reason</p>
                <p className="bg-gray-50 p-3 rounded-xl text-sm text-slate-700">
                  {viewingRequest.reason}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Status</p>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(viewingRequest.status)}`}
                >
                  {viewingRequest.status}
                </span>
                {viewingRequest.reviewedBy &&
                  viewingRequest.status !== "Pending" && (
                    <span className="ml-2 text-xs text-slate-400">
                      by {viewingRequest.reviewedBy}
                    </span>
                  )}
              </div>
              {viewingRequest.status === "Rejected" &&
                viewingRequest.rejectionReason && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">
                      Rejection Comment
                    </p>
                    <p className="bg-red-50 p-3 rounded-xl text-sm text-red-700">
                      {viewingRequest.rejectionReason}
                    </p>
                  </div>
                )}
              {viewingRequest.status === "Pending" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(viewingRequest.id)}
                    disabled={actingId === viewingRequest.id}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={15} /> Approve
                  </button>
                  <button
                    onClick={() => openReject(viewingRequest)}
                    disabled={actingId === viewingRequest.id}
                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle size={15} /> Reject
                  </button>
                </div>
              )}
              <button
                onClick={() => setViewingRequest(null)}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                  isHR
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject — comment is required and shown to the employee */}
      {rejecting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <form
            onSubmit={handleReject}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
          >
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-t-2xl">
              <h3 className="text-xl font-bold">Reject Leave Request</h3>
              <button
                type="button"
                onClick={() => setRejecting(null)}
                className="p-1.5 hover:bg-white/20 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-800">
                  {rejecting.name}
                </span>{" "}
                · {rejecting.leaveType} · {rejecting.startDate} →{" "}
                {rejecting.endDate} ({rejecting.days} day(s))
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Comment *
                </label>
                <textarea
                  value={rejectComment}
                  onChange={(e) => {
                    setRejectComment(e.target.value);
                    setRejectError("");
                  }}
                  rows={4}
                  autoFocus
                  placeholder="Tell the employee why this request is rejected…"
                  className={`w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 ${
                    isHR
                      ? "border border-slate-200 bg-slate-50 text-slate-700"
                      : "border border-gray-200 bg-gray-50 text-gray-700"
                  }`}
                />
              </div>
              {rejectError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {rejectError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={actingId === rejecting.id}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle size={15} />{" "}
                  {actingId === rejecting.id ? "Rejecting…" : "Reject Leave"}
                </button>
                <button
                  type="button"
                  onClick={() => setRejecting(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-slate-700 py-3 rounded-xl font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Add / manage leave types — centered popup with blurred backdrop, like Add Employment Types */}
      {role === "hr" && (
        <NameListModal
          open={showLeaveTypes}
          onClose={() => setShowLeaveTypes(false)}
          title="Add Leave Types"
          subtitle="Define the kinds of leave your company offers"
          heading="Leave Types"
          hint="Add as many as you need, e.g. Sick Leave, Annual Leave"
          placeholder="Leave type, e.g. Sick Leave"
          addLabel="Add another leave"
          saveLabel="Save Leave Types"
          existingLabel="Existing leave types"
          emptyLabel="No leave types added yet"
          icon={Tag}
          load={hrApi.getLeaveTypes}
          save={hrApi.createLeaveTypes}
          onUpdate={hrApi.updateLeaveType}
          onDelete={hrApi.deleteLeaveType}
        />
      )}
    </PageLayout>
  );
};

// Export both HR and Admin leave pages from this shared component
export const HRLeave = () => <LeaveManagement role="hr" />;
export const AdminLeave = () => <LeaveManagement role="admin" />;
export default HRLeave;
