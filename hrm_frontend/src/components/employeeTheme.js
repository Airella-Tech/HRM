import { useMemo, useState } from "react";

// Employee portal primary accent — professional Teal (#0d9488)
export const EMP_GRADIENT = "bg-teal-600";

// Summary card tones — aligned with the latest Recruitment gradient StatCard pattern
// Consistent Teal-scale and status-matched gradient pairs
export const CARD_TONES = {
  teal: "from-teal-600 to-teal-700",
  blue: "from-teal-600 to-teal-700",
  green: "from-emerald-600 to-teal-700",
  deep: "from-teal-700 to-teal-800",
  darkTeal: "from-teal-800 to-teal-900",
  yellow: "from-amber-500 to-amber-600",
  amber: "from-amber-500 to-amber-600",
  purple: "from-teal-700 to-teal-800",
  orange: "from-orange-500 to-orange-600",
  red: "from-rose-600 to-rose-700",
  slate: "from-slate-700 to-slate-800",
};

// Soft chip tones for badges and lightweight indicator tags
export const CHIP_TONES = {
  teal: "bg-teal-50 text-teal-700 border-teal-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-rose-50 text-rose-700 border-rose-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
};

// Sort state + sorted copy of `rows`; `pick(row, key)` returns the value to compare
export const useSort = (rows, pick, initialKey = null, initialDir = "asc") => {
  const [sortKey, setSortKey] = useState(initialKey);
  const [sortDir, setSortDir] = useState(initialDir);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const out = [...rows].sort((a, b) =>
      String(pick(a, sortKey) ?? "").localeCompare(String(pick(b, sortKey) ?? ""), undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
    return sortDir === "asc" ? out : out.reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortKey, sortDir]);

  const headerProps = (key) => ({ onClick: () => toggleSort(key), sortDir: sortKey === key ? sortDir : null });

  return { sorted, headerProps };
};
