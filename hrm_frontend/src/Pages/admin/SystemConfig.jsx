import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  Activity,
  ShieldCheck,
  FileText,
  Server,
  Database,
  Cpu,
  HardDrive,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
  Link2,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";

const AdminSystemConfig = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("settings");
  const [saved, setSaved] = useState(false);

  const [leaveSettings, setLeaveSettings] = useState({
    annualLeaveDays: 14,
    sickLeaveDays: 7,
    casualLeaveDays: 5,
    emergencyLeaveDays: 3,
    carryForwardAllowed: true,
    maxCarryForwardDays: 5,
  });
  const [payrollSettings, setPayrollSettings] = useState({
    basicSalaryPercent: 60,
    hraPercent: 20,
    pfPercent: 12,
    taxPercent: 10,
    overtimeMultiplier: 1.5,
    payrollCycleDay: 28,
  });
  const auditLogs = [
    {
      id: 1,
      user: "Alice Johnson",
      action: "Approved leave request",
      module: "Leave",
      timestamp: "2026-02-24 09:15",
      severity: "info",
    },
    {
      id: 2,
      user: "Admin (David Lee)",
      action: "Created new company: Tech Solutions",
      module: "Companies",
      timestamp: "2026-02-24 08:45",
      severity: "info",
    },
    {
      id: 3,
      user: "Admin (Frank Brown)",
      action: "Updated payroll formula",
      module: "System Config",
      timestamp: "2026-02-23 17:30",
      severity: "warning",
    },
    {
      id: 4,
      user: "Bob Williams",
      action: "Failed login attempt",
      module: "Auth",
      timestamp: "2026-02-23 14:10",
      severity: "error",
    },
    {
      id: 5,
      user: "Carol Smith",
      action: "Rejected company: Blue Sky Retail",
      module: "Companies",
      timestamp: "2026-02-23 11:00",
      severity: "info",
    },
    {
      id: 6,
      user: "System",
      action: "Automated payroll run completed",
      module: "Payroll",
      timestamp: "2026-02-22 00:00",
      severity: "info",
    },
  ];
  const health = {
    serverUptime: 99.9,
    databaseLoad: 45,
    apiResponse: 78,
    storage: 62,
    activeConnections: 124,
    errorRate: 0.3,
  };

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (s) {
      const u = JSON.parse(s);
      if (u.role !== "ADMIN") {
        navigate("/unauthorized");
        return;
      }
      setUser(u);
    } else navigate("/login");
  }, [navigate]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const severityStyle = (s) =>
  ({
    error: "bg-rose-50 text-rose-700 border border-rose-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
  }[s] || "bg-sky-50 text-sky-700 border border-sky-200");

  const barColor = (v) => (v >= 90 ? "bg-emerald-500" : v >= 60 ? "bg-amber-500" : "bg-rose-500");

  if (!user) return null;

  const tabs = [
    { key: "settings", label: "Global Settings", icon: Settings },
    { key: "health", label: "System Health", icon: Activity },
    { key: "audit", label: "Audit Logs", icon: ShieldCheck },
  ];

  return (
        <PageLayout
          role="admin"
          activePage="System Config"
          title="System Configuration"
          subtitle="Manage global settings, monitor system health, and review audit logs"
        >
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Tab bar */}
                  <div className="flex gap-1.5 bg-white p-1.5 rounded-2xl shadow-[0_2px_12px_rgba(15,23,42,0.035)] border border-slate-200/90 w-fit">
                    {tabs.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all ${activeTab === t.key
                            ? "bg-primary-600 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-50"
                          }`}
                      >
                        <t.icon size={15} /> {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Settings Tab */}
                  {activeTab === "settings" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(15,23,42,0.035)] border border-slate-200/90 p-6">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-5">
                              <span className="w-8 h-8 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center">
                                <FileText size={16} />
                              </span>
                              Default Leave Policy
                            </h3>
                            <div className="space-y-4">
                              {[
                                ["Annual Leave (days)", "annualLeaveDays"],
                                ["Sick Leave (days)", "sickLeaveDays"],
                                ["Casual Leave (days)", "casualLeaveDays"],
                                ["Emergency Leave (days)", "emergencyLeaveDays"],
                                ["Max Carry-Forward Days", "maxCarryForwardDays"],
                              ].map(([label, key]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <label className="text-slate-600 font-medium">{label}</label>
                    <input
                      type="number"
                      min={0}
                      value={leaveSettings[key]}
                      onChange={(e) =>
                        setLeaveSettings({ ...leaveSettings, [key]: Number(e.target.value) })
                      }
                      className="w-20 px-3 py-2 border border-slate-200 rounded-xl text-xs text-center focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-slate-50/50"
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="text-slate-600 font-medium">Allow Carry-Forward</label>
                  <button
                    onClick={() =>
                      setLeaveSettings({
                        ...leaveSettings,
                        carryForwardAllowed: !leaveSettings.carryForwardAllowed,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      leaveSettings.carryForwardAllowed ? "bg-primary-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        leaveSettings.carryForwardAllowed ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(15,23,42,0.035)] border border-slate-200/90 p-6">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-5">
                <span className="w-8 h-8 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center">
                  <Activity size={16} />
                </span>
                Payroll Formula Configuration
              </h3>
              <div className="space-y-4">
                {[
                  ["Basic Salary (%)", "basicSalaryPercent", 1],
                  ["HRA (%)", "hraPercent", 1],
                  ["PF Deduction (%)", "pfPercent", 1],
                  ["Tax Deduction (%)", "taxPercent", 1],
                  ["Overtime Multiplier (x)", "overtimeMultiplier", 0.1],
                  ["Payroll Cycle Day", "payrollCycleDay", 1],
                ].map(([label, key, step]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <label className="text-slate-600 font-medium">{label}</label>
                    <input
                      type="number"
                      min={0}
                      step={step}
                      value={payrollSettings[key]}
                      onChange={(e) =>
                        setPayrollSettings({ ...payrollSettings, [key]: Number(e.target.value) })
                      }
                      className="w-20 px-3 py-2 border border-slate-200 rounded-xl text-xs text-center focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-slate-50/50"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 flex items-center gap-4">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-xs shadow-sm shadow-primary-600/20 transition-all"
              >
                <Save size={15} /> Save Policy Settings
              </button>
              {saved && (
                <span className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs animate-fade-in">
                  <CheckCircle2 size={16} /> Settings saved successfully!
                </span>
              )}
            </div>
          </div>
        )}

        {/* Health Tab — Uses matching primary color for Admin UI */}
        {activeTab === "health" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  label: "Server Uptime",
                  value: `${health.serverUptime}%`,
                  icon: Server,
                  sub: "Online and responsive",
                },
                {
                  label: "Active Connections",
                  value: health.activeConnections,
                  icon: Link2,
                  sub: "Concurrent live sessions",
                },
                {
                  label: "Error Rate",
                  value: `${health.errorRate}%`,
                  icon: AlertCircle,
                  sub: "Below tolerance threshold",
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
                      <p className="mt-2 text-3xl font-bold tracking-tight">{s.value}</p>
                      <p className="mt-1 text-xs text-white/75 truncate">{s.sub}</p>
                    </div>
                    <div className="shrink-0 rounded-xl bg-white/20 p-2.5 text-white backdrop-blur-xs flex items-center justify-center">
                      <IconComponent size={20} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(15,23,42,0.035)] border border-slate-200/90 p-6">
              <h3 className="text-base font-bold text-slate-800 mb-5">Performance & Load Metrics</h3>
              <div className="space-y-4">
                {[
                  ["Server Uptime", health.serverUptime, Server],
                  ["Database Load", health.databaseLoad, Database],
                  ["API Response Time", health.apiResponse, Cpu],
                  ["Storage Capacity Used", health.storage, HardDrive],
                ].map(([label, value, Icon]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1.5 font-medium">
                      <span className="flex items-center gap-2 text-slate-600">
                        <Icon size={14} className="text-primary-600" />
                        {label}
                      </span>
                      <span className="font-bold text-slate-800">{value}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor(value)} rounded-full transition-all duration-700`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === "audit" && (
          <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(15,23,42,0.035)] border border-slate-200/90 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary-600" /> System Audit Trail
              </h3>
              <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-3 py-1 rounded-full border border-slate-200">
                {auditLogs.length} audit entries
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                    <th className="px-5 py-3.5 text-left font-semibold">User / Actor</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Action Description</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Module</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Timestamp</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800">{log.user}</td>
                      <td className="px-5 py-3.5 text-slate-600">{log.action}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[11px] rounded-full font-semibold border border-slate-200">
                          {log.module}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 flex items-center gap-1.5">
                        <Clock size={12} /> {log.timestamp}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${severityStyle(
                            log.severity
                          )}`}
                        >
                          {log.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default AdminSystemConfig;