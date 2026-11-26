import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";

const AdminAttendance = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");

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

  const departmentData = [
    { id: 1, department: "IT", totalEmployees: 25, present: 22, absent: 2, halfDay: 1, lateCount: 5, avgWorkHours: "8.5" },
    { id: 2, department: "HR", totalEmployees: 10, present: 9, absent: 1, halfDay: 0, lateCount: 2, avgWorkHours: "9.0" },
    { id: 3, department: "Finance", totalEmployees: 15, present: 13, absent: 1, halfDay: 1, lateCount: 3, avgWorkHours: "8.7" },
    { id: 4, department: "Marketing", totalEmployees: 12, present: 11, absent: 1, halfDay: 0, lateCount: 4, avgWorkHours: "8.3" },
    { id: 5, department: "Operations", totalEmployees: 18, present: 16, absent: 2, halfDay: 0, lateCount: 6, avgWorkHours: "8.8" },
  ];
  const stats = {
    total: departmentData.reduce((s, d) => s + d.totalEmployees, 0),
    present: departmentData.reduce((s, d) => s + d.present, 0),
    absent: departmentData.reduce((s, d) => s + d.absent, 0),
    late: departmentData.reduce((s, d) => s + d.lateCount, 0),
    avg: (
      (departmentData.reduce((s, d) => s + d.present, 0) /
        departmentData.reduce((s, d) => s + d.totalEmployees, 0)) *
      100
    ).toFixed(1),
  };
  const filtered = departmentData.filter(
      (d) =>
        d.department.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (filterDepartment === "all" || d.department === filterDepartment)
    );

  if (!user) return null;
  return (
    <PageLayout
      role="admin"
      activePage="Attendance"
      title="System-Wide Attendance"
      subtitle="Monitor attendance across all departments"
      actions={
        <button className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm shadow-primary-600/20 transition-all">
          <Download size={15} /> Export
        </button>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Stats — Matching primary color */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          {[
            { label: "Total Workforce", value: stats.total, icon: Users, sub: "All registered" },
            { label: "Present Today", value: stats.present, icon: CheckCircle2, sub: "Currently logged" },
            { label: "Absent", value: stats.absent, icon: XCircle, sub: "Unexcused" },
            { label: "Late Arrivals", value: stats.late, icon: Clock, sub: "Grace exceeded" },
            { label: "Avg Rate", value: `${stats.avg}%`, icon: TrendingUp, sub: "Across departments" },
          ].map((s) => {
            const IconComponent = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 p-5 text-white shadow-sm flex items-start justify-between gap-3 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white/85 truncate">{s.label}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight">{s.value}</p>
                  <p className="mt-1 text-xs text-white/75 truncate">{s.sub}</p>
                </div>
                <div className="shrink-0 rounded-xl bg-white/20 p-2 text-white backdrop-blur-xs flex items-center justify-center">
                  <IconComponent size={18} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(15,23,42,0.035)] border border-slate-200/90 p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search departments…"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-slate-50/50 text-slate-800"
              />
            </div>
            <div className="relative">
              <Filter size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="pl-9 pr-8 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-slate-50/50 appearance-none text-slate-700 font-medium"
              >
                <option value="all">All Departments</option>
                {departmentData.map((d) => (
                  <option key={d.id} value={d.department}>
                    {d.department}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(15,23,42,0.035)] border border-slate-200/90 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                  {["Department", "Employees", "Present", "Absent", "Half Day", "Late", "Avg Hours", "Attendance Rate"].map(
                    (h) => (
                      <th key={h} className="px-5 py-3.5 text-left font-semibold">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((d) => {
                  const rate = ((d.present / d.totalEmployees) * 100).toFixed(0);
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800">{d.department}</td>
                      <td className="px-5 py-3.5 text-slate-600">{d.totalEmployees}</td>
                      <td className="px-5 py-3.5 font-semibold text-emerald-600">{d.present}</td>
                      <td className="px-5 py-3.5 font-semibold text-rose-600">{d.absent}</td>
                      <td className="px-5 py-3.5 text-slate-500">{d.halfDay}</td>
                      <td className="px-5 py-3.5 font-semibold text-amber-600">{d.lateCount}</td>
                      <td className="px-5 py-3.5 text-slate-600">{d.avgWorkHours} hrs</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-primary-600 rounded-full"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="font-semibold text-slate-700">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default AdminAttendance;
