// Shared colour palette and axis-scale helper for the HR Report charts (src/components/ReportCharts.jsx)
export const COLORS = {
    teal: "#0d9488", emerald: "#10b981", sky: "#0ea5e9", indigo: "#6366f1",
    amber: "#f59e0b", rose: "#f43f5e", violet: "#8b5cf6", slate: "#94a3b8",
};
export const PALETTE = [COLORS.teal, COLORS.indigo, COLORS.amber, COLORS.sky, COLORS.rose, COLORS.violet, COLORS.emerald, COLORS.slate];

export const niceScale = (rawMax, target = 4) => {
    if (!isFinite(rawMax) || rawMax <= 0) return { max: 1, ticks: [0, 1], step: 1 };
    const rough = rawMax / target;
    const pow = Math.pow(10, Math.floor(Math.log10(rough)));
    const f = rough / pow;
    const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
    const max = Math.ceil(rawMax / step - 1e-9) * step;
    const ticks = [];
    for (let v = 0; v <= max + step / 1000; v += step) ticks.push(Number(v.toFixed(6)));
    return { max, ticks, step };
};
