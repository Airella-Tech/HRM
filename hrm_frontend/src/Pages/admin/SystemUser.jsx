import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Search, Filter, Eye, CheckCircle, XCircle, UserCog,
  Building2, Layers, Table, X, Loader2
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { ADMIN_URL } from "../../services/api";

const AdminSystemUsers = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterCompany, setFilterCompany] = useState("all");
  const [viewMode, setViewMode] = useState("grouped"); // 'grouped' or 'table'
  const [viewingUser, setViewingUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [systemUsers, setSystemUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${ADMIN_URL}/admin/users`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.data || data || [];
        setSystemUsers(list);
      }
    } catch (err) {
      console.warn("Could not fetch system users", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${ADMIN_URL}/admin/companies`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.data || data || [];
        setCompanies(list);
      }
    } catch (err) {
      console.warn("Could not fetch companies", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchCompanies();
    }
  }, [user]);

  // Helper to resolve clean company name for any user object
  const getResolvedCompanyName = useCallback(
    (u) => {
      if (u.companyName && u.companyName.trim()) return u.companyName.trim();
      if (u.company && typeof u.company === "string" && u.company.trim()) return u.company.trim();
      if (u.companyId) {
        const match = companies.find((c) => c.id === u.companyId);
        if (match && match.companyName) return match.companyName.trim();
      }
      return "HRM System";
    },
    [companies]
  );

  const stats = {
    total: systemUsers.length,
    hrManagers: systemUsers.filter((u) => (u.role || "").toUpperCase().includes("HR")).length,
    admins: systemUsers.filter((u) => (u.role || "").toUpperCase().includes("ADMIN")).length,
    employees: systemUsers.filter((u) => (u.role || "").toUpperCase().includes("EMPLOYEE")).length,
  };

  // Unique company names list for dropdown filter
  const companyOptions = useMemo(() => {
    const set = new Set();
    systemUsers.forEach((u) => {
      const name = getResolvedCompanyName(u);
      if (name) set.add(name);
    });
    companies.forEach((c) => {
      if (c.companyName) set.add(c.companyName.trim());
    });
    return Array.from(set).sort();
  }, [systemUsers, companies, getResolvedCompanyName]);

  // Filtered system users
  const filtered = useMemo(() => {
    return systemUsers.filter((u) => {
      const nameStr = (u.fullName || u.name || "").toLowerCase();
      const emailStr = (u.email || "").toLowerCase();
      const resolvedComp = getResolvedCompanyName(u);
      const compStr = resolvedComp.toLowerCase();

      const searchLower = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !searchLower ||
        nameStr.includes(searchLower) ||
        emailStr.includes(searchLower) ||
        compStr.includes(searchLower);

      const roleVal = (u.role || "").trim().toLowerCase();
      const filterRoleLower = filterRole.trim().toLowerCase();
      const matchesRole =
        filterRole === "all" ||
        roleVal === filterRoleLower ||
        roleVal.includes(filterRoleLower) ||
        (filterRoleLower === "hr" && (roleVal.includes("hr") || roleVal.includes("manager")));

      const filterCompLower = filterCompany.trim().toLowerCase();
      const matchesCompany =
        filterCompany === "all" ||
        compStr === filterCompLower ||
        compStr.includes(filterCompLower) ||
        filterCompLower.includes(compStr);

      return matchesSearch && matchesRole && matchesCompany;
    });
  }, [systemUsers, searchTerm, filterRole, filterCompany, getResolvedCompanyName]);

  // Group filtered users by company
  const companyGroupedUsers = useMemo(() => {
    const map = new Map();

    filtered.forEach((u) => {
      const cName = getResolvedCompanyName(u);
      if (!map.has(cName)) {
        map.set(cName, []);
      }
      map.get(cName).push(u);
    });

    return Array.from(map.entries()).map(([cName, usersList]) => ({
      companyName: cName,
      users: usersList,
      hrCount: usersList.filter((u) => (u.role || "").toUpperCase().includes("HR")).length,
      employeeCount: usersList.filter((u) => (u.role || "").toUpperCase().includes("EMPLOYEE")).length,
    }));
  }, [filtered, getResolvedCompanyName]);

  const handleAssignRole = (id) => {
    if (!selectedRole) return;
    setSystemUsers((users) =>
      users.map((u) => (u.id === id ? { ...u, role: selectedRole, status: "ACTIVE" } : u))
    );
    setViewingUser(null);
    setSelectedRole("");
  };

  const handleDeactivate = (id) => {
    setSystemUsers((users) =>
      users.map((u) => (u.id === id ? { ...u, status: "INACTIVE" } : u))
    );
    setViewingUser(null);
  };

  const roleBadge = (r) => {
    const norm = (r || "").toUpperCase();
    if (norm.includes("ADMIN")) return "bg-violet-100 text-violet-700 border border-violet-200";
    if (norm.includes("HR")) return "bg-indigo-100 text-indigo-700 border border-indigo-200";
    return "bg-slate-100 text-slate-700 border border-slate-200";
  };

  const statusBadge = (s) => {
    const norm = (s || "").toUpperCase();
    if (norm === "ACTIVE" || norm === "APPROVED") return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    if (norm === "INACTIVE" || norm === "REJECTED") return "bg-red-100 text-red-700 border border-red-200";
    return "bg-amber-100 text-amber-700 border border-amber-200";
  };

  if (!user) return null;

  return (
    <PageLayout
      role="admin"
      activePage="System Users"
      title="User & Role Management"
      subtitle="Manage all system users, organized company-wise with role assignment and administration"
    >
      <div className="space-y-6">

        {/* Top Summary Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
          {[
            { label: "Total System Users", value: stats.total, icon: "👥", gradient: "from-indigo-400 to-violet-500" },
            { label: "HR Managers", value: stats.hrManagers, icon: "🎯", gradient: "from-emerald-400 to-teal-500" },
            { label: "Administrators", value: stats.admins, icon: "🛡", gradient: "from-violet-400 to-purple-600" },
            { label: "Employees", value: stats.employees, icon: "👤", gradient: "from-sky-400 to-blue-500" },
          ].map((s) => (
            <div key={s.label} className={`bg-gradient-to-br ${s.gradient} p-6 rounded-2xl text-white hover:-translate-y-1 hover:shadow-lg transition-all duration-300`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">{s.label}</p>
                <span className="text-2xl">{s.icon}</span>
              </div>
              <p className="text-4xl font-bold">{loading ? "..." : s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters & View Switcher Toolbar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">

            {/* Search Input */}
            <div className="relative w-full lg:w-96">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or company…"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Company Filter Dropdown */}
              <div className="relative flex-1 lg:flex-initial">
                <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 appearance-none font-medium text-gray-700 w-full"
                >
                  <option value="all">All Companies</option>
                  {companyOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Role Filter Dropdown */}
              <div className="relative flex-1 lg:flex-initial">
                <Filter size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 appearance-none font-medium text-gray-700 w-full"
                >
                  <option value="all">All Roles</option>
                  <option value="hr">HR Manager</option>
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                </select>
              </div>

              {/* View Mode Toggle Button */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setViewMode("grouped")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === "grouped"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-gray-500 hover:text-gray-800"
                    }`}
                  title="Company-wise Grouped View"
                >
                  <Layers size={14} /> Company View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === "table"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-gray-500 hover:text-gray-800"
                    }`}
                  title="Combined Table View"
                >
                  <Table size={14} /> Full Table
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-center gap-2">
              <Loader2 size={20} className="animate-spin text-indigo-600" />
              <span className="font-medium text-xs">Loading system users by company...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100 shadow-sm">
            No system users match the selected filters.
          </div>
        ) : viewMode === "grouped" ? (
          /* COMPANY-WISE GROUPED VIEW */
          <div className="space-y-6">
            {companyGroupedUsers.map((group) => (
              <div key={group.companyName} className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden transition-all hover:shadow-md">

                {/* Company Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base tracking-tight text-white">{group.companyName}</h3>
                      <p className="text-indigo-200/80 text-xs">
                        Registered Organization Account
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-indigo-200 border border-white/10">
                      👥 {group.users.length} Total Users
                    </span>
                    <span className="px-3 py-1 bg-emerald-500/20 backdrop-blur-md rounded-full text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                      🎯 {group.hrCount} HR Manager{group.hrCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* User Table for this Company */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200/80 text-gray-500 uppercase tracking-wider text-[11px]">
                        <th className="px-6 py-3 text-left font-semibold">User Name</th>
                        <th className="px-6 py-3 text-left font-semibold">Email</th>
                        <th className="px-6 py-3 text-left font-semibold">Role</th>
                        <th className="px-6 py-3 text-left font-semibold">Joined Date</th>
                        <th className="px-6 py-3 text-left font-semibold">Status</th>
                        <th className="px-6 py-3 text-left font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {group.users.map((u, i) => (
                        <tr key={u.id || i} className={`hover:bg-indigo-50/40 transition-colors ${i % 2 === 1 ? "bg-gray-50/30" : ""}`}>
                          <td className="px-6 py-3.5 font-bold text-gray-800">{u.fullName || u.name}</td>
                          <td className="px-6 py-3.5 text-gray-600">{u.email}</td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${roleBadge(u.role)}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-gray-400">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : u.joinedOn || "Active"}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusBadge(u.status)}`}>
                              {u.status || "ACTIVE"}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <button
                              onClick={() => setViewingUser(u)}
                              className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold text-xs transition-colors"
                            >
                              <Eye size={14} /> Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            ))}
          </div>
        ) : (
          /* COMBINED TABLE VIEW */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs">
                    {["Name", "Email", "Company", "Role", "Joined Date", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-5 py-4 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((u, i) => (
                    <tr key={u.id || i} className={`hover:bg-indigo-50/40 transition-colors ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                      <td className="px-5 py-3.5 font-bold text-gray-800">{u.fullName || u.name}</td>
                      <td className="px-5 py-3.5 text-gray-600">{u.email}</td>
                      <td className="px-5 py-3.5 text-gray-700 font-semibold">{getResolvedCompanyName(u)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${roleBadge(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : u.joinedOn || "Active"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusBadge(u.status)}`}>
                          {u.status || "ACTIVE"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setViewingUser(u)}
                          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold text-xs transition-colors"
                        >
                          <Eye size={14} /> Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Manage User Modal */}
      {viewingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
              <div>
                <h3 className="text-xl font-bold">User Account Details</h3>
                <p className="text-indigo-200 text-xs mt-0.5">{viewingUser.email}</p>
              </div>
              <button onClick={() => { setViewingUser(null); setSelectedRole(""); }} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-5 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                {[
                  ["Full Name", viewingUser.fullName || viewingUser.name],
                  ["Email Address", viewingUser.email],
                  ["Assigned Company", getResolvedCompanyName(viewingUser)],
                  ["Designation / Title", viewingUser.designation || viewingUser.role || "N/A"],
                ].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">{l}</p>
                    <p className="font-semibold text-gray-800">{v}</p>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100">
                <p className="text-xs font-bold text-indigo-900 mb-2 flex items-center gap-2">
                  <UserCog size={16} className="text-indigo-600" /> Assign / Change Role
                </p>
                <div className="flex gap-2">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="flex-1 px-3 py-2 border border-indigo-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Select a role…</option>
                    <option value="HR_MANAGER">HR Manager</option>
                    <option value="ADMIN">Admin</option>
                    <option value="EMPLOYEE">Employee</option>
                  </select>
                  <button
                    onClick={() => handleAssignRole(viewingUser.id)}
                    disabled={!selectedRole}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle size={15} /> Assign
                  </button>
                </div>
              </div>

              {viewingUser.status !== "INACTIVE" && (
                <button
                  onClick={() => handleDeactivate(viewingUser.id)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <XCircle size={16} /> Deactivate User Account
                </button>
              )}

              <button
                onClick={() => { setViewingUser(null); setSelectedRole(""); }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold text-xs transition-colors"
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

export default AdminSystemUsers;