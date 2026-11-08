/**
 * UserMenu — the user card at the bottom of the sidebar (HR, Employee and Recruitment).
 * Clicking it opens a small "Switch area" menu (HR / Employee / Recruitment),
 * so the switch no longer takes up sidebar height.
 *
 * To help people find it:
 *  - the card has a border and a labelled "Switch" pill,
 *  - a one-time hint bubble explains it on the first visit,
 *  - the collapsed avatar carries a small switch badge.
 *
 * Props:
 *   mode      : 'hr' | 'employee' | 'recruitment' — the area being viewed now
 *   initials  : letters shown in the avatar
 *   name      : the user's full name
 *   roleLabel : small text under the name (for example "Recruiter")
 *   accent    : avatar colours (avatarFrom / avatarTo); optional menuBg and ringClass
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
  mode = "recruitment",
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

  // The colour of the area being viewed (teal for HR, sky for Employee, indigo for Recruitment)
  const currentOption = options.find((o) => o.key === mode);
  const currentColour =
    currentOption?.active || "bg-primary-600 text-white shadow";

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
    if (option.key !== mode) navigate(option.path);
  };

  return (
    <div ref={wrapRef} className="relative">
      {showHint && (
        <div
          role="status"
          className={`absolute bottom-full left-0 right-0 z-40 mb-3 rounded-xl p-3 text-xs shadow-xl ${currentColour}`}
        >
          <p className="text-[13px] font-semibold">Switch area is here</p>
          <p className="mt-0.5 leading-snug text-white/85">
            Move between HR, Employee and Recruitment from this menu.
          </p>
          <button
            type="button"
            onClick={markHintSeen}
            className="mt-2 rounded-md bg-white/20 px-2.5 py-1 font-semibold hover:bg-white/30"
          >
            Got it
          </button>
          <span
            className={`absolute -bottom-1.5 right-8 h-3 w-3 rotate-45 ${currentColour}`}
          />
        </div>
      )}

      {open && canSwitch && (
        <div
          role="menu"
          aria-label="Switch area"
          className={`absolute z-50 rounded-xl border border-white/10 p-1.5 shadow-2xl ${
            accent.menuBg || "bg-slate-800"
          } ${
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
            const isCurrent = option.key === mode;
            return (
              <button
                key={option.key}
                type="button"
                role="menuitem"
                onClick={() => goTo(option)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                  isCurrent
                    ? option.active
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
            <span
              className={`absolute -bottom-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ${
                accent.ringClass || "ring-slate-900"
              } ${currentColour}`}
            >
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