/**
 * UserMenu — the user card at the bottom of the Recruitment sidebar.
 * Clicking it opens a small "Switch area" menu (HR / Employee / Recruitment),
 * so the switch no longer takes up sidebar height.
 *
 * Props:
 *   initials  : letters shown in the avatar
 *   name      : the user's full name
 *   roleLabel : small text under the name (for example "Recruiter")
 *   accent    : the ACCENT block of the current role (avatar colours)
 *   collapsed : the sidebar is collapsed (avatar only)
 */
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown } from "lucide-react";
import { useAreaOptions } from "../utils/useAreaOptions";

export const UserMenu = ({
  initials,
  name,
  roleLabel,
  accent,
  collapsed = false,
}) => {
  const navigate = useNavigate();
  const options = useAreaOptions();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const canSwitch = options.length > 0;

  // Close on a click outside the menu or on Escape
  useEffect(() => {
    if (!open) return undefined;
    const onMouseDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const goTo = (option) => {
    setOpen(false);
    if (option.key !== "recruitment") navigate(option.path);
  };

  return (
    <div ref={wrapRef} className="relative">
      {open && canSwitch && (
        <div
          role="menu"
          aria-label="Switch area"
          className={`absolute z-50 rounded-xl border border-white/10 bg-primary-800 p-1.5 shadow-2xl ${
            collapsed ? "left-full bottom-0 ml-3 w-56" : "bottom-full left-0 right-0 mb-2"
          }`}
        >
          <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Switch area
          </p>
          {options.map((option) => {
            const Icon = option.icon;
            const isCurrent = option.key === "recruitment";
            return (
              <button
                key={option.key}
                type="button"
                role="menuitem"
                onClick={() => goTo(option)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                  isCurrent
                    ? "bg-primary-600 text-white"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={16} />
                <span className="flex-1 text-left">{option.label}</span>
                {isCurrent && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => canSwitch && setOpen((v) => !v)}
        aria-haspopup={canSwitch ? "menu" : undefined}
        aria-expanded={canSwitch ? open : undefined}
        title={collapsed && canSwitch ? `${name} - switch area` : undefined}
        className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
          canSwitch ? "cursor-pointer hover:bg-white/10" : "cursor-default"
        } ${collapsed ? "justify-center px-0" : ""}`}
      >
        <div
          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md`}
        >
          {initials}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {name}
              </p>
              <p className="truncate text-xs text-gray-400">
                {canSwitch ? `${roleLabel} · switch area` : roleLabel}
              </p>
            </div>
            {canSwitch && (
              <ChevronsUpDown size={16} className="flex-shrink-0 text-gray-400" />
            )}
          </>
        )}
      </button>
    </div>
  );
};

export default UserMenu;