import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ClockIcon, CalendarDays, DollarSign, User, Bell,
  Award, Target, TrendingUp, CheckCircle2, Calendar, Gift,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { SummaryCard } from "../../components/EmployeeUI";
import { CARD_TONES } from "../../components/employeeTheme";
import { employeeApi } from "../../services/api";
import { getCurrentPosition, formatMinutes, summarizeSessions, useNow } from "../../utils/attendance";

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
  const [todaySessions, setTodaySessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clockInLoading, setClockInLoading] = useState(false);
  const [clockOutLoading, setClockOutLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isClockedIn = todaySessions.some((s) => !s.clockOutTime);
  const now = useNow(isClockedIn);
  const attendance = useMemo(() => summarizeSessions(todaySessions, now), [todaySessions, now]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      fetchTodayAttendance();
    } else {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (user) {
      // Each card loads independently, so one failing endpoint never shows made-up numbers for the others
      const loadDashboardData = async () => {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const [notRes, leavesRes, balRes, payRes, attRes] = await Promise.allSettled([
          employeeApi.getNotifications(),
          employeeApi.getLeaves(),
          employeeApi.getLeaveBalance(),
          employeeApi.getPayslips(),
          employeeApi.getAttendanceHistory(), // defaults to the current month
        ]);
        const list = (r) => (r.status === "fulfilled" && Array.isArray(r.value?.data) ? r.value.data : []);

        setNotifications(list(notRes));

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

  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      const response = await employeeApi.getTodayAttendance();
      setTodaySessions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      setTodaySessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      setClockInLoading(true);
      const coords = await getCurrentPosition();
      const response = await employeeApi.clockInGPS(coords.latitude, coords.longitude);
      if (response.data) {
        setMessage("✓ Clocked in successfully!");
        setTimeout(() => setMessage(""), 3000);
        fetchTodayAttendance();
      }
    } catch (error) {
      console.error("Clock in error:", error);
      setMessage("✗ " + (error.message || "Failed to clock in"));
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setClockInLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setClockOutLoading(true);
      const coords = await getCurrentPosition();
      const response = await employeeApi.clockOutGPS(coords.latitude, coords.longitude);
      if (response.data) {
        setMessage("✓ Clocked out successfully!");
        setTimeout(() => setMessage(""), 3000);
        fetchTodayAttendance();
      }
    } catch (error) {
      setMessage("✗ " + (error.message || "Failed to clock out"));
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setClockOutLoading(false);
    }
  };

  const formatTime = (time) => {
    if (!time) return "--:--";
    const [hours, minutes] = time.split(":").slice(0, 2);
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (!user) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-employee-500" />
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

        {/* ── Message Alert ── */}
        {message && (
          <div className={`p-4 rounded-lg text-white ${message.startsWith("✓") ? "bg-green-500" : "bg-red-500"}`}>
            {message}
          </div>
        )}

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { tone: CARD_TONES.blue,   icon: <ClockIcon size={20} />,    label: "Present Days",   value: stats.presentDays,         sub: "This month"        },
            { tone: CARD_TONES.green,  icon: <Calendar size={20} />,     label: "Leave Balance",  value: stats.leaveBalance,        sub: "Days available"    },
            { tone: CARD_TONES.yellow, icon: <CalendarDays size={20} />, label: "Pending Leaves", value: stats.pendingLeaves,       sub: "Awaiting approval" },
            { tone: CARD_TONES.purple, icon: <DollarSign size={20} />,   label: "Last Salary",    value: stats.lastSalary != null ? `Rs. ${stats.lastSalary}` : "—", sub: stats.lastSalaryPeriod },
          ].map(c => (
            <SummaryCard key={c.label} icon={c.icon} title={c.label} value={c.value} description={c.sub} className={c.tone} />
          ))}
        </div>

        {/* ── Today's Attendance + Quick Actions ──
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <h3 className="text-xl font-bold mb-6 flex items-center text-gray-800">
              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                <ClockIcon className="text-blue-600" size={24} />
              </div>
              Today's Attendance
            </h3>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-gray-500 text-sm mb-2">Clock In</p>
                    <p className="text-3xl font-bold text-blue-600">{formatTime(attendance?.clockInTime)}</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-gray-500 text-sm mb-2">Clock Out</p>
                    <p className="text-3xl font-bold text-orange-600">{formatTime(attendance?.clockOutTime)}</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-gray-500 text-sm mb-2">Working Hours</p>
                    <p className="text-3xl font-bold text-green-600">{formatMinutes(attendance?.totalWorkingMinutes || 0, isClockedIn)}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleClockIn}
                    disabled={clockInLoading || isClockedIn}
                    className="flex-1 bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-2 font-semibold">
                    <ClockIcon size={20} /> {clockInLoading ? "Getting location..." : "Clock In"}
                  </button>
                  <button 
                    onClick={handleClockOut}
                    disabled={clockOutLoading || !isClockedIn}
                    className="flex-1 bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:bg-gray-300 hover:text-gray-500 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold transition">
                    <ClockIcon size={20} /> {clockOutLoading ? "Getting location..." : "Clock Out"}
                  </button>
                </div>
              </>
            )}
          </div>

          
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <h3 className="text-xl font-bold mb-6 flex items-center text-gray-800">
              <div className="bg-gray-100 p-2 rounded-lg mr-3">
                <LayoutDashboard className="text-gray-700" size={24} />
              </div>
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button onClick={() => navigate("/employee/leave")}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition flex items-center justify-center gap-2 font-medium shadow-md hover:shadow-lg">
                <CalendarDays size={20} /> Apply for Leave
              </button>
              <button onClick={() => navigate("/employee/payslip")}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-purple-600 hover:to-purple-700 transition flex items-center justify-center gap-2 font-medium shadow-md hover:shadow-lg">
                <DollarSign size={20} /> View Payslip
              </button>
              <button onClick={() => navigate("/employee/profile")}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center justify-center gap-2 font-medium shadow-md hover:shadow-lg">
                <User size={20} /> Update Profile
              </button>
            </div>
          </div>
        </div> */}

        {/* ── My Month + Upcoming Leave (real data) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-white to-employee-50 p-6 rounded-xl border border-employee-100 shadow-sm">
            <h3 className="text-lg font-semibold mb-6 flex items-center text-slate-800">
              <div className="bg-orange-50 p-2 rounded-lg mr-3">
                <Target className="text-orange-600" size={20} />
              </div>
              My Month
            </h3>
            <div className="space-y-4">
              {[
                { label: "Attendance Rate", pct: monthStats.attendancePct, note: `${stats.presentDays} day${stats.presentDays === 1 ? "" : "s"} worked this month` },
                { label: "Punctuality", pct: monthStats.punctualPct, note: "Days you arrived on time" },
                { label: "Leave Used", pct: monthStats.leaveUsedPct, note: `${monthStats.leaveUsed} of ${monthStats.leaveTotal} days this year` },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-slate-600">{m.label} <span className="text-xs text-slate-400">· {m.note}</span></span>
                    <span className="text-sm font-semibold text-slate-800">{m.pct != null ? `${m.pct}%` : "—"}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-employee-500 h-2 rounded-full" style={{ width: `${m.pct || 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-employee-50 p-6 rounded-xl border border-employee-100 shadow-sm">
            <h3 className="text-lg font-semibold mb-6 flex items-center text-slate-800">
              <div className="bg-violet-50 p-2 rounded-lg mr-3">
                <Calendar className="text-violet-600" size={20} />
              </div>
              Upcoming Leave
            </h3>
            <div className="space-y-3">
              {upcomingLeaves.map(l => (
                <div key={l.id} className="flex items-start gap-3 p-3 border border-employee-100 bg-white/70 hover:bg-white rounded-lg transition">
                  <div className="bg-sky-50 text-blue-600 p-2 rounded-lg"><CalendarDays size={18} /></div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{l.leaveTypeName || "Leave"}</p>
                    <p className="text-sm text-slate-500">
                      {l.startDate}{l.endDate && l.endDate !== l.startDate ? ` → ${l.endDate}` : ""} · {l.numberOfDays} day{l.numberOfDays === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${String(l.status).toUpperCase() === "APPROVED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {String(l.status).charAt(0) + String(l.status).slice(1).toLowerCase()}
                  </span>
                </div>
              ))}
              {upcomingLeaves.length === 0 && (
                <div className="text-center py-5 text-gray-400 text-sm">No upcoming leave.</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Recent Notifications ── */}
        <div className="bg-gradient-to-br from-white to-employee-50 p-6 rounded-xl border border-employee-100 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 flex items-center text-slate-800">
            <div className="bg-rose-50 p-2 rounded-lg mr-3">
              <Bell className="text-rose-500" size={20} />
            </div>
            Recent Notifications
          </h3>
          <div className="space-y-3">
            {notifications.map((n, i) => (
              <div key={n.id || i} className="flex items-start gap-3 p-3 hover:bg-white/70 rounded-lg transition">
                <CheckCircle2 className={`${n.isRead ? "text-gray-300" : "text-rose-500"} mt-1`} size={20} />
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{n.title}</p>
                  <p className="text-sm text-gray-500">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{n.createdAt ? n.createdAt.replace("T", " ").substring(0, 16) : ""}</p>
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="text-center py-5 text-gray-400 text-sm">
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