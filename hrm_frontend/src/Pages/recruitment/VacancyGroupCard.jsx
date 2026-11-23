import React from "react";
import {
  Briefcase,
  Building2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const badgeStyles = {
  primary: "bg-primary-50 text-primary-700 border-primary-200",
  green: "bg-green-50 text-green-700 border-green-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
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
        className={`flex flex-col justify-between gap-4 px-5 py-4 lg:flex-row lg:items-center ${
          expanded ? "border-b border-slate-200" : ""
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
            <Briefcase size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-slate-900">
              {title}
            </h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Building2 size={12} />
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
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
