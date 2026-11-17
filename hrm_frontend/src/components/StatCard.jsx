/**
 * StatCard — the summary card shown at the top of a page.
 * Plain white card with a tinted icon chip, the same look as the cards on Interview Progress
 * and Job Offers. This is the one place to change if the team adopts a new card design.
 * The tone only tints the icon chip and means the same on every page:
 *   primary = new / in progress / total      green = approved, published, shortlisted
 *   amber   = pending, under review          red   = rejected, closed
 *   slate   = draft or a neutral count
 * Pass `onClick` to make the card a filter button (it then shows a ring while `active`).
 */
import React from "react";

// Full class names are written out so Tailwind keeps them in the build.
const TONES = {
  primary: "bg-primary-50 text-primary-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-rose-50 text-rose-600",
  slate: "bg-slate-100 text-slate-600",
};

export function StatCardGrid({ cols = 4, children }) {
  const colClass =
    cols === 5 ? "xl:grid-cols-5" : cols === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4";
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${colClass}`}>{children}</div>
  );
}

export default function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  tone = "primary",
  onClick,
  active = false,
}) {
  const base =
    "w-full text-left rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-start justify-between gap-3";

  const content = (
    <>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        {caption && <p className="mt-1 text-xs text-slate-500">{caption}</p>}
      </div>
      {Icon && (
        <div className={`shrink-0 rounded-xl p-3 ${TONES[tone] || TONES.primary}`}>
          <Icon size={22} />
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`${base} cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
          active ? "border-primary-300 ring-2 ring-primary-200" : ""
        }`}
      >
        {content}
      </button>
    );
  }
  return <div className={base}>{content}</div>;
}