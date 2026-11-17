/**
 * Shared pieces for the public Careers pages: layout, notice, and deadline meter.
 * Professional, clean design aligned with the HRM application.
 */
import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileSearch } from "lucide-react";
import logo from "../../assets/logo.jpg";
import { daysLeft, formatDate } from "../../utils/careersFormat";

const DAY = 24 * 60 * 60 * 1000;

const deadlineLabel = (days) =>
  days === 0 ? "Closes today" : days === 1 ? "Closes tomorrow" : `${days} days left`;

const deadlineTone = (days) =>
  days <= 3
    ? { text: "text-rose-600", bar: "bg-rose-500" }
    : days <= 7
      ? { text: "text-amber-600", bar: "bg-amber-500" }
      : { text: "text-sky-600", bar: "bg-sky-500" };

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
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className={`font-semibold ${tone.text}`}>{deadlineLabel(days)}</span>
        <span className="text-[11px] text-slate-400">{formatDate(deadline)}</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${tone.bar} transition-[width] duration-700 ease-out`}
          style={{ width: ready ? `${pct}%` : "0%" }}
        />
      </div>
    </div>
  );
};

/** Page frame: deep-navy band (top bar + hero content), then the white/slate body. */
export const CareersLayout = ({ hero, children }) => {
  const [params] = useSearchParams();
  const company = params.get("company") || "";
  const trackLink = company ? `/careers/track?company=${encodeURIComponent(company)}` : "/careers/track";
  const homeLink = company ? `/careers?company=${encodeURIComponent(company)}` : "/careers";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Header Bar */}
      <div className="bg-[#0b1126] text-white border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-4">
            <Link to={homeLink} className="flex items-center gap-3 group">
              <div className="h-9 w-9 rounded-xl overflow-hidden ring-1 ring-white/20 bg-white flex-shrink-0">
                <img src={logo} alt="Company logo" className="h-full w-full object-cover" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-white block group-hover:text-sky-300 transition-colors">
                  Careers Portal
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  HRM Opportunities
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                to={trackLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 transition-colors"
              >
                <FileSearch size={14} className="text-sky-400" />
                <span>Track Application</span>
              </Link>
            </div>
          </div>
          {hero}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} HRM Enterprise Careers & Recruitment System.</span>
          <div className="flex items-center gap-4 text-xs">
            <Link to={homeLink} className="hover:text-slate-900 transition-colors">
              Open Positions
            </Link>
            <Link to={trackLink} className="hover:text-slate-900 transition-colors">
              Track Application
            </Link>
            <Link to="/about" className="hover:text-slate-900 transition-colors">
              About Company
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const Notice = ({ title, text, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm py-14 px-6 text-center max-w-lg mx-auto">
    <p className="text-base font-bold text-slate-900">{title}</p>
    {text && <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">{text}</p>}
    {children && <div className="mt-5">{children}</div>}
  </div>
);
