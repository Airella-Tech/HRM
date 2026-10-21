import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Clock, CalendarDays, Wallet, UserPlus, AlertTriangle, RefreshCw, Download, Printer,
  ChevronRight, CheckCircle2, Cake, Award, SlidersHorizontal, Info, TrendingUp, TrendingDown,
  FileText, ChevronDown, Loader2,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { hrApi, userHrApi } from "../../services/api";
import {
  BarChart, Badge, ChartCard, DataTable, DonutChart, EmptyState, HBars, KpiCard, Legend, RateBar, TrendChart, Delta,
} from "../../components/ReportCharts";
import { COLORS } from "../../utils/chartTheme";
import {
  ARRIVAL_BINS, DEFAULT_RULES, PERIODS, bucketize, computeAttendance, computeLeave, computePayroll, computeToday,
  computeWorkforce, downloadCsv, fmtDate, fmtDayMonth, fmtHours, fmtMoney, fmtMoneyShort, fmtNum, fmtPct, normEmployees,
  normLeaves, rangeText, resolveRange, startOfDay, titleCase, ymd,
} from "../../utils/reportData";
import { downloadReportPdf } from "../../utils/exportPdf";
import { buildPeriodReport, periodBounds } from "../../utils/periodReport";

const RULES_KEY = "hrReportAttendanceRules";
const loadRules = () => {
  try { return { ...DEFAULT_RULES, ...(JSON.parse(localStorage.getItem(RULES_KEY)) || {}) }; } catch { return DEFAULT_RULES; }
};
const toArr = (r) => (Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : []);
const axisMoney = (v) => (v >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${+(v / 1e3).toFixed(0)}K` : `${v}`);
const pctAxis = (v) => `${v}%`;
const TABS = [
  ["overview", "Overview"], ["workforce", "Workforce"], ["attendance", "Attendance"], ["leave", "Leave"], ["payroll", "Payroll"],
];
const LEAVE_TONE = { APPROVED: "green", PENDING: "amber", REJECTED: "red", CANCELLED: "gray" };
const STATUS_COLORS = { Approved: COLORS.emerald, Pending: COLORS.amber, Rejected: COLORS.rose, Cancelled: COLORS.slate };

const selectCls = "border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500";

const Skeleton = () => (
  <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Loading report">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
      {[...Array(6)].map((_, i) => <div key={i} className="h-36 rounded-2xl bg-white border border-gray-100" />)}
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div className="xl:col-span-2 h-72 rounded-2xl bg-white border border-gray-100" />
      <div className="h-72 rounded-2xl bg-white border border-gray-100" />
    </div>
  </div>
);

const Report = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("overview");
  const [periodKey, setPeriodKey] = useState("last30");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [dept, setDept] = useState("all");
  const [rules, setRules] = useState(loadRules);
  const [showRules, setShowRules] = useState(false);

  const [core, setCore] = useState({ employees: [], departments: [], leaves: [], allowances: [], adjustments: [], sheets: [] });
  const [attRows, setAttRows] = useState([]);
  const [coreLoading, setCoreLoading] = useState(true);
  const [attLoading, setAttLoading] = useState(true);
  const [coreFailed, setCoreFailed] = useState([]);
  const [attFailed, setAttFailed] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Monthly / yearly report export
  const nowD = new Date();
  const [exportOpen, setExportOpen] = useState(false);
  const [exportKind, setExportKind] = useState("monthly");
  const [exportMonth, setExportMonth] = useState(`${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, "0")}`);
  const [exportYear, setExportYear] = useState(String(nowD.getFullYear()));
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState(null); // { ok, text }

  // ── auth guard (same rule as the other HR pages) ────────────────────────────
  useEffect(() => {
    const s = localStorage.getItem("user");
    if (!s) { navigate("/login"); return; }
    const u = JSON.parse(s);
    if (u.role !== "HR_MANAGER" && u.role !== "ADMIN") { navigate("/unauthorized"); return; }
    setUser(u);
  }, [navigate]);

  const today = useMemo(() => startOfDay(new Date()), [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const range = useMemo(() => resolveRange(periodKey, custom, today), [periodKey, custom, today]);
  const customIncomplete = periodKey === "custom" && !(custom.from && custom.to && custom.from <= custom.to);

  // ── data: company-wide sources (loaded once + on refresh) ───────────────────
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    (async () => {
      setCoreLoading(true);
      const [emp, depts, leaves, allow, adj] = await Promise.allSettled([
        userHrApi.getEmployees(), hrApi.getDepartments(), hrApi.getLeaveRequests(), hrApi.getAllowanceRequests(), hrApi.getPendingAdjustments(),
      ]);
      const fails = [];
      const take = (r, name) => { if (r.status === "fulfilled") return toArr(r.value); fails.push(name); return []; };
      const employees = take(emp, "Employees");
      const next = {
        employees, departments: take(depts, "Departments"), leaves: take(leaves, "Leave"),
        allowances: take(allow, "Allowance requests"), adjustments: take(adj, "Attendance adjustments"), sheets: [],
      };
      const payable = employees.filter((e) => e.email && String(e.status || "ACTIVE").toUpperCase() === "ACTIVE");
      if (payable.length) {
        try {
          const r = await hrApi.getPaySheets(payable.map((e) => ({
            email: e.email, employeeCode: e.employeeId, fullName: e.fullName,
            departmentName: e.departmentName, designation: e.designation, employmentType: e.employmentType,
          })));
          next.sheets = toArr(r);
        } catch { fails.push("Payroll"); }
      }
      if (cancelled) return;
      setCore(next); setCoreFailed(fails); setCoreLoading(false); setUpdatedAt(new Date());
    })();
    return () => { cancelled = true; };
  }, [user, refreshKey]);

  // ── data: attendance for [previous period start … period end] ───────────────
  const fromStr = ymd(range.prevStart), toStr = ymd(range.end);
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    setAttLoading(true);
    hrApi.getAttendanceRange(fromStr, toStr)
      .then((r) => { if (!cancelled) { setAttRows(toArr(r)); setAttFailed(false); } })
      .catch(() => { if (!cancelled) { setAttRows([]); setAttFailed(true); } })
      .finally(() => { if (!cancelled) setAttLoading(false); });
    return () => { cancelled = true; };
  }, [user, fromStr, toStr, refreshKey]);

  useEffect(() => { try { localStorage.setItem(RULES_KEY, JSON.stringify(rules)); } catch { /* ignore */ } }, [rules]);

  // ── derived data ────────────────────────────────────────────────────────────
  const empsAll = useMemo(() => normEmployees(core.employees), [core.employees]);
  const deptOptions = useMemo(() => {
    const s = new Set(empsAll.map((e) => e.dept));
    core.departments.forEach((d) => d.name && d.active !== false && s.add(d.name));
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [empsAll, core.departments]);
  const inDept = useCallback((name) => dept === "all" || (name || "Unassigned") === dept, [dept]);
  const emps = useMemo(() => empsAll.filter((e) => inDept(e.dept)), [empsAll, inDept]);

  const leaves = useMemo(() => {
    const deptByCode = new Map(empsAll.map((e) => [e.code, e.dept]));
    return normLeaves(core.leaves).map((l) => ({ ...l, dept: deptByCode.get(l.code) || l.dept })).filter((l) => inDept(l.dept));
  }, [core.leaves, empsAll, inDept]);

  const wf = useMemo(() => computeWorkforce(emps, range, today), [emps, range, today]);
  const att = useMemo(() => computeAttendance({ rows: attRows, emps, leaves, range, today, rules }), [attRows, emps, leaves, range, today, rules]);
  const attPrev = useMemo(
    () => computeAttendance({ rows: attRows, emps, leaves, range: { ...range, start: range.prevStart, end: range.prevEnd }, today, rules }),
    [attRows, emps, leaves, range, today, rules],
  );
  const trend = useMemo(() => bucketize(att.perDate), [att.perDate]);
  const snap = useMemo(() => computeToday({ rows: attRows, emps, leaves, today }), [attRows, emps, leaves, today]);
  const lv = useMemo(() => computeLeave({ leaves, range, today }), [leaves, range, today]);

  const pay = useMemo(() => {
    const deptByEmail = new Map(empsAll.map((e) => [e.email, e.dept]));
    const sheets = core.sheets.filter((s) => inDept(s.departmentName));
    const reqs = core.allowances.filter((r) => dept === "all" || deptByEmail.get(String(r.employeeEmail || "").toLowerCase()) === dept);
    return computePayroll(sheets, reqs);
  }, [core.sheets, core.allowances, empsAll, dept, inDept]);

  const adjustments = useMemo(() => core.adjustments.filter((a) => inDept(a.departmentName)), [core.adjustments, inDept]);

  const startCutoff = useMemo(() => {
    const [h = 9, m = 0] = String(rules.shiftStart).split(":").map(Number);
    return h * 60 + m + (Number(rules.graceMin) || 0);
  }, [rules]);

  const rateFloor = useMemo(() => {
    const rates = trend.buckets.map((b) => b.rate).filter((r) => r != null);
    if (!rates.length) return 0;
    return Math.max(0, Math.floor((Math.min(...rates) - 5) / 10) * 10);
  }, [trend.buckets]);

  const arrivalView = useMemo(() => {
    const nz = att.arrival.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0);
    if (!nz.length) return { bins: ARRIVAL_BINS, values: att.arrival };
    const a = Math.max(0, nz[0] - 1), b = Math.min(ARRIVAL_BINS.length - 1, nz[nz.length - 1] + 1);
    return { bins: ARRIVAL_BINS.slice(a, b + 1), values: att.arrival.slice(a, b + 1) };
  }, [att.arrival]);

  const pendingTotal = lv.pending.length + pay.pendingReqs.length + adjustments.length;
  const failedNames = [...coreFailed, ...(attFailed ? ["Attendance"] : [])];
  const initialLoading = (coreLoading || attLoading) && !updatedAt;
  const busy = coreLoading || attLoading;

  const actions = useMemo(() => {
    const oldest = lv.pending[0]?.ageDays ?? 0;
    return [
      { key: "leave", count: lv.pending.length, label: "Leave requests awaiting approval", detail: lv.pending.length ? `Oldest has been waiting ${oldest} day${oldest === 1 ? "" : "s"}` : "", tone: oldest >= 3 ? "red" : "amber", go: () => navigate("/hr/leave") },
      { key: "allow", count: pay.pendingReqs.length, label: "Allowance requests to review", detail: `${fmtMoney(pay.pendingAmount)} requested`, tone: "amber", go: () => navigate("/hr/payslip") },
      { key: "adj", count: adjustments.length, label: "Attendance adjustment requests", detail: "Employees asked to correct a record", tone: "amber", go: () => navigate("/hr/attendance") },
      { key: "nosal", count: pay.unconfigured.length, label: "Employees without a salary set up", detail: "They are missing from payroll totals", tone: "red", go: () => navigate("/hr/payroll/salaries") },
      { key: "open", count: att.openDays, label: "Days with a missed clock-out", detail: "In the selected period", tone: "amber", go: () => navigate("/hr/attendance") },
      { key: "low", count: att.perEmp.filter((r) => r.rate != null && r.rate < 80).length, label: "Employees below 80% attendance", detail: "In the selected period", tone: "red", go: () => setTab("attendance") },
      { key: "nodept", count: wf.noDept, label: "Employees with no department", detail: "Assign them so reports stay accurate", tone: "gray", go: () => navigate("/hr/employees") },
    ].filter((a) => a.count > 0);
  }, [lv.pending, pay.pendingReqs, pay.pendingAmount, pay.unconfigured, adjustments, att.openDays, att.perEmp, wf.noDept, navigate]);

  const highlights = useMemo(() => {
    const out = [];
    const rated = Object.entries(att.byDept).filter(([k, v]) => k !== "Unassigned" && v.rate != null).sort((a, b) => b[1].rate - a[1].rate);
    if (rated.length >= 2) {
      out.push({ icon: TrendingUp, tone: "green", text: `${rated[0][0]} has the strongest attendance at ${fmtPct(rated[0][1].rate)}.` });
      const last = rated[rated.length - 1];
      if (last[1].rate < 95) out.push({ icon: TrendingDown, tone: "amber", text: `${last[0]} is lowest at ${fmtPct(last[1].rate)}.` });
    }
    const late = [...att.perEmp].sort((a, b) => b.late - a.late)[0];
    if (late && late.late >= 3) out.push({ icon: Clock, tone: "amber", text: `${late.e.name} arrived late on ${late.late} days.` });
    if (lv.byType[0]) out.push({ icon: CalendarDays, tone: "blue", text: `${lv.byType[0].label} is the most used leave type, at ${lv.byType[0].value} day${lv.byType[0].value === 1 ? "" : "s"}.` });
    if (pay.byDept.length >= 2 && pay.net > 0 && pay.byDept[0].label !== "Unassigned") out.push({ icon: Wallet, tone: "violet", text: `${pay.byDept[0].label} accounts for ${((pay.byDept[0].value / pay.net) * 100).toFixed(0)}% of monthly payroll.` });
    if (wf.byDept.length >= 2 && wf.byDept[0].label !== "Unassigned") out.push({ icon: Users, tone: "blue", text: `${wf.byDept[0].label} is the largest department with ${wf.byDept[0].value} people.` });
    return out.slice(0, 4);
  }, [att.byDept, att.perEmp, lv.byType, pay.byDept, pay.net, wf.byDept]);

  const scorecard = useMemo(() => {
    const names = new Set(wf.byDept.map((d) => d.label));
    core.departments.filter((d) => d.active !== false && d.name && inDept(d.name)).forEach((d) => names.add(d.name));
    const pick = (arr, name) => arr.find((x) => x.label === name);
    return [...names].map((name) => {
      const p = pick(pay.byDept, name);
      return {
        name, manager: core.departments.find((d) => d.name === name)?.managerName || "—",
        headcount: pick(wf.byDept, name)?.value || 0, tenure: wf.deptTenure[name] ?? null,
        rate: att.byDept[name]?.rate ?? null, late: att.byDept[name]?.late || 0,
        leaveDays: pick(lv.byDept, name)?.value || 0, payroll: p?.value || 0, avgPay: p ? p.value / p.count : null,
      };
    });
  }, [wf.byDept, wf.deptTenure, core.departments, inDept, pay.byDept, att.byDept, lv.byDept]);

  // ── export ──────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const stamp = `${ymd(range.start)}_to_${ymd(range.end)}`;
    const name = (t) => `hr-report-${t}-${stamp}.csv`;
    if (tab === "workforce") {
      downloadCsv(name("workforce"), ["Employee ID", "Name", "Email", "Department", "Designation", "Employment type", "Role", "Status", "Joined", "Terminated"],
        emps.map((e) => [e.code, e.name, e.email, e.dept, e.designation, e.type, titleCase(e.role), titleCase(e.status), e.join ? ymd(e.join) : "", e.term ? ymd(e.term) : ""]));
    } else if (tab === "attendance") {
      downloadCsv(name("attendance"), ["Employee ID", "Name", "Department", "Working days", "Present", "Late", "Half days", "Absent", "On leave", "Missed clock-out", "Avg hours/day", "Attendance %"],
        att.perEmp.map((r) => [r.e.code, r.e.name, r.e.dept, r.expected, r.present, r.late, r.half, r.absent, r.leave, r.open, r.avgMinutes != null ? (r.avgMinutes / 60).toFixed(2) : "", r.rate != null ? r.rate.toFixed(1) : ""]));
    } else if (tab === "leave") {
      downloadCsv(name("leave"), ["Employee ID", "Name", "Department", "Leave type", "From", "To", "Days", "Status", "Submitted"],
        lv.inPeriod.map((l) => [l.code, l.name, l.dept, l.type, ymd(l.start), ymd(l.end), l.days, titleCase(l.status), l.created ? ymd(l.created) : ""]));
    } else if (tab === "payroll") {
      downloadCsv(name("payroll-monthly"), ["Employee ID", "Name", "Department", "Designation", "Employment type", "Basic", "Allowances", "Deductions", "Net", "Salary set up"],
        pay.rows.map((r) => [r.code, r.name, r.dept, r.designation, r.type, r.basic.toFixed(2), r.allowance.toFixed(2), r.deduction.toFixed(2), r.net.toFixed(2), r.configured ? "Yes" : "No"]));
    } else {
      downloadCsv(name("department-scorecard"), ["Department", "Manager", "Employees", "Avg tenure (yrs)", "Attendance %", "Late days", "Leave days", "Monthly payroll (net)", "Avg net pay"],
        scorecard.map((r) => [r.name, r.manager, r.headcount, r.tenure != null ? r.tenure.toFixed(1) : "", r.rate != null ? r.rate.toFixed(1) : "", r.late, r.leaveDays, r.payroll.toFixed(2), r.avgPay != null ? r.avgPay.toFixed(2) : ""]));
    }
  };

  // Full report for one month or one year (one PDF: overview page + a section per topic)
  const handlePeriodExport = async () => {
    const value = exportKind === "monthly" ? exportMonth : exportYear;
    setExportNote(null);
    const bounds = periodBounds(exportKind, value);
    if (!bounds) { setExportNote({ ok: false, text: exportKind === "monthly" ? "Pick a month first." : "Pick a year first." }); return; }
    setExporting(true);
    try {
      // The attendance on screen only covers the selected period, so fetch this report's own range
      const res = await hrApi.getAttendanceRange(bounds.from, bounds.to);
      const { filename, ...pdfSpec } = buildPeriodReport({
        kind: exportKind, value, attRows: toArr(res), emps, leaves, pay,
        departments: core.departments, rules, today,
        deptLabel: dept === "all" ? "All departments" : dept,
      });
      downloadReportPdf(filename, pdfSpec);
      setExportNote({ ok: true, text: `Downloaded ${filename}` });
    } catch (e) {
      setExportNote({ ok: false, text: (e.message || "Could not build the report").replace(/^\d{3}:\s*/, "") });
    } finally {
      setExporting(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // KPI strip
  // ═════════════════════════════════════════════════════════════════════════════
  const kpis = (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
      <KpiCard icon={Users} tint="teal" label="Active employees" value={fmtNum(wf.activeCount)}
        sub={wf.inactiveCount + wf.terminatedCount > 0 ? `${wf.inactiveCount} inactive · ${wf.terminatedCount} terminated` : "Everyone is active"} />
      <KpiCard icon={Clock} tint="sky" label="Attendance rate" value={fmtPct(att.rate)}
        delta={<Delta cur={att.rate} prev={attPrev.rate} mode="pts" />}
        sub={`${fmtNum(att.lateDays)} late arrivals · ${fmtNum(att.absentDays)} absences`}
        spark={trend.buckets.map((b) => b.rate)} />
      <KpiCard icon={CalendarDays} tint="amber" label="Leave days taken" value={fmtNum(lv.takenDays)}
        delta={<Delta cur={lv.takenDays} prev={lv.prevTakenDays} good="neutral" />}
        sub={`${lv.pending.length} request${lv.pending.length === 1 ? "" : "s"} pending approval`} />
      <KpiCard icon={Wallet} tint="violet" label="Monthly payroll (net)" value={fmtMoneyShort(pay.net)}
        sub={pay.configuredCount ? `Avg ${fmtMoneyShort(pay.avgNet)} per employee${pay.unconfigured.length ? ` · ${pay.unconfigured.length} not set up` : ""}` : "No salaries set up yet"} />
      <KpiCard icon={UserPlus} tint="mint" label="New hires" value={fmtNum(wf.hires.length)}
        delta={<Delta cur={wf.hires.length} prev={wf.prevHires.length} mode="abs" good="neutral" />}
        sub={`${wf.exits.length} left${wf.attritionRate != null ? ` · ${wf.attritionRate.toFixed(1)}% attrition` : ""}`}
        spark={wf.monthly.hires} />
      <KpiCard icon={AlertTriangle} tint={pendingTotal ? "rose" : "teal"} label="Pending approvals" value={fmtNum(pendingTotal)}
        sub={`Leave ${lv.pending.length} · Allowance ${pay.pendingReqs.length} · Attendance ${adjustments.length}`}
        onClick={() => { setTab("overview"); setTimeout(() => document.getElementById("needs-attention")?.scrollIntoView({ behavior: "smooth", block: "center" }), 60); }} />
    </div>
  );

  // ═════════════════════════════════════════════════════════════════════════════
  // Tabs
  // ═════════════════════════════════════════════════════════════════════════════
  const trendLabel = trend.mode === "day" ? "Daily" : trend.mode === "week" ? "Weekly (week starting)" : "Monthly";
  const toneChip = { green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", blue: "bg-sky-50 text-sky-600", violet: "bg-violet-50 text-violet-600" };
  const countTone = { red: "bg-rose-50 text-rose-600", amber: "bg-amber-50 text-amber-600", gray: "bg-gray-100 text-gray-600" };

  const renderOverview = () => (
    <div className="space-y-5">
      {highlights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {highlights.map((h) => (
            <div key={h.text} className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 break-inside-avoid">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${toneChip[h.tone]}`}><h.icon size={14} /></span>
              <p className="text-[13px] text-gray-600 leading-snug">{h.text}</p>
            </div>
          ))}
        </div>
      )}

      <ChartCard title="Today at a glance" subtitle={`${fmtDate(today)} · live from clock-in records`}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ["Clocked in", snap.clockedIn, COLORS.emerald],
            ["Still working", snap.working, COLORS.teal],
            ["On approved leave", snap.onLeave, COLORS.indigo],
            ["Not clocked in yet", snap.notYet, COLORS.amber],
          ].map(([label, value, color]) => (
            <div key={label}>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900 tabular-nums">{value}</span>
                <span className="text-xs text-gray-400">of {snap.total}</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{label}</p>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${snap.total ? (value / snap.total) * 100 : 0}%`, background: color }} /></div>
            </div>
          ))}
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <ChartCard className="xl:col-span-2" title="Attendance rate" subtitle={`${trendLabel} · share of expected working days attended`}>
          <TrendChart labels={trend.buckets.map((b) => b.label)} format={(v) => fmtPct(v)} axisFormat={pctAxis} yMax={100} minY={rateFloor} area={false} height={330}
            series={[{ name: "Attendance rate", color: COLORS.teal, values: trend.buckets.map((b) => (b.rate == null ? null : +b.rate.toFixed(1))) }]} />
          {rateFloor > 0 && <p className="text-[11px] text-gray-400 mt-1">Axis starts at {rateFloor}% to make day-to-day changes visible.</p>}
        </ChartCard>
        <div id="needs-attention" className="min-w-0">
          <ChartCard title="Needs attention" subtitle="Items HR can act on now" className="h-full">
            {actions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
                <CheckCircle2 className="text-emerald-500" size={28} />
                <p className="text-sm font-medium text-gray-700">All clear</p>
                <p className="text-xs text-gray-400">No pending approvals or data gaps.</p>
              </div>
            ) : (
              <ul className="space-y-1 -mx-1">
                {actions.map((a) => (
                  <li key={a.key}>
                    <button onClick={a.go} className="w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                      <span className={`min-w-[2rem] h-8 px-1 rounded-lg flex items-center justify-center text-sm font-bold tabular-nums ${countTone[a.tone]}`}>{a.count}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] text-gray-800 leading-tight">{a.label}</span>
                        {a.detail && <span className="block text-xs text-gray-400 truncate">{a.detail}</span>}
                      </span>
                      <ChevronRight size={16} className="text-gray-300 flex-shrink-0 no-print" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        <ChartCard title="Headcount by department" subtitle="Active employees">
          <HBars items={wf.byDept.slice(0, 8)} format={fmtNum} />
        </ChartCard>
        <ChartCard title="Leave days by type" subtitle="Approved leave in the selected period">
          {lv.byType.length ? <DonutChart data={lv.byType.slice(0, 6)} centerValue={fmtNum(lv.takenDays)} centerLabel="days taken" /> : <EmptyState text="No approved leave in this period" />}
        </ChartCard>
        <ChartCard title="Monthly payroll by department" subtitle="Net pay, salaries that are set up">
          <BarChart labels={pay.byDept.slice(0, 7).map((d) => d.label)} series={[{ name: "Net payroll", color: COLORS.violet, values: pay.byDept.slice(0, 7).map((d) => Math.round(d.value)) }]}
            format={fmtMoney} axisFormat={axisMoney} height={210} />
        </ChartCard>
      </div>

      <ChartCard title="Department scorecard" subtitle="One row per department for the selected period">
        <DataTable rowKey={(r) => r.name} pageSize={8} initialSort={{ key: "headcount", dir: "desc" }} searchText={(r) => `${r.name} ${r.manager}`}
          emptyText="No departments found"
          rows={scorecard}
          columns={[
            { key: "name", label: "Department", render: (r) => <span className="font-semibold text-gray-800">{r.name}</span> },
            { key: "manager", label: "Manager" },
            { key: "headcount", label: "Employees", align: "right" },
            { key: "tenure", label: "Avg tenure", align: "right", render: (r) => (r.tenure != null ? `${r.tenure.toFixed(1)} yrs` : "—") },
            { key: "rate", label: "Attendance", render: (r) => <RateBar value={r.rate} /> },
            { key: "late", label: "Late days", align: "right" },
            { key: "leaveDays", label: "Leave days", align: "right" },
            { key: "payroll", label: "Monthly payroll", align: "right", render: (r) => fmtMoney(r.payroll) },
          ]} />
      </ChartCard>
    </div>
  );

  const renderWorkforce = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <ChartCard className="xl:col-span-2" title="Hires and exits" subtitle="Last 12 months"
          action={<Legend items={[{ name: "Joined", color: COLORS.teal }, { name: "Left", color: COLORS.rose }]} />}>
          <BarChart labels={wf.monthly.labels} height={230}
            series={[{ name: "Joined", color: COLORS.teal, values: wf.monthly.hires }, { name: "Left", color: COLORS.rose, values: wf.monthly.exits }]} />
        </ChartCard>
        <ChartCard title="Employment status" subtitle="All employee records">
          <DonutChart data={wf.byStatus.map((d) => ({ ...d, color: { Active: COLORS.emerald, Inactive: COLORS.amber, Terminated: COLORS.rose }[d.label] }))} centerValue={fmtNum(wf.total)} centerLabel="records" />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        <ChartCard title="Employment type" subtitle="Active employees"><DonutChart data={wf.byType} centerValue={fmtNum(wf.activeCount)} centerLabel="active" /></ChartCard>
        <ChartCard title="Gender" subtitle="Active employees">
          <DonutChart data={wf.byGender.map((d) => ({ ...d, color: { Male: COLORS.sky, Female: COLORS.rose, Other: COLORS.violet, "Not set": COLORS.slate }[d.label] }))} centerValue={fmtNum(wf.activeCount)} centerLabel="active" />
        </ChartCard>
        <ChartCard title="Age groups" subtitle="Active employees">
          <BarChart labels={wf.ageBands.labels} height={190} series={[{ name: "Employees", color: COLORS.indigo, values: wf.ageBands.values }]} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        <ChartCard title="Length of service" subtitle={wf.avgTenure != null ? `Average ${wf.avgTenure.toFixed(1)} years` : "Active employees"}>
          <BarChart labels={wf.tenureBands.labels} height={190} series={[{ name: "Employees", color: COLORS.teal, values: wf.tenureBands.values }]} />
        </ChartCard>
        <ChartCard title="Top designations" subtitle="Active employees"><HBars items={wf.byDesignation} format={fmtNum} color={COLORS.indigo} labelWidth="9rem" /></ChartCard>
        <ChartCard title="This month" subtitle="Birthdays and work anniversaries">
          {wf.birthdays.length + wf.anniversaries.length === 0 ? <EmptyState text="Nothing this month" /> : (
            <div className="space-y-4 max-h-[210px] overflow-y-auto pr-1">
              {[
                ["Birthdays", Cake, wf.birthdays, (r) => `turns ${r.age}`, "text-rose-500 bg-rose-50"],
                ["Work anniversaries", Award, wf.anniversaries, (r) => `${r.years} year${r.years === 1 ? "" : "s"}`, "text-amber-600 bg-amber-50"],
              ].map(([title, Icon, list, note, chip]) => list.length > 0 && (
                <div key={title}>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">{title}</p>
                  <ul className="space-y-1.5">
                    {list.slice(0, 6).map((r, i) => (
                      <li key={`${title}-${i}-${r.name}`} className="flex items-center gap-2.5 text-[13px]">
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${chip}`}><Icon size={12} /></span>
                        <span className="text-gray-700 truncate">{r.name}</span>
                        <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">{r.day} {fmtDayMonth(today).split(" ")[1]} · {note(r)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Employees" subtitle={`${emps.length} record${emps.length === 1 ? "" : "s"}${dept === "all" ? "" : ` in ${dept}`}`}>
        <DataTable rowKey={(r) => r.id} pageSize={8} initialSort={{ key: "name", dir: "asc" }}
          searchText={(r) => `${r.name} ${r.code} ${r.dept} ${r.designation} ${r.type}`} rows={emps}
          columns={[
            { key: "name", label: "Employee", render: (r) => <div><p className="font-semibold text-gray-800">{r.name}</p><p className="text-xs text-gray-400">{r.code || r.email}</p></div> },
            { key: "dept", label: "Department" },
            { key: "designation", label: "Designation" },
            { key: "type", label: "Type" },
            { key: "join", label: "Joined", sortValue: (r) => r.join?.getTime(), render: (r) => fmtDate(r.join) },
            { key: "status", label: "Status", render: (r) => <Badge tone={r.status === "ACTIVE" ? "green" : r.status === "INACTIVE" ? "amber" : "red"}>{titleCase(r.status)}</Badge> },
          ]} />
      </ChartCard>
    </div>
  );

  const attendanceRows = useMemo(() => att.perEmp.map((r) => ({
    id: r.e.id, name: r.e.name, code: r.e.code, dept: r.e.dept, expected: r.expected, present: r.present, late: r.late,
    absent: r.absent, leave: r.leave, open: r.open, avgMinutes: r.avgMinutes, rate: r.rate,
  })), [att.perEmp]);

  const renderAttendance = () => (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3 no-print">
        <button onClick={() => setShowRules((v) => !v)} className="flex items-center gap-2 text-sm font-medium text-gray-700 w-full text-left" aria-expanded={showRules}>
          <SlidersHorizontal size={15} className="text-teal-600" />
          Attendance rules
          <span className="text-xs font-normal text-gray-400">Late after {rules.shiftStart} + {rules.graceMin} min · half day under {rules.halfDayHours} h</span>
        </button>
        {showRules && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-end gap-4">
            <label className="text-xs text-gray-500">Shift starts
              <input type="time" value={rules.shiftStart} onChange={(e) => setRules({ ...rules, shiftStart: e.target.value || DEFAULT_RULES.shiftStart })} className={`${selectCls} block mt-1`} />
            </label>
            <label className="text-xs text-gray-500">Grace period (minutes)
              <input type="number" min="0" max="120" value={rules.graceMin} onChange={(e) => setRules({ ...rules, graceMin: Math.max(0, Number(e.target.value) || 0) })} className={`${selectCls} block mt-1 w-32`} />
            </label>
            <label className="text-xs text-gray-500">Half day if worked less than (hours)
              <input type="number" min="0" max="12" step="0.5" value={rules.halfDayHours} onChange={(e) => setRules({ ...rules, halfDayHours: Math.max(0, Number(e.target.value) || 0) })} className={`${selectCls} block mt-1 w-32`} />
            </label>
            <button onClick={() => setRules(DEFAULT_RULES)} className="text-xs text-teal-600 hover:underline pb-2.5">Reset to defaults</button>
            <p className="text-xs text-gray-400 flex items-start gap-1.5 basis-full"><Info size={13} className="mt-px flex-shrink-0" />
              The system stores clock-in and clock-out times only, so late arrivals, half days and absences are worked out here using these rules. Working days are Monday to Friday and exclude today.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <ChartCard className="xl:col-span-2" title="Attendance by day" subtitle={`${trendLabel} · employee-days`}
          action={<Legend items={[{ name: "On time", color: COLORS.emerald }, { name: "Late", color: COLORS.amber }, { name: "Half day", color: COLORS.sky }, { name: "Absent", color: COLORS.rose }]} />}>
          <BarChart stacked labels={trend.buckets.map((b) => b.label)} height={240}
            series={[
              { name: "On time", color: COLORS.emerald, values: trend.buckets.map((b) => b.onTime) },
              { name: "Late", color: COLORS.amber, values: trend.buckets.map((b) => b.late) },
              { name: "Half day", color: COLORS.sky, values: trend.buckets.map((b) => b.half) },
              { name: "Absent", color: COLORS.rose, values: trend.buckets.map((b) => b.absent) },
            ]} />
        </ChartCard>
        <ChartCard title="Attendance mix" subtitle={`${fmtNum(att.expectedDays)} expected employee-days`}>
          <DonutChart centerValue={fmtPct(att.rate, 0)} centerLabel="attended"
            data={[
              { label: "On time", value: att.categories.onTime, color: COLORS.emerald }, { label: "Late", value: att.categories.late, color: COLORS.amber },
              { label: "Half day", value: att.categories.half, color: COLORS.sky }, { label: "Absent", value: att.categories.absent, color: COLORS.rose },
            ]} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        <ChartCard title="Attendance by department" subtitle="Rate for the selected period">
          <HBars max={100} format={(v) => fmtPct(v)} labelWidth="8rem"
            items={Object.entries(att.byDept).filter(([, v]) => v.rate != null).sort((a, b) => b[1].rate - a[1].rate)
              .map(([label, v]) => ({ label, value: v.rate, color: v.rate < 80 ? COLORS.rose : v.rate < 90 ? COLORS.amber : COLORS.teal }))} />
        </ChartCard>
        <ChartCard title="Arrival times" subtitle={`First clock-in of the day · amber is after ${String(Math.floor(startCutoff / 60)).padStart(2, "0")}:${String(startCutoff % 60).padStart(2, "0")}`}>
          <BarChart labels={arrivalView.bins.map((b) => b.label)} height={200}
            barColors={arrivalView.bins.map((b) => (b.from >= startCutoff ? COLORS.amber : COLORS.teal))}
            series={[{ name: "Employee-days", color: COLORS.teal, values: arrivalView.values }]} />
        </ChartCard>
        <ChartCard title="Working hours & clock-in method" subtitle="Completed days only">
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-bold text-gray-900 tabular-nums">{fmtHours(att.avgMinutes)}</span>
            <span className="text-xs text-gray-400">average per working day</span>
          </div>
          <DonutChart size={120} thickness={16} centerValue={fmtNum(att.methods.GPS + att.methods.MANUAL)} centerLabel="clock-ins"
            data={[{ label: "GPS", value: att.methods.GPS, color: COLORS.teal }, { label: "Manual", value: att.methods.MANUAL, color: COLORS.slate }]} />
        </ChartCard>
      </div>

      <ChartCard title="Employee attendance" subtitle="Lowest attendance first · click a column to re-sort">
        <DataTable rowKey={(r) => r.id} pageSize={8} initialSort={{ key: "rate", dir: "asc" }} searchText={(r) => `${r.name} ${r.code} ${r.dept}`}
          emptyText={attFailed ? "Attendance could not be loaded" : "No completed working days in this period"} rows={attendanceRows}
          columns={[
            { key: "name", label: "Employee", render: (r) => <div><p className="font-semibold text-gray-800">{r.name}</p><p className="text-xs text-gray-400">{r.code}</p></div> },
            { key: "dept", label: "Department" },
            { key: "expected", label: "Working days", align: "right" },
            { key: "present", label: "Present", align: "right" },
            { key: "late", label: "Late", align: "right", render: (r) => (r.late ? <span className="font-semibold text-amber-600">{r.late}</span> : 0) },
            { key: "absent", label: "Absent", align: "right", render: (r) => (r.absent ? <span className="font-semibold text-rose-600">{r.absent}</span> : 0) },
            { key: "leave", label: "On leave", align: "right" },
            { key: "avgMinutes", label: "Avg hours", align: "right", render: (r) => fmtHours(r.avgMinutes) },
            { key: "rate", label: "Attendance", render: (r) => <RateBar value={r.rate} /> },
          ]} />
      </ChartCard>
    </div>
  );

  const renderLeave = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <ChartCard className="xl:col-span-2" title="Approved leave over time" subtitle="Working days of leave per month, last 12 months"
          action={<Legend items={[{ name: "Leave days", color: COLORS.indigo }]} />}>
          <TrendChart labels={lv.monthly.labels} series={[{ name: "Leave days", color: COLORS.indigo, values: lv.monthly.days }]} />
        </ChartCard>
        <ChartCard title="Requests submitted" subtitle="In the selected period">
          <DonutChart data={lv.statusCounts.map((d) => ({ ...d, color: STATUS_COLORS[d.label] }))} centerValue={fmtNum(lv.submitted.length)} centerLabel="requests" />
          {lv.avgTurnaroundHrs != null && (
            <p className="text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100">Approved in <span className="font-semibold text-gray-800">{lv.avgTurnaroundHrs < 48 ? `${lv.avgTurnaroundHrs.toFixed(0)} hours` : `${(lv.avgTurnaroundHrs / 24).toFixed(1)} days`}</span> on average.</p>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        <ChartCard title="Leave days by type" subtitle="Approved, selected period"><HBars items={lv.byType} format={fmtNum} color={COLORS.indigo} labelWidth="8rem" /></ChartCard>
        <ChartCard title="Leave days by department" subtitle="Approved, selected period"><HBars items={lv.byDept.slice(0, 8)} format={fmtNum} color={COLORS.sky} labelWidth="8rem" /></ChartCard>
        <ChartCard title="Day leave starts" subtitle="Requests submitted in the period">
          <BarChart labels={["Mon", "Tue", "Wed", "Thu", "Fri"]} height={190} series={[{ name: "Requests", color: COLORS.violet, values: lv.dow }]} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        <ChartCard title="Waiting for approval" subtitle="Oldest first"
          action={lv.pending.length > 0 && <button onClick={() => navigate("/hr/leave")} className="text-xs font-medium text-teal-600 hover:underline no-print">Review</button>}>
          {lv.pending.length === 0 ? <EmptyState text="No pending leave requests" /> : (
            <ul className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
              {lv.pending.slice(0, 8).map((l) => (
                <li key={l.id} className="flex items-center gap-3 text-[13px]">
                  <span className="flex-1 min-w-0"><span className="block text-gray-800 font-medium truncate">{l.name}</span>
                    <span className="block text-xs text-gray-400 truncate">{l.type} · {fmtDayMonth(l.start)}{l.days > 1 ? ` – ${fmtDayMonth(l.end)}` : ""}</span></span>
                  <Badge tone={l.ageDays >= 3 ? "red" : "amber"}>{l.ageDays === 0 ? "Today" : `${l.ageDays}d waiting`}</Badge>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
        <ChartCard title="Away today and coming up" subtitle="Approved leave, next 14 days">
          {lv.onLeaveToday.length + lv.upcoming.length === 0 ? <EmptyState text="Nobody is on leave" /> : (
            <ul className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
              {lv.onLeaveToday.map((l) => (
                <li key={`t${l.id}`} className="flex items-center gap-3 text-[13px]">
                  <span className="flex-1 min-w-0 truncate text-gray-800 font-medium">{l.name}<span className="block text-xs font-normal text-gray-400">{l.type} · until {fmtDayMonth(l.end)}</span></span>
                  <Badge tone="blue">On leave</Badge>
                </li>
              ))}
              {lv.upcoming.map((l) => (
                <li key={`u${l.id}`} className="flex items-center gap-3 text-[13px]">
                  <span className="flex-1 min-w-0 truncate text-gray-800 font-medium">{l.name}<span className="block text-xs font-normal text-gray-400">{l.type} · {l.days} day{l.days === 1 ? "" : "s"}</span></span>
                  <span className="text-xs text-gray-500 whitespace-nowrap">from {fmtDayMonth(l.start)}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
        <ChartCard title="Most leave taken" subtitle="Approved days, selected period">
          <HBars items={lv.topTakers.slice(0, 7).map((t) => ({ label: t.name, value: t.days }))} format={fmtNum} color={COLORS.teal} labelWidth="9rem" />
        </ChartCard>
      </div>

      <ChartCard title="Leave requests" subtitle="Requests that overlap or were submitted in the selected period">
        <DataTable rowKey={(r) => r.id} pageSize={8} initialSort={{ key: "start", dir: "desc" }} searchText={(r) => `${r.name} ${r.dept} ${r.type} ${r.status}`}
          emptyText="No leave requests in this period" rows={lv.inPeriod}
          columns={[
            { key: "name", label: "Employee", render: (r) => <span className="font-semibold text-gray-800">{r.name}</span> },
            { key: "dept", label: "Department" },
            { key: "type", label: "Type" },
            { key: "start", label: "From", sortValue: (r) => r.start.getTime(), render: (r) => fmtDate(r.start) },
            { key: "end", label: "To", sortValue: (r) => r.end.getTime(), render: (r) => fmtDate(r.end) },
            { key: "days", label: "Days", align: "right" },
            { key: "status", label: "Status", render: (r) => <Badge tone={LEAVE_TONE[r.status] || "gray"}>{titleCase(r.status)}</Badge> },
          ]} />
      </ChartCard>
    </div>
  );

  const renderPayroll = () => (
    <div className="space-y-5">
      {pay.unconfigured.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <p><span className="font-semibold">{pay.unconfigured.length} employee{pay.unconfigured.length === 1 ? " has" : "s have"} no salary set up</span> and {pay.unconfigured.length === 1 ? "is" : "are"} left out of the totals below.{" "}
            <button onClick={() => navigate("/hr/payroll/salaries")} className="underline font-medium no-print">Set up salaries</button></p>
        </div>
      )}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          ["Basic salary", pay.basic, "text-gray-900"], ["Allowances", pay.allowance, "text-emerald-600"],
          ["Deductions", pay.deduction, "text-rose-600"], ["Net payroll", pay.net, "text-violet-700"],
        ].map(([label, value, cls]) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 break-inside-avoid">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-2xl font-bold mt-1 tabular-nums ${cls}`}>{fmtMoney(value)}</p>
            <p className="text-xs text-gray-400 mt-1">per month · {pay.configuredCount} employee{pay.configuredCount === 1 ? "" : "s"}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <ChartCard className="xl:col-span-2" title="Net payroll by department" subtitle="Monthly, weekly and annual pay converted to a monthly figure">
          <BarChart labels={pay.byDept.map((d) => d.label)} height={240} format={fmtMoney} axisFormat={axisMoney}
            series={[{ name: "Net payroll", color: COLORS.violet, values: pay.byDept.map((d) => Math.round(d.value)) }]} />
        </ChartCard>
        <ChartCard title="Payroll by employment type" subtitle="Share of net payroll">
          <DonutChart data={pay.byType.map((d) => ({ label: d.label, value: Math.round(d.value) }))} format={(v) => fmtMoneyShort(v)} centerValue={fmtMoneyShort(pay.net)} centerLabel="net / month" />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        <ChartCard title="Salary distribution" subtitle="Employees by monthly net pay (Rs.)">
          <BarChart labels={pay.histogram.labels} height={200} series={[{ name: "Employees", color: COLORS.violet, values: pay.histogram.values }]} />
        </ChartCard>
        <ChartCard title="Average net pay by designation" subtitle="Top 8 by pay"><HBars items={pay.byDesignation} format={fmtMoneyShort} color={COLORS.violet} labelWidth="8rem" /></ChartCard>
        <ChartCard title="Allowance requests" subtitle="All requests from employees"
          action={pay.pendingReqs.length > 0 && <button onClick={() => navigate("/hr/payslip")} className="text-xs font-medium text-teal-600 hover:underline no-print">Review</button>}>
          <DonutChart size={124} thickness={17} data={pay.allowanceStatus.map((d) => ({ label: d.label, value: d.value, color: STATUS_COLORS[d.label] }))} centerValue={fmtNum(pay.allowanceStatus.reduce((a, d) => a + d.value, 0))} centerLabel="requests" />
          {pay.pendingReqs.length > 0 && <p className="text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100"><span className="font-semibold text-gray-800">{fmtMoney(pay.pendingAmount)}</span> is waiting for a decision.</p>}
        </ChartCard>
      </div>

      <ChartCard title="Pay sheets" subtitle="Monthly figures per employee">
        <DataTable rowKey={(r) => r.email || r.code} pageSize={8} initialSort={{ key: "net", dir: "desc" }} searchText={(r) => `${r.name} ${r.code} ${r.dept} ${r.designation}`}
          emptyText="No pay sheets to show" rows={pay.rows}
          columns={[
            { key: "name", label: "Employee", render: (r) => <div><p className="font-semibold text-gray-800">{r.name}</p><p className="text-xs text-gray-400">{r.code}</p></div> },
            { key: "dept", label: "Department" },
            { key: "designation", label: "Designation" },
            { key: "basic", label: "Basic", align: "right", render: (r) => (r.configured ? fmtMoney(r.basic) : "—") },
            { key: "allowance", label: "Allowances", align: "right", render: (r) => (r.configured ? fmtMoney(r.allowance) : "—") },
            { key: "deduction", label: "Deductions", align: "right", render: (r) => (r.configured ? fmtMoney(r.deduction) : "—") },
            { key: "net", label: "Net", align: "right", render: (r) => (r.configured ? <span className="font-semibold text-gray-900">{fmtMoney(r.net)}</span> : "—") },
            { key: "configured", label: "Status", sortValue: (r) => (r.configured ? 1 : 0), render: (r) => <Badge tone={r.configured ? "green" : "amber"}>{r.configured ? "Set up" : "Not set up"}</Badge> },
          ]} />
      </ChartCard>
    </div>
  );

  // ═════════════════════════════════════════════════════════════════════════════
  // Page
  // ═════════════════════════════════════════════════════════════════════════════
  const actionsBar = (
    <div className="flex items-center gap-2 no-print">
      <button onClick={() => setRefreshKey((k) => k + 1)} disabled={busy} title="Refresh data" aria-label="Refresh data"
        className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"><RefreshCw size={18} className={busy ? "animate-spin" : ""} /></button>
      <button onClick={() => window.print()} className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"><Printer size={15} /> Print</button>
      <button onClick={handleExport} disabled={initialLoading} title="Download the table on the current tab as CSV"
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"><Download size={15} /> <span className="hidden md:inline">This tab</span> CSV</button>
      <div className="relative">
        <button onClick={() => setExportOpen((o) => !o)} disabled={initialLoading} aria-haspopup="dialog" aria-expanded={exportOpen}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
          <FileText size={15} /> Export report <ChevronDown size={14} className={`transition-transform ${exportOpen ? "rotate-180" : ""}`} />
        </button>
        {exportOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
            <div role="dialog" aria-label="Export monthly or yearly report" className="absolute right-0 mt-2 w-80 z-20 bg-white border border-gray-100 rounded-2xl shadow-xl p-4 space-y-4 text-left">
              <div>
                <p className="text-sm font-semibold text-gray-800">Export a full report</p>
                <p className="text-xs text-gray-500 mt-0.5">One easy-to-read PDF with an overview page, then Summary, Departments, Attendance, Leave, Payroll and Workforce sections.</p>
              </div>
              <div className="inline-flex w-full bg-gray-100 rounded-xl p-1 gap-1">
                {[["monthly", "Monthly"], ["yearly", "Yearly"]].map(([k, label]) => (
                  <button key={k} onClick={() => { setExportKind(k); setExportNote(null); }}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${exportKind === k ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>{label}</button>
                ))}
              </div>
              {exportKind === "monthly" ? (
                <label className="block text-xs text-gray-500">Month
                  <input type="month" value={exportMonth} max={`${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, "0")}`} onChange={(e) => setExportMonth(e.target.value)} className={`${selectCls} block mt-1 w-full`} />
                </label>
              ) : (
                <label className="block text-xs text-gray-500">Year
                  <select value={exportYear} onChange={(e) => setExportYear(e.target.value)} className={`${selectCls} block mt-1 w-full`}>
                    {Array.from({ length: 6 }, (_, i) => nowD.getFullYear() - i).map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </label>
              )}
              <p className="text-xs text-gray-400">Scope: {dept === "all" ? "All departments" : dept}. Change the Department filter above to export just one.</p>
              {exportNote && (
                <p role="status" className={`text-xs rounded-lg px-3 py-2 ${exportNote.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{exportNote.text}</p>
              )}
              <button onClick={handlePeriodExport} disabled={exporting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
                {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} {exporting ? "Building report…" : `Download ${exportKind} report (PDF)`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <PageLayout role="hr" activePage="Reports" title="HR Reports" subtitle="Live analytics for your workforce, attendance, leave and payroll" actions={actionsBar}>
      <style>{`@media print {
        nav, header.h-16, .no-print { display: none !important; }
        .h-screen { height: auto !important; }
        .overflow-hidden, .overflow-auto { overflow: visible !important; }
        main { padding: 0 !important; }
        body { background: #fff !important; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { margin: 12mm; }
      }`}</style>

      <div className="space-y-5">
        {/* Print-only heading */}
        <div className="hidden print:block">
          <h1 className="text-xl font-bold text-gray-900">HR Report · {TABS.find(([k]) => k === tab)?.[1]}</h1>
          <p className="text-xs text-gray-500">{rangeText(range)} · {dept === "all" ? "All departments" : dept} · Generated {fmtDate(new Date())}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3 no-print">
          <label className="text-xs text-gray-500">Period
            <select value={periodKey} onChange={(e) => setPeriodKey(e.target.value)} className={`${selectCls} block mt-1`}>
              {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </label>
          {periodKey === "custom" && (
            <>
              <label className="text-xs text-gray-500">From
                <input type="date" value={custom.from} max={ymd(today)} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className={`${selectCls} block mt-1`} />
              </label>
              <label className="text-xs text-gray-500">To
                <input type="date" value={custom.to} max={ymd(today)} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className={`${selectCls} block mt-1`} />
              </label>
            </>
          )}
          <label className="text-xs text-gray-500">Department
            <select value={dept} onChange={(e) => setDept(e.target.value)} className={`${selectCls} block mt-1`}>
              <option value="all">All departments</option>
              {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <p className="text-xs text-gray-400 pb-2.5 ml-auto text-right">
            {customIncomplete ? "Pick both dates — showing the last 30 days meanwhile." : <>Showing <span className="font-medium text-gray-600">{rangeText(range)}</span>, compared with the {range.days} days before</>}
            {updatedAt && <> · Updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>}
          </p>
        </div>

        {/* Errors */}
        {failedNames.length > 0 && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 no-print">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <p className="flex-1">Some data could not be loaded: <span className="font-semibold">{failedNames.join(", ")}</span>. Related numbers may be incomplete or zero.</p>
            <button onClick={() => setRefreshKey((k) => k + 1)} className="font-semibold underline">Try again</button>
          </div>
        )}

        {initialLoading ? <Skeleton /> : (
          <div className={`space-y-5 transition-opacity ${busy ? "opacity-60" : ""}`} aria-busy={busy}>
            {kpis}

            {/* Tabs */}
            <div role="tablist" aria-label="Report sections" className="flex border-b border-gray-200 overflow-x-auto no-print">
              {TABS.map(([key, label]) => (
                <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                  className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors focus:outline-none focus-visible:bg-gray-100 ${tab === key ? "text-teal-700 border-teal-500" : "text-gray-500 border-transparent hover:text-gray-800"}`}>
                  {label}
                </button>
              ))}
            </div>

            <div role="tabpanel">
              {tab === "overview" && renderOverview()}
              {tab === "workforce" && renderWorkforce()}
              {tab === "attendance" && renderAttendance()}
              {tab === "leave" && renderLeave()}
              {tab === "payroll" && renderPayroll()}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Report;