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
import { useState, useEffect, useRef, useLayoutEffect, useMemo } from "react";
import {
  useRecruitmentAccess,
  fetchRecruitmentAccess,
} from "../utils/useRecruitmentAccess";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  // Employee icons
  LayoutDashboard,
  Clock,
  CalendarDays,
  DollarSign,
  User,
  // HR icons
  Users,
  Building2,
  CalendarCheck,
  FileText,
  BarChart3,
  Bell as BellIcon,
  // Admin icons
  Settings,
  Activity,
  // Recruitment icons
  BriefcaseBusiness,
  CalendarClock,
  ClipboardCheck,
  ChartNoAxesCombined,
  Handshake,
  ShieldCheck,
  FilePlus,
  FilePlus2,
  Send,
  CheckCircle2,
  Megaphone,
  UserCheck,
  FileDown,
  UserPlus,
  Award,
} from "lucide-react";
import logo from "../assets/logo.jpg";
import NotificationPopup from "./NotificationPopup";
import { UserMenu } from "./UserMenu";

// ─── Nav configs per role ────────────────────────────────────────────────────
const NAV = {
  employee: [
    { name: "Overview", icon: LayoutDashboard, path: "/employee/dashboard" },
    { name: "Attendance", icon: Clock, path: "/employee/attendance" },
    { name: "Leave", icon: CalendarDays, path: "/employee/leave" },
    { name: "Payslip", icon: DollarSign, path: "/employee/payslip" },
    { name: "Notifications", icon: BellIcon, path: "/employee/notifications" },
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
    // Manage recruitment roles from the HR dashboard
    {
      name: "Roles & Permissions",
      icon: ShieldCheck,
      path: "/hr/roles-permissions",
    },
    { name: "Profile", icon: User, path: "/hr/profile" },
  ],
  admin: [
    { name: "Overview", icon: LayoutDashboard, path: "/admin/dashboard" },
    { name: "Companies", icon: Building2, path: "/admin/companies" },
    { name: "System Users", icon: Users, path: "/admin/system-users" },
    { name: "Attendance", icon: CalendarCheck, path: "/admin/attendance" },
    { name: "Leave", icon: FileText, path: "/admin/leave" },
    { name: "Payroll", icon: DollarSign, path: "/admin/payslip" },
    { name: "System Config", icon: Settings, path: "/admin/system-config" },
    { name: "Profile", icon: User, path: "/admin/profile" },
  ],

  recruiter: [
    {
      name: "Overview",
      icon: LayoutDashboard,
      path: "/recruitment/dashboard",
      requiresAny: [],
    },

  
        // Job Vacancies (split into three pages)
    {
      name: "Create Vacancies",
      icon: FilePlus2,
      path: "/recruitment/vacancies/create",
      requiresAny: ["VACANCY_CREATE", "CREATE_VACANCIES"],
    },
    {
      name: "Vacancy Approval",
      icon: ClipboardCheck,
      path: "/recruitment/vacancies/approval",
      requiresAny: ["VACANCY_APPROVE", "APPROVE_VACANCIES"],
    },
    {
      name: "Publish Vacancies",
      icon: Send,
      path: "/recruitment/vacancies/publish",
      requiresAny: ["VACANCY_PUBLISH", "PUBLISH_CLOSE_VACANCIES"],
    },

    // Candidate Applications
    {
      name: "View Applications",
      icon: FileText,
      path: "/recruitment/applications",
      requiresAny: ["APPLICATION_VIEW", "VIEW_APPLICATIONS", "RESUME_DOWNLOAD", "DOWNLOAD_RESUMES"],
    },
    {
      name: "Review Applications",
      icon: ClipboardCheck,
      path: "/recruitment/applications/review",
      requiresAny: ["APPLICATION_SCREEN", "REVIEW_APPLICATIONS"],
    },
    {
      name: "Shortlist Candidates",
      icon: UserCheck,
      path: "/recruitment/applications/shortlist",
      requiresAny: ["APPLICATION_SHORTLIST", "SHORTLIST_CANDIDATES"],
    },

    // Interviews & Evaluations
    {
      name: "Schedule Interviews",
      icon: CalendarClock,
      path: "/recruitment/interviews?view=schedule",
      requiresAny: ["INTERVIEW_SCHEDULE", "SCHEDULE_INTERVIEWS"],
    },
    {
      name: "Assign Interviewers",
      icon: UserPlus,
      path: "/recruitment/assign-interviewers",
      requiresAny: ["INTERVIEW_ASSIGN", "ASSIGN_INTERVIEWERS"],
    },

    {
      name: "Interview Progress",
      icon: ClipboardCheck,
      path: "/recruitment/interview-progress",
      requiresAny: ["INTERVIEW_PROGRESS_VIEW"],
    },
    {
      name: "Evaluate Interviews",
      icon: Award,
      path: "/recruitment/evaluations",
      requiresAny: ["INTERVIEW_EVALUATE", "EVALUATE_INTERVIEWS"],
    },

    {
      name: "Evaluation Review",
      icon: CheckCircle2,
      path: "/recruitment/evaluation-review",
      requiresAny: ["INTERVIEW_DECIDE"],

    },

    // Job Offers
    {
      name: "Manage Job Offers",
      icon: Handshake,
      path: "/recruitment/offers",
      requiresAny: ["OFFER_MANAGE", "MANAGE_JOB_OFFERS"],
    },

    // Role & Permission Management
    {
      name: "Roles & Permissions",
      icon: ShieldCheck,
      path: "/recruitment/roles-permissions",
      requiresAny: ["RECRUITMENT_ROLE_ADMIN", "MANAGE_ROLES_PERMISSIONS"],
    },
    // Audit trail (needs AUDIT_VIEW, or full access)
    {
      name: "Audit Log",
      icon: Activity,
      path: "/recruitment/audit-log",
      requiresAny: ["AUDIT_VIEW"],
    },
  ],
};

// ─── Module coordinated colour systems ─────────────────────────────────────────
const ACCENT = {
  admin: {
    from: "rgba(37,99,235,1)",
    to: "rgba(29,78,216,0.9)",
    shadow: "rgba(37,99,235,0.3)",
    avatarFrom: "from-blue-600",
    avatarTo: "to-blue-800",
    label: "Administrator",
    surface: "bg-[#F8FAFC]",
    sidebarBg: "linear-gradient(180deg, #0b1528 0%, #112240 100%)",
    activeBg: "#2563EB",
    activeBorder: "border-blue-400",
    activeIcon: "text-blue-200",
    menuBg: "bg-[#0b1528]",
    ringClass: "ring-blue-900",
    sidebarBottomFade: "linear-gradient(to top, #112240, transparent)",
    topbar: "border-slate-200/80",
    title: "text-slate-900",
    hover: "hover:bg-blue-50",
    badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    moduleCode: "HR ADMIN",
  },
  hr: {
    from: "rgba(147,51,234,1)",
    to: "rgba(126,34,206,0.9)",
    shadow: "rgba(147,51,234,0.3)",
    avatarFrom: "from-purple-600",
    avatarTo: "to-purple-800",
    label: "HR Manager",
    surface: "bg-[#F8FAFC]",
    sidebarBg: "linear-gradient(180deg, #1d102e 0%, #2b1845 100%)",
    activeBg: "#9333EA",
    activeBorder: "border-purple-300",
    activeIcon: "text-purple-200",
    menuBg: "bg-[#1d102e]",
    ringClass: "ring-purple-900",
    sidebarBottomFade: "linear-gradient(to top, #2b1845, transparent)",
    topbar: "border-slate-200/80",
    title: "text-slate-900",
    hover: "hover:bg-purple-50",
    badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    moduleCode: "HR",
  },
  recruiter: {
    from: "rgba(99,102,241,1)",
    to: "rgba(79,70,229,0.9)",
    shadow: "rgba(99,102,241,0.3)",
    avatarFrom: "from-indigo-600",
    avatarTo: "to-indigo-800",
    label: "Recruiter",
    surface: "bg-[#F8FAFC]",
    sidebarBg: "linear-gradient(180deg, #131738 0%, #1c224f 100%)",
    activeBg: "#6366F1",
    activeBorder: "border-indigo-300",
    activeIcon: "text-indigo-200",
    menuBg: "bg-[#131738]",
    ringClass: "ring-indigo-900",
    sidebarBottomFade: "linear-gradient(to top, #1c224f, transparent)",
    topbar: "border-slate-200/80",
    title: "text-slate-900",
    hover: "hover:bg-indigo-50",
    badgeBg: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    moduleCode: "RECRUITMENT",
  },
  recruitment: {
    from: "rgba(99,102,241,1)",
    to: "rgba(79,70,229,0.9)",
    shadow: "rgba(99,102,241,0.3)",
    avatarFrom: "from-indigo-600",
    avatarTo: "to-indigo-800",
    label: "Recruiter",
    surface: "bg-[#F8FAFC]",
    sidebarBg: "linear-gradient(180deg, #131738 0%, #1c224f 100%)",
    activeBg: "#6366F1",
    activeBorder: "border-indigo-300",
    activeIcon: "text-indigo-200",
    menuBg: "bg-[#131738]",
    ringClass: "ring-indigo-900",
    sidebarBottomFade: "linear-gradient(to top, #1c224f, transparent)",
    topbar: "border-slate-200/80",
    title: "text-slate-900",
    hover: "hover:bg-indigo-50",
    badgeBg: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    moduleCode: "RECRUITMENT",
  },
  employee: {
    from: "rgba(13,148,136,1)",
    to: "rgba(15,118,110,0.9)",
    shadow: "rgba(13,148,136,0.3)",
    avatarFrom: "from-teal-600",
    avatarTo: "to-teal-800",
    label: "Employee",
    surface: "bg-[#F8FAFC]",
    sidebarBg: "linear-gradient(180deg, #0d2524 0%, #133937 100%)",
    activeBg: "#0D9488",
    activeBorder: "border-teal-300",
    activeIcon: "text-teal-200",
    menuBg: "bg-[#0d2524]",
    ringClass: "ring-teal-900",
    sidebarBottomFade: "linear-gradient(to top, #133937, transparent)",
    topbar: "border-slate-200/80",
    title: "text-slate-900",
    hover: "hover:bg-teal-50",
    badgeBg: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    moduleCode: "EMPLOYEE",
  },
};
// Remembers sidebar scroll between page changes (each page remounts PageLayout)
let savedNavScroll = 0;

export const PageLayout = ({
  role = "employee",
  activePage,
  activeNav,
  title,
  subtitle,
  breadcrumbs,
  actions,
  children,
}) => {
  // Remember the collapsed/expanded sidebar between pages
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return sessionStorage.getItem("sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });
  const toggleCollapsed = () =>
    setCollapsed((c) => {
      const next = !c;
      try {
        sessionStorage.setItem("sidebar_collapsed", next ? "1" : "0");
      } catch {
        // Ignore — the sidebar still toggles for this page
      }
      return next;
    });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const accent = ACCENT[role];

  // Shared, cached access: the menu stays on screen while access refreshes in the background
  const sharedAccess = useRecruitmentAccess();

  useEffect(() => {
    if (role === "recruiter") fetchRecruitmentAccess(true);
  }, [role]);

  // Before the first answer arrives, HR Managers and Admins already know they have full access
  let storedRole;
  try {
    storedRole = JSON.parse(localStorage.getItem("user") || "{}")?.role;
  } catch {
    storedRole = undefined;
  }
  const recruitmentAccess = useMemo(() => {
    if (role !== "recruiter") return null;
    return (
      sharedAccess ||
      (storedRole === "ADMIN"
        ? { fullAccess: true, hasRecruitmentAccess: true, permissions: [] }
        : null)
    );
  }, [role, sharedAccess, storedRole]);
  const navListRef = useRef(null);

  useLayoutEffect(() => {
    if (navListRef.current) navListRef.current.scrollTop = savedNavScroll;
  }, [recruitmentAccess]);
  const navItems =
    role !== "recruiter"
      ? NAV[role] || []
      : (NAV.recruiter || []).filter((item) => {
        // Do not show Recruitment pages until access is confirmed.
        if (!recruitmentAccess?.hasRecruitmentAccess) {
          return false;
        }

        // Some pages require full access.
        if (item.requiresFullAccess) {
          return recruitmentAccess.fullAccess;
        }

        // Everyone with recruitment access can see Overview.
        if (item.name === "Overview") {
          return true;
        }

        // Full-access users can see all other Recruitment pages.
        if (recruitmentAccess.fullAccess) {
          return true;
        }

        // Show the page if no specific permission is required,
        // or if the user has at least one required permission.
        return (
          !item.requiresAny?.length ||
          item.requiresAny.some((permission) =>
            recruitmentAccess.permissions.includes(permission),
          )
        );
      });

  const storedUser = localStorage.getItem("user");

  let user = {};
  try {
    user = storedUser ? JSON.parse(storedUser) : {};
  } catch {
    user = {};
  }
  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

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
        style={{
          background:
            accent.sidebarBg ||
            "linear-gradient(180deg, #0a1120 0%, #0f172a 100%)",
        }}
      >
        {/* Logo row */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 flex-shrink-0">
          <img
            src={logo}
            alt="Logo"
            className="w-9 h-9 rounded-xl flex-shrink-0 shadow-md object-cover"
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <span className="text-white text-sm font-bold tracking-tight block truncate">
                HRM System
              </span>
              <span className={`inline-block text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded border ${accent.badgeBg}`}>
                {accent.moduleCode}
              </span>
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav items */}
        <ul
          ref={navListRef}
          onScroll={(e) => {
            savedNavScroll = e.currentTarget.scrollTop;
          }}
          className="flex-1 min-h-0 py-4 pb-8 space-y-1 px-3 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.18)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent"
        >
          {role === "recruiter" &&
            !recruitmentAccess &&
            [0, 1, 2, 3, 4].map((i) => (
              <li
                key={i}
                className="h-11 rounded-xl bg-white/5 animate-pulse"
              />
            ))}
          {navItems.map((item) => {
            const currentFullPath = location.pathname + location.search;
            const currentBase = location.pathname;
            const itemBase = item.path ? item.path.split("?")[0] : "";

            const nameMatches =
              activePage === item.name ||
              (activePage === "Roles & Permissions" &&
                item.name === "Manage Roles & Permissions") ||
              (activePage === "Manage Roles & Permissions" &&
                item.name === "Roles & Permissions") ||
              (activePage === "Applications" &&
                (item.name === "View Applications" ||
                  item.name === "Applications")) ||
              (activePage === "Interviews" &&
                (item.name === "Schedule Interviews" ||
                  item.name === "Interviews")) ||
              (activePage === "Interview Progress" &&
                item.name === "Interview Progress") ||
              (activePage === "Evaluations" &&
                (item.name === "Evaluate Interviews" ||
                  item.name === "Evaluations")) ||
              (activePage === "Evaluation Review" &&
                item.name === "Evaluation Review") ||
              ((activePage === "Evaluation Review" ||
                activePage === "Interview Evaluation Review") &&
                item.name === "Evaluation Review") ||
              (activePage === "Job Offers" &&
                (item.name === "Manage Job Offers" ||
                  item.name === "Job Offers"));

            const exactUrlMatches = Boolean(
              item.path && item.path === currentFullPath,
            );
            const baseUrlMatches = Boolean(
              item.path && !location.search && itemBase === currentBase,
            );

            const isActive = activeNav
              ? item.name === activeNav
              : exactUrlMatches ||
              (nameMatches &&
                (location.search
                  ? exactUrlMatches
                  : baseUrlMatches || !item.path?.includes("?"))) ||
              (baseUrlMatches && !navItems.some((n) => n.name === activePage));
            return (
              <li key={item.name}>
                <button
                  onClick={() => (item.path ? navigate(item.path) : null)}
                  className={`relative flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${accent.activeBorder
                      ? `border-l-[3px] ${isActive ? accent.activeBorder : "border-transparent"}`
                      : ""
                    }
                    ${isActive
                      ? "text-white"
                      : role === "hr"
                        ? "text-slate-400 hover:text-white hover:bg-primary-800/40"
                        : "text-gray-400 hover:text-white hover:bg-white/10"
                    }
                    ${collapsed ? "justify-center px-0" : ""}`}
                  style={
                    isActive
                      ? accent.activeBg
                        ? { backgroundColor: accent.activeBg }
                        : {
                          background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                          boxShadow: `0 2px 12px ${accent.shadow}`,
                        }
                      : {}
                  }
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon size={18} className={`flex-shrink-0 ${isActive && accent.activeIcon ? accent.activeIcon : ""}`} />
                  {!collapsed && <span>{item.name}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="pointer-events-none h-6 -mt-6 shrink-0" style={{ background: accent.sidebarBottomFade || "linear-gradient(to top, #1b2142, transparent)" }} />


        {/* User + logout */}
        <div className="border-t border-white/10 p-3 space-y-2 flex-shrink-0">
          <UserMenu
            mode={
              role === "admin"
                ? "admin"
                : role === "hr"
                  ? "hr"
                  : role === "employee"
                    ? "employee"
                    : "recruitment"
            }
            initials={initials}
            name={user?.fullName || "User"}
            roleLabel={accent.label}
            accent={accent}
            collapsed={collapsed}
          />
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-red-500/20 transition-all ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? "Sign Out" : undefined}
          >
            <LogOut size={18} />
            {!collapsed && (
              <span className="text-sm font-medium">Sign Out</span>
            )}
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header
          className={`flex-shrink-0 h-16 bg-white border-b ${accent.topbar} flex items-center justify-between px-6 shadow-xs`}
        >
          <div>
            {breadcrumbs && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5 font-medium">
                {breadcrumbs}
              </div>
            )}
            <h1 className="text-lg font-bold text-slate-900 leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-xs text-slate-500 hidden md:block">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <button
              onClick={() => setIsNotificationsOpen((v) => !v)}
              className={`relative p-2 rounded-xl text-slate-500 ${accent.hover} transition-colors cursor-pointer`}
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 bg-rose-600 text-white font-bold text-[9px] rounded-full flex items-center justify-center shadow-xs animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() =>
                navigate(
                  role === "admin"
                    ? "/admin/profile"
                    : role === "hr"
                      ? "/hr/profile"
                      : role === "recruiter" || role === "recruitment"
                        ? "/recruitment/profile"
                        : "/employee/profile",
                )
              }
              title="My Profile"
              aria-label="Open my profile"
              className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} flex items-center justify-center text-white text-xs font-bold shadow-xs cursor-pointer hover:shadow-md hover:scale-105 transition-all`}
            >
              {initials}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
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
