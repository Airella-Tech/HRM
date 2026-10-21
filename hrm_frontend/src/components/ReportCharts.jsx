/**
 * ReportCharts — dependency-free SVG charts + small UI pieces used by the HR Report page.
 * Charts measure their container so text stays crisp at any width.
 */
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Search, TrendingUp, TrendingDown } from "lucide-react";
import { COLORS, PALETTE, niceScale } from "../utils/chartTheme";

// ─── helpers ──────────────────────────────────────────────────────────────────
const useWidth = (fallback = 560) => {
    const ref = useRef(null);
    const [w, setW] = useState(fallback);
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        setW(el.clientWidth || fallback);
        if (typeof ResizeObserver === "undefined") return undefined;
        const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width) || fallback));
        ro.observe(el);
        return () => ro.disconnect();
    }, [fallback]);
    return [ref, w];
};

const truncate = (s, n) => (String(s).length > n ? `${String(s).slice(0, Math.max(1, n - 1))}…` : String(s));

const Tip = ({ x, y = 8, width, children }) => (
    <div
        className="pointer-events-none absolute z-20 rounded-lg bg-slate-900/95 text-white text-xs px-3 py-2 shadow-lg whitespace-nowrap"
        style={{ left: x, top: y, transform: `translateX(${x > width * 0.6 ? "calc(-100% - 12px)" : "12px"})` }}
    >
        {children}
    </div>
);

const TipRow = ({ color, name, value }) => (
    <div className="flex items-center gap-2 leading-5">
        {color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />}
        <span className="text-slate-300">{name}</span>
        <span className="ml-auto pl-4 font-semibold tabular-nums">{value}</span>
    </div>
);

// ─── Card / empty ─────────────────────────────────────────────────────────────
export const ChartCard = ({ title, subtitle, action, children, className = "" }) => (
    <section className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 break-inside-avoid min-w-0 ${className}`}>
        <header className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
                {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
            {action}
        </header>
        {children}
    </section>
);

export const EmptyState = ({ text = "No data for this selection", height = 128 }) => (
    <div className="flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl px-4 text-center" style={{ height }}>
        {text}
    </div>
);

export const Legend = ({ items, className = "" }) => (
    <div className={`flex flex-wrap gap-x-4 gap-y-1 ${className}`}>
        {items.map((i) => (
            <span key={i.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: i.color }} />
                {i.name}
            </span>
        ))}
    </div>
);

// ─── Trend (line / area) ──────────────────────────────────────────────────────
export const TrendChart = ({ labels = [], series = [], height = 240, area = true, format = (v) => v, axisFormat, yMax, minY = 0 }) => {
    const axis = axisFormat || format;
    const [ref, width] = useWidth();
    const [hi, setHi] = useState(null);
    const gid = useId().replace(/:/g, "");
    const m = { t: 14, r: 14, b: 26, l: 46 };
    const iw = Math.max(40, width - m.l - m.r), ih = height - m.t - m.b;
    const n = labels.length;
    const vals = series.flatMap((s) => s.values.filter((v) => v != null && isFinite(v)));
    if (!n || !vals.length) return <EmptyState height={height} />;

    const hiVal = yMax ?? Math.max(0, ...vals);
    const sc = niceScale(hiVal - minY);
    const x = (i) => m.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
    const y = (v) => m.t + ih - ((v - minY) / sc.max) * ih;

    const runs = (values) => {
        const out = []; let cur = [];
        values.forEach((v, i) => { if (v == null || !isFinite(v)) { if (cur.length) out.push(cur); cur = []; } else cur.push([i, v]); });
        if (cur.length) out.push(cur);
        return out;
    };
    const longestLabel = Math.max(...labels.map((l) => String(l).length));
    const every = Math.max(1, Math.ceil((n * (longestLabel * 6.3 + 14)) / iw));

    const onMove = (e) => {
        const r = ref.current.getBoundingClientRect();
        const i = n <= 1 ? 0 : Math.round(((e.clientX - r.left - m.l) / iw) * (n - 1));
        setHi(Math.min(n - 1, Math.max(0, i)));
    };

    return (
        <div ref={ref} className="relative w-full" onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
            <svg width={width} height={height} role="img" aria-label="Trend chart" className="block select-none">
                <defs>
                    {series.map((s, si) => (
                        <linearGradient key={si} id={`${gid}-${si}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                            <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
                        </linearGradient>
                    ))}
                </defs>
                {sc.ticks.map((t) => (
                    <g key={t}>
                        <line x1={m.l} x2={m.l + iw} y1={y(t + minY)} y2={y(t + minY)} stroke="#eef2f6" />
                        <text x={m.l - 8} y={y(t + minY) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{axis(t + minY)}</text>
                    </g>
                ))}
                {labels.map((l, i) => i % every === 0 && (
                    <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill="#94a3b8">{l}</text>
                ))}
                {series.map((s, si) => runs(s.values).map((run, ri) => {
                    const line = run.map(([i, v], k) => `${k ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
                    return (
                        <g key={`${si}-${ri}`}>
                            {area && run.length > 1 && (
                                <path d={`${line}L${x(run[run.length - 1][0]).toFixed(1)},${y(minY)}L${x(run[0][0]).toFixed(1)},${y(minY)}Z`} fill={`url(#${gid}-${si})`} />
                            )}
                            <path d={line} fill="none" stroke={s.color} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
                            {run.length === 1 && <circle cx={x(run[0][0])} cy={y(run[0][1])} r="3.5" fill={s.color} />}
                        </g>
                    );
                }))}
                {hi != null && (
                    <g>
                        <line x1={x(hi)} x2={x(hi)} y1={m.t} y2={m.t + ih} stroke="#cbd5e1" strokeDasharray="3 3" />
                        {series.map((s, si) => s.values[hi] != null && isFinite(s.values[hi]) && (
                            <circle key={si} cx={x(hi)} cy={y(s.values[hi])} r="4.5" fill="#fff" stroke={s.color} strokeWidth="2.25" />
                        ))}
                    </g>
                )}
            </svg>
            {hi != null && (
                <Tip x={x(hi)} width={width}>
                    <div className="font-semibold mb-0.5">{labels[hi]}</div>
                    {series.map((s) => <TipRow key={s.name} color={s.color} name={s.name} value={s.values[hi] == null ? "—" : format(s.values[hi])} />)}
                </Tip>
            )}
        </div>
    );
};

// ─── Vertical bars (grouped or stacked) ───────────────────────────────────────
export const BarChart = ({ labels = [], series = [], stacked = false, height = 240, format = (v) => v, axisFormat, barColors }) => {
    const axis = axisFormat || format;
    const [ref, width] = useWidth();
    const [hi, setHi] = useState(null);
    const n = labels.length;
    const longest = Math.max(1, ...labels.map((l) => String(l).length));
    const bandRaw = Math.max(40, width - 50) / Math.max(1, n);
    const rotate = n <= 16 && longest * 6.3 > bandRaw - 6;
    const m = { t: 14, r: 10, b: rotate ? 64 : 30, l: 40 };
    const iw = Math.max(40, width - m.l - m.r), ih = height - m.t - m.b;
    const totals = labels.map((_, i) => (stacked ? series.reduce((a, s) => a + (s.values[i] || 0), 0) : Math.max(0, ...series.map((s) => s.values[i] || 0))));
    const dataMax = Math.max(0, ...totals);
    if (!n || dataMax === 0) return <EmptyState height={height} />;

    const sc = niceScale(dataMax);
    const band = iw / n, bw = Math.min(56, band * 0.62);
    const y = (v) => m.t + ih - (v / sc.max) * ih;
    const cx = (i) => m.l + band * i + band / 2;
    const every = rotate ? 1 : Math.max(1, Math.ceil((n * (longest * 6.3 + 10)) / iw));
    const maxChars = rotate ? 18 : Math.max(4, Math.floor((band * every) / 6.4));

    return (
        <div ref={ref} className="relative w-full" onMouseLeave={() => setHi(null)}>
            <svg width={width} height={height} role="img" aria-label="Bar chart" className="block select-none">
                {sc.ticks.map((t) => (
                    <g key={t}>
                        <line x1={m.l} x2={m.l + iw} y1={y(t)} y2={y(t)} stroke="#eef2f6" />
                        <text x={m.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{axis(t)}</text>
                    </g>
                ))}
                {labels.map((l, i) => (
                    <g key={i} onMouseEnter={() => setHi(i)}>
                        <rect x={m.l + band * i} y={m.t} width={band} height={ih + m.b - 6} fill={hi === i ? "#f8fafc" : "transparent"} />
                        {stacked
                            ? (() => {
                                let acc = 0;
                                return series.map((s, si) => {
                                    const v = s.values[i] || 0; if (!v) return null;
                                    const y0 = y(acc + v), h = y(acc) - y0; acc += v;
                                    return <rect key={si} x={cx(i) - bw / 2} y={y0} width={bw} height={Math.max(0, h)} fill={s.color} />;
                                });
                            })()
                            : series.map((s, si) => {
                                const v = s.values[i] || 0, w = bw / series.length;
                                return <rect key={si} x={cx(i) - bw / 2 + w * si + 0.5} y={y(v)} width={Math.max(1, w - 1)} height={Math.max(0, y(0) - y(v))} rx="2.5" fill={barColors && series.length === 1 ? barColors[i] || s.color : s.color} />;
                            })}
                        {i % every === 0 && (rotate
                            ? <text x={cx(i) + 4} y={m.t + ih + 14} textAnchor="end" fontSize="11" fill="#94a3b8" transform={`rotate(-35 ${cx(i) + 4} ${m.t + ih + 14})`}>{truncate(l, maxChars)}</text>
                            : <text x={cx(i)} y={height - 10} textAnchor="middle" fontSize="11" fill="#94a3b8">{truncate(l, maxChars)}</text>)}
                    </g>
                ))}
            </svg>
            {hi != null && (
                <Tip x={cx(hi)} width={width}>
                    <div className="font-semibold mb-0.5">{labels[hi]}</div>
                    {series.map((s) => <TipRow key={s.name} color={barColors && series.length === 1 ? barColors[hi] || s.color : s.color} name={s.name} value={format(s.values[hi] || 0)} />)}
                    {stacked && series.length > 1 && <div className="border-t border-white/15 mt-1 pt-1"><TipRow name="Total" value={format(totals[hi])} /></div>}
                </Tip>
            )}
        </div>
    );
};

// ─── Horizontal ranked bars (HTML) ────────────────────────────────────────────
export const HBars = ({ items = [], format = (v) => v, max, color = COLORS.teal, labelWidth = "8rem", empty = "No data for this selection" }) => {
    const data = items.filter((i) => i.value != null);
    if (!data.length) return <EmptyState text={empty} />;
    const top = max ?? Math.max(...data.map((d) => d.value), 1);
    return (
        <ul className="space-y-3">
            {data.map((d) => (
                <li key={d.label} className="grid items-center gap-3" style={{ gridTemplateColumns: `minmax(0,${labelWidth}) 1fr auto` }}>
                    <span className="text-xs text-gray-600 truncate" title={d.label}>{d.label}</span>
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, (d.value / top) * 100))}%`, background: d.color || color }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 tabular-nums text-right min-w-[2.5rem]">
                        {format(d.value)}{d.note && <span className="ml-1.5 font-normal text-gray-400">{d.note}</span>}
                    </span>
                </li>
            ))}
        </ul>
    );
};

// ─── Donut ────────────────────────────────────────────────────────────────────
export const DonutChart = ({ data = [], centerValue, centerLabel, format = (v) => v, size = 152, thickness = 20, colors = PALETTE }) => {
    const [hi, setHi] = useState(null);
    const items = data.map((d, i) => ({ ...d, color: d.color || colors[i % colors.length] }));
    const total = items.reduce((a, d) => a + d.value, 0);
    if (!total) return <EmptyState />;
    const r = (size - thickness) / 2, C = 2 * Math.PI * r, c = size / 2;
    const gap = items.filter((d) => d.value > 0).length > 1 ? 2 : 0;
    let offset = 0;
    return (
        <div className="flex items-center gap-5 flex-wrap justify-center sm:justify-start">
            <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
                <svg width={size} height={size} role="img" aria-label="Donut chart" className="-rotate-90">
                    <circle cx={c} cy={c} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
                    {items.map((d, i) => {
                        const len = (d.value / total) * C;
                        const seg = (
                            <circle key={d.label} cx={c} cy={c} r={r} fill="none" stroke={d.color}
                                strokeWidth={hi === i ? thickness + 3 : thickness}
                                strokeDasharray={`${Math.max(0, len - gap)} ${C - Math.max(0, len - gap)}`} strokeDashoffset={-offset}
                                onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} style={{ transition: "stroke-width .12s" }} />
                        );
                        offset += len;
                        return d.value > 0 ? seg : null;
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    {(() => {
                        const txt = String(hi != null ? format(items[hi].value) : centerValue ?? format(total));
                        const cls = txt.length <= 5 ? "text-xl" : txt.length <= 8 ? "text-base" : "text-xs";
                        return <span className={`${cls} font-bold text-gray-900 tabular-nums leading-tight`}>{txt}</span>;
                    })()}
                    <span className="text-[11px] text-gray-400 truncate" style={{ maxWidth: size - thickness * 2 - 10 }}>{hi != null ? items[hi].label : centerLabel || "Total"}</span>
                </div>
            </div>
            <ul className="flex-1 min-w-[190px] space-y-1.5">
                {items.map((d, i) => (
                    <li key={d.label} className={`flex items-center gap-2 text-xs rounded-md px-1.5 py-0.5 ${hi === i ? "bg-gray-50" : ""}`} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                        <span className="text-gray-600 truncate">{d.label}</span>
                        <span className="ml-auto font-semibold text-gray-800 tabular-nums">{format(d.value)}</span>
                        <span className="text-gray-400 tabular-nums w-10 text-right">{((d.value / total) * 100).toFixed(0)}%</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// ─── Sparkline ────────────────────────────────────────────────────────────────
export const Sparkline = ({ values = [], color = COLORS.teal, width = 92, height = 30 }) => {
    const v = values.filter((x) => x != null && isFinite(x));
    if (v.length < 2) return null;
    const lo = Math.min(...v), hi = Math.max(...v), span = hi - lo || 1;
    const pts = v.map((val, i) => [(i / (v.length - 1)) * (width - 4) + 2, height - 4 - ((val - lo) / span) * (height - 8)]);
    const d = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join("");
    return (
        <svg width={width} height={height} aria-hidden="true" className="flex-shrink-0">
            <path d={d} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
        </svg>
    );
};

// ─── KPI card ─────────────────────────────────────────────────────────────────
/** cur/prev comparison chip. mode: "pct" (relative %), "pts" (percentage points), "abs" (difference) */
export const Delta = ({ cur, prev, mode = "pct", good = "up", suffix = "", onDark = false }) => {
    if (cur == null || prev == null || !isFinite(cur) || !isFinite(prev)) return null;
    const diff = cur - prev;
    const muted = onDark ? "text-white/75" : "text-gray-400";
    if (Math.abs(diff) < 1e-9) return <span className={`text-[11px] ${muted}`}>No change vs previous</span>;
    let text;
    if (mode === "pts") text = `${Math.abs(diff).toFixed(1)} pts`;
    else if (mode === "abs") text = `${Math.abs(diff).toLocaleString()}${suffix}`;
    else text = prev === 0 ? "new" : `${Math.abs((diff / prev) * 100).toFixed(0)}%`;
    const up = diff > 0;
    const positive = good === "neutral" ? null : good === "up" ? up : !up;
    const tone = onDark
        ? positive === false ? "bg-rose-600/80 text-white" : "bg-white/25 text-white"
        : positive == null ? "text-slate-600 bg-slate-100" : positive ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50";
    const Icon = up ? TrendingUp : TrendingDown;
    return (
        <span className={`inline-flex items-center gap-1.5 text-[11px] ${muted}`}>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold ${tone}`}><Icon size={11} />{text}</span>
            vs previous
        </span>
    );
};

export const KpiCard = ({ icon: Icon, tint = "teal", label, value, sub, delta, spark, onClick }) => {
    // Same gradient set as the other HR pages: green, blue, purple, yellow (+ red for alerts).
    const grads = {
        teal: "from-teal-400 to-emerald-500", sky: "from-sky-400 to-blue-500", violet: "from-violet-400 to-purple-500",
        amber: "from-amber-400 to-orange-500", mint: "from-emerald-400 to-teal-600", rose: "from-rose-400 to-red-500",
    };
    const Tag = onClick ? "button" : "div";
    const d = React.isValidElement(delta) ? React.cloneElement(delta, { onDark: true }) : delta;
    return (
        <Tag onClick={onClick} className={`text-left bg-gradient-to-br ${grads[tint] || grads.teal} text-white rounded-2xl shadow-sm p-5 flex flex-col gap-3 min-w-0 break-inside-avoid hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ${onClick ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-500" : ""}`}>
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-white/85 font-medium">{label}</span>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/20"><Icon size={18} /></span>
            </div>
            <div className="flex items-end justify-between gap-3">
                <span className="text-[28px] leading-none font-bold tabular-nums tracking-tight">{value}</span>
                {spark && <Sparkline values={spark} color="#ffffff" />}
            </div>
            <div className="space-y-1 min-h-[2.25rem]">
                {d}
                {sub && <p className="text-xs text-white/80">{sub}</p>}
            </div>
        </Tag>
    );
};

export const Badge = ({ tone = "gray", children }) => {
    const tones = {
        gray: "bg-gray-100 text-gray-600", green: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700",
        red: "bg-rose-100 text-rose-700", blue: "bg-sky-100 text-sky-700", violet: "bg-violet-100 text-violet-700",
    };
    return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
};

export const RateBar = ({ value, warnBelow = 90, badBelow = 80 }) => {
    if (value == null) return <span className="text-xs text-gray-400">—</span>;
    const color = value < badBelow ? COLORS.rose : value < warnBelow ? COLORS.amber : COLORS.teal;
    return (
        <div className="flex items-center gap-2 min-w-[110px]">
            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: color }} /></div>
            <span className="text-xs font-semibold text-gray-700 tabular-nums w-11 text-right">{value.toFixed(1)}%</span>
        </div>
    );
};

// ─── Data table (search + sort + pagination) ──────────────────────────────────
/**
 * columns: [{ key, label, render?(row), sortValue?(row), align?: "right", className? }]
 */
export const DataTable = ({ columns, rows, pageSize = 8, searchText, initialSort, emptyText = "Nothing to show", rowKey }) => {
    const [q, setQ] = useState("");
    const [sort, setSort] = useState(initialSort || null);
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        let r = needle && searchText ? rows.filter((row) => searchText(row).toLowerCase().includes(needle)) : rows;
        if (sort) {
            const col = columns.find((c) => c.key === sort.key);
            const val = (row) => (col?.sortValue ? col.sortValue(row) : row[sort.key]);
            r = [...r].sort((a, b) => {
                const x = val(a), y = val(b);
                if (x == null && y == null) return 0;
                if (x == null) return 1;
                if (y == null) return -1;
                const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
                return sort.dir === "asc" ? c : -c;
            });
        }
        return r;
    }, [rows, q, sort, columns, searchText]);

    useEffect(() => { setPage(1); }, [q, rows.length]);
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const cur = Math.min(page, pages);
    const view = filtered.slice((cur - 1) * pageSize, cur * pageSize);
    const toggle = (c) => { if (c.sortable === false) return; setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: "asc" })); };

    return (
        <div>
            {searchText && (
                <div className="relative mb-3 max-w-xs no-print">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search table"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
            )}
            <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500">
                            {columns.map((c) => {
                                const active = sort?.key === c.key;
                                return (
                                    <th key={c.key} scope="col" className={`px-4 py-3 font-semibold whitespace-nowrap ${c.align === "right" ? "text-right" : "text-left"}`}
                                        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
                                        {c.sortable === false ? c.label : (
                                            <button onClick={() => toggle(c)} className={`inline-flex items-center gap-1 hover:text-gray-800 ${c.align === "right" ? "flex-row-reverse" : ""}`}>
                                                {c.label}
                                                {active ? (sort.dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronDown size={12} className="opacity-25" />}
                                            </button>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {view.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-xs text-gray-400">{emptyText}</td></tr>}
                        {view.map((row, i) => (
                            <tr key={rowKey ? rowKey(row) : i} className="hover:bg-teal-50/40 transition-colors">
                                {columns.map((c) => (
                                    <td key={c.key} className={`px-4 py-3 text-gray-700 ${c.align === "right" ? "text-right tabular-nums" : ""} ${c.className || ""}`}>
                                        {c.render ? c.render(row) : row[c.key] ?? "—"}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {filtered.length > pageSize && (
                <div className="flex items-center justify-between mt-3 text-xs text-gray-500 no-print">
                    <span>Showing {(cur - 1) * pageSize + 1}–{Math.min(cur * pageSize, filtered.length)} of {filtered.length}</span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(cur - 1)} disabled={cur <= 1} aria-label="Previous page" className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft size={14} /></button>
                        <span className="px-2 tabular-nums">{cur} / {pages}</span>
                        <button onClick={() => setPage(cur + 1)} disabled={cur >= pages} aria-label="Next page" className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronRight size={14} /></button>
                    </div>
                </div>
            )}
        </div>
    );
};