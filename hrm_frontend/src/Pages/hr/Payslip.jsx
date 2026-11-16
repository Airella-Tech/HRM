import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Download,
  Eye,
  Send,
  Calendar,
  X,
  DollarSign,
  Plus,
  SlidersHorizontal,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Loader2,
  Briefcase,
  Users,
  Building2,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Check,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { hrApi, userHrApi } from "../../services/api";
import { num, norm, resolveSheet } from "../../utils/payroll";
import { downloadCsvFile, downloadWorkbook } from "../../utils/exportFile";

const money = (v) =>
  `Rs.${num(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const periodLabel = (p) =>
  ({ MONTHLY: "Monthly", WEEKLY: "Weekly", ANNUAL: "Annual" })[p] || "";

const fmtDateTime = (v) => (v ? String(v).replace("T", " ").slice(0, 16) : "—");
const money2 = (v) =>
  `Rs.${num(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const headerBtn =
  "inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all duration-200";

const HRPayslip = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [viewingPayslip, setViewingPayslip] = useState(null);

  // Employee details from the user database; salaries from hrm_db_hr (basic_payments + additional_payments)
  const [employees, setEmployees] = useState([]);
  const [sheets, setSheets] = useState([]);
  // Raw rows of hrm_db_hr.basic_payments / additional_payments, used when the pay sheet did not match
  const [basicPayments, setBasicPayments] = useState([]);
  const [additionalPayments, setAdditionalPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  // A message handed over by the Individual Allowance & Deduction / Allowance Requests pages
  const [message, setMessage] = useState(location.state?.message || "");
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 5;

  // "roles" = job role salaries (basic_payments); "employees" = per-employee pay sheets
  const [activeTab, setActiveTab] = useState("roles");
  // Departments (name + short code) for the department filter and the department-code search
  const [departments, setDepartments] = useState([]);
  const [deptFilter, setDeptFilter] = useState("");
  const [rolePage, setRolePage] = useState(1);
  // Result of the last "Generate All": who got a payslip and who was skipped (with the reason)
  const [genResult, setGenResult] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  // Payslip being sent from the view popup: { email, state: "sending" | "sent" | "error", text }
  const [sendState, setSendState] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (location.state?.message) {
      const t = setTimeout(() => setMessage(""), 5000);
      // Clear the navigation state so a refresh does not show it again
      navigate(location.pathname, { replace: true, state: null });
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (s) {
      const u = JSON.parse(s);
      if (u.role !== "HR_MANAGER" && u.role !== "ADMIN") {
        navigate("/unauthorized");
        return;
      }
      setUser(u);
    } else navigate("/login");
  }, [navigate]);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const empRes = await userHrApi.getEmployees();
      const emps = (empRes.data || []).filter((e) => e.email);
      setEmployees(emps);
      const sheetRes = await hrApi.getPaySheets(
        emps.map((e) => ({
          email: e.email,
          employeeCode: e.employeeId,
          fullName: e.fullName,
          departmentName: e.departmentName,
          designation: e.designation,
          employmentType: e.employmentType,
        })),
      );
      setSheets(sheetRes.data || []);
      const [basicRes, additionalRes] = await Promise.all([
        hrApi.getBasicPayments().catch(() => ({ data: [] })),
        hrApi.getAdditionalPayments().catch(() => ({ data: [] })),
      ]);
      setBasicPayments(basicRes.data || []);
      setAdditionalPayments(additionalRes.data || []);
      hrApi
        .getDepartments()
        .then((r) => setDepartments(r.data || []))
        .catch(() => {});
    } catch (e) {
      console.error("Failed to load payroll data", e);
      setLoadError(
        (e.message || "Failed to load payroll data").replace(/^\d{3}:\s*/, ""),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const flash = (text, ms = 6000) => {
    setMessage(text);
    setTimeout(() => setMessage(""), ms);
  };

  // Generates the month's payslips for everyone with a salary and delivers them to the employees
  const handleGenerateAll = async () => {
    setGenerating(true);
    setLoadError("");
    try {
      const [year, month] = filterMonth.split("-").map((n) => parseInt(n, 10));
      setGenResult(null);
      const res = await hrApi.generatePayroll(month, year);
      const sent = res?.data?.generated ?? 0;
      const skipped = res?.data?.skipped || [];
      setGenResult({ month: filterMonth, sent, skipped });
      if (sent > 0)
        flash(
          `✓ ${sent} payslip(s) for ${filterMonth} sent — employees see them on their Payslip page.`,
        );
      else
        setLoadError(
          `No payslips were sent for ${filterMonth}. See the reasons below.`,
        );
      loadData();
    } catch (e) {
      setLoadError(
        (e.message || "Failed to generate payroll").replace(/^\d{3}:\s*/, ""),
      );
    } finally {
      setGenerating(false);
    }
  };

  // Sends one employee's payslip for the selected month
  const handleSendPayslip = async (row) => {
    const [year, month] = filterMonth.split("-").map((n) => parseInt(n, 10));
    setSendState({ email: row.email, state: "sending", text: "" });
    try {
      await hrApi.sendPayslip(row.email, month, year);
      setSendState({
        email: row.email,
        state: "sent",
        text: `Payslip for ${filterMonth} sent to ${row.name}`,
      });
    } catch (e) {
      setSendState({
        email: row.email,
        state: "error",
        text: (e.message || "Failed to send payslip").replace(/^\d{3}:\s*/, ""),
      });
    }
  };

  const closePayslip = () => {
    setViewingPayslip(null);
    setSendState(null);
  };

  const payrollData = useMemo(() => {
    const byEmail = new Map(
      sheets.map((s) => [(s.employeeEmail || "").toLowerCase(), s]),
    );
    const deptCodeByName = new Map(
      departments.map((d) => [norm(d.name), d.shortCode || ""]),
    );
    return employees.map((emp) => {
      const sheet = resolveSheet(
        emp,
        byEmail.get(emp.email.trim().toLowerCase()),
        basicPayments,
        additionalPayments,
      );
      const hasAdjustments = (sheet?.additionalItems || []).length > 0;
      return {
        id: emp.id,
        email: emp.email,
        empId: emp.employeeId || `EMP${emp.id}`,
        name: emp.fullName,
        department: emp.departmentName || "—",
        departmentCode: deptCodeByName.get(norm(emp.departmentName)) || "",
        designation: emp.designation || "—",
        employmentType: emp.employmentType || "",
        month: filterMonth,
        basicSalary: num(sheet?.basicSalary),
        allowances: num(sheet?.totalAllowance),
        deductions: num(sheet?.totalDeduction),
        netSalary: num(sheet?.netTotal),
        status: !sheet?.configured
          ? "Not Configured"
          : hasAdjustments
            ? "Adjusted"
            : "Configured",
        // Why no job role salary matched, shown under the Basic column
        missingReason: sheet?.configured
          ? ""
          : !emp.designation
            ? "No job role set for this employee"
            : !emp.employmentType
              ? "No employment type set for this employee"
              : (sheet?.configuredEmploymentTypes || []).length > 0
                ? `${emp.designation} has salary only for: ${sheet.configuredEmploymentTypes.join(", ")} — add one for ${emp.employmentType}`
                : `No salary added for ${emp.designation} (${emp.employmentType})`,
        sheet,
      };
    });
  }, [
    employees,
    sheets,
    basicPayments,
    additionalPayments,
    filterMonth,
    departments,
  ]);

  // ── Job role salaries (rows of basic_payments added via "Add Salaries for Job Roles") ──
  const editRoleSalary = (row) =>
    navigate("/hr/payroll/salaries", { state: { editRow: row } });

  const deleteRoleSalary = async (row) => {
    try {
      setDeletingId(row.id);
      await hrApi.deleteBasicPayment(row.id);
      setConfirmDeleteId(null);
      setMessage(
        `✓ Salary row deleted for ${row.jobRoleTitle} (${row.employmentTypeName})`,
      );
      setTimeout(() => setMessage(""), 3000);
      loadData();
    } catch (e) {
      setLoadError(
        (e.message || "Failed to delete salary row").replace(/^\d{3}:\s*/, ""),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const stats = {
    total: payrollData.length,
    payroll: payrollData.reduce((s, p) => s + p.netSalary, 0),
    configured: payrollData.filter((p) => p.status !== "Not Configured").length,
    pending: payrollData.filter((p) => p.status === "Not Configured").length,
  };

  // Exports the employees currently shown (search + department filter) for the selected month
  const exportRows = () =>
    filtered.map((p) => [
      p.empId,
      p.name,
      p.department,
      p.designation,
      p.employmentType || "",
      periodLabel(p.sheet?.period),
      Math.round(p.basicSalary * 100) / 100,
      Math.round(p.allowances * 100) / 100,
      Math.round(p.deductions * 100) / 100,
      Math.round(p.netSalary * 100) / 100,
      p.status,
    ]);
  const EXPORT_HEADERS = [
    "Employee ID",
    "Employee",
    "Department",
    "Designation",
    "Employment Type",
    "Pay Period",
    "Basic",
    "Allowances",
    "Deductions",
    "Net Salary",
    "Status",
  ];

  const handleExport = (kind) => {
    setExportOpen(false);
    if (filtered.length === 0) {
      setLoadError(
        "Nothing to export — no employees match the current search / filters.",
      );
      return;
    }
    const rows = exportRows();
    const file = `payroll-${filterMonth}`;
    if (kind === "csv") {
      downloadCsvFile(`${file}.csv`, EXPORT_HEADERS, rows);
    } else {
      const sum = (i) => rows.reduce((t, r) => t + (Number(r[i]) || 0), 0);
      downloadWorkbook(`${file}.xls`, [
        {
          name: `Payroll ${filterMonth}`,
          title: `Payroll — ${filterMonth}`,
          subtitle: `${rows.length} employee(s)${deptFilter ? ` · ${deptFilter}` : ""} · exported ${new Date().toLocaleString()}`,
          headers: EXPORT_HEADERS,
          rows,
          totals: [
            "Total",
            "",
            "",
            "",
            "",
            "",
            sum(6),
            sum(7),
            sum(8),
            sum(9),
            "",
          ],
        },
      ]);
    }
    flash(`✓ Exported ${rows.length} employee(s) for ${filterMonth}`, 3500);
  };

  const deptOptions = useMemo(() => {
    const byKey = new Map(
      departments
        .filter((d) => d.active !== false)
        .map((d) => [norm(d.name), { name: d.name, code: d.shortCode || "" }]),
    );
    employees.forEach((e) => {
      const k = norm(e.departmentName);
      if (k && !byKey.has(k))
        byKey.set(k, { name: e.departmentName, code: "" });
    });
    return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [departments, employees]);

  const q = searchTerm.trim().toLowerCase();
  const filtered = payrollData.filter(
    (p) =>
      (!deptFilter || norm(p.department) === norm(deptFilter)) &&
      ((p.name || "").toLowerCase().includes(q) ||
        p.empId.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q) ||
        (p.departmentCode || "").toLowerCase().includes(q) ||
        p.designation.toLowerCase().includes(q)),
  );

  const filteredRoles = basicPayments.filter(
    (r) =>
      (r.departmentName || "").toLowerCase().includes(q) ||
      (r.jobRoleTitle || "").toLowerCase().includes(q) ||
      (r.employmentTypeName || "").toLowerCase().includes(q) ||
      (r.createdByName || "").toLowerCase().includes(q),
  );
  const roleTotalPages = Math.max(
    1,
    Math.ceil(filteredRoles.length / ROWS_PER_PAGE),
  );
  const paginatedRoles = filteredRoles.slice(
    (rolePage - 1) * ROWS_PER_PAGE,
    rolePage * ROWS_PER_PAGE,
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterMonth, deptFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setRolePage(1);
  }, [searchTerm]);
  useEffect(() => {
    if (rolePage > roleTotalPages) setRolePage(roleTotalPages);
  }, [rolePage, roleTotalPages]);

  const statusBadge = (s) =>
    ({
      Configured: "bg-emerald-100 text-emerald-700",
      Adjusted: "bg-primary-100 text-primary-700",
    })[s] || "bg-amber-100 text-amber-700";

  if (!user) return null;

  return (
    <PageLayout
      role="hr"
      activePage="Payroll"
      title="Payroll Management"
      subtitle="Manage employee salaries and payslips"
      actions={
        <div className="flex flex-wrap items-center gap-2 w-full">
          <button
            onClick={() => navigate("/hr/payroll/salaries")}
            className={`${headerBtn} justify-center flex-1 sm:flex-none`}
          >
            <Plus size={17} strokeWidth={2.5} /> Add Salaries for Job Roles
          </button>
          <button
            onClick={() => navigate("/hr/payroll/individual-allowance")}
            className={`${headerBtn} justify-center flex-1 sm:flex-none`}
          >
            <SlidersHorizontal size={16} /> Individual Allowance & Deduction
          </button>
          <button
            onClick={() => navigate("/hr/payroll/allowance-requests")}
            className={`${headerBtn} justify-center flex-1 sm:flex-none`}
          >
            <Inbox size={16} /> See Allowance Requests
          </button>
          <button
            onClick={handleGenerateAll}
            disabled={generating}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all duration-200"
          >
            {generating ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}{" "}
            {generating ? "Generating…" : "Generate All"}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {message && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
            <Check size={18} className="shrink-0" />
            {message}
          </div>
        )}
        {loadError && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {loadError}
          </div>
        )}

        {genResult && genResult.skipped.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold">
                {genResult.sent} sent · {genResult.skipped.length} skipped for{" "}
                {genResult.month}
              </p>
              <button
                onClick={() => setGenResult(null)}
                className="text-amber-700 hover:text-amber-900"
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
            <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {genResult.skipped.map((k, i) => (
                <li key={i}>
                  <b>{k.employee}</b> — {k.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
          {[
            {
              label: "Employees",
              value: stats.total,
              subtitle: "Total employees in payroll",
              color: "bg-primary-600",
              icon: Users,
            },
            {
              label: "Total Net Pay",
              value: `Rs.${(stats.payroll / 1000).toFixed(0)}K`,
              subtitle: "Combined employee net salary",
              color: "bg-primary-500",
              icon: DollarSign,
            },
            {
              label: "Configured",
              value: stats.configured,
              subtitle: "Employees with salary setup",
              color: "bg-primary-700",
              icon: Check,
            },
            {
              label: "Pending Setup",
              value: stats.pending,
              subtitle: "Employees awaiting salary setup",
              color: "bg-primary-800",
              icon: Calendar,
            },
          ].map((s) => {
            const Icon = s.icon;

            return (
              <div
                key={s.label}
                className={`${s.color} relative overflow-hidden p-6 rounded-2xl text-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
              >
                {/* Decorative circles */}
                <div className="absolute -right-6 -top-8 w-28 h-28 rounded-full bg-white/10" />
                <div className="absolute -right-2 -bottom-12 w-24 h-24 rounded-full bg-white/10" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/85 text-sm font-medium">
                      {s.label}
                    </p>
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Icon size={21} className="text-white" />
                    </div>
                  </div>

                  <p className="text-3xl font-bold tracking-tight">{s.value}</p>
                  <p className="text-xs text-white/75 mt-2">{s.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="inline-flex flex-wrap bg-white border border-slate-200 shadow-sm rounded-xl p-1 gap-1">
          {[
            { key: "roles", label: "Job Role Salaries", icon: Briefcase },
            { key: "employees", label: "Employee Payslips", icon: Users },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === t.key
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-primary-50 hover:text-primary-700"
              }`}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        {/* SEARCH & FILTER CONTROLS */}
        <div className="overflow-visible bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Find Payroll Records
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Search, filter, and export salary information
            </p>
          </div>

          <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between p-4 sm:p-5">
            <div className="relative flex-1 min-w-0">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  activeTab === "roles"
                    ? "Search by department, job role, employment type or set by…"
                    : "Search by name, ID, department, department code or designation…"
                }
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"
              />
            </div>

            {activeTab === "employees" && (
              <>
                <div className="relative">
                  <Building2
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:outline-none focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all min-w-[200px]"
                  >
                    <option value="">All departments</option>
                    {deptOptions.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                        {d.code ? ` (${d.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <Calendar
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="month"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"
                  />
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setExportOpen((o) => !o)}
                    aria-haspopup="menu"
                    aria-expanded={exportOpen}
                    className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all duration-200"
                  >
                    <Download size={15} />
                    Export
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${exportOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {exportOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setExportOpen(false)}
                      />

                      <div
                        role="menu"
                        className="absolute right-0 mt-2 w-64 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
                      >
                        <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          {filterMonth} · {filtered.length} employee(s)
                        </p>

                        <button
                          role="menuitem"
                          onClick={() => handleExport("xls")}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-primary-50 text-left transition-colors"
                        >
                          <FileSpreadsheet
                            size={16}
                            className="text-emerald-600"
                          />
                          <span>
                            <b className="font-semibold">Excel</b>{" "}
                            <span className="text-slate-400">
                              · with totals
                            </span>
                          </span>
                        </button>

                        <button
                          role="menuitem"
                          onClick={() => handleExport("csv")}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-primary-50 text-left transition-colors"
                        >
                          <FileText size={16} className="text-primary-600" />
                          <span>
                            <b className="font-semibold">CSV</b>{" "}
                            <span className="text-slate-400">· plain data</span>
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {activeTab === "roles" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Briefcase size={18} className="text-primary-600" /> Job Role
                Salaries
                <span className="text-xs font-normal text-slate-400">
                  · added through “Add Salaries for Job Roles”
                </span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary-700 text-white text-xs">
                    {[
                      "Department",
                      "Job Role",
                      "Employment Type",
                      "Period",
                      "Basic",
                      "Allowance",
                      "Deduction",
                      "Total Salary",
                      "Employees",
                      "Set By",
                      "Last Updated",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3.5 text-left font-semibold whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRoles.map((r, i) => (
                    <tr
                      key={r.id}
                      className={`hover:bg-primary-50/60 transition-colors ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}
                    >
                      <td className="px-5 py-3 text-slate-600">
                        {r.departmentName}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {r.jobRoleTitle}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {r.employmentTypeName}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {periodLabel(r.period) || "—"}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-800 whitespace-nowrap">
                        {money2(r.basicSalary)}
                      </td>
                      <td className="px-5 py-3 text-emerald-600 font-semibold whitespace-nowrap">
                        +{money2(r.allowance)}
                      </td>
                      <td className="px-5 py-3 text-red-600 font-semibold whitespace-nowrap">
                        -{money2(r.deduction)}
                      </td>
                      <td className="px-5 py-3 font-bold text-primary-700 whitespace-nowrap">
                        {money2(r.totalSalary)}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {r.employeeCount ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {r.createdByName || "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                        {fmtDateTime(r.updatedAt)}
                      </td>
                      <td className="px-5 py-3">
                        {confirmDeleteId === r.id ? (
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <button
                              onClick={() => deleteRoleSalary(r)}
                              disabled={deletingId === r.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                            >
                              {deletingId === r.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Trash2 size={13} />
                              )}{" "}
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={deletingId === r.id}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold disabled:opacity-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => editRoleSalary(r)}
                              title="Edit this salary row"
                              className="p-1.5 text-slate-400 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(r.id)}
                              title="Delete this salary row"
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {isLoading && (
                    <tr>
                      <td
                        colSpan={12}
                        className="text-center py-10 text-slate-400"
                      >
                        Loading job role salaries…
                      </td>
                    </tr>
                  )}
                  {!isLoading && filteredRoles.length === 0 && (
                    <tr>
                      <td
                        colSpan={12}
                        className="text-center py-10 text-slate-400"
                      >
                        {searchTerm
                          ? "No job role salaries match your search"
                          : "No job role salaries added yet. Click “Add Salaries for Job Roles” to add one."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {!isLoading && filteredRoles.length > 0 && (
              <div className="flex flex-col items-center gap-2 px-5 py-4 border-t border-slate-200">
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRolePage((p) => Math.max(1, p - 1))}
                    disabled={rolePage === 1}
                    aria-label="Previous page"
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-600 border border-slate-200 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  {Array.from(
                    { length: roleTotalPages },
                    (_, idx) => idx + 1,
                  ).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setRolePage(pg)}
                      className={`h-8 min-w-[2rem] px-2 rounded-lg text-xs font-semibold transition-colors ${pg === rolePage ? "bg-primary-600 text-white shadow-sm" : "text-slate-600 border border-slate-200 hover:bg-primary-50 hover:text-primary-700"}`}
                    >
                      {pg}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setRolePage((p) => Math.min(roleTotalPages, p + 1))
                    }
                    disabled={rolePage === roleTotalPages}
                    aria-label="Next page"
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-600 border border-slate-200 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Showing{" "}
                  <strong className="text-slate-800">
                    {(rolePage - 1) * ROWS_PER_PAGE + 1}-
                    {Math.min(rolePage * ROWS_PER_PAGE, filteredRoles.length)}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-slate-800">
                    {filteredRoles.length}
                  </strong>{" "}
                  salary rows
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "employees" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary-700 text-white text-xs">
                    {[
                      "Emp ID",
                      "Employee",
                      "Dept",
                      "Designation",
                      "Basic",
                      "Allowances",
                      "Deductions",
                      "Net Salary",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-4 text-left font-semibold whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((p, i) => (
                    <tr
                      key={p.email}
                      className={`hover:bg-primary-50/60 transition-colors ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}
                    >
                      <td className="px-5 py-3.5 font-mono font-semibold text-slate-700">
                        {p.empId}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        {p.name}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {p.department}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">
                        {p.designation}
                      </td>
                      <td className="px-5 py-3.5 font-semibold whitespace-nowrap">
                        {p.missingReason ? (
                          <>
                            <span className="text-slate-400">Not set</span>
                            <p className="text-[11px] font-normal text-amber-600 whitespace-normal max-w-[180px] mt-0.5">
                              {p.missingReason}
                            </p>
                          </>
                        ) : (
                          money(p.basicSalary)
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-emerald-600 font-semibold whitespace-nowrap">
                        +{money(p.allowances)}
                      </td>
                      <td className="px-5 py-3.5 text-red-600 font-semibold whitespace-nowrap">
                        -{money(p.deductions)}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-primary-700 whitespace-nowrap">
                        {money(p.netSalary)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadge(p.status)}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setViewingPayslip(p)}
                            title="View Payslip"
                            className="p-1.5 text-slate-400 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() =>
                              navigate("/hr/payroll/individual-allowance", {
                                state: { email: p.email },
                              })
                            }
                            title="Edit allowances & deductions"
                            aria-label="Edit allowances & deductions"
                            className="p-1.5 text-slate-400 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!isLoading &&
                    paginated.length > 0 &&
                    paginated.length < ROWS_PER_PAGE &&
                    Array.from({
                      length: ROWS_PER_PAGE - paginated.length,
                    }).map((_, idx) => (
                      <tr key={`filler-${idx}`} aria-hidden="true">
                        <td colSpan={10} className="px-5 py-3.5">
                          &nbsp;
                        </td>
                      </tr>
                    ))}
                  {!isLoading && filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="text-center py-10 text-slate-400"
                      >
                        {searchTerm || deptFilter
                          ? "No employees match your search / department"
                          : "No employees found"}
                      </td>
                    </tr>
                  )}
                  {isLoading && (
                    <tr>
                      <td
                        colSpan={10}
                        className="text-center py-10 text-slate-400"
                      >
                        Loading payroll data…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {!isLoading && filtered.length > 0 && (
              <div className="flex flex-col items-center gap-2 px-5 py-4 border-t border-slate-200">
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-600 border border-slate-200 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
                    (p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`h-8 min-w-[2rem] px-2 rounded-lg text-xs font-semibold transition-colors ${
                          p === currentPage
                            ? "bg-primary-600 text-white shadow-sm"
                            : "text-slate-600 border border-slate-200 hover:bg-primary-50 hover:text-primary-700"
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-600 border border-slate-200 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Showing{" "}
                  <strong className="text-slate-800">
                    {(currentPage - 1) * ROWS_PER_PAGE + 1}-
                    {Math.min(currentPage * ROWS_PER_PAGE, filtered.length)}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-slate-800">{filtered.length}</strong>{" "}
                  employees
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {viewingPayslip &&
        (() => {
          const s = viewingPayslip.sheet || {};
          const items = s.additionalItems || [];
          return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between p-6 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-t-2xl">
                  <div>
                    <h3 className="text-xl font-bold">
                      Payslip – {viewingPayslip.month}
                    </h3>
                    <p className="text-primary-100 text-sm">
                      {viewingPayslip.name} · {viewingPayslip.empId}
                    </p>
                  </div>
                  <button
                    onClick={closePayslip}
                    className="p-1.5 hover:bg-white/20 rounded-xl"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ["Employee", viewingPayslip.name],
                      ["Employee ID", viewingPayslip.empId],
                      ["Email", viewingPayslip.email],
                      ["Payslip Month", viewingPayslip.month],
                      ["Department", viewingPayslip.department],
                      ["Designation", viewingPayslip.designation],
                      ["Employment Type", viewingPayslip.employmentType || "—"],
                      ["Pay Period", periodLabel(s.period) || "—"],
                    ].map(([l, v]) => (
                      <div
                        key={l}
                        className="bg-slate-50 p-3 rounded-xl border border-slate-100"
                      >
                        <p className="text-xs text-slate-400 mb-0.5">{l}</p>
                        <p className="font-semibold text-slate-900 break-all">
                          {v}
                        </p>
                      </div>
                    ))}
                  </div>
                  {!s.configured && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                      No job role salary is set for this employee's job role and
                      employment type yet.
                    </p>
                  )}
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2 text-sm">
                      Earnings
                    </h4>
                    <div className="space-y-2 text-sm">
                      {[
                        ["Basic Salary", s.basicSalary],
                        ["Job Role Allowance", s.roleAllowance],
                        ...items
                          .filter((i) => i.type === "ALLOWANCE")
                          .map((i) => [i.name, i.amount]),
                      ].map(([l, v], idx) => (
                        <div
                          key={`${l}-${idx}`}
                          className="flex justify-between py-1.5 border-b border-slate-100"
                        >
                          <span className="text-slate-600">{l}</span>
                          <span className="font-medium">{money(v)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2 bg-emerald-50 px-2 rounded-lg font-bold text-emerald-700">
                        <span>Total Earnings</span>
                        <span>
                          {money(
                            viewingPayslip.basicSalary +
                              viewingPayslip.allowances,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2 text-sm">
                      Deductions
                    </h4>
                    <div className="space-y-2 text-sm">
                      {[
                        ["Job Role Deduction", s.roleDeduction],
                        ...items
                          .filter((i) => i.type === "DEDUCTION")
                          .map((i) => [i.name, i.amount]),
                      ].map(([l, v], idx) => (
                        <div
                          key={`${l}-${idx}`}
                          className="flex justify-between py-1.5 border-b border-slate-100"
                        >
                          <span className="text-slate-600">{l}</span>
                          <span className="font-medium">{money(v)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2 bg-red-50 px-2 rounded-lg font-bold text-red-600">
                        <span>Total Deductions</span>
                        <span>{money(viewingPayslip.deductions)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-primary-700 to-primary-800 text-white p-5 rounded-2xl flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-primary-100 text-xs mb-0.5">
                        Net Salary
                      </p>
                      <p className="text-3xl font-bold">
                        {money(viewingPayslip.netSalary)}
                      </p>
                    </div>
                    <DollarSign size={40} className="opacity-40" />
                  </div>
                  {sendState?.email === viewingPayslip.email &&
                    sendState.state !== "sending" && (
                      <p
                        className={`text-sm rounded-xl px-4 py-3 border ${sendState.state === "sent" ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}
                      >
                        {sendState.state === "sent" ? "✓ " : ""}
                        {sendState.text}
                      </p>
                    )}
                  {viewingPayslip.status === "Not Configured" && (
                    <p className="text-xs text-amber-700">
                      A payslip can only be sent once a salary is set up for
                      this employee.
                    </p>
                  )}
                  <div className="flex gap-3">
                    {(() => {
                      const sending =
                        sendState?.email === viewingPayslip.email &&
                        sendState.state === "sending";
                      const sent =
                        sendState?.email === viewingPayslip.email &&
                        sendState.state === "sent";
                      return (
                        <button
                          onClick={() => handleSendPayslip(viewingPayslip)}
                          disabled={
                            sending ||
                            viewingPayslip.status === "Not Configured"
                          }
                          className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
                        >
                          {sending ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : sent ? (
                            <Check size={15} />
                          ) : (
                            <Send size={15} />
                          )}
                          {sending
                            ? "Sending…"
                            : sent
                              ? "Sent — send again"
                              : "Send to employee"}
                        </button>
                      );
                    })()}
                    <button
                      onClick={closePayslip}
                      className="flex-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-sm transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </PageLayout>
  );
};
export default HRPayslip;
