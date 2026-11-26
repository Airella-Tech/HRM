import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, Eye, TrendingUp, Users, X, DollarSign, CheckCircle2, Clock } from "lucide-react";
import { PageLayout } from "../../components/PageLayout";

const AdminPayslip = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingPayslip, setViewingPayslip] = useState(null);

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

  const deptPayroll = [
    { id: 1, department: "IT", employees: 25, totalSalary: 1375000, avgSalary: 55000, processed: 25, pending: 0 },
    { id: 2, department: "HR", employees: 10, totalSalary: 490000, avgSalary: 49000, processed: 9, pending: 1 },
    { id: 3, department: "Finance", employees: 15, totalSalary: 787500, avgSalary: 52500, processed: 14, pending: 1 },
    { id: 4, department: "Marketing", employees: 12, totalSalary: 732000, avgSalary: 61000, processed: 12, pending: 0 },
    { id: 5, department: "Operations", employees: 18, totalSalary: 846000, avgSalary: 47000, processed: 18, pending: 0 },
  ];
  const stats = {
    employees: deptPayroll.reduce((s, d) => s + d.employees, 0),
    payroll: deptPayroll.reduce((s, d) => s + d.totalSalary, 0),
    processed: deptPayroll.reduce((s, d) => s + d.processed, 0),
    pending: deptPayroll.reduce((s, d) => s + d.pending, 0),
  };
  const filtered = deptPayroll.filter((d) =>
    d.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) return null;
  return (
    <PageLayout
      role="admin"
      activePage="Payroll"
      title="System-Wide Payroll"
      subtitle="Monitor payroll across all departments"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Stats Cards — Matching primary color */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[
            { label: "Total Employees", value: stats.employees, icon: Users, sub: "Across all teams" },
            {
              label: "Total Monthly Payroll",
              value: `Rs. ${(stats.payroll / 1000000).toFixed(2)}M`,
              icon: DollarSign,
              sub: "Gross commitment",
            },
            { label: "Processed Payroll", value: stats.processed, icon: CheckCircle2, sub: "Completed disbursements" },
            { label: "Pending Approvals", value: stats.pending, icon: Clock, sub: "Awaiting final sign-off" },
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

        {/* Search & Actions */}
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
            <button className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm shadow-primary-600/20 transition-all">
              <Download size={14} /> Export Report
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(15,23,42,0.035)] border border-slate-200/90 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                  {["Department", "Employees", "Total Payroll", "Avg Salary", "Processed", "Pending", "Status", "Actions"].map(
                    (h) => (
                      <th key={h} className="px-5 py-3.5 text-left font-semibold">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-800">{d.department}</td>
                    <td className="px-5 py-3.5 text-slate-600">{d.employees}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-800">
                      Rs. {d.totalSalary.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      Rs. {d.avgSalary.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-emerald-600">{d.processed}</td>
                    <td className="px-5 py-3.5 font-semibold text-amber-600">{d.pending}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          d.pending === 0
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            d.pending === 0 ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                        {d.pending === 0 ? "Completed" : "Pending"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setViewingPayslip(d)}
                        className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-800 font-semibold text-xs transition-colors"
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {viewingPayslip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200/90">
            <div
              className="flex items-center justify-between p-6 text-white"
              style={{ background: "linear-gradient(135deg, #121731 0%, #1b2142 60%, #2b3566 100%)" }}
            >
              <div>
                <h3 className="text-xl font-bold tracking-tight">{viewingPayslip.department} Department</h3>
                <p className="text-slate-300 text-xs mt-0.5">Payroll Breakdown Summary</p>
              </div>
              <button
                onClick={() => setViewingPayslip(null)}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70 space-y-2.5">
                {[
                  ["Department Name", viewingPayslip.department],
                  ["Total Headcount", `${viewingPayslip.employees} employees`],
                  ["Total Monthly Outflow", `Rs. ${viewingPayslip.totalSalary.toLocaleString()}`],
                  ["Average Compensation", `Rs. ${viewingPayslip.avgSalary.toLocaleString()}`],
                  ["Processed Slips", viewingPayslip.processed],
                  ["Pending Approvals", viewingPayslip.pending],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-b-0">
                    <span className="text-slate-500 font-medium">{l}</span>
                    <span className="font-bold text-slate-800">{v}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setViewingPayslip(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-semibold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default AdminPayslip;
