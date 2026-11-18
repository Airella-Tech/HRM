import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Search, Filter, Eye, CheckCircle2, XCircle, UserCog,
  Building2, Layers, Table, X, Loader2, ShieldCheck, UserCheck, RefreshCw
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { ADMIN_URL } from "../../services/api";
import {
  Button, Card, StatCard, StatCardGrid, TableToolbar, TableCard,
  TableHeaderRow, TableHeader, TableRows, TableRow, StatusBadge, Modal,
  LoadingState, EmptyState, FormGroup, FormSelect
} from "../../components/common/EnterpriseUI";

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

  const roleBadgeStyle = (r) => {
    const norm = (r || "").toUpperCase();
    if (norm.includes("ADMIN")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (norm.includes("HR")) return "bg-purple-50 text-purple-700 border-purple-200";
    return "bg-teal-50 text-teal-700 border-teal-200";
  };

  if (!user) return null;

  return (
    <PageLayout
      role="admin"
      activePage="System Users"
      title="User & Role Management"
      subtitle="Directory of system accounts across tenant companies with role assignments"
      actions={
        <Button
          variant="light"
          size="sm"
          role="admin"
          icon={RefreshCw}
          onClick={() => {
            fetchUsers();
            fetchCompanies();
          }}
          loading={loading}
        >
          Refresh Users
        </Button>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        {/* Top Summary Stats */}
        <StatCardGrid cols={4}>
          <StatCard
            role="admin"
            label="Total Accounts"
            value={loading ? "..." : stats.total}
            icon={Users}
            tone="primary"
            variant="clean"
            onClick={() => setFilterRole("all")}
            active={filterRole === "all"}
          />
          <StatCard
            role="admin"
            label="HR Managers"
            value={loading ? "..." : stats.hrManagers}
            icon={UserCheck}
            tone="secondary"
            variant="clean"
            onClick={() => setFilterRole("hr")}
            active={filterRole === "hr"}
          />
          <StatCard
            role="admin"
            label="Administrators"
            value={loading ? "..." : stats.admins}
            icon={ShieldCheck}
            tone="accent"
            variant="clean"
            onClick={() => setFilterRole("admin")}
            active={filterRole === "admin"}
          />
          <StatCard
            role="admin"
            label="Employees"
            value={loading ? "..." : stats.employees}
            icon={Users}
            tone="slate"
            variant="clean"
            onClick={() => setFilterRole("employee")}
            active={filterRole === "employee"}
          />
        </StatCardGrid>

        {/* Filters & View Switcher Toolbar */}
        <TableToolbar
          role="admin"
          search={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Search by user name, email, or company name..."
          shown={filtered.length}
          total={systemUsers.length}
          filters={
            <>
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="all">All Companies</option>
                {companyOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="hr">HR Manager</option>
                <option value="admin">Admin</option>
                <option value="employee">Employee</option>
              </select>
            </>
          }
          actions={
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode("grouped")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === "grouped"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
                  }`}
                title="Company-wise Grouped View"
              >
                <Layers size={14} /> Company View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === "table"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
                  }`}
                title="Combined Table View"
              >
                <Table size={14} /> Full Table
              </button>
            </div>
          }
        />

        {/* Content Area */}
        {loading ? (
          <LoadingState
            role="admin"
            title="Loading system accounts"
            subtitle="Fetching registered users from user microservice..."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            role="admin"
            icon={Users}
            title="No matching system users"
            subtitle="No user accounts match your specified search keywords or filter criteria."
            action={
              <Button
                variant="outline"
                size="sm"
                role="admin"
                onClick={() => {
                  setSearchTerm("");
                  setFilterCompany("all");
                  setFilterRole("all");
                }}
              >
                Reset All Filters
              </Button>
            }
          />
        ) : viewMode === "grouped" ? (
          /* COMPANY-WISE GROUPED VIEW */
          <div className="space-y-6">
            {companyGroupedUsers.map((group) => (
              <Card
                key={group.companyName}
                role="admin"
                noPadding
                className="overflow-hidden"
              >
                {/* Company Header */}
                <div className="bg-slate-900 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base tracking-tight text-white">{group.companyName}</h3>
                      <p className="text-slate-400 text-xs">Registered Organization Workspace</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-slate-200 border border-white/10">
                      👥 {group.users.length} Users
                    </span>
                    <span className="px-3 py-1 bg-purple-500/20 backdrop-blur-md rounded-full text-xs font-semibold text-purple-300 border border-purple-500/30">
                      🎯 {group.hrCount} HR Manager{group.hrCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* User Table for this Company */}
                <TableCard className="border-0 shadow-none rounded-none">
                  <TableHeaderRow cols="grid-cols-[2fr_2fr_1.4fr_1.2fr_1fr_100px]">
                    <TableHeader role="admin">User Name</TableHeader>
                    <TableHeader role="admin">Email Address</TableHeader>
                    <TableHeader role="admin">Assigned Role</TableHeader>
                    <TableHeader role="admin">Registered</TableHeader>
                    <TableHeader role="admin">Status</TableHeader>
                    <TableHeader role="admin" className="justify-end">Action</TableHeader>
                  </TableHeaderRow>
                  <TableRows>
                    {group.users.map((u) => (
                      <TableRow
                        key={u.id}
                        cols="grid-cols-[2fr_2fr_1.4fr_1.2fr_1fr_100px]"
                        mobile={
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-slate-900 text-sm">{u.fullName || u.name}</p>
                              <StatusBadge status={u.status || "ACTIVE"} size="sm" />
                            </div>
                            <p className="text-xs text-slate-500">{u.email}</p>
                            <div className="flex items-center justify-between pt-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${roleBadgeStyle(u.role)}`}>
                                {u.role}
                              </span>
                              <Button
                                variant="light"
                                size="sm"
                                role="admin"
                                onClick={() => setViewingUser(u)}
                              >
                                Manage
                              </Button>
                            </div>
                          </div>
                        }
                      >
                        <p className="font-bold text-slate-900 text-sm truncate">{u.fullName || u.name}</p>
                        <span className="text-xs text-slate-600 truncate">{u.email}</span>
                        <div>
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${roleBadgeStyle(u.role)}`}>
                            {u.role}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : u.joinedOn || "Active"}
                        </span>
                        <div>
                          <StatusBadge status={u.status || "ACTIVE"} />
                        </div>
                        <div className="text-right">
                          <Button
                            variant="light"
                            size="sm"
                            role="admin"
                            icon={Eye}
                            onClick={() => setViewingUser(u)}
                          >
                            Manage
                          </Button>
                        </div>
                      </TableRow>
                    ))}
                  </TableRows>
                </TableCard>
              </Card>
            ))}
          </div>
        ) : (
          /* COMBINED TABLE VIEW */
          <Card role="admin" noPadding>
            <TableCard className="border-0 shadow-none rounded-none">
              <TableHeaderRow cols="grid-cols-[2fr_2fr_1.8fr_1.3fr_1.2fr_1fr_100px]">
                <TableHeader role="admin">Full Name</TableHeader>
                <TableHeader role="admin">Email Address</TableHeader>
                <TableHeader role="admin">Company</TableHeader>
                <TableHeader role="admin">Role</TableHeader>
                <TableHeader role="admin">Registered</TableHeader>
                <TableHeader role="admin">Status</TableHeader>
                <TableHeader role="admin" className="justify-end">Action</TableHeader>
              </TableHeaderRow>
              <TableRows>
                {filtered.map((u) => (
                  <TableRow
                    key={u.id}
                    cols="grid-cols-[2fr_2fr_1.8fr_1.3fr_1.2fr_1fr_100px]"
                    mobile={
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-900 text-sm">{u.fullName || u.name}</p>
                          <StatusBadge status={u.status || "ACTIVE"} size="sm" />
                        </div>
                        <p className="text-xs text-slate-500">{u.email} • {getResolvedCompanyName(u)}</p>
                        <div className="flex items-center justify-between pt-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${roleBadgeStyle(u.role)}`}>
                            {u.role}
                          </span>
                          <Button
                            variant="light"
                            size="sm"
                            role="admin"
                            onClick={() => setViewingUser(u)}
                          >
                            Manage
                          </Button>
                        </div>
                      </div>
                    }
                  >
                    <p className="font-bold text-slate-900 text-sm truncate">{u.fullName || u.name}</p>
                    <span className="text-xs text-slate-600 truncate">{u.email}</span>
                    <span className="text-xs font-semibold text-slate-700 truncate">{getResolvedCompanyName(u)}</span>
                    <div>
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${roleBadgeStyle(u.role)}`}>
                        {u.role}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : u.joinedOn || "Active"}
                    </span>
                    <div>
                      <StatusBadge status={u.status || "ACTIVE"} />
                    </div>
                    <div className="text-right">
                      <Button
                        variant="light"
                        size="sm"
                        role="admin"
                        icon={Eye}
                        onClick={() => setViewingUser(u)}
                      >
                        Manage
                      </Button>
                    </div>
                  </TableRow>
                ))}
              </TableRows>
            </TableCard>
          </Card>
        )}
      </div>

      {/* Manage User Modal */}
      {viewingUser && (
        <Modal
          isOpen={Boolean(viewingUser)}
          onClose={() => {
            setViewingUser(null);
            setSelectedRole("");
          }}
          title="User Account Details"
          subtitle={viewingUser.email}
          icon={UserCog}
          role="admin"
          maxWidth="max-w-lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="secondary"
                onClick={() => {
                  setViewingUser(null);
                  setSelectedRole("");
                }}
              >
                Close
              </Button>
              {viewingUser.status !== "INACTIVE" && (
                <Button
                  variant="danger"
                  icon={XCircle}
                  onClick={() => handleDeactivate(viewingUser.id)}
                >
                  Deactivate Account
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              {[
                ["Full Name", viewingUser.fullName || viewingUser.name],
                ["Email Address", viewingUser.email],
                ["Assigned Company", getResolvedCompanyName(viewingUser)],
                ["Designation / Title", viewingUser.designation || viewingUser.role || "N/A"],
              ].map(([l, v]) => (
                <div key={l} className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">{l}</span>
                  <p className="font-semibold text-slate-900 text-xs">{v}</p>
                </div>
              ))}
            </div>

            <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200/80 space-y-3">
              <div className="flex items-center gap-2">
                <UserCog size={16} className="text-blue-600" />
                <span className="font-bold text-slate-900 text-xs">Assign or Change Role</span>
              </div>
              <div className="flex gap-2.5">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Select a role…</option>
                  <option value="HR_MANAGER">HR Manager</option>
                  <option value="ADMIN">Admin</option>
                  <option value="EMPLOYEE">Employee</option>
                </select>
                <Button
                  variant="primary"
                  size="sm"
                  role="admin"
                  icon={CheckCircle2}
                  disabled={!selectedRole}
                  onClick={() => handleAssignRole(viewingUser.id)}
                >
                  Assign
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700">Account Status:</span>
              <StatusBadge status={viewingUser.status || "ACTIVE"} />
            </div>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
};

export default AdminSystemUsers;
