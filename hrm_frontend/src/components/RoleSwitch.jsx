/**
 * RoleSwitch — toggle that lets a user jump between the HR dashboard,
 * the Employee dashboard and the Recruitment area without logging out.
 * HR managers always see all three. Other users see Employee, plus Recruitment
 * when they have recruitment access. Renders nothing for anyone else.
 *
 * Props:
 *   mode     : 'hr' | 'employee' | 'recruitment' — which side is currently being viewed
 *   sidebar  : render for the dark sidebar instead of a light topbar
 *   collapsed: hide labels when the sidebar is collapsed
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, UserRound, UsersRound } from "lucide-react";
import { useRecruitmentAccess } from "../utils/useRecruitmentAccess";

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

export const RoleSwitch = ({
  mode = "hr",
  sidebar = false,
  collapsed = false,
}) => {
  const navigate = useNavigate();

  const user = getStoredUser();
  const isHRManager = user?.role === "HR_MANAGER";

  // Shared, cached answer — no request of its own on every page
  const access = useRecruitmentAccess();
  const canRecruit =
    access?.hasRecruitmentAccess === true || access?.fullAccess === true;

  if (!isHRManager && !canRecruit) return null;

  const options = [
    ...(isHRManager
      ? [
          {
            key: "hr",
            label: "HR",
            icon: Briefcase,
            path: "/hr/dashboard",
            active: "bg-teal-500 text-white shadow",
          },
        ]
      : []),

    {
      key: "employee",
      label: "Employee",
      icon: UserRound,
      path: "/employee/dashboard",
      active: "bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow",
    },

    // HR managers always get Recruitment; others only when they have access
    ...(isHRManager || canRecruit
      ? [
          {
            key: "recruitment",
            label: "Recruitment",
            icon: UsersRound,
            path: "/recruitment/dashboard",
            active: "bg-violet-600 text-white shadow",
          },
        ]
      : []),
  ];


    // Three or more options (or a collapsed sidebar) are stacked so nothing overflows
  const stacked = sidebar && (collapsed || options.length > 2);

  return (
    <div
      className={`${sidebar
        ? `flex ${stacked ? "flex-col" : "flex-row"} items-stretch bg-white/5 rounded-xl p-1 gap-1`
        : "flex items-center bg-gray-100 rounded-xl p-1 gap-1"}`}
      role="group"
      aria-label="Switch dashboard"
    >
            {sidebar && stacked && !collapsed && (
        <p className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Switch area
        </p>
      )}
      {options.map(({ key, label, icon: Icon, path, active }) => {
        const isActive = mode === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => !isActive && navigate(path)}
            aria-pressed={isActive}
            title={`Switch to ${label} dashboard`}
            className={`flex ${stacked ? "w-full" : "flex-1"} ${
              collapsed ? "justify-center" : stacked ? "justify-start" : "justify-center"
            } items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              isActive
                ? active
                : sidebar
                  ? "text-gray-400 hover:text-white hover:bg-white/10"
                  : "text-gray-500 hover:text-gray-800 hover:bg-white"
            }`}
          >
            <Icon size={16} />
            {(!sidebar || !collapsed) && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default RoleSwitch;