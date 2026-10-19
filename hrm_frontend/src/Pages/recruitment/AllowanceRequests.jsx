import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, FileText, Upload, Search, Filter, Clock, CheckCircle, XCircle, Calendar } from "lucide-react";
import { employeeApi } from "../../services/api";
import {
  EmpButton, SearchBar, FilterSelect, ShowingCount, TableCard, TableHeaderRow, TableHeader, TableRows, TableRow, LoadingState, EmptyState,
} from "../../components/EmployeeUI";
import { EMP_GRADIENT, useSort } from "../../components/employeeTheme";

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const REQUEST_COLS = "grid-cols-[1.5fr_1fr_1fr_1.2fr_1fr_1.6fr]";

// Server errors come back as "400: <reason>"; show just the reason
const errorText = (error, fallback) => (error?.message || fallback).replace(/^\d{3}:\s*/, "");
const money = (n) => (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const formatDate = (dt) => (dt ? dt.replace("T", " ").slice(0, 16) : "—");
const fileSize = (bytes) => (bytes ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : "");

const STATUS_STYLE = {
  PENDING: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  REJECTED: "bg-red-50 text-red-700 ring-1 ring-red-200",
};
const STATUS_ICON = { PENDING: <Clock size={13} />, APPROVED: <CheckCircle size={13} />, REJECTED: <XCircle size={13} /> };
const statusLabel = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : "");

const inputCls = "w-full border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-employee-500 focus:border-employee-500 bg-white";

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
 * The employee's allowance requests: the "Request for Allowance" popup (name, amount, description,
 * PDF) and the history table showing HR's decision and comment.
 *   showForm / onCloseForm: the page's header button opens the popup
 */
const AllowanceRequests = ({ showForm, onCloseForm }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({ name: "", amount: "", description: "" });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const fileInput = useRef(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const load = async () => {
    try {
      setLoading(true);
      setLoadError("");
      const res = await employeeApi.getAllowanceRequests();
      setRequests(res.data || []);
    } catch (e) {
      setLoadError(errorText(e, "Failed to load your allowance requests"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Fresh form every time the popup opens
  useEffect(() => {
    if (showForm) {
      setForm({ name: "", amount: "", description: "" });
      setFile(null);
      setFormError("");
    }
  }, [showForm]);

  const pickFile = (f) => {
    setFormError("");
    if (!f) { setFile(null); return; }
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setFormError("Only PDF files can be attached");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    if (f.size > MAX_PDF_BYTES) {
      setFormError("The PDF must be 5 MB or smaller");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setFormError("Attach a PDF document"); return; }
    try {
      setSubmitting(true);
      setFormError("");
      const data = new FormData();
      data.append("name", form.name.trim());
      data.append("amount", form.amount);
      data.append("description", form.description.trim());
      data.append("document", file);
      const res = await employeeApi.requestAllowance(data);
      onCloseForm();
      setMessage(`✓ ${res.message || "Allowance request sent to HR"}`);
      setTimeout(() => setMessage(""), 3000);
      load();
    } catch (e2) {
      setFormError(errorText(e2, "Failed to send the request"));
    } finally {
      setSubmitting(false);
    }
  };

  const viewDocument = async (r) => {
    try {
      openPdf(await employeeApi.getAllowanceDocument(r.id), r.documentName);
    } catch (e) {
      setMessage(`✗ ${errorText(e, "Could not open the document")}`);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.name, r.description, r.reviewComment].some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [requests, searchTerm, statusFilter]);

  const { sorted, headerProps } = useSort(filtered, (r, key) =>
    key === "amount" ? String(Math.round(Number(r.amount) || 0)).padStart(12, "0") : r[key] || ""
  );

  const isFiltering = searchTerm || statusFilter !== "ALL";

  const statusPill = (s) => (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[s] || ""}`}>
      {STATUS_ICON[s]} {statusLabel(s)}
    </span>
  );

  const hrResponse = (r) =>
    r.status === "PENDING" ? (
      <span className="text-xs text-slate-400">Waiting for HR</span>
    ) : (
      <div className="min-w-0">
        {r.reviewComment && (
          <p className={`text-xs truncate ${r.status === "REJECTED" ? "text-red-600" : "text-slate-600"}`} title={r.reviewComment}>
            {r.reviewComment}
          </p>
        )}
        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
          {r.reviewedByName ? `${r.reviewedByName} · ` : ""}{formatDate(r.reviewedAt)}
        </p>
      </div>
    );

  const documentButton = (r) => (
    <button onClick={() => viewDocument(r)} title={r.documentName}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1.5 rounded-lg transition-colors">
      <FileText size={13} /> PDF
    </button>
  );

  return (
    <>
      {message && (
        <div className={`p-4 rounded-lg text-white ${message.startsWith("✓") ? "bg-green-500" : "bg-red-500"}`}>
          {message}
        </div>
      )}

      {/* =====================================================
          ALLOWANCE REQUEST HISTORY — search & filter
      ====================================================== */}
      <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search allowance requests by name, description or HR comment...">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400" />
          <FilterSelect value={statusFilter} onChange={setStatusFilter}>
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </FilterSelect>
        </div>
        <ShowingCount shown={sorted.length} total={requests.length} />
      </SearchBar>

      {/* =====================================================
          ALLOWANCE REQUEST HISTORY TABLE
      ====================================================== */}
      <TableCard>
        <TableHeaderRow cols={REQUEST_COLS}>
          <TableHeader {...headerProps("name")}>Allowance</TableHeader>
          <TableHeader {...headerProps("amount")}>Amount</TableHeader>
          <TableHeader {...headerProps("createdAt")}>Requested On</TableHeader>
          <TableHeader>Document</TableHeader>
          <TableHeader {...headerProps("status")}>Status</TableHeader>
          <TableHeader>HR Response</TableHeader>
        </TableHeaderRow>

        {loading ? (
          <LoadingState title="Loading allowance requests..." />
        ) : loadError ? (
          <p className="m-5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{loadError}</p>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={isFiltering ? <Search size={28} /> : <FileText size={28} />}
            title={isFiltering ? "No matching requests" : "No allowance requests yet"}
            subtitle={isFiltering ? "Try clearing your search or choosing another status." : "Use Request for Allowance to ask HR for an allowance."}
          />
        ) : (
          <TableRows>
            {sorted.map((r) => (
              <TableRow
                key={r.id}
                cols={REQUEST_COLS}
                mobile={
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-800">{r.name}</p>
                      {statusPill(r.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">Rs. {money(r.amount)}</span>
                      <span>{formatDate(r.createdAt)}</span>
                      {documentButton(r)}
                    </div>
                    {r.description && <p className="text-sm text-slate-600">{r.description}</p>}
                    {hrResponse(r)}
                  </div>
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-10 w-10 flex-shrink-0 rounded-xl ${EMP_GRADIENT} text-white font-bold text-sm flex items-center justify-center shadow-sm`}>
                    {(r.name || "A").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{r.name}</p>
                    {r.description && <p className="text-xs text-slate-400 truncate mt-0.5" title={r.description}>{r.description}</p>}
                  </div>
                </div>
                <span className="text-sm font-bold text-blue-700">Rs. {money(r.amount)}</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Calendar size={13} className="text-slate-400" /> {formatDate(r.createdAt)}
                </span>
                <div>{documentButton(r)}</div>
                <div>{statusPill(r.status)}</div>
                {hrResponse(r)}
              </TableRow>
            ))}
          </TableRows>
        )}
      </TableCard>

      {/* Request for Allowance popup */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Request for Allowance</h2>
              <button onClick={() => !submitting && onCloseForm()} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                <input value={form.name} maxLength={100} required onChange={e => setForm({ ...form, name: e.target.value })}
                  className={inputCls} placeholder="e.g. Medical claim" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Amount (Rs.) *</label>
                <input type="number" min="0.01" step="0.01" value={form.amount} required onChange={e => setForm({ ...form, amount: e.target.value })}
                  className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description *</label>
                <textarea value={form.description} maxLength={1000} rows="3" required onChange={e => setForm({ ...form, description: e.target.value })}
                  className={`${inputCls} resize-none`} placeholder="Why are you requesting this allowance?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Supporting Document (PDF, max 5 MB) *</label>
                <label className={`flex items-center gap-3 border-2 border-dashed rounded-lg px-4 py-4 cursor-pointer transition-colors ${file ? "border-employee-300 bg-employee-50/60" : "border-slate-300 hover:border-employee-400 hover:bg-slate-50"}`}>
                  <span className="bg-white border border-slate-200 p-2 rounded-lg text-employee-600">{file ? <FileText size={20} /> : <Upload size={20} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-700 truncate">{file ? file.name : "Choose a PDF file"}</span>
                    <span className="block text-xs text-slate-400">{file ? fileSize(file.size) : "Click to browse"}</span>
                  </span>
                  <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="hidden"
                    onChange={e => pickFile(e.target.files?.[0])} />
                </label>
              </div>
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{formError}</div>
              )}
              <div className="flex gap-3 pt-2">
                <EmpButton type="submit" disabled={submitting} className="flex-1 py-3">
                  {submitting ? "Sending..." : "Send Request"}
                </EmpButton>
                <EmpButton type="button" variant="secondary" onClick={onCloseForm} disabled={submitting} className="flex-1 py-3">
                  Cancel
                </EmpButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AllowanceRequests;
