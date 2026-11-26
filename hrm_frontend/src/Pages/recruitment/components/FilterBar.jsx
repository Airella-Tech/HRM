import React from "react";
import { Search, ChevronDown, RefreshCw } from "lucide-react";

/**
 * Shared filter bar for every Recruitment list page (HRM-263).
 *
 * Layout (always the same):
 *   Row 1: Search -> dropdown filters -> extras (e.g. List/Calendar toggle)
 *          -> "N found" + Expand all / Collapse all on the right
 *   Row 2: (optional) status pills with count bubbles
 *
 * Props
 *  search / onSearchChange / searchPlaceholder
 *  filters      [{ id, label, value, onChange, allLabel?, allValue?, options }]
 *               options: string[] or [{ value, label }]
 *               The "All" option is added automatically (value "All",
 *               or allValue when a page uses a different one, e.g. "ALL").
 *  extras       node shown after the dropdowns (view toggle etc.)
 *  pills        { value, onChange, items: [{ value, label, count, icon }] }
 *  count / countLabel / loading   -> "7 candidates found"
 *  onExpandAll / onCollapseAll    -> buttons only show when both are given
 *  onReset / hasActiveFilters     -> "Reset filters" shows only when active
 */

export function FilterSelect({
  label,
  value,
  onChange,
  allLabel = "All",
  allValue = "All",
  options = [],
}) {
  const normalized = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );

  return (
    <label className="relative inline-flex h-10 w-56 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm transition-colors focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 hover:bg-slate-50">
      <span className="font-medium text-slate-400">{label}:</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="min-w-0 flex-1 cursor-pointer appearance-none truncate bg-transparent font-semibold text-slate-800 focus:outline-none"
      >
        <option value={allValue}>{allLabel}</option>
        {normalized.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </label>
  );
}

export function FilterPills({ value, onChange, items = [] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
      {items.map((item) => {
        const active = value === item.value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors ${
              active
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {Icon && <Icon size={13} />}
            <span>{item.label}</span>
            {item.count != null && (
              <span
                className={`rounded-full px-1.5 py-px text-[11px] font-bold ${
                  active ? "bg-white/25 text-white" : "bg-white text-slate-500"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  extras = null,
  pills = null,
  count = null,
  countLabel = "result",
  loading = false,
  onExpandAll,
  onCollapseAll,
  onReset,
  hasActiveFilters = false,
}) {
  const showExpand = Boolean(onExpandAll && onCollapseAll);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>

        {filters.map((filter) => (
          <FilterSelect key={filter.id} {...filter} />
        ))}

        {extras}

        {hasActiveFilters && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-800"
          >
            <RefreshCw size={12} /> Reset filters
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          {count != null && (
            <span className="whitespace-nowrap text-xs text-slate-500">
              {loading
                ? "Loading..."
                : `${count} ${countLabel}${count !== 1 ? "s" : ""} found`}
            </span>
          )}
          {showExpand && (
            <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
              <button
                type="button"
                onClick={onExpandAll}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-primary-600"
              >
                Expand all
              </button>
              <span className="h-4 w-px bg-slate-200" />
              <button
                type="button"
                onClick={onCollapseAll}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-primary-600"
              >
                Collapse all
              </button>
            </div>
          )}
        </div>
      </div>

      {pills && <FilterPills {...pills} />}
    </div>
  );
}