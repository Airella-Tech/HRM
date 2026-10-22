import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Plus, CheckCircle, XCircle, Clock, FileText, Calendar, AlertCircle, X, Filter, Search } from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { employeeApi } from "../../services/api";
import {
  EmpButton, SummaryCard, SearchBar, FilterSelect, ShowingCount, TableCard, TableHeaderRow, TableHeader, TableRows, TableRow, LoadingState, EmptyState,
} from "../../components/EmployeeUI";
import { EMP_GRADIENT, CARD_TONES, useSort } from "../../components/employeeTheme";

// Gradients for the per-type balance cards, in the order the API returns the types
const BALANCE_TONES = [CARD_TONES.blue, CARD_TONES.green, CARD_TONES.yellow];

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

  const statusStyle = (s) => ({
    Approved:  "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Rejected:  "bg-red-50 text-red-700 ring-1 ring-red-200",
    Pending:   "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Cancelled: "bg-slate-50 text-slate-600 ring-1 ring-slate-200",
  }[s] || "bg-slate-50 text-slate-600 ring-1 ring-slate-200");

  const statusIcon = { Approved: <CheckCircle size={14} />, Rejected: <XCircle size={14} />, Pending: <Clock size={14} />, Cancelled: <AlertCircle size={14} /> };

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

  const statusPill = (status) => {
    const label = statusLabel(status);
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle(label)}`}>
        {statusIcon[label]} {label}
      </span>
    );
  };


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
      <div className="space-y-6">
        {message && (
          <div className={`p-4 rounded-lg text-white ${message.startsWith("✓") ? "bg-green-500" : "bg-red-500"}`}>
            {message}
          </div>
        )}

        {/* Balance cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-4 gap-5">
          {[
            ...balances.map((b, i) => ({
              label: b.leaveTypeName,
              remaining: b.remainingDays,
              used: b.usedDays,
              total: b.totalDays,
              tone: BALANCE_TONES[i % BALANCE_TONES.length],
            })),
            {
              label: "Total Balance",
              remaining: balances.reduce((sum, b) => sum + (b.remainingDays || 0), 0),
              used: balances.reduce((sum, b) => sum + (b.usedDays || 0), 0),
              total: balances.reduce((sum, b) => sum + (b.totalDays || 0), 0),
              tone: CARD_TONES.purple,
            },
          ].map(b => (
            <SummaryCard key={b.label} icon={<CalendarDays size={20} />} title={b.label} value={b.remaining}
              description={`Remaining · ${b.used}/${b.total} used`} className={b.tone} />
          ))}
        </div>

        {/* =====================================================
            SEARCH & FILTER CONTROLS
        ====================================================== */}
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search by leave type, reason, or date...">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-400" />
            <FilterSelect value={statusFilter} onChange={setStatusFilter}>
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </FilterSelect>
          </div>
          <ShowingCount shown={sortedHistory.length} total={leaveHistory.length} />
        </SearchBar>

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
                      <div className={`h-10 w-10 flex-shrink-0 rounded-xl ${EMP_GRADIENT} text-white font-bold text-sm flex items-center justify-center shadow-sm`}>
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg">
            <div className={`flex items-center justify-between p-6 ${EMP_GRADIENT} text-white rounded-t-xl`}>
              <h2 className="text-lg font-semibold">Apply for Leave</h2>
              <button onClick={() => setShowApplyForm(false)} className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <X size={17} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Leave Type *</label>
                <select value={formData.leaveTypeId} onChange={e => setFormData({...formData, leaveTypeId: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-employee-500 focus:border-employee-500 bg-white" required>
                  <option value="">Select leave type</option>
                  {leaveTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Start Date *</label>
                  <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-employee-500 focus:border-employee-500 bg-white" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">End Date *</label>
                  <input type="date" value={formData.endDate} min={formData.startDate || undefined} onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-employee-500 focus:border-employee-500 bg-white" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Reason *</label>
                <textarea value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} rows="3"
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-employee-500 focus:border-employee-500 bg-white resize-none"
                  placeholder="Please provide a reason..." required />
              </div>
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{formError}</div>
              )}
              <div className="flex gap-3 pt-2">
                <EmpButton type="submit" disabled={submitting} className="flex-1">{submitting ? "Submitting..." : "Submit Application"}</EmpButton>
                <EmpButton type="button" variant="secondary" onClick={() => setShowApplyForm(false)} className="flex-1">Cancel</EmpButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Leave;
