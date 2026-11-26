import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  XCircle,
  Bell,
  Sparkles,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { ADMIN_URL } from "../../services/api";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [systemUsersCount, setSystemUsersCount] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      if (userData.role !== "ADMIN") {
        navigate("/unauthorized");
        return;
      }
      setUser(userData);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // 1. Fetch live companies
      const compRes = await fetch(`${ADMIN_URL}/admin/companies`, { headers });
      if (compRes.ok) {
        const compData = await compRes.json();
        setCompanies(compData.data || compData || []);
      }

      // 2. Fetch live system users count
      const usersRes = await fetch(`${ADMIN_URL}/admin/users`, { headers });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const list = usersData.data || usersData || [];
        setSystemUsersCount(list.length);
      }
    } catch (err) {
      console.warn("Failed to fetch live admin dashboard data:", err);
      setError("Unable to connect to Admin_Backend service. Please check if services are running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  if (!user) return null;

  const totalCompanies = companies.length;
  const pendingCompanies = companies.filter((c) => (c.status || "").toUpperCase() === "PENDING");
  const activeCompanies = companies.filter(
    (c) => (c.status || "").toUpperCase() === "ACTIVE" || (c.status || "").toUpperCase() === "APPROVED"
  );
  const rejectedCompanies = companies.filter((c) => (c.status || "").toUpperCase() === "REJECTED");

  return (
    <PageLayout
      role="admin"
      activePage="Overview"
      title="Admin Dashboard"
      subtitle="System Overview & Pending Company Onboarding Applications"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Error Notification */}
        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-5 py-4 rounded-2xl text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="text-amber-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-amber-700 hover:text-amber-900 font-bold text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Hero Welcome Banner */}
        <div
          className="relative overflow-hidden rounded-3xl p-8 text-white shadow-md border border-white/10"
          style={{ background: "linear-gradient(135deg, #121731 0%, #1b2142 50%, #2b3566 100%)" }}
        >
          <div
            className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle, #7c8ac8, transparent)" }}
          />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[11px] font-semibold text-primary-200 uppercase tracking-wider mb-2">
                <Sparkles size={12} className="text-amber-300" />
                Administrator Portal
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Welcome back, {user.fullName?.split(" ")[0]}
              </h2>
              <p className="text-slate-300 text-xs mt-1.5 font-medium">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-xs font-semibold backdrop-blur-md flex items-center gap-2 border border-white/10 shadow-xs">
                <Building2 size={15} className="text-primary-300" />
                {totalCompanies} Registered Companies
              </span>
              <span className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-xs font-semibold backdrop-blur-md flex items-center gap-2 border border-white/10 shadow-xs">
                <Clock size={15} className="text-primary-300" />
                {pendingCompanies.length} Pending Review
              </span>
            </div>
          </div>
        </div>

        {/* Live Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[
            {
              title: "Total Companies",
              value: totalCompanies,
              icon: Building2,
              sub: `${activeCompanies.length} active clients`,
            },
            {
              title: "Pending Applications",
              value: pendingCompanies.length,
              icon: Clock,
              sub: "Awaiting approval",
            },
            {
              title: "Active System Users",
              value: systemUsersCount,
              icon: Users,
              sub: "Across all tenants",
            },
            {
              title: "Rejected Applications",
              value: rejectedCompanies.length,
              icon: XCircle,
              sub: "Audit logged records",
            },
          ].map((s) => {
            const IconComponent = s.icon;
            return (
              <div
                key={s.title}
                className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 p-5 text-white shadow-sm flex items-start justify-between gap-3 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white/85 truncate">{s.title}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {loading ? "..." : s.value}
                  </p>
                  <p className="mt-1 text-xs text-white/75 truncate">{s.sub}</p>
                </div>
                <div className="shrink-0 rounded-xl bg-white/20 p-2.5 text-white backdrop-blur-xs flex items-center justify-center">
                  <IconComponent size={20} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Middle Section: Live Pending Approvals Table & Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Applications List (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-[0_2px_12px_rgba(15,23,42,0.035)] border border-slate-200/90 p-6">
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Building2 size={18} className="text-primary-600" />
                  Pending Company Onboarding Approvals
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time submitted requests awaiting administrator review
                </p>
              </div>
              <button
                onClick={() => navigate("/admin/companies")}
                className="text-xs font-semibold text-primary-600 hover:text-primary-800 flex items-center gap-1 transition-colors"
              >
                View All <ArrowRight size={14} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                    <th className="text-left py-3 px-3 font-semibold">Company Name</th>
                    <th className="text-left py-3 px-3 font-semibold">Contact Email</th>
                    <th className="text-left py-3 px-3 font-semibold">Industry</th>
                    <th className="text-left py-3 px-3 font-semibold">Submitted</th>
                    <th className="text-right py-3 px-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 size={16} className="animate-spin text-primary-600" />
                          <span>Fetching pending company requests...</span>
                        </div>
                      </td>
                    </tr>
                  ) : pendingCompanies.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <CheckCircle2 size={24} className="text-emerald-500 mb-1" />
                          <p className="font-semibold text-slate-700">No Pending Applications</p>
                          <p className="text-[11px] text-slate-400">
                            All submitted company registration requests have been reviewed.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pendingCompanies.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-800">{c.companyName || c.name}</p>
                          <p className="text-[10px] text-slate-400">{c.registrationNumber || "Reg N/A"}</p>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{c.email}</td>
                        <td className="py-3 px-3 text-slate-500">{c.industry || "General"}</td>
                        <td className="py-3 px-3 text-slate-400">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : c.submittedOn || "Recent"}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => navigate("/admin/companies")}
                            className="px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors"
                          >
                            Review & Action
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Activity Feed (1 Col) */}
          <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(15,23,42,0.035)] border border-slate-200/90 p-6 flex flex-col">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Bell size={18} className="text-primary-600" />
              Recent System Activity
            </h3>

            <div className="space-y-3 flex-1">
              {companies.slice(0, 4).map((c, i) => {
                const isPending = (c.status || "").toUpperCase() === "PENDING";
                const isApproved =
                  (c.status || "").toUpperCase() === "APPROVED" || (c.status || "").toUpperCase() === "ACTIVE";
                return (
                  <div
                    key={c.id || i}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:border-slate-300 transition-colors text-xs"
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${isPending
                        ? "bg-amber-100 text-amber-700"
                        : isApproved
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                        }`}
                    >
                      <Building2 size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate">{c.companyName || c.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {isPending
                          ? "Registration request pending review"
                          : isApproved
                            ? "Company approved & HR provisioned"
                            : "Application rejected"}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 inline-block">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "System Record"}
                      </span>
                    </div>
                  </div>
                );
              })}

              {companies.length === 0 && !loading && (
                <div className="p-6 text-center text-xs text-slate-400">
                  No system activity logs available.
                </div>
              )}
            </div>

            <button
              onClick={() => navigate("/admin/companies")}
              className="mt-4 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs text-center transition-colors"
            >
              Go to Companies Directory
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default AdminDashboard;
