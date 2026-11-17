/**
 * StatCard — the summary card shown at the top of a page.
 * Coloured summary card used across recruitment pages.
 * Tone values select one of the primary-scale gradient pairs consistently.
 * Pass `onClick` to make the card a filter button (it then shows a ring while `active`).
 */
import React from "react";

// Full class names are written out so Tailwind keeps them in the build.
const TONES = {
  primary: "from-primary-600 to-primary-700",
  slate: "from-primary-800 to-primary-900",
  green: "from-primary-700 to-primary-800",
  amber: "from-primary-500 to-primary-600",
  red: "from-primary-600 to-primary-700",
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
    "w-full text-left rounded-2xl bg-gradient-to-br p-5 text-white shadow-md flex items-start justify-between gap-3";

  const content = (
    <>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white/85">{label}</p>
        <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        {caption && <p className="mt-1 text-xs text-white/75">{caption}</p>}
      </div>
      {Icon && (
        <div className="shrink-0 rounded-xl bg-white/20 p-3 text-white">
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
        className={`${base} ${`bg-gradient-to-br ${TONES[tone] || TONES.primary}`} cursor-pointer hover:shadow-lg transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
          active ? "ring-2 ring-primary-200" : ""
        }`}
      >
        {content}
      </button>
    );
  }
  return <div className={`${base} ${`bg-gradient-to-br ${TONES[tone] || TONES.primary}`}`}>{content}</div>;
}