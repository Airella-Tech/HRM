import { useMemo, useState } from "react";

// Employee portal primary accent — professional Teal (#0d9488)
export const EMP_GRADIENT = "bg-teal-600";

// Summary card tones — clean white cards with tinted icon chips matching Recruitment's StatCard pattern
export const CARD_TONES = {
  teal: "bg-teal-50 text-teal-600",
  blue: "bg-teal-50 text-teal-600",
  green: "bg-emerald-50 text-emerald-600",
  yellow: "bg-amber-50 text-amber-600",
  purple: "bg-violet-50 text-violet-600",
  orange: "bg-orange-50 text-orange-600",
  red: "bg-rose-50 text-rose-600",
  slate: "bg-slate-100 text-slate-600",
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
