import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Calendar, CheckCircle, XCircle, Download, Filter, MapPin, Timer, Search } from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { employeeApi } from "../../services/api";
import {
  EmpButton, SummaryCard, SearchBar, FilterSelect, ShowingCount, TableCard, TableHeaderRow, TableHeader, TableRows, TableRow, LoadingState, EmptyState,
} from "../../components/EmployeeUI";
import { EMP_GRADIENT, CARD_TONES, useSort } from "../../components/employeeTheme";
import {
  getCurrentPosition, formatMinutes, summarizeSessions, groupSessionsByDate, toLocalDateString, useNow,
} from "../../utils/attendance";

const mapLink = (location) => {
  if (!location) return null;
  return `https://www.google.com/maps?q=${location}`;
};

const calculateStats = (days) => {
  let present = 0, absent = 0, leave = 0, late = 0;
  let totalMinutes = 0;

  days.forEach(d => {
    if (d.status === "PRESENT") present++;
    else if (d.status === "ABSENT") absent++;
    else if (d.status === "HALF_DAY") leave++;
    else if (d.status === "LATE") late++;

    totalMinutes += d.totalWorkingMinutes || 0;
  });

  return {
    totalDays: days.length,
    present,
    absent,
    leave,
    late,
    workingHours: (totalMinutes / 60).toFixed(1)
  };
};

const Attendance = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  // Raw session rows from the API; the summaries below are derived from them on every render
  // so an open session's working time keeps counting up while the page is open.
  const [todaySessions, setTodaySessions] = useState([]);
  const [historySessions, setHistorySessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clockInLoading, setClockInLoading] = useState(false);
  const [clockOutLoading, setClockOutLoading] = useState(false);
  const [message, setMessage] = useState("");
  const isClockedIn = todaySessions.some((sess) => !sess.clockOutTime);
  const now = useNow(isClockedIn);
  const attendance = useMemo(() => summarizeSessions(todaySessions, now), [todaySessions, now]);
  const attendanceHistory = useMemo(() => groupSessionsByDate(historySessions, now), [historySessions, now]);
  const stats = useMemo(() => calculateStats(attendanceHistory), [attendanceHistory]);

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (s) {
      setUser(JSON.parse(s));
      fetchAttendanceData();
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      // Fetch today's sessions (an employee may clock in/out multiple times a day)
      const todayResponse = await employeeApi.getTodayAttendance();
      setTodaySessions(Array.isArray(todayResponse.data) ? todayResponse.data : []);

      // Fetch attendance history for the month
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const historyResponse = await employeeApi.getAttendanceHistory(
        toLocalDateString(startDate),
        toLocalDateString(endDate)
      );
      setHistorySessions(Array.isArray(historyResponse.data) ? historyResponse.data : []);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      setMessage("Error loading attendance data");
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      setClockInLoading(true);
      setMessage("");
      const coords = await getCurrentPosition();
      const response = await employeeApi.clockInGPS(coords.latitude, coords.longitude);
      if (response.data) {
        setMessage("✓ Clocked in successfully!");
        setTimeout(() => setMessage(""), 3000);
        fetchAttendanceData();
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
      setMessage("");
      const coords = await getCurrentPosition();
      const response = await employeeApi.clockOutGPS(coords.latitude, coords.longitude);
      if (response.data) {
        setMessage("✓ Clocked out successfully!");
        setTimeout(() => setMessage(""), 3000);
        fetchAttendanceData();
      }
    } catch (error) {
      console.error("Clock out error:", error);
      setMessage("✗ " + (error.message || "Failed to clock out"));
      setTimeout(() => setMessage(""), 5000);
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

  const statusBadge = (s) => ({
    PRESENT: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    ABSENT: "bg-yellow-50 text-red-700 ring-1 ring-red-200",
    HALF_DAY: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    LATE: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  }[s] || "bg-slate-50 text-slate-600 ring-1 ring-slate-200");

  const statusLabel = (s) => ({
    PRESENT: "Present",
    ABSENT: "Absent",
    HALF_DAY: "Leave",
    LATE: "Late",
  }[s] || s);

  const getDayName = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { weekday: "long" });
  };

  // History search / filter / sort
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredHistory = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return attendanceHistory.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (r.date || "").toLowerCase().includes(q) || getDayName(r.date).toLowerCase().includes(q);
    });
  }, [attendanceHistory, searchTerm, statusFilter]);

  const { sorted: sortedHistory, headerProps } = useSort(filteredHistory, (r, key) =>
    key === "hours" ? String(r.totalWorkingMinutes || 0).padStart(6, "0") : r[key] || ""
  );

  if (!user) return null;

  const isFiltering = searchTerm || statusFilter !== "ALL";

  const locationLinks = (r) => (
    <div className="flex gap-2">
      {r.clockInLocation && (
        <a href={mapLink(r.clockInLocation)} target="_blank" rel="noopener noreferrer" title="Clock-in location"
          className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors">
          <MapPin size={14} />
        </a>
      )}
      {r.clockOutLocation && (
        <a href={mapLink(r.clockOutLocation)} target="_blank" rel="noopener noreferrer" title="Clock-out location"
          className="h-7 w-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors">
          <MapPin size={14} />
        </a>
      )}
      {!r.clockInLocation && !r.clockOutLocation && <span className="text-slate-300 text-xs">—</span>}
    </div>
  );

  const statusPill = (s) => (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(s)}`}>{statusLabel(s)}</span>
  );

  return (
    <PageLayout
      role="employee"
      activePage="Attendance"
      title="Attendance"
      subtitle="Track your attendance and working hours"
      actions={
        <EmpButton>
          <Download size={17} strokeWidth={2.5} /> Export
        </EmpButton>
      }
    >
      <div className="space-y-6">
        {/* Message Alert */}
        {message && (
          <div className={`px-4 py-3 rounded-xl border text-sm font-medium ${message.startsWith("✓") ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
            {message}
          </div>
        )}

        {/* Clock In/Out card */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-3 mb-5">
            <span className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center">
              <Timer size={18} />
            </span>
            Today's Attendance
          </h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {[
                  { label: "Last Clock In", value: formatTime(attendance?.clockInTime), text: "text-slate-900" },
                  { label: "Last Clock Out", value: formatTime(attendance?.clockOutTime), text: "text-slate-900" },
                  { label: "Working Hours", value: formatMinutes(attendance?.totalWorkingMinutes || 0, isClockedIn), text: "text-slate-900" },
                  { label: "Status", value: !attendance ? "Not Started" : attendance.isClockedIn ? "Clocked In" : "Clocked Out", text: attendance?.isClockedIn ? "text-emerald-600" : "text-teal-600" },
                ].map(t => (
                  <div key={t.label} className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-4 text-center">
                    <p className="text-slate-500 text-xs font-medium mb-1.5">{t.label}</p>
                    <p className={`text-2xl font-bold tracking-tight ${t.text}`}>{t.value}</p>
                  </div>
                ))}
              </div>
              {attendance?.sessions?.length > 1 && (
                <p className="text-xs text-slate-400 mb-3">{attendance.sessions.length} sessions today</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleClockIn}
                  disabled={clockInLoading || attendance?.isClockedIn}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-600/20 text-white disabled:opacity-40 disabled:cursor-not-allowed py-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all active:scale-[0.99]"
                >
                  <CheckCircle size={18} /> {clockInLoading ? "Getting location..." : "Clock In"}
                </button>
                <button
                  onClick={handleClockOut}
                  disabled={clockOutLoading || !attendance?.isClockedIn}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/20 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all active:scale-[0.99]"
                >
                  <XCircle size={18} /> {clockOutLoading ? "Getting location..." : "Clock Out"}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-3.5 flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-400 shrink-0" /> Your GPS location is captured at clock-in and clock-out. You can clock in and out as many times as needed during the day.
              </p>
              {(attendance?.clockInLocation || attendance?.clockOutLocation) && (
                <div className="flex flex-wrap gap-2.5 mt-3">
                  {attendance?.clockInLocation && (
                    <a href={mapLink(attendance.clockInLocation)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors">
                      <MapPin size={13} /> Clock-in location
                    </a>
                  )}
                  {attendance?.clockOutLocation && (
                    <a href={mapLink(attendance.clockOutLocation)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors">
                      <MapPin size={13} /> Clock-out location
                    </a>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Monthly stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: "Total Days", value: stats.totalDays, tone: CARD_TONES.blue, icon: <Calendar size={18} /> },
            { label: "Present", value: stats.present, tone: CARD_TONES.green, icon: <CheckCircle size={18} /> },
            { label: "Absent", value: stats.absent, tone: CARD_TONES.red, icon: <XCircle size={18} /> },
            { label: "On Leave", value: stats.leave, tone: CARD_TONES.purple, icon: <Calendar size={18} /> },
            { label: "Late", value: stats.late, tone: CARD_TONES.yellow, icon: <Clock size={18} /> },
            { label: "Hours", value: stats.workingHours + "h", tone: CARD_TONES.slate, icon: <Timer size={18} /> },
          ].map(s => (
            <SummaryCard key={s.label} icon={s.icon} title={s.label} value={s.value} className={s.tone} />
          ))}
        </div>

        {/* =====================================================
            SEARCH & FILTER CONTROLS
        ====================================================== */}
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search history by date (e.g. 2026-09) or day...">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-400" />
            <FilterSelect value={statusFilter} onChange={setStatusFilter}>
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="HALF_DAY">Leave</option>
              <option value="LATE">Late</option>
            </FilterSelect>
          </div>
          <ShowingCount shown={sortedHistory.length} total={attendanceHistory.length} />
        </SearchBar>

        {/* =====================================================
            ATTENDANCE HISTORY TABLE
        ====================================================== */}
        <TableCard>
          <TableHeaderRow cols={HISTORY_COLS}>
            <TableHeader {...headerProps("date")}>Date</TableHeader>
            <TableHeader>Day</TableHeader>
            <TableHeader {...headerProps("clockInTime")}>Check In</TableHeader>
            <TableHeader {...headerProps("clockOutTime")}>Check Out</TableHeader>
            <TableHeader {...headerProps("hours")}>Working Hours</TableHeader>
            <TableHeader>Location</TableHeader>
            <TableHeader {...headerProps("status")}>Status</TableHeader>
          </TableHeaderRow>

          {loading ? (
            <LoadingState title="Loading attendance history..." subtitle="Fetching latest records from database" />
          ) : sortedHistory.length === 0 ? (
            <EmptyState
              icon={isFiltering ? <Search size={28} /> : <Calendar size={28} />}
              title={isFiltering ? "No matching records" : "No attendance records yet"}
              subtitle={isFiltering
                ? "Try clearing your search or choosing another status."
                : "Your attendance history for this month will appear here."}
            />
          ) : (
            <TableRows>
              {sortedHistory.map((r, i) => (
                <TableRow
                  key={r.date || i}
                  cols={HISTORY_COLS}
                  mobile={
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{r.date}</p>
                          <p className="text-xs text-slate-400">{getDayName(r.date)}</p>
                        </div>
                        {statusPill(r.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span>In: {formatTime(r.clockInTime)}</span>
                        <span>Out: {formatTime(r.clockOutTime)}</span>
                        <span className="font-semibold text-slate-800">{formatMinutes(r.totalWorkingMinutes)}</span>
                        {locationLinks(r)}
                      </div>
                    </div>
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 font-bold text-sm flex items-center justify-center shadow-xs">
                      {new Date(r.date).getDate() || "—"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{r.date}</p>
                      {r.sessionCount > 1 && (
                        <p className="text-xs text-slate-400 mt-0.5">{r.sessionCount} sessions</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-slate-600">{getDayName(r.date)}</span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Clock size={13} className="text-slate-400" /> {formatTime(r.clockInTime)}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Clock size={13} className="text-slate-400" /> {formatTime(r.clockOutTime)}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">{formatMinutes(r.totalWorkingMinutes)}</span>
                  {locationLinks(r)}
                  <div>{statusPill(r.status)}</div>
                </TableRow>
              ))}
            </TableRows>
          )}
        </TableCard>
      </div>
    </PageLayout>
  );
};

const HISTORY_COLS = "grid-cols-[1.4fr_1fr_1fr_1fr_1.1fr_0.8fr_0.9fr]";

export default Attendance;
