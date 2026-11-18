import React from "react";
import { EMP_GRADIENT, CARD_TONES } from "./employeeTheme";
import { ArrowUpDown, ChevronUp, ChevronDown, Loader2, Search, X } from "lucide-react";

/**
 * Shared UI building blocks for the Employee portal pages.
 * Aligned with the latest Recruitment module UI patterns:
 * - Coloured gradient StatCards & SummaryCardGrid (consistent Teal theme)
 * - Standalone rounded-2xl search and filter toolbar cards
 * - Rounded-2xl table containers with uppercase tracking-wider headers
 * - Status chips with status dots
 * - Standalone loading and empty state cards
 * - Distinct, professional Teal primary actions
 */

// ---------------------------------------------------------
// BUTTONS
// ---------------------------------------------------------
export const EmpButton = ({ variant = "primary", className = "", children, ...props }) => {
  const styles = {
    primary: "bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/20 active:scale-[0.99]",
    secondary: "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm active:scale-[0.99]",
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
// SUMMARY CARD GRID (Matches Recruitment StatCardGrid)
// ---------------------------------------------------------
export const SummaryCardGrid = ({ cols = 4, children, className = "" }) => {
  const colClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-2 lg:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 xl:grid-cols-6",
  }[cols] || "sm:grid-cols-2 lg:grid-cols-4";

  return <div className={`grid grid-cols-1 ${colClass} gap-5 ${className}`}>{children}</div>;
};

// ---------------------------------------------------------
// SUMMARY CARDS (Matches latest Recruitment StatCard Pattern)
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
  const toneClass = tone || className;
  const isGradient = toneClass && toneClass.includes("from-");
  const isWhiteExplicit = toneClass && toneClass.includes("bg-white");

  if (isGradient || (!isWhiteExplicit && !toneClass.includes("bg-"))) {
    // Aligned with latest Recruitment gradient card styling adapted for Employee Teal
    const gradient = isGradient ? toneClass : "from-teal-600 to-teal-700";
    const content = (
      <>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white/85 truncate">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white tracking-tight truncate">{value}</p>
          {description && <p className="mt-1 text-xs text-white/75 truncate">{description}</p>}
        </div>
        {icon && (
          <div className="shrink-0 rounded-xl bg-white/20 p-3 text-white flex items-center justify-center">
            {React.isValidElement(icon)
              ? React.cloneElement(icon, { size: icon.props.size || 22, className: `${icon.props.className || ""}` })
              : icon}
          </div>
        )}
      </>
    );

    const baseClasses = `w-full text-left rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-md flex items-start justify-between gap-3`;

    if (onClick) {
      return (
        <button
          type="button"
          onClick={onClick}
          aria-pressed={active}
          className={`${baseClasses} cursor-pointer hover:shadow-lg transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
            active ? "ring-2 ring-teal-200" : ""
          }`}
        >
          {content}
        </button>
      );
    }

    return <div className={baseClasses}>{content}</div>;
  }

  // Fallback for white card with tinted icon chips
  const chipStyle = tone || (className.includes("bg-") ? className : "bg-teal-50 text-teal-600 border border-teal-100");
  const content = (
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

  const containerClasses = `w-full text-left rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between gap-3 ${
    onClick ? "cursor-pointer" : ""
  } ${active ? "ring-2 ring-teal-500 border-teal-500" : ""}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={containerClasses}>
        {content}
      </button>
    );
  }

  return <div className={containerClasses}>{content}</div>;
};

export const Panel = ({ title, icon, actions, className = "", bodyClassName = "p-5 sm:p-6", children }) => (
  <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.035)] overflow-hidden ${className}`}>
    {(title || actions) && (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
        {title && (
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-3">
            {icon && (
              <span className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 shadow-2xs">{icon}</span>
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
// SEARCH & FILTER BAR (Standalone card matching Recruitment)
// ---------------------------------------------------------
export const SearchBar = ({ value, onChange, placeholder = "Search...", children }) => (
  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
    <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
      <div className="relative flex-1 max-w-lg">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
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
    className={`px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer ${className}`}
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
export const TableCard = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden ${className}`}>{children}</div>
);

// Clean subtle header row matching latest Recruitment table design
export const TableHeaderRow = ({ cols, children, className = "" }) => (
  <div className={`hidden lg:grid ${cols} gap-4 px-6 py-3.5 bg-slate-50/80 border-b border-slate-200/80 text-xs uppercase font-semibold text-slate-500 tracking-wider ${className}`}>
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

export const TableRow = ({ cols, children, mobile, className = "" }) => (
  <div className={`group px-4 sm:px-6 py-4 hover:bg-slate-50/70 transition-colors ${className}`}>
    <div className={`hidden lg:grid ${cols} gap-4 items-center`}>{children}</div>
    {mobile && <div className="lg:hidden">{mobile}</div>}
  </div>
);

// Standalone loading state card matching latest Recruitment patterns
export const LoadingState = ({ title = "Loading...", subtitle = "Fetching latest records from database" }) => (
  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-16 text-center space-y-3 my-2">
    <div className="h-12 w-12 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center mx-auto shadow-2xs">
      <Loader2 size={24} className="animate-spin text-teal-600" />
    </div>
    <p className="text-sm font-semibold text-slate-800">{title}</p>
    {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
  </div>
);

// Standalone empty state card matching latest Recruitment patterns
export const EmptyState = ({ icon, title, subtitle, action }) => (
  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-14 text-center max-w-md mx-auto space-y-3 my-4">
    <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center mx-auto shadow-2xs">
      {icon}
    </div>
    <h3 className="text-base font-bold text-slate-900">{title}</h3>
    {subtitle && <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">{subtitle}</p>}
    {action && <div className="pt-2">{action}</div>}
  </div>
);

// Status chip with dot indicator matching latest Recruitment status chip style
export const StatusChip = ({ label, status = "default", dot = true, className = "" }) => {
  const norm = String(status || label || "").toUpperCase();
  const styles = {
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200 dot-emerald-500",
    PRESENT: "bg-emerald-50 text-emerald-700 border-emerald-200 dot-emerald-500",
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200 dot-emerald-500",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200 dot-amber-500",
    REJECTED: "bg-rose-50 text-rose-700 border-rose-200 dot-rose-500",
    ABSENT: "bg-rose-50 text-rose-700 border-rose-200 dot-rose-500",
    CANCELLED: "bg-slate-100 text-slate-600 border-slate-200 dot-slate-400",
    LATE: "bg-amber-50 text-amber-700 border-amber-200 dot-amber-500",
    HALF_DAY: "bg-teal-50 text-teal-700 border-teal-200 dot-teal-500",
  }[norm] || "bg-teal-50 text-teal-700 border-teal-200 dot-teal-500";

  const parts = styles.split(" ");
  const bg = parts[0];
  const text = parts[1];
  const border = parts[2];
  const dotColor = parts[3];
  const dotBg = dotColor ? dotColor.replace("dot-", "bg-") : "bg-teal-500";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${bg} ${text} ${border} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotBg}`} />}
      <span>{label || status}</span>
    </span>
  );
};

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
