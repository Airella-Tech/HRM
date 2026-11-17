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
import { useAreaOptions } from "../utils/useAreaOptions";

export const RoleSwitch = ({
  mode = "hr",
  sidebar = false,
  collapsed = false,
}) => {
  const navigate = useNavigate();
  const options = useAreaOptions();

  if (options.length === 0) return null;

  // In the sidebar the options are always stacked (icon-only when collapsed) so nothing overflows
  const stacked = sidebar && (collapsed || options.length > 1);

  return (
    <div
      className={`${
        sidebar
          ? `flex ${stacked ? "flex-col" : "flex-row"} items-stretch bg-white/5 rounded-xl p-1 gap-1`
          : "flex items-center bg-gray-100 rounded-xl p-1 gap-1"
      }`}
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
              collapsed
                ? "justify-center"
                : stacked
                  ? "justify-start"
                  : "justify-center"
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