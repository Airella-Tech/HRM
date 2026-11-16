import React from "react";
import { EMP_GRADIENT } from "./employeeTheme";
import { ArrowUpDown, ChevronUp, ChevronDown, Loader2, Search, X } from "lucide-react";

/**
 * Shared UI building blocks for the Employee portal pages.
 * Matches the refined, clean aesthetic of the refactored Recruitment module:
 * - Plain white cards with tinted icon chips (StatCard pattern)
 * - Clean subtle table headers with uppercase tracking-wider labels
 * - Distinct, professional Sky / Ocean Blue primary actions
 * - Polished inputs, search bars, and state containers
 */

// ---------------------------------------------------------
// BUTTONS
// ---------------------------------------------------------
export const EmpButton = ({ variant = "primary", className = "", children, ...props }) => {
  const styles = {
    primary: "bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/20 active:scale-[0.99]",
    secondary: "bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 active:scale-[0.99]",
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20 active:scale-[0.99]",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 active:scale-[0.99]",
  }[variant] || "bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/20";

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {children}
    </button>
  );
};

// ---------------------------------------------------------
// SUMMARY CARDS (Matches Recruitment StatCard Pattern)
// ---------------------------------------------------------
export const SummaryCard = ({
  icon,
  title,
  value,
  description,
  className = "",
  tone,
  onClick,
  active = false,
}) => {
  // If className is passed as one of the chip tone strings (e.g. from CARD_TONES)
  const chipStyle = tone || (className.includes("bg-") ? className : "bg-teal-50 text-teal-600 border border-teal-100");

  const cardContent = (
    <>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
        <p className="mt-2 text-3xl font-bold text-slate-900 tracking-tight truncate">{value}</p>
        {description && <p className="mt-1 text-xs text-slate-500 truncate">{description}</p>}
      </div>
      {icon && (
        <div className={`shrink-0 rounded-xl p-3 flex items-center justify-center ${chipStyle}`}>
          {React.isValidElement(icon)
            ? React.cloneElement(icon, { size: icon.props.size || 22, className: `${icon.props.className || ""}` })
            : icon}
        </div>
      )}
    </>
  );

  const containerClasses = `w-full text-left rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between gap-3 ${
    onClick ? "cursor-pointer" : ""
  } ${active ? "ring-2 ring-teal-500 border-teal-500" : ""}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={containerClasses}>
        {cardContent}
      </button>
    );
  }

  return <div className={containerClasses}>{cardContent}</div>;
};

export const Panel = ({ title, icon, actions, className = "", bodyClassName = "p-5 sm:p-6", children }) => (
  <div className={`bg-white rounded-xl border border-slate-200/90 shadow-sm ${className}`}>
    {(title || actions) && (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100">
        {title && (
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-3">
            {icon && (
              <span className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">{icon}</span>
            )}
            {title}
          </h2>
        )}
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    )}
    <div className={bodyClassName}>{children}</div>
  </div>
);

// ---------------------------------------------------------
// SEARCH & FILTER BAR
// ---------------------------------------------------------
export const SearchBar = ({ value, onChange, placeholder = "Search...", children }) => (
  <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 sm:p-5">
    <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
      <div className="relative flex-1 max-w-lg">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {children && <div className="flex items-center gap-3 flex-wrap">{children}</div>}
    </div>
  </div>
);

export const FilterSelect = ({ value, onChange, children, className = "" }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer ${className}`}
  >
    {children}
  </select>
);

export const ShowingCount = ({ shown, total }) => (
  <span className="text-xs text-slate-500 font-medium">
    Showing <strong className="text-slate-900">{shown}</strong> of {total}
  </span>
);

// ---------------------------------------------------------
// TABLE
// ---------------------------------------------------------
export const TableCard = ({ children }) => (
  <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">{children}</div>
);

// Clean subtle header row matching Recruitment table design
export const TableHeaderRow = ({ cols, children }) => (
  <div className={`hidden lg:grid ${cols} gap-4 px-6 py-3.5 bg-slate-50/90 border-b border-slate-200 rounded-t-xl text-slate-500`}>
    {children}
  </div>
);

export const TableHeader = ({ children, className = "", onClick, sortDir }) => (
  <div
    onClick={onClick}
    className={`text-[11px] font-bold uppercase tracking-wider text-slate-500 ${
      onClick ? "flex items-center gap-1.5 cursor-pointer select-none hover:text-slate-900 transition-colors" : ""
    } ${className}`}
  >
    {children}
    {onClick &&
      (sortDir ? (
        sortDir === "asc" ? <ChevronUp size={12} className="text-teal-600" /> : <ChevronDown size={12} className="text-teal-600" />
      ) : (
        <ArrowUpDown size={11} className="opacity-50 hover:opacity-100" />
      ))}
  </div>
);

export const TableRows = ({ children }) => <div className="divide-y divide-slate-100">{children}</div>;

export const TableRow = ({ cols, children, mobile }) => (
  <div className="group px-4 sm:px-6 py-4 hover:bg-slate-50/70 transition-colors">
    <div className={`hidden lg:grid ${cols} gap-4 items-center`}>{children}</div>
    {mobile && <div className="lg:hidden">{mobile}</div>}
  </div>
);

export const LoadingState = ({ title = "Loading...", subtitle }) => (
  <div className="py-20 flex flex-col items-center justify-center text-center">
    <div className="h-11 w-11 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center mb-4 shadow-xs">
      <Loader2 size={22} className="animate-spin" />
    </div>
    <p className="text-sm font-semibold text-slate-800">{title}</p>
    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
  </div>
);

export const EmptyState = ({ icon, title, subtitle, action }) => (
  <div className="py-16 px-6 flex flex-col items-center justify-center text-center">
    <div className="h-14 w-14 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center mb-4 shadow-xs">
      {icon}
    </div>
    <h3 className="text-base font-bold text-slate-900">{title}</h3>
    {subtitle && <p className="text-sm text-slate-500 mt-1 max-w-sm">{subtitle}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

// ---------------------------------------------------------
// MISC
// ---------------------------------------------------------
export const Alert = ({ message }) => {
  if (!message) return null;
  const ok = message.startsWith("✓");
  return (
    <div
      className={`px-4 py-3 rounded-xl border text-sm font-medium ${
        ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
      }`}
    >
      {message}
    </div>
  );
};

export const IdChip = ({ children }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold border border-slate-200">
    {children}
  </span>
);
