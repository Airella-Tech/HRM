import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Plus, Clock, FileText, Calendar, X, Filter, Search } from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { employeeApi } from "../../services/api";
import {
  EmpButton, SummaryCard, SummaryCardGrid, SearchBar, FilterSelect, ShowingCount, TableCard, TableHeaderRow, TableHeader, TableRows, TableRow, LoadingState, EmptyState, StatusChip,
} from "../../components/EmployeeUI";
import { EMP_GRADIENT, CARD_TONES, useSort } from "../../components/employeeTheme";

// Gradients for the per-type balance cards, in the order the API returns the types
const BALANCE_TONES = [CARD_TONES.teal, CARD_TONES.green, CARD_TONES.deep];

const HISTORY_COLS = "grid-cols-[1.5fr_1.5fr_0.7fr_1fr_1.8fr_1fr]";


const Leave = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const emptyForm = { leaveTypeId: "", startDate: "", endDate: "", reason: "" };
  const [formData, setFormData] = useState(emptyForm);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (s) {
      setUser(JSON.parse(s));
      loadLeaveData();
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const loadLeaveData = async () => {
    try {
      setLoading(true);
      const [typesRes, balanceRes, historyRes] = await Promise.all([
        employeeApi.getLeaveTypes(),
        employeeApi.getLeaveBalance(),
        employeeApi.getLeaves(),
      ]);
      setLeaveTypes(typesRes.data || []);
      setBalances(balanceRes.data || []);
      setLeaveHistory(historyRes.data || []);
    } catch (error) {
      console.error("Error loading leave data:", error);
      setMessage("✗ " + (error.message || "Failed to load leave data"));
    } finally {
      setLoading(false);
    }
  };

  const openApplyForm = () => {
    setFormData(emptyForm);
    setFormError("");
    setShowApplyForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.endDate < formData.startDate) {
      setFormError("End date cannot be before start date");
      return;
    }
    try {
      setSubmitting(true);
      setFormError("");
      await employeeApi.applyLeave({
        leaveTypeId: Number(formData.leaveTypeId),
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason.trim(),
      });
      setShowApplyForm(false);
      setFormData(emptyForm);
      setMessage("✓ Leave application submitted");
      setTimeout(() => setMessage(""), 3000);
      loadLeaveData();
    } catch (error) {
      // Server errors come back as "400: <reason>"; show just the reason in the form
      setFormError((error.message || "Failed to submit leave application").replace(/^\d{3}:\s*/, ""));
    } finally {
      setSubmitting(false);
    }
  };

  // API statuses are upper-case enums (PENDING, APPROVED, ...); the UI shows them capitalised
  const statusLabel = (st) => (st ? st.charAt(0) + st.slice(1).toLowerCase() : "");
  const formatAppliedOn = (createdAt) => (createdAt ? createdAt.split("T")[0] : "—");

  // History search / filter / sort
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredHistory = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return leaveHistory.filter((l) => {
      if (statusFilter !== "ALL" && (l.status || "").toUpperCase() !== statusFilter) return false;
      if (!q) return true;
      return [l.leaveTypeName, l.reason, l.startDate, l.endDate]
        .some((v) => (v || "").toString().toLowerCase().includes(q));
    });
  }, [leaveHistory, searchTerm, statusFilter]);

  const { sorted: sortedHistory, headerProps } = useSort(filteredHistory, (l, key) =>
    key === "numberOfDays" ? String(l.numberOfDays || 0).padStart(4, "0") : l[key] || ""
  );

  if (!user) return null;

  const isFiltering = searchTerm || statusFilter !== "ALL";

  const statusPill = (status) => (
    <StatusChip status={status} label={statusLabel(status)} />
  );

  return (
    <PageLayout
      role="employee"
      activePage="Leave"
      title="Leave Management"
      subtitle="Apply for leave and track your balance"
      actions={
        <EmpButton onClick={openApplyForm}>
          <Plus size={17} strokeWidth={2.5} /> Apply for Leave
        </EmpButton>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {message && (
          <div className={`px-4 py-3 rounded-xl border text-sm font-medium ${message.startsWith("✓") ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
            {message}
          </div>
        )}

        {/* Balance cards with Small Color Accent pattern */}
        <SummaryCardGrid cols={4}>
          {[
            ...balances.map((b, i) => ({
              label: b.leaveTypeName,
              remaining: b.remainingDays,
              used: b.usedDays,
              total: b.totalDays,
              tone: ["teal", "green", "deep"][i % 3],
            })),
            {
              label: "Total Balance",
              remaining: balances.reduce((sum, b) => sum + (b.remainingDays || 0), 0),
              used: balances.reduce((sum, b) => sum + (b.usedDays || 0), 0),
              total: balances.reduce((sum, b) => sum + (b.totalDays || 0), 0),
              tone: "teal",
            },
          ].map(b => (
            <SummaryCard key={b.label} icon={<CalendarDays size={20} />} title={b.label} value={b.remaining}
              description={`Remaining · ${b.used}/${b.total} used`} tone={b.tone} />
          ))}
        </SummaryCardGrid>

        {/* =====================================================
            SEARCH & FILTER CONTROLS (With Quick Status Pills)
        ====================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.035)] p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by leave type, reason, or date…"
                className="w-full pl-10 pr-4 h-10 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 bg-slate-50/50 transition-all font-medium"
              />
            </div>
            <div className="relative sm:w-48">
              <Filter size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-9 pr-8 h-10 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 bg-slate-50/50 appearance-none transition-all cursor-pointer"
              >
                <option value="ALL">All Statuses ({leaveHistory.length})</option>
                <option value="PENDING">Pending ({leaveHistory.filter(l => (l.status || '').toUpperCase() === 'PENDING').length})</option>
                <option value="APPROVED">Approved ({leaveHistory.filter(l => (l.status || '').toUpperCase() === 'APPROVED').length})</option>
                <option value="REJECTED">Rejected ({leaveHistory.filter(l => (l.status || '').toUpperCase() === 'REJECTED').length})</option>
                <option value="CANCELLED">Cancelled ({leaveHistory.filter(l => (l.status || '').toUpperCase() === 'CANCELLED').length})</option>
              </select>
            </div>
          </div>

          {/* Quick Filter Status Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            {[
              { id: "ALL", label: "All Leaves", count: leaveHistory.length, activeColor: "bg-teal-600 text-white border-teal-600" },
              { id: "PENDING", label: "Pending", count: leaveHistory.filter(l => (l.status || '').toUpperCase() === 'PENDING').length, activeColor: "bg-amber-500 text-white border-amber-500", dot: "bg-amber-400" },
              { id: "APPROVED", label: "Approved", count: leaveHistory.filter(l => (l.status || '').toUpperCase() === 'APPROVED').length, activeColor: "bg-emerald-600 text-white border-emerald-600", dot: "bg-emerald-400" },
              { id: "REJECTED", label: "Rejected", count: leaveHistory.filter(l => (l.status || '').toUpperCase() === 'REJECTED').length, activeColor: "bg-rose-600 text-white border-rose-600", dot: "bg-rose-400" },
              { id: "CANCELLED", label: "Cancelled", count: leaveHistory.filter(l => (l.status || '').toUpperCase() === 'CANCELLED').length, activeColor: "bg-slate-700 text-white border-slate-700", dot: "bg-slate-400" },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  type="button"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${active
                    ? `${tab.activeColor} shadow-xs`
                    : "bg-slate-50/70 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                >
                  {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-white" : tab.dot}`} />}
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${active ? "bg-white/25 text-white" : "bg-slate-200/80 text-slate-600"
                    }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =====================================================
            LEAVE HISTORY TABLE
        ====================================================== */}
        <TableCard>
          <TableHeaderRow cols={HISTORY_COLS}>
            <TableHeader {...headerProps("leaveTypeName")}>Leave Type</TableHeader>
            <TableHeader {...headerProps("startDate")}>Period</TableHeader>
            <TableHeader {...headerProps("numberOfDays")}>Days</TableHeader>
            <TableHeader {...headerProps("createdAt")}>Applied On</TableHeader>
            <TableHeader>Reason</TableHeader>
            <TableHeader {...headerProps("status")}>Status</TableHeader>
          </TableHeaderRow>

          {loading ? (
            <LoadingState title="Loading leave history..." subtitle="Fetching latest records from database" />
          ) : sortedHistory.length === 0 ? (
            <EmptyState
              icon={isFiltering ? <Search size={28} /> : <FileText size={28} />}
              title={isFiltering ? "No matching applications" : "No leave applications yet"}
              subtitle={isFiltering
                ? "Try clearing your search or choosing another status."
                : "Apply for leave and your applications will appear here."}
              action={!isFiltering && (
                <EmpButton onClick={openApplyForm}><Plus size={16} /> Apply for Leave</EmpButton>
              )}
            />
          ) : (
            <TableRows>
              {sortedHistory.map((leave) => {
                const rejection = leave.status === "REJECTED" && leave.rejectionReason && (
                  <p className="text-xs text-red-600 mt-1 truncate" title={leave.rejectionReason}>
                    Rejected: {leave.rejectionReason}
                  </p>
                );
                const days = `${leave.numberOfDays} day${leave.numberOfDays > 1 ? "s" : ""}`;

                return (
                  <TableRow
                    key={leave.id}
                    cols={HISTORY_COLS}
                    mobile={
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-800">{leave.leaveTypeName}</p>
                          {statusPill(leave.status)}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {leave.startDate} → {leave.endDate}</span>
                          <span className="flex items-center gap-1"><CalendarDays size={12} /> {days}</span>
                          <span className="flex items-center gap-1"><Clock size={12} /> Applied {formatAppliedOn(leave.createdAt)}</span>
                        </div>
                        <p className="text-sm text-slate-600">{leave.reason}</p>
                        {rejection}
                      </div>
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 font-bold text-sm flex items-center justify-center shadow-xs">
                        {(leave.leaveTypeName || "L").charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm font-semibold text-slate-800 truncate">{leave.leaveTypeName}</p>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Calendar size={13} className="text-slate-400 flex-shrink-0" />
                      {leave.startDate} → {leave.endDate}
                    </span>
                    <span className="text-sm font-semibold text-slate-800">{leave.numberOfDays}</span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Clock size={13} className="text-slate-400" /> {formatAppliedOn(leave.createdAt)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-600 truncate" title={leave.reason}>{leave.reason}</p>
                      {rejection}
                    </div>
                    <div>{statusPill(leave.status)}</div>
                  </TableRow>
                );
              })}
            </TableRows>
          )}
        </TableCard>
      </div>

      {/* Apply Form Modal */}
      {showApplyForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Apply for Leave</h2>
                <p className="text-xs text-slate-500 mt-0.5">Submit your leave request for manager approval</p>
              </div>
              <button onClick={() => setShowApplyForm(false)} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors">
                <X size={17} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">Leave Type *</label>
                <select value={formData.leaveTypeId} onChange={e => setFormData({ ...formData, leaveTypeId: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white transition-all cursor-pointer" required>
                  <option value="">Select leave type</option>
                  {leaveTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">Start Date *</label>
                  <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white transition-all" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">End Date *</label>
                  <input type="date" value={formData.endDate} min={formData.startDate || undefined} onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white transition-all" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">Reason *</label>
                <textarea value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} rows="3"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white transition-all resize-none"
                  placeholder="Please provide a brief reason for your leave..." required />
              </div>
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl px-4 py-3">{formError}</div>
              )}
              <div className="flex gap-3 pt-2">
                <EmpButton type="submit" disabled={submitting} className="flex-1 py-2.5">{submitting ? "Submitting..." : "Submit Application"}</EmpButton>
                <EmpButton type="button" variant="secondary" onClick={() => setShowApplyForm(false)} className="flex-1 py-2.5">Cancel</EmpButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Leave;
