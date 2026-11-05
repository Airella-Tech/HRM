/**
 * UserMenu — the user card at the bottom of the Recruitment sidebar.
 * Clicking it opens a small "Switch area" menu (HR / Employee / Recruitment),
 * so the switch no longer takes up sidebar height.
 *
 * To help people find it:
 *  - the card has a border and a labelled "Switch" pill,
 *  - a one-time hint bubble explains it on the first visit,
 *  - the collapsed avatar carries a small switch badge.
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
import { ArrowLeftRight, Check } from "lucide-react";
import { useAreaOptions } from "../utils/useAreaOptions";

const HINT_KEY = "area_menu_hint_seen";

const readHintSeen = () => {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
};

const writeHintSeen = () => {
  try {
    localStorage.setItem(HINT_KEY, "1");
  } catch {
    // Ignore — the hint will simply show again next time
  }
};

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
  const [hintSeen, setHintSeen] = useState(readHintSeen);
  const wrapRef = useRef(null);

  const canSwitch = options.length > 0;
  const showHint = canSwitch && !collapsed && !open && !hintSeen;

  const markHintSeen = () => {
    setHintSeen(true);
    writeHintSeen();
  };

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

  const toggleMenu = () => {
    if (!canSwitch) return;
    markHintSeen();
    setOpen((v) => !v);
  };

  const goTo = (option) => {
    setOpen(false);
    if (option.key !== "recruitment") navigate(option.path);
  };

  return (
    <div ref={wrapRef} className="relative">
      {showHint && (
        <div
          role="status"
          className="absolute bottom-full left-0 right-0 z-40 mb-3 rounded-xl bg-primary-500 p-3 text-xs text-white shadow-xl"
        >
          <p className="text-[13px] font-semibold">Switch area is here</p>
          <p className="mt-0.5 leading-snug text-primary-100">
            Move between HR, Employee and Recruitment from this menu.
          </p>
          <button
            type="button"
            onClick={markHintSeen}
            className="mt-2 rounded-md bg-white/15 px-2.5 py-1 font-semibold hover:bg-white/25"
          >
            Got it
          </button>
          <span className="absolute -bottom-1.5 right-8 h-3 w-3 rotate-45 bg-primary-500" />
        </div>
      )}

      {open && canSwitch && (
        <div
          role="menu"
          aria-label="Switch area"
          className={`absolute z-50 rounded-xl border border-white/10 bg-primary-800 p-1.5 shadow-2xl ${
            collapsed
              ? "left-full bottom-0 ml-3 w-56"
              : "bottom-full left-0 right-0 mb-2"
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
        onClick={toggleMenu}
        aria-haspopup={canSwitch ? "menu" : undefined}
        aria-expanded={canSwitch ? open : undefined}
        title={canSwitch ? `${name} - switch area` : undefined}
        className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
          canSwitch
            ? "cursor-pointer border border-white/10 bg-white/5 hover:bg-white/10"
            : "cursor-default border border-transparent"
        } ${collapsed ? "justify-center px-0" : ""}`}
      >
        <div
          className={`relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent.avatarFrom} ${accent.avatarTo} text-sm font-bold text-white shadow-md`}
        >
          {initials}
          {collapsed && canSwitch && (
            <span className="absolute -bottom-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-white ring-2 ring-primary-900">
              <ArrowLeftRight size={9} />
            </span>
          )}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {name}
              </p>
              <p className="truncate text-xs text-gray-400">{roleLabel}</p>
            </div>
            {canSwitch && (
              <span className="relative flex flex-shrink-0 items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold text-gray-200">
                <ArrowLeftRight size={12} />
                Switch
                {!hintSeen && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400" />
                )}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
};

export default UserMenu;