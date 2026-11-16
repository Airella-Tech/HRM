import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClockIcon, CalendarDays, DollarSign, Bell,
  Award, Target, TrendingUp, CheckCircle2, Calendar, Gift,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { SummaryCard } from "../../components/EmployeeUI";
import { CARD_TONES } from "../../components/employeeTheme";
import { employeeApi, recruitmentApi } from "../../services/api";

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    presentDays: 0,
    leaveBalance: 0,
    pendingLeaves: 0,
    lastSalary: null,
    lastSalaryPeriod: "No payslip yet",
  });
  const [notifications, setNotifications] = useState([]);
  // Real numbers behind "My Month" and "Upcoming Leave"
  const [monthStats, setMonthStats] = useState({ attendancePct: null, punctualPct: null, leaveUsedPct: null, leaveUsed: 0, leaveTotal: 0 });
  const [upcomingLeaves, setUpcomingLeaves] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (user) {
      // Each card loads independently, so one failing endpoint never shows made-up numbers for the others
      const loadDashboardData = async () => {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const [notRes, recNotRes, leavesRes, balRes, payRes, attRes] = await Promise.allSettled([
          employeeApi.getNotifications(),
          recruitmentApi.getNotifications(),
          employeeApi.getLeaves(),
          employeeApi.getLeaveBalance(),
          employeeApi.getPayslips(),
          employeeApi.getAttendanceHistory(), // defaults to the current month
        ]);
        const list = (r) => (r.status === "fulfilled" && Array.isArray(r.value?.data) ? r.value.data : []);
        const empNotifs = list(notRes);
        const recNotifs = list(recNotRes).map((n) => ({ ...n, source: "recruitment" }));
        const combined = [...empNotifs, ...recNotifs].sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );

        setNotifications(combined);

        const pendingLeaves = list(leavesRes).filter((l) => String(l.status).toUpperCase() === "PENDING").length;

        const leaveBalance = list(balRes).reduce((sum, b) => sum + (Number(b.remainingDays) || 0), 0);

        // Days worked this month: distinct dates with any attendance other than absent
        const presentDays = new Set(
          list(attRes).filter((a) => a.date && String(a.status).toUpperCase() !== "ABSENT").map((a) => a.date)
        ).size;

        const latest = [...list(payRes)].sort((a, b) => (b.year - a.year) || (b.month - a.month))[0];

        // Attendance rate = days worked this month / weekdays elapsed so far this month
        const today = new Date();
        let weekdays = 0;
        for (let d = 1; d <= today.getDate(); d++) {
          const wd = new Date(today.getFullYear(), today.getMonth(), d).getDay();
          if (wd !== 0 && wd !== 6) weekdays++;
        }
        const attended = list(attRes).filter((a) => a.date && String(a.status).toUpperCase() !== "ABSENT");
        const lateDates = new Set(attended.filter((a) => String(a.status).toUpperCase() === "LATE").map((a) => a.date));
        const leaveTotal = list(balRes).reduce((sum, b) => sum + (Number(b.totalDays) || 0), 0);
        const leaveUsed = list(balRes).reduce((sum, b) => sum + (Number(b.usedDays) || 0), 0);
        setMonthStats({
          attendancePct: weekdays > 0 ? Math.min(100, Math.round((presentDays / weekdays) * 100)) : null,
          punctualPct: presentDays > 0 ? Math.round(((presentDays - lateDates.size) / presentDays) * 100) : null,
          leaveUsedPct: leaveTotal > 0 ? Math.round((leaveUsed / leaveTotal) * 100) : null,
          leaveUsed, leaveTotal,
        });

        const todayStr = today.toISOString().slice(0, 10);
        setUpcomingLeaves(
          list(leavesRes)
            .filter((l) => ["APPROVED", "PENDING"].includes(String(l.status).toUpperCase()) && l.endDate && String(l.endDate) >= todayStr)
            .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))
            .slice(0, 4)
        );

        setStats({
          presentDays,
          leaveBalance,
          pendingLeaves,
          lastSalary: latest ? (Number(latest.netSalary) || 0).toLocaleString() : null,
          lastSalaryPeriod: latest ? `${monthNames[latest.month - 1] || ""} ${latest.year}` : "No payslip yet",
        });
      };
      loadDashboardData();
    }
  }, [user]);

  if (!user) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent" />
    </div>
  );

  return (
    <PageLayout
      role="employee"
      activePage="Overview"
      title={`Welcome, ${user.fullName}!`}
      subtitle="Here's your overview for today"
    >
      <div className="space-y-6">

        {/* ── Stats Cards (StatCard pattern matching Recruitment) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { tone: CARD_TONES.green,  icon: <ClockIcon size={20} />,    label: "Present Days",   value: stats.presentDays,         sub: "This month"        },
            { tone: CARD_TONES.blue,   icon: <Calendar size={20} />,     label: "Leave Balance",  value: stats.leaveBalance,        sub: "Days available"    },
            { tone: CARD_TONES.yellow, icon: <CalendarDays size={20} />, label: "Pending Leaves", value: stats.pendingLeaves,       sub: "Awaiting approval" },
            { tone: CARD_TONES.purple, icon: <DollarSign size={20} />,   label: "Last Salary",    value: stats.lastSalary != null ? `Rs. ${stats.lastSalary}` : "—", sub: stats.lastSalaryPeriod },
          ].map(c => (
            <SummaryCard key={c.label} icon={c.icon} title={c.label} value={c.value} description={c.sub} className={c.tone} />
          ))}
        </div>

        {/* ── My Month + Upcoming Leave ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-3">
              <span className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center">
                <Target size={18} />
              </span>
              My Month Performance
            </h3>
            <div className="space-y-4">
              {[
                { label: "Attendance Rate", pct: monthStats.attendancePct, note: `${stats.presentDays} day${stats.presentDays === 1 ? "" : "s"} worked this month` },
                { label: "Punctuality", pct: monthStats.punctualPct, note: "Days you arrived on time" },
                { label: "Leave Used", pct: monthStats.leaveUsedPct, note: `${monthStats.leaveUsed} of ${monthStats.leaveTotal} days this year` },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-slate-700">{m.label} <span className="text-xs font-normal text-slate-400">· {m.note}</span></span>
                    <span className="text-sm font-bold text-slate-900">{m.pct != null ? `${m.pct}%` : "—"}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-teal-600 h-2 rounded-full transition-all duration-500" style={{ width: `${m.pct || 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-3">
              <span className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center">
                <Calendar size={18} />
              </span>
              Upcoming Leave
            </h3>
            <div className="space-y-3">
              {upcomingLeaves.map(l => (
                <div key={l.id} className="flex items-start gap-3.5 p-3.5 border border-slate-100 bg-slate-50/60 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
                    <CalendarDays size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">{l.leaveTypeName || "Leave"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {l.startDate}{l.endDate && l.endDate !== l.startDate ? ` → ${l.endDate}` : ""} · {l.numberOfDays} day{l.numberOfDays === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${String(l.status).toUpperCase() === "APPROVED" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"}`}>
                    {String(l.status).charAt(0) + String(l.status).slice(1).toLowerCase()}
                  </span>
                </div>
              ))}
              {upcomingLeaves.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">No upcoming leave scheduled.</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Recent Notifications ── */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
              <Bell size={18} />
            </span>
            Recent Notifications
          </h3>
          <div className="space-y-3">
            {notifications.map((n, i) => (
              <div
                key={n.id || i}
                onClick={() => n.link && navigate(n.link)}
                className={`flex items-start gap-3.5 p-3.5 border border-slate-100 bg-slate-50/60 hover:bg-slate-50 rounded-xl transition-all ${n.link ? "cursor-pointer hover:border-slate-200 hover:shadow-xs" : ""}`}
              >
                <CheckCircle2 className={`${(n.isRead ?? n.seen ?? n.read) ? "text-slate-300" : "text-teal-600"} mt-0.5 shrink-0`} size={18} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <p className="text-[11px] text-slate-400">{n.createdAt ? n.createdAt.replace("T", " ").substring(0, 16) : ""}</p>
                    {n.link && (
                      <span className="text-xs font-semibold text-teal-600 hover:underline">
                        Open →
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                No recent notifications.
              </div>
            )}
          </div>
        </div>

      </div>
    </PageLayout>
  );
};

export default EmployeeDashboard;