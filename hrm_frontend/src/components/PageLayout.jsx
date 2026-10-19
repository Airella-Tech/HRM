/**
 * PageLayout — Shared premium layout wrapper used by all sub-pages.
 * Provides the deep-navy sidebar + white topbar.
 *
 * Props:
 *   role        : 'employee' | 'hr' | 'admin'
 *   activePage  : string  — name of the current page (used to highlight nav item)
 *   title       : string  — page title shown in topbar
 *   subtitle    : string  — subtitle shown in topbar
 *   actions     : ReactNode — optional topbar right-side actions
 *   children    : ReactNode — page content
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, LogOut, Bell,
  // Employee icons
  LayoutDashboard, Clock, CalendarDays, DollarSign, User,
  // HR icons
  Users, Building2, CalendarCheck, FileText, BarChart3, Bell as BellIcon,
  // Admin icons
  Settings, Activity,
    // Recruitment icons
  BriefcaseBusiness, CalendarClock,ClipboardCheck,ChartNoAxesCombined,Handshake,ShieldCheck,
} from "lucide-react";
import logo from "../assets/logo.jpg";
import NotificationPopup from "./NotificationPopup";
import RoleSwitch from "./RoleSwitch";

// ─── Nav configs per role ────────────────────────────────────────────────────
const NAV = {
  employee: [
    { name: "Overview", icon: LayoutDashboard, path: "/employee/dashboard" },
    { name: "Attendance", icon: Clock, path: "/employee/attendance" },
    { name: "Leave", icon: CalendarDays, path: "/employee/leave" },
    { name: "Payslip", icon: DollarSign, path: "/employee/payslip" },
    { name: "Profile", icon: User, path: "/employee/profile" },
  ],
  hr: [
    { name: "Overview", icon: LayoutDashboard, path: "/hr/dashboard" },
    { name: "Departments", icon: Building2, path: "/hr/departments" },
    { name: "Employees", icon: Users, path: "/hr/employees" },
    { name: "Attendance", icon: CalendarCheck, path: "/hr/attendance" },
    { name: "Leave Management", icon: FileText, path: "/hr/leave" },
    { name: "Payroll", icon: DollarSign, path: "/hr/payslip" },
    { name: "Reports", icon: BarChart3, path: "/hr/report" },
    { name: "Notifications", icon: BellIcon, path: "/hr/notifications" },
    // Recruitment role management
    {name: "Roles & Permissions",icon: ShieldCheck,path: "/hr/roles-permissions",},
    { name: "Profile", icon: User, path: "/hr/profile" },
  ],
  admin: [
    { name: "Overview", icon: LayoutDashboard, path: "/admin/dashboard" },
    { name: "Companies", icon: Building2, path: "/admin/companies" },
    { name: "System Users", icon: Users, path: "/admin/system-users" },
    // { name: "Attendance", icon: CalendarCheck, path: "/admin/attendance" },
    // { name: "Leave", icon: FileText, path: "/admin/leave" },
    // { name: "Payroll", icon: Activity, path: "/admin/payslip" },
    { name: "System Config", icon: Settings, path: "/admin/system-config" },
    { name: "Profile", icon: User, path: "/admin/profile" },
  ],

  
  recruiter: [
    {
      name: "Overview",
      icon: LayoutDashboard,
      path: "/recruitment/dashboard",
    },
    {
      name: "Job Vacancies",
      icon: BriefcaseBusiness,
      path: "/recruitment/vacancies",
    },
    {
      name: "Applications",
      icon: FileText,
      path: "/recruitment/applications",
    },
    {
      name: "Candidate Records",
      icon: Users,
      path: "/recruitment/candidates",
    },
    {
      name: "Interviews",
      icon: CalendarClock,
      path: "/recruitment/interviews",
    },
    {
      name: "Evaluations",
      icon: ClipboardCheck,
      path: "/recruitment/evaluations",
    },
    {
      name: "Job Offers",
      icon: Handshake,
      path: "/recruitment/offers",
    },
  
    {
      name: "Reports & Statistics",
      icon: ChartNoAxesCombined,
      path: "/recruitment/reports",
    },
  ],

};

// ─── Role accent colours ──────────────────────────────────────────────────────
const ACCENT = {
  employee: { from: "rgba(14,165,233,0.7)", to: "rgba(6,182,212,0.5)", shadow: "rgba(14,165,233,0.3)", avatarFrom: "from-sky-400", avatarTo: "to-blue-500", label: "Employee", surface: "bg-slate-50", topbar: "border-slate-200", title: "text-slate-900", hover: "hover:bg-employee-50" },
  hr: { from: "rgba(20,184,166,0.75)", to: "rgba(13,148,136,0.55)", shadow: "rgba(20,184,166,0.3)", avatarFrom: "from-teal-400", avatarTo: "to-emerald-500", label: "HR Manager", surface: "bg-gray-50", topbar: "border-gray-100", title: "text-gray-900", hover: "hover:bg-gray-100" },
  admin: { from: "rgba(99,102,241,0.8)", to: "rgba(79,70,229,0.6)", shadow: "rgba(99,102,241,0.35)", avatarFrom: "from-indigo-500", avatarTo: "to-violet-600", label: "Administrator", surface: "bg-gray-50", topbar: "border-gray-100", title: "text-gray-900", hover: "hover:bg-gray-100" },
  recruiter: {from: "rgba(99,102,241,0.8)",to: "rgba(139,92,246,0.6)",shadow: "rgba(99,102,241,0.3)",avatarFrom: "from-indigo-500",avatarTo: "to-violet-600",label: "Recruiter",surface: "bg-slate-50",topbar: "border-indigo-100",title: "text-slate-900",hover: "hover:bg-indigo-50",},
};

export const PageLayout = ({ role = "employee", activePage, title, subtitle, actions, children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const accent = ACCENT[role];
  const navItems = NAV[role] || [];



  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : {};
  const initials = user?.fullName?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "U";

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className={`flex h-screen ${accent.surface} overflow-hidden`}>
      {/* ── Premium Navy Sidebar ── */}
      <nav
        className={`flex flex-col flex-shrink-0 shadow-2xl transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}
        style={{ background: "linear-gradient(180deg, #0a1120 0%, #0f172a 100%)" }}
      >
        {/* Logo row */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 flex-shrink-0">
          <img src={logo} alt="Logo" className="w-9 h-9 rounded-xl flex-shrink-0 shadow-md" />
          {!collapsed && (
            <span className="text-white text-base font-bold tracking-tight">HRM System</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav items */}
        <ul className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
          {navItems.map(item => {
            const isActive = activePage === item.name;
            return (
              <li key={item.name}>
                <button
                  onClick={() => item.path ? navigate(item.path) : null}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive ? "text-white" : "text-gray-400 hover:text-white hover:bg-white/10"}
                    ${collapsed ? "justify-center px-0" : ""}`}
                  style={isActive ? {
                    background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                    boxShadow: `0 2px 12px ${accent.shadow}`,
                  } : {}}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon size={18} className="flex-shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        {(role === "hr" || role === "employee") && (
          <div className="px-3 pb-3 flex-shrink-0">
            <RoleSwitch mode={role} sidebar collapsed={collapsed} />
          </div>
        )}

        {/* User + logout */}
        <div className="border-t border-white/10 p-3 space-y-2 flex-shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md`}>
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{user?.fullName || "User"}</p>
                <p className="text-gray-500 text-xs">{accent.label}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-red-500/20 transition-all ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut size={18} />
            {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className={`flex-shrink-0 h-16 bg-white border-b ${accent.topbar} flex items-center justify-between px-6 shadow-sm`}>
          <div>
            <h1 className={`text-lg font-bold ${accent.title}`}>{title}</h1>
            {subtitle && <p className="text-xs text-gray-400 hidden md:block">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <button
              onClick={() => setIsNotificationsOpen(v => !v)}
              className={`relative p-2 rounded-xl text-gray-500 ${accent.hover} transition-colors`}
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 bg-red-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center shadow-xs animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            {role === "hr" || role === "employee"  || role === "recruiter" ? (
              <button
                type="button"
                onClick={() => navigate(role === "hr" ? "/hr/profile" : role === "recruiter"
            ? "/recruitment/profile" : "/employee/profile")}
                title="My Profile"
                aria-label="Open my profile"
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} flex items-center justify-center text-white text-xs font-bold shadow cursor-pointer hover:shadow-md hover:scale-105 transition-all`}
              >
                {initials}
              </button>
            ) : (
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} flex items-center justify-center text-white text-xs font-bold shadow`}>
                {initials}
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      {/* Notification Popup Drawer */}
      <NotificationPopup
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onUnreadCountChange={setUnreadCount}
        role={role}
      />
    </div>
  );
};

export default PageLayout;
