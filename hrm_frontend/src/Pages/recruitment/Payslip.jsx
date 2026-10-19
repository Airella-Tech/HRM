import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, Download, Eye, Calendar, TrendingUp, FileText, CreditCard, X, Filter, Search, Wallet, Plus, RefreshCw } from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { employeeApi } from "../../services/api";
import {
  EmpButton, SummaryCard, SearchBar, FilterSelect, ShowingCount, TableCard, TableHeaderRow, TableHeader, TableRows, TableRow, LoadingState, EmptyState,
} from "../../components/EmployeeUI";
import { EMP_GRADIENT, CARD_TONES, useSort } from "../../components/employeeTheme";
import AllowanceRequests from "./AllowanceRequests";

const PAYSLIP_COLS = "grid-cols-[1.4fr_1.1fr_1fr_1fr_1.1fr_0.8fr_150px]";

const money = (n) => (Number(n) || 0).toLocaleString();

const PERIOD_LABELS = { MONTHLY: "Monthly", WEEKLY: "Weekly", ANNUAL: "Annual" };
const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const escapeHtml = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const rs = (n) => `Rs. ${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Opens a printable payslip; choose "Save as PDF" in the print dialog to download it.
const printPayslip = (p, user, info) => {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) { alert("Please allow pop-ups for this site to download your payslip."); return; }
  const earn = Number(p.basicSalary || 0) + Number(p.totalAllowances || 0);
  const row = (l, v, cls = "") => `<tr class="${cls}"><td>${escapeHtml(l)}</td><td class="r">${escapeHtml(v)}</td></tr>`;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Payslip ${MONTH_NAMES[p.month]} ${p.year}</title>
  <style>
    body{font-family:Segoe UI,Arial,sans-serif;color:#1e293b;margin:32px;}
    h1{font-size:22px;margin:0;color:#0369a1} .sub{color:#64748b;font-size:13px;margin:4px 0 20px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}
    .grid div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:13px}
    .grid b{display:block;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
    table{width:100%;border-collapse:collapse;margin-bottom:18px;font-size:14px}
    th{text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;padding:6px 0;border-bottom:2px solid #e2e8f0}
    td{padding:7px 0;border-bottom:1px solid #f1f5f9} .r{text-align:right} .tot td{font-weight:700;border-top:2px solid #cbd5e1}
    .net{background:#0369a1;color:#fff;border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;font-size:18px;font-weight:700}
    .foot{margin-top:24px;color:#94a3b8;font-size:11px;text-align:center}
    @media print{body{margin:14mm}}
  </style></head><body>
  <h1>Payslip — ${escapeHtml(MONTH_NAMES[p.month])} ${escapeHtml(p.year)}</h1>
  <p class="sub">${escapeHtml(info.company || "")}</p>
  <div class="grid">
    <div><b>Employee</b>${escapeHtml(user.fullName)}</div><div><b>Email</b>${escapeHtml(user.email)}</div>
    <div><b>Department</b>${escapeHtml(info.department || "—")}</div><div><b>Designation</b>${escapeHtml(info.designation || "—")}</div>
    <div><b>Working days</b>${escapeHtml(p.workingDays ?? "—")}</div><div><b>Days present</b>${escapeHtml(p.presentDays ?? "—")}</div>
  </div>
  <table><thead><tr><th>Earnings</th><th class="r">Amount</th></tr></thead><tbody>
    ${row("Basic Salary", rs(p.basicSalary))}${row("Allowances", rs(p.totalAllowances))}${row("Total Earnings", rs(earn), "tot")}
  </tbody></table>
  <table><thead><tr><th>Deductions</th><th class="r">Amount</th></tr></thead><tbody>
    ${row("Total Deductions", rs(p.totalDeductions), "tot")}
  </tbody></table>
  <div class="net"><span>Net Salary</span><span>${escapeHtml(rs(p.netSalary))}</span></div>
  <p class="foot">Computer-generated payslip · ${escapeHtml(new Date().toLocaleDateString())}</p>
  <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
  </body></html>`);
  w.document.close();
};

const Payslip = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedYear, setSelectedYear] = useState("ALL");
  const [viewingPayslip, setViewingPayslip] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [paySheet, setPaySheet] = useState(null);
  const [paySheetLoading, setPaySheetLoading] = useState(false);
  const [paySheetError, setPaySheetError] = useState("");
  const [showAllowanceForm, setShowAllowanceForm] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (s) setUser(JSON.parse(s));
    else navigate("/login");
  }, [navigate]);

  const loadPayslips = async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    setLoadError("");
    try {
      const response = await employeeApi.getPayslips();
      setPayslips(response.data || []);
    } catch (e) {
      console.error("Failed to load payslips:", e);
      setLoadError((e.message || "Could not load your payslips").replace(/^\d{3}:\s*/, ""));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return undefined;
    loadPayslips();

    // Current salary from HR: job role basic payment + individual allowances / deductions
    (async () => {
      setPaySheetLoading(true);
      setPaySheetError("");
      try {
        const response = await employeeApi.getPaySheet();
        setPaySheet(response.data || null);
      } catch (e) {
        setPaySheetError((e.message || "Failed to load your salary").replace(/^\d{3}:\s*/, ""));
      } finally {
        setPaySheetLoading(false);
      }
    })();

    // New payslips sent by HR show up when the employee comes back to this tab
    const onFocus = () => loadPayslips(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = (p) => printPayslip(p, user, {
    department: paySheet?.departmentName,
    designation: paySheet?.designation,
    company: user.companyName,
  });

  const getMonthName = (m) => MONTH_NAMES[m] || "";

  const [searchTerm, setSearchTerm] = useState("");

  const years = useMemo(
    () => [...new Set(payslips.map((p) => String(p.year)))].sort().reverse(),
    [payslips]
  );

  const filteredPayslips = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return payslips.filter((p) => {
      if (selectedYear !== "ALL" && String(p.year) !== selectedYear) return false;
      if (!q) return true;
      return `${getMonthName(p.month)} ${p.year} ${p.status || "PAID"}`.toLowerCase().includes(q);
    });
  }, [payslips, searchTerm, selectedYear]);

  const { sorted: sortedPayslips, headerProps } = useSort(filteredPayslips, (p, key) => {
    if (key === "period") return `${p.year}-${String(p.month).padStart(2, "0")}`;
    if (key === "status") return p.status || "PAID";
    return String(Math.round(p[key] || 0)).padStart(12, "0");
  });

  if (!user) return null;

  // Real figures from the payslips HR has sent (latest month first)
  const latest = [...payslips].sort((a, b) => (b.year - a.year) || (b.month - a.month))[0];
  const lastNet = latest ? Number(latest.netSalary) || 0 : 0;
  const totalNet = payslips.reduce((acc, p) => acc + (Number(p.netSalary) || 0), 0);
  const avgNet = payslips.length > 0 ? Math.round(totalNet / payslips.length) : 0;
  const thisYear = new Date().getFullYear();
  const ytdNet = payslips.filter((p) => p.year === thisYear).reduce((acc, p) => acc + (Number(p.netSalary) || 0), 0);

  const isFiltering = searchTerm || selectedYear !== "ALL";

  const statusPill = (status) => (
    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      {status || "PAID"}
    </span>
  );

  const rowActions = (p) => (
    <div className="flex items-center justify-end gap-2">
      <button onClick={() => setViewingPayslip(p)} title="View"
        className="h-8 w-8 rounded-lg bg-sky-50 text-blue-600 hover:bg-sky-100 flex items-center justify-center transition-colors">
        <Eye size={15} />
      </button>
      <button onClick={() => handleDownload(p)} title="Download PDF"
        className={`h-8 px-3 rounded-lg ${EMP_GRADIENT} text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity`}>
        <Download size={13} /> PDF
      </button>
    </div>
  );

  return (
    <PageLayout
      role="employee"
      activePage="Payslip"
      title="Payslip"
      subtitle="View and download your salary payslips"
      actions={
        <div className="flex items-center gap-2">
          <EmpButton variant="secondary" onClick={() => loadPayslips()} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh
          </EmpButton>
          <EmpButton onClick={() => setShowAllowanceForm(true)}>
            <Plus size={17} strokeWidth={2.5} /> Request for Allowance
          </EmpButton>
        </div>
      }
    >
      <div className="space-y-6">
        {loadError && (
          <div role="alert" className="flex items-center justify-between gap-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <span>{loadError}</span>
            <button onClick={() => loadPayslips()} className="font-semibold underline">Try again</button>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[
            { label: "Last Salary",   value: `Rs. ${lastNet.toLocaleString()}`, icon: <CreditCard size={20} />, tone: CARD_TONES.blue, sub: latest ? `${getMonthName(latest.month)} ${latest.year}` : "No payslip yet" },
            { label: "Avg. Monthly",  value: `Rs. ${avgNet.toLocaleString()}`, icon: <TrendingUp size={20} />, tone: CARD_TONES.green, sub: payslips.length ? `Across ${payslips.length} payslip${payslips.length === 1 ? "" : "s"}` : "No payslip yet" },
            { label: "Total Earnings",  value: `Rs. ${ytdNet.toLocaleString()}`, icon: <DollarSign size={20} />, tone: CARD_TONES.yellow, sub: `Net pay in ${thisYear}` },
            { label: "Total Payslips",value: payslips.length, icon: <FileText size={20} />, tone: CARD_TONES.purple, sub: "Available" },
          ].map(s => (
            <SummaryCard key={s.label} icon={s.icon} title={s.label} value={s.value} description={s.sub} className={s.tone} />
          ))}
        </div>

        {/* =====================================================
            CURRENT SALARY (pay sheet set by HR)
        ====================================================== */}
        <div className="bg-gradient-to-br from-white to-employee-50 rounded-xl border border-employee-100 shadow-sm p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-3">
              <span className="bg-emerald-50 p-2 rounded-lg"><Wallet size={20} className="text-emerald-600" /></span> My Current Salary
            </h2>
            {paySheet?.configured && paySheet.period && (
              <span className="text-xs font-semibold text-employee-700 bg-employee-50 border border-employee-100 px-2.5 py-1 rounded-lg">
                {PERIOD_LABELS[paySheet.period] || paySheet.period}
              </span>
            )}
          </div>
          {paySheetLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-employee-500"></div>
            </div>
          ) : paySheetError ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{paySheetError}</p>
          ) : paySheet && (
            <div className="space-y-5">
              {!paySheet.configured && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  HR has not set a salary for your job role{paySheet.designation ? ` (${paySheet.designation})` : ""} yet.
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                {[["Department", paySheet.departmentName], ["Designation", paySheet.designation], ["Employment Type", paySheet.employmentType]].map(([l, v]) => (
                  <div key={l} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-slate-400 text-xs">{l}</p>
                    <p className="mt-1 font-semibold text-slate-800 truncate">{v || "—"}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">Earnings</h3>
                  <div className="space-y-2">
                    {[["Basic Salary", paySheet.basicSalary], ["Job Role Allowance", paySheet.roleAllowance],
                      ...(paySheet.additionalItems || []).filter(i => i.type === "ALLOWANCE").map(i => [i.name, i.amount])].map(([l, v], idx) => (
                      <div key={`${l}-${idx}`} className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">{l}</span><span className="font-semibold">Rs. {money(v)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2.5 px-3 bg-emerald-50 border border-emerald-100 rounded-xl font-semibold text-emerald-700">
                      <span>Total Earnings</span><span>Rs. {money(Number(paySheet.basicSalary || 0) + Number(paySheet.totalAllowance || 0))}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">Deductions</h3>
                  <div className="space-y-2">
                    {[["Job Role Deduction", paySheet.roleDeduction],
                      ...(paySheet.additionalItems || []).filter(i => i.type === "DEDUCTION").map(i => [i.name, i.amount])].map(([l, v], idx) => (
                      <div key={`${l}-${idx}`} className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">{l}</span><span className="font-semibold">Rs. {money(v)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2.5 px-3 bg-red-50 border border-red-100 rounded-xl font-semibold text-red-600">
                      <span>Total Deductions</span><span>Rs. {money(paySheet.totalDeduction)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`${EMP_GRADIENT} text-white p-5 rounded-lg flex justify-between items-center`}>
                <span className="text-lg font-bold">Net Salary</span>
                <span className="text-2xl font-bold">Rs. {money(paySheet.netTotal)}</span>
              </div>
            </div>
          )}
        </div>

        {/* =====================================================
            SEARCH & FILTER CONTROLS
        ====================================================== */}
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search by month (e.g. March) or year...">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-400" />
            <FilterSelect value={selectedYear} onChange={setSelectedYear}>
              <option value="ALL">All Years</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </FilterSelect>
          </div>
          <ShowingCount shown={sortedPayslips.length} total={payslips.length} />
        </SearchBar>

        {/* =====================================================
            PAYSLIP TABLE
        ====================================================== */}
        <TableCard>
          <TableHeaderRow cols={PAYSLIP_COLS}>
            <TableHeader {...headerProps("period")}>Period</TableHeader>
            <TableHeader {...headerProps("basicSalary")}>Basic</TableHeader>
            <TableHeader {...headerProps("totalAllowances")}>Allowances</TableHeader>
            <TableHeader {...headerProps("totalDeductions")}>Deductions</TableHeader>
            <TableHeader {...headerProps("netSalary")}>Net Salary</TableHeader>
            <TableHeader {...headerProps("status")}>Status</TableHeader>
            <TableHeader className="text-right">Actions</TableHeader>
          </TableHeaderRow>

          {isLoading ? (
            <LoadingState title="Loading payslips..." subtitle="Fetching latest records from database" />
          ) : sortedPayslips.length === 0 ? (
            <EmptyState
              icon={isFiltering ? <Search size={28} /> : <FileText size={28} />}
              title={isFiltering ? "No payslips found" : "No payslips yet"}
              subtitle={isFiltering
                ? "Try clearing your search or choosing another year."
                : "Your payslips will appear here once payroll is processed."}
            />
          ) : (
            <TableRows>
              {sortedPayslips.map((p) => (
                <TableRow
                  key={p.id}
                  cols={PAYSLIP_COLS}
                  mobile={
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">{getMonthName(p.month)} {p.year}</p>
                        {statusPill(p.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <span className="text-slate-500">Basic: <b className="text-slate-800">Rs. {money(p.basicSalary)}</b></span>
                        <span className="text-slate-500">Net: <b className="text-blue-700">Rs. {money(p.netSalary)}</b></span>
                        <span className="text-emerald-700">+{money(p.totalAllowances)}</span>
                        <span className="text-red-600">-{money(p.totalDeductions)}</span>
                      </div>
                      {rowActions(p)}
                    </div>
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 flex-shrink-0 rounded-xl ${EMP_GRADIENT} text-white flex items-center justify-center shadow-sm`}>
                      <Calendar size={18} />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">{getMonthName(p.month)} {p.year}</p>
                  </div>
                  <span className="text-sm text-slate-700 font-medium">Rs. {money(p.basicSalary)}</span>
                  <span className="text-sm font-semibold text-emerald-700">+{money(p.totalAllowances)}</span>
                  <span className="text-sm font-semibold text-red-600">-{money(p.totalDeductions)}</span>
                  <span className="text-sm font-bold text-blue-700">Rs. {money(p.netSalary)}</span>
                  <div>{statusPill(p.status)}</div>
                  {rowActions(p)}
                </TableRow>
              ))}
            </TableRows>
          )}
        </TableCard>

        {/* Allowance requests to HR: history table + "Request for Allowance" popup */}
        <AllowanceRequests showForm={showAllowanceForm} onCloseForm={() => setShowAllowanceForm(false)} />
      </div>

      {/* Detail Modal */}
      {viewingPayslip && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className={`flex items-center justify-between p-6 ${EMP_GRADIENT} text-white rounded-t-xl`}>
              <div>
                <h2 className="text-lg font-semibold">Payslip Details</h2>
                <p className="text-sky-100 text-sm">{getMonthName(viewingPayslip.month)} {viewingPayslip.year}</p>
              </div>
              <button onClick={() => setViewingPayslip(null)} className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><X size={17} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Employee Name", user.fullName],
                  ["Email", user.email],
                  ["Department", paySheet?.departmentName],
                  ["Designation", paySheet?.designation],
                  ["Days Present", viewingPayslip.presentDays != null ? `${viewingPayslip.presentDays} of ${viewingPayslip.workingDays ?? "—"}` : null],
                  ["Status", viewingPayslip.status || "PAID"]
                ].map(([l,v]) => (
                  <div key={l}><p className="text-slate-400 text-xs">{l}</p><p className="font-semibold text-slate-800">{v || "N/A"}</p></div>
                ))}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-3">Earnings & Allowances</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Basic Salary</span><span className="font-semibold">Rs. {money(viewingPayslip.basicSalary)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Other Allowances</span><span className="font-semibold">Rs. {money(viewingPayslip.totalAllowances)}</span>
                  </div>
                  <div className="flex justify-between py-2.5 px-3 bg-slate-50 border border-slate-100 rounded-lg font-semibold text-emerald-700">
                    <span>Total Earnings</span><span>Rs. {money(Number(viewingPayslip.basicSalary) + Number(viewingPayslip.totalAllowances))}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-3">Deductions</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2.5 px-3 bg-slate-50 border border-slate-100 rounded-lg font-semibold text-red-600">
                    <span>Total Deductions</span><span>Rs. {money(viewingPayslip.totalDeductions)}</span>
                  </div>
                </div>
              </div>
              <div className={`${EMP_GRADIENT} text-white p-5 rounded-lg flex justify-between items-center`}>
                <span className="text-lg font-bold">Net Salary</span>
                <span className="text-2xl font-bold">Rs. {money(viewingPayslip.netSalary)}</span>
              </div>
              <div className="flex gap-3">
                <EmpButton onClick={() => handleDownload(viewingPayslip)} className="flex-1">
                  <Download size={16} /> Download PDF
                </EmpButton>
                <EmpButton variant="secondary" onClick={() => setViewingPayslip(null)} className="flex-1">Close</EmpButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};
export default Payslip;
