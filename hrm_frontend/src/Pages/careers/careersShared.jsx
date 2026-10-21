/**
 * Shared pieces for the public Careers pages: layout, formatting and the deadline meter.
 */
import React, { useEffect, useState } from "react";
import logo from "../../assets/logo.jpg";

// Server errors come back as "404: <reason>"; show just the reason
export const errorText = (error, fallback) =>
  (error?.message || fallback).replace(/^\d{3}:\s*/, "");

export const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatSalary = (min, max) => {
  const fmt = (n) => Number(n).toLocaleString();
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `From ${fmt(min)}`;
  if (max != null) return `Up to ${fmt(max)}`;
  return null;
};

const DAY = 24 * 60 * 60 * 1000;

/** Whole days from today until the deadline (0 = closes today). */
export const daysLeft = (deadline) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((new Date(`${deadline}T00:00:00`) - today) / DAY));
};

/** True if the role was published within the last 3 days. */
export const isNew = (publishedAt) =>
  Boolean(publishedAt) && Date.now() - new Date(publishedAt).getTime() < 3 * DAY;

const deadlineLabel = (days) =>
  days === 0 ? "Closes today" : days === 1 ? "Closes tomorrow" : `${days} days left`;

const deadlineTone = (days) =>
  days <= 3
    ? { text: "text-red-600", bar: "bg-red-500" }
    : days <= 7
    ? { text: "text-amber-600", bar: "bg-amber-500" }
    : { text: "text-indigo-600", bar: "bg-indigo-500" };

/** Shows how much time is left to apply: a label, the date, and a bar that shrinks as the deadline nears. */
export const DeadlineMeter = ({ deadline, publishedAt }) => {
  const days = daysLeft(deadline);
  const tone = deadlineTone(days);

  const total = publishedAt
    ? Math.max(1, Math.round((new Date(`${deadline}T00:00:00`) - new Date(publishedAt)) / DAY))
    : null;
  const pct = total ? Math.min(100, Math.max(4, Math.round((days / total) * 100))) : 100;

  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className={`font-semibold ${tone.text}`}>{deadlineLabel(days)}</span>
        <span className="text-xs text-slate-400">{formatDate(deadline)}</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${tone.bar} transition-[width] duration-700 ease-out motion-reduce:transition-none`}
          style={{ width: ready ? `${pct}%` : "0%" }}
        />
      </div>
    </div>
  );
};

/** Page frame: navy band (top bar + optional hero content), then the page body. */
export const CareersLayout = ({ hero, children }) => (
  <div className="min-h-screen bg-[#F6F7FB] flex flex-col text-slate-900">
    <div className="bg-[#0F1B3D] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 py-4">
          <img src={logo} alt="Company logo" className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-semibold tracking-tight">Careers</span>
        </div>
        {hero}
      </div>
    </div>

    <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">{children}</main>

    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 text-xs text-slate-400">
        Powered by HRM System
      </div>
    </footer>
  </div>
);

export const Notice = ({ title, text, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 py-14 px-6 text-center">
    <p className="text-slate-900 font-semibold">{title}</p>
    {text && <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">{text}</p>}
    {children && <div className="mt-5">{children}</div>}
  </div>
);