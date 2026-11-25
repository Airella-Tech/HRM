import React from "react";
import {
  Briefcase,
  Building2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const badgeStyles = {
  primary: "bg-white text-primary-700 border-[#cfd5ee]",
  green: "bg-green-50 text-green-700 border-green-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  slate: "bg-white text-slate-600 border-[#cfd5ee]",
};

export default function VacancyGroupCard({
  title,
  department,
  meta,
  badges = [],
  expanded,
  onToggle,
  children,
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div
        className={`flex flex-col justify-between gap-4 bg-gradient-to-r from-[#d5dbf5] to-[#e6e9f9] px-6 py-5 text-slate-900 lg:flex-row lg:items-center ${
          expanded ? "border-b border-[#cfd5ee]" : ""
        }`}
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-md shadow-primary-600/25">
            <Briefcase size={22} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-xl font-bold tracking-tight text-[#1b2142]">
              {title}
            </h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1">
                <Building2 size={14} />
                <span>{department}</span>
              </span>
              {meta && (
                <>
                  <span>·</span>
                  <span>{meta}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
          {badges.map(({ label, tone = "slate" }) => (
            <span
              key={`${tone}-${label}`}
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                badgeStyles[tone] || badgeStyles.slate
              }`}
            >
              {label}
            </span>
          ))}

          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="inline-flex items-center gap-2 rounded-xl border border-[#cfd5ee] bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {expanded ? (
              <>
                <ChevronUp size={16} />
                <span>Collapse</span>
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                <span>Expand</span>
              </>
            )}
          </button>
        </div>
      </div>

      {expanded && children}
    </div>
  );
}