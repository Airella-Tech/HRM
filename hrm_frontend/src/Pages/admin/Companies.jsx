import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  AlertCircle,
  Loader2,
  Send,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { ADMIN_URL } from "../../services/api";

const AdminCompanies = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [viewingCompany, setViewingCompany] = useState(null);
  const [rejectingCompany, setRejectingCompany] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (s) {
      const u = JSON.parse(s);
      if (u.role !== "ADMIN") {
        navigate("/unauthorized");
        return;
      }
      setUser(u);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${ADMIN_URL}/admin/companies`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch companies list");
      }

      const responseData = await res.json();
      const list = responseData.data || responseData || [];
      setCompanies(list);
    } catch (err) {
      console.warn("Failed to fetch company list from Admin_Backend", err);
      setError(err.message || "Unable to fetch company list from Admin_Backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCompanies();
    }
  }, [user]);

  const handleApprove = async (id) => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${ADMIN_URL}/admin/companies/${id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || `Failed to approve company application (HTTP ${res.status}).`);
      }

      setSuccessMsg(
        `Company approved! The HR account (${viewingCompany?.email || "company email"}) was created and its login details were emailed to the client.`
      );
      setViewingCompany(null);
      fetchCompanies();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResend = async (id) => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${ADMIN_URL}/admin/companies/${id}/resend-credentials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || `Failed to resend credentials (HTTP ${res.status}).`);
      }
      setSuccessMsg("A new temporary password was saved for the HR account and emailed to the client.");
      setViewingCompany(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectingCompany) return;

    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const token = localStorage.getItem("token");
      const url = `${ADMIN_URL}/admin/companies/${rejectingCompany.id}/reject?reason=${encodeURIComponent(
        rejectionReason
      )}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || `Failed to reject company application (HTTP ${res.status}).`);
      }

      setSuccessMsg("Company application rejected and rejection notification email sent to client.");
      setRejectingCompany(null);
      setViewingCompany(null);
      setRejectionReason("");
      fetchCompanies();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const stats = {
    total: companies.length,
    pending: companies.filter((c) => (c.status || "").toUpperCase() === "PENDING").length,
    active: companies.filter(
      (c) => (c.status || "").toUpperCase() === "ACTIVE" || (c.status || "").toUpperCase() === "APPROVED"
    ).length,
    rejected: companies.filter((c) => (c.status || "").toUpperCase() === "REJECTED").length,
  };

  const filtered = companies.filter((c) => {
    const nameStr = (c.companyName || c.name || "").toLowerCase();
    const indStr = (c.industry || "").toLowerCase();
    const matchesSearch = nameStr.includes(searchTerm.toLowerCase()) || indStr.includes(searchTerm.toLowerCase());

    const statusVal = (c.status || "").toLowerCase();
    const matchesStatus =
      filterStatus === "all" ||
      statusVal === filterStatus.toLowerCase() ||
      (filterStatus === "active" && statusVal === "approved");

    return matchesSearch && matchesStatus;
  });

  const renderStatusBadge = (s) => {
    const norm = (s || "").toUpperCase();
    if (norm === "ACTIVE" || norm === "APPROVED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {norm === "APPROVED" ? "Approved" : "Active"}
        </span>
      );
    }
    if (norm === "REJECTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-[11px] bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Rejected
        </span>
      );
    }
    if (norm === "PENDING") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-[11px] bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        {s || "Unknown"}
      </span>
    );
  };

  if (!user) return null;

  return (
    <PageLayout
      role="admin"
      activePage="Companies"
      title="Company Management"
      subtitle="Review, approve, and manage all registered company requests"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Success Alert */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-4 rounded-2xl text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-5 py-4 rounded-2xl text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-700 hover:text-rose-900 font-bold text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[
            {
              label: "Total Applications",
              value: stats.total,
              icon: Building2,
              sub: `${stats.active} active clients`,
            },
            {
              label: "Pending Review",
              value: stats.pending,
              icon: Clock,
              sub: "Action required",
            },
            {
              label: "Active / Approved",
              value: stats.active,
              icon: CheckCircle2,
              sub: "Provisioned tenants",
            },
            {
              label: "Rejected",
              value: stats.rejected,
              icon: XCircle,
              sub: "Audit logged records",
            },
          ].map((s) => {
            const IconComponent = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 p-5 text-white shadow-sm flex items-start justify-between gap-3 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white/85 truncate">{s.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">{loading ? "..." : s.value}</p>
                  <p className="mt-1 text-xs text-white/75 truncate">{s.sub}</p>
                </div>
                <div className="shrink-0 rounded-xl bg-white/20 p-2.5 text-white backdrop-blur-xs flex items-center justify-center">
                  <IconComponent size={20} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(15,23,42,0.035)] border border-slate-200/90 p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by company name or industry…"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-slate-50/50 text-slate-800"
              />
            </div>
            <div className="relative w-full sm:w-auto">
              <Filter size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full sm:w-auto pl-9 pr-8 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-slate-50/50 text-slate-700 font-medium appearance-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active / Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(15,23,42,0.035)] border border-slate-200/90 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                  <th className="px-5 py-3.5 text-left font-semibold">Company Name</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Industry</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Registration No</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Contact Person</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Contact Email</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Submitted</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Status</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 size={18} className="animate-spin text-primary-600" />
                        <span>Loading registered company applications...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-12 text-center text-slate-400">
                      No company applications found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c, i) => (
                    <tr
                      key={c.id || i}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-800">{c.companyName || c.name}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{c.industry || "General"}</td>
                      <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                        {c.registrationNumber || "N/A"}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-700">
                        {c.contactPersonName || c.contact || "N/A"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{c.email}</td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : c.submittedOn || "N/A"}
                      </td>
                      <td className="px-5 py-3.5">{renderStatusBadge(c.status)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setError(null);
                            setSuccessMsg(null);
                            setViewingCompany(c);
                          }}
                          className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-800 font-semibold text-xs transition-colors"
                        >
                          <Eye size={14} /> Inspect & Action
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Action Modal */}
      {viewingCompany && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/90">
            {/* Modal Header */}
            <div
              className="flex items-center justify-between p-6 text-white"
              style={{ background: "linear-gradient(135deg, #121731 0%, #1b2142 60%, #2b3566 100%)" }}
            >
              <div>
                <h3 className="text-xl font-bold tracking-tight">Company Application Request</h3>
                <p className="text-slate-300 text-xs mt-0.5">Application Details & Approval Decision</p>
              </div>
              <button
                onClick={() => setViewingCompany(null)}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
                {[
                  ["Company Name", viewingCompany.companyName || viewingCompany.name],
                  ["Registration Number", viewingCompany.registrationNumber],
                  ["Industry / Sector", viewingCompany.industry || "N/A"],
                  ["Estimated Employees", viewingCompany.employeeCount || "N/A"],
                  ["Business Email", viewingCompany.email],
                  ["Phone Number", viewingCompany.phone || "N/A"],
                  ["Contact Person", viewingCompany.contactPersonName || viewingCompany.contact || "N/A"],
                  ["Designation / Role", viewingCompany.contactPersonRole || "N/A"],
                  ["Website", viewingCompany.website || "N/A"],
                  [
                    "Submitted Date",
                    viewingCompany.createdAt
                      ? new Date(viewingCompany.createdAt).toLocaleString()
                      : viewingCompany.submittedOn || "N/A",
                  ],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">
                      {label}
                    </p>
                    <p className="font-semibold text-slate-800">{val}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
                  Office Address
                </p>
                <p className="bg-slate-50/80 p-3 rounded-xl text-slate-700 border border-slate-200/70">
                  {viewingCompany.address || "N/A"}
                </p>
              </div>

              {viewingCompany.notes && (
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
                    Applicant Notes
                  </p>
                  <p className="bg-amber-50/70 p-3 rounded-xl text-amber-900 border border-amber-200/70 italic">
                    {viewingCompany.notes}
                  </p>
                </div>
              )}

              {viewingCompany.rejectionReason && (
                <div>
                  <p className="text-[10px] text-rose-500 font-semibold uppercase tracking-wider mb-1">
                    Rejection Reason
                  </p>
                  <p className="bg-rose-50 p-3 rounded-xl text-rose-800 border border-rose-200">
                    {viewingCompany.rejectionReason}
                  </p>
                </div>
              )}

              {/* Status Badge */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-500 font-medium">Application Status:</span>
                {renderStatusBadge(viewingCompany.status)}
              </div>

              {error && !rejectingCompany && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-500 mt-0.5" />
                  <span className="break-words">{error}</span>
                </div>
              )}

              {/* Action Buttons for Pending Applications */}
              {(viewingCompany.status || "").toUpperCase() === "PENDING" && (
                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleApprove(viewingCompany.id)}
                    disabled={actionLoading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold text-xs shadow-sm shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {actionLoading ? "Creating HR account & sending email..." : "Approve & Provision HR Account"}
                  </button>
                  <button
                    onClick={() => setRejectingCompany(viewingCompany)}
                    disabled={actionLoading}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-semibold text-xs shadow-sm shadow-rose-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    Reject Application
                  </button>
                </div>
              )}

              {(viewingCompany.status || "").toUpperCase() === "APPROVED" && (
                <button
                  onClick={() => handleResend(viewingCompany.id)}
                  disabled={actionLoading}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-semibold text-xs shadow-sm shadow-primary-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send size={15} />
                  {actionLoading
                    ? "Resetting HR password & sending email..."
                    : "Resend HR Credentials (new temporary password)"}
                </button>
              )}

              <button
                onClick={() => setViewingCompany(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-xs transition-colors mt-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingCompany && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200/90 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Reject Application</h3>
              <button
                onClick={() => setRejectingCompany(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Please state the reason for rejecting{" "}
              <span className="font-semibold text-slate-800">
                {rejectingCompany.companyName || rejectingCompany.name}
              </span>
              . This reason will be emailed to the client.
            </p>
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                required
                rows="3"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="State rejection reason (e.g., Unable to verify registration document / incomplete information)..."
                className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              ></textarea>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setRejectingCompany(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow-sm shadow-rose-600/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default AdminCompanies;
