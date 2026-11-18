import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Check,
  Ban,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  SlidersHorizontal,
  Eye,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { hrApi } from "../../services/api";

// Server errors come back as "400: <reason>"; show just the reason
const errorText = (error, fallback) =>
  (error?.message || fallback).replace(/^\d{3}:\s*/, "");
const money = (v) =>
  `Rs.${(Number(v) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const formatDate = (dt) => (dt ? dt.replace("T", " ").slice(0, 16) : "—");

const STATUS_STYLE = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};
const STATUS_ICON = {
  PENDING: <Clock size={12} />,
  APPROVED: <CheckCircle size={12} />,
  REJECTED: <XCircle size={12} />,
};
const statusLabel = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : "");

/** Opens a PDF blob in a new tab (falls back to downloading it if pop-ups are blocked). */
const openPdf = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "document.pdf";
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

/**
 * HR page listing employees' allowance requests (stored in hrm_db_employee.allowance_requests).
 * Reject needs a comment, which the employee sees in their history. Approving adds the allowance
 * to the employee's pay automatically; a shortcut then opens Individual Allowance & Deduction.
 */
const HRAllowanceRequests = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [viewing, setViewing] = useState(null); // request whose form is open
  const handledNavKey = useRef(null);
  const reloadedForNav = useRef(null);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState(null); // { text, email } after an approval
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [searchTerm, setSearchTerm] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null); // request being rejected
  const [rejectComment, setRejectComment] = useState("");
  const [rejectError, setRejectError] = useState("");

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await hrApi.getAllowanceRequests();
      setRequests(res.data || []);
    } catch (e) {
      setError(errorText(e, "Failed to load allowance requests"));
    } finally {
      setLoading(false);
    }
  };

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
    load();
  }, [navigate]);

  // Arriving from a notification (…/allowance-requests?view=<id>): open that request's form for review.
  useEffect(() => {
    const viewId = new URLSearchParams(location.search).get("view");
    if (!user || !viewId || loading || handledNavKey.current === location.key)
      return;
    const found = requests.find((r) => String(r.id) === viewId);
    if (found) {
      handledNavKey.current = location.key;
      setViewing(found);
      if (found.status !== "PENDING") setStatusFilter("ALL");
    } else if (reloadedForNav.current !== location.key) {
      reloadedForNav.current = location.key; // brand-new request: refresh once and look again
      load();
    } else {
      handledNavKey.current = location.key;
      setError("That allowance request could not be found");
    }
  }, [user, loading, requests, location.key, location.search]);

  const counts = useMemo(
    () => ({
      ALL: requests.length,
      PENDING: requests.filter((r) => r.status === "PENDING").length,
      APPROVED: requests.filter((r) => r.status === "APPROVED").length,
      REJECTED: requests.filter((r) => r.status === "REJECTED").length,
    }),
    [requests],
  );

  const filtered = requests.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    const q = searchTerm.trim().toLowerCase();
    return (
      !q ||
      [r.employeeName, r.employeeCode, r.name, r.description].some((v) =>
        (v || "").toLowerCase().includes(q),
      )
    );
  });

  const sortedRequests = useMemo(() => {
    if (!sortConfig.key) return filtered;

    return [...filtered].sort((a, b) => {
      let valueA;
      let valueB;

      switch (sortConfig.key) {
        case "employee":
          valueA = a.employeeName || a.employeeEmail || "";
          valueB = b.employeeName || b.employeeEmail || "";
          break;

        case "allowance":
          valueA = a.name || "";
          valueB = b.name || "";
          break;

        case "amount":
          valueA = Number(a.amount) || 0;
          valueB = Number(b.amount) || 0;
          break;

        case "description":
          valueA = a.description || "";
          valueB = b.description || "";
          break;

        case "requestedOn":
          valueA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          valueB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;

        case "status":
          valueA = a.status || "";
          valueB = b.status || "";
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
  }, [filtered, sortConfig]);

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

  const viewingNow = viewing
    ? requests.find((r) => r.id === viewing.id) || viewing
    : null;

  const viewDocument = async (r) => {
    try {
      setError("");
      openPdf(await hrApi.getAllowanceDocument(r.id), r.documentName);
    } catch (e) {
      setError(errorText(e, "Could not open the document"));
    }
  };

  const announce = (request) => {
    setMessage({
      text: `✓ ${money(request.amount)} "${request.name}" added to ${request.employeeName || request.employeeEmail}'s pay`,
      email: request.employeeEmail,
    });
  };

  const approve = async (r) => {
    try {
      setBusyId(r.id);
      setError("");
      const res = await hrApi.approveAllowanceRequest(r.id, null);
      await load();
      announce(res.data || r);
    } catch (e) {
      setError(errorText(e, "Failed to approve the request"));
      load();
    } finally {
      setBusyId(null);
    }
  };

  // Approved requests that were never added to the employee's pay (approved before this was automatic)
  const addToPay = async (r) => {
    try {
      setBusyId(r.id);
      setError("");
      const res = await hrApi.addAllowanceToPay(r.id);
      await load();
      announce(res.data || r);
    } catch (e) {
      setError(
        errorText(e, "Failed to add the allowance to the employee's pay"),
      );
    } finally {
      setBusyId(null);
    }
  };

  const openReject = (r) => {
    setRejecting(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.querySelector("main")?.scrollTo?.({ top: 0, behavior: "smooth" });
    setRejectComment("");
    setRejectError("");
  };

  const confirmReject = async (e) => {
    e.preventDefault();
    if (!rejectComment.trim()) {
      setRejectError("Enter a comment explaining why the request is rejected");
      return;
    }
    try {
      setBusyId(rejecting.id);
      setRejectError("");
      await hrApi.rejectAllowanceRequest(rejecting.id, rejectComment.trim());
      setRejecting(null);
      load();
    } catch (e2) {
      setRejectError(errorText(e2, "Failed to reject the request"));
    } finally {
      setBusyId(null);
    }
  };

  if (!user) return null;

  return (
    <PageLayout
      role="hr"
      activePage="Payroll"
      title="Allowance Requests"
      subtitle="Requests employees sent with a supporting PDF · approving adds the allowance to the employee's pay automatically"
      actions={
        <button
          onClick={() => navigate("/hr/payslip")}
          className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <ArrowLeft size={16} /> Back to Payroll
        </button>
      }
    >
      <div className="space-y-6">
        {message && (
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 flex flex-wrap items-center justify-between gap-3">
            <span>{message.text}</span>
            <button
              onClick={() =>
                navigate("/hr/payroll/individual-allowance", {
                  state: { email: message.email },
                })
              }
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <SlidersHorizontal size={14} /> Open Individual Allowance &
              Deduction
            </button>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Reject comment (inline, no popup) */}
        {rejecting && (
          <form
            onSubmit={confirmReject}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow duration-200"
          >
            <h2 className="text-base font-bold text-slate-800">
              Reject allowance request
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              {rejecting.employeeName} · {rejecting.name} ·{" "}
              {money(rejecting.amount)}
            </p>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Comment for the employee *
            </label>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows="3"
              maxLength={1000}
              autoFocus
              placeholder="Why is this request rejected?"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 bg-slate-50 resize-none"
            />
            {rejectError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mt-3">
                {rejectError}
              </div>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setRejecting(null)}
                disabled={busyId === rejecting.id}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyId === rejecting.id}
                className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                <Ban size={15} />{" "}
                {busyId === rejecting.id ? "Rejecting..." : "Reject Request"}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {["PENDING", "APPROVED", "REJECTED", "ALL"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  statusFilter === s
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                }`}
              >
                {s === "ALL" ? "All" : statusLabel(s)} ({counts[s]})
              </button>
            ))}
          </div>
          <div className="relative md:w-80">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employee or allowance…"
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 focus:bg-white bg-slate-50 transition-all"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-sky-600 to-sky-700 text-white text-xs">
                  {[
                    { label: "Employee", key: "employee" },
                    { label: "Allowance", key: "allowance" },
                    { label: "Amount", key: "amount" },
                    { label: "Description", key: "description" },
                    { label: "Requested On", key: "requestedOn" },
                    { label: "Document", key: null },
                    { label: "Status", key: "status" },
                    { label: "Actions", key: null },
                  ].map((h) => (
                    <th
                      key={h.label}
                      className="px-4 py-3.5 text-left font-semibold whitespace-nowrap"
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
              {sortedRequests.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`align-top hover:bg-sky-50/70 transition-colors ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 whitespace-nowrap">
                        {r.employeeName || r.employeeEmail}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">
                        {r.employeeCode}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {r.name}
                    </td>
                    <td className="px-4 py-3 font-bold text-sky-700 whitespace-nowrap">
                      {money(r.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[260px]">
                      <p className="line-clamp-3" title={r.description}>
                        {r.description}
                      </p>
                      {r.status !== "PENDING" && (
                        <p
                          className={`text-xs mt-1 ${r.status === "REJECTED" ? "text-red-600" : "text-gray-400"}`}
                        >
                          {r.reviewComment ? `HR: ${r.reviewComment}` : ""}
                          {r.reviewedByName
                            ? ` (${r.reviewedByName}, ${formatDate(r.reviewedAt)})`
                            : ""}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => viewDocument(r)}
                        title={r.documentName}
                        className="inline-flex items-center gap-1 bg-sky-50 hover:bg-sky-100 text-sky-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <FileText size={13} /> View PDF
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[r.status] || ""}`}
                      >
                        {STATUS_ICON[r.status]} {statusLabel(r.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "PENDING" ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setViewing(r)}
                            title="View request form"
                            className="inline-flex items-center gap-1 bg-sky-50 hover:bg-sky-100 text-sky-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Eye size={13} /> View
                          </button>
                          <button
                            onClick={() => approve(r)}
                            disabled={busyId === r.id}
                            className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Check size={13} /> Approve
                          </button>
                          <button
                            onClick={() => openReject(r)}
                            disabled={busyId === r.id}
                            className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Ban size={13} /> Reject
                          </button>
                        </div>
                      ) : r.status === "APPROVED" ? (
                        r.addedToPay ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                            <Check size={12} /> Added to pay
                          </span>
                        ) : (
                          <button
                            onClick={() => addToPay(r)}
                            disabled={busyId === r.id}
                            className="inline-flex items-center gap-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
                          >
                            <Check size={13} /> Add to pay
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400">
                      {requests.length === 0
                        ? "No allowance requests yet"
                        : "No requests match this filter"}
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400">
                      Loading allowance requests…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Request form — opened from the table or from a notification; HR approves or rejects here */}
      {viewingNow && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-sky-700 to-sky-600 text-white rounded-t-2xl">
              <h3 className="text-xl font-bold">Allowance Request</h3>
              <button
                onClick={() => setViewing(null)}
                className="p-1.5 hover:bg-white/20 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  [
                    "Employee",
                    viewingNow.employeeName || viewingNow.employeeEmail,
                  ],
                  ["Employee ID", viewingNow.employeeCode || "—"],
                  ["Allowance", viewingNow.name],
                  ["Amount", money(viewingNow.amount)],
                  ["Requested On", formatDate(viewingNow.createdAt)],
                  ["Email", viewingNow.employeeEmail],
                ].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-xs text-slate-500 mb-0.5">{l}</p>
                    <p className="font-semibold text-slate-800 break-words">
                      {v}
                    </p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Description</p>
                <p className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm text-slate-700 whitespace-pre-wrap">
                  {viewingNow.description}
                </p>
              </div>
              <button
                onClick={() => viewDocument(viewingNow)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-2 rounded-lg transition-colors"
              >
                <FileText size={14} /> View PDF · {viewingNow.documentName}
              </button>
              <div>
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[viewingNow.status] || ""}`}
                >
                  {STATUS_ICON[viewingNow.status]}{" "}
                  {statusLabel(viewingNow.status)}
                </span>
                {viewingNow.reviewedByName &&
                  viewingNow.status !== "PENDING" && (
                    <span className="ml-2 text-xs text-gray-400">
                      by {viewingNow.reviewedByName}
                    </span>
                  )}
              </div>
              {viewingNow.status !== "PENDING" && viewingNow.reviewComment && (
                <p
                  className={`p-3 rounded-xl text-sm ${viewingNow.status === "REJECTED" ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-700"}`}
                >
                  HR: {viewingNow.reviewComment}
                </p>
              )}
              {viewingNow.status === "PENDING" && (
                <div className="flex gap-3">
                  <button
                    disabled={busyId === viewingNow.id}
                    onClick={async () => {
                      const r = viewingNow;
                      setViewing(null);
                      await approve(r);
                    }}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={15} /> Approve
                  </button>
                  <button
                    disabled={busyId === viewingNow.id}
                    onClick={() => {
                      const r = viewingNow;
                      setViewing(null);
                      openReject(r);
                    }}
                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Ban size={15} /> Reject
                  </button>
                </div>
              )}
              <button
                onClick={() => setViewing(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default HRAllowanceRequests;
