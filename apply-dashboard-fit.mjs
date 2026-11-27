// Run from the repo root:  node apply-dashboard-fit.mjs
// Makes the Recruitment dashboard fill the page for users who only have access
// to a few widgets (e.g. vacancies only): the KPI row and the chart row adapt to
// how many cards are visible, and a single KPI becomes a wide strip.
import fs from "fs";
import path from "path";

const file = path.join("hrm_frontend", "src", "Pages", "recruitment", "Dashboard.jsx");
const raw = fs.readFileSync(file, "utf8");
const eol = raw.includes("\r\n") ? "\r\n" : "\n";
let text = raw.replace(/\r\n/g, "\n");

if (text.includes("const KPI_COLS")) {
  console.log("Dashboard.jsx already done, skipped");
  process.exit(0);
}

let failed = false;
const once = (from, to, label) => {
  const n = text.split(from).length - 1;
  if (n !== 1) {
    console.error(`  ! ${label}: expected 1 match, found ${n}. Skipped this one.`);
    failed = true;
    return;
  }
  text = text.replace(from, () => to);
};

// 1. column maps
once(
  "const KpiCard = ({\n",
  `// Columns by number of visible cards, so a row never ends half empty
const KPI_COLS = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
};
const ROW_COLS = { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3" };

const KpiCard = ({
`,
  "KpiCard start",
);

// 2. wide KPI strip
once(
  "  footnote,\n  loading,\n}) => {\n  const positive = metric?.delta >= 0;\n",
  `  footnote,
  loading,
  wide = false,
}) => {
  const positive = metric?.delta >= 0;

  if (wide) {
    return (
      <Card className={\`group relative overflow-hidden border-0 \${gradient} p-5 text-white\`}>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white">
              <Icon size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/85">{label}</p>
              <p className="text-3xl font-bold tabular-nums text-white">{loading ? "—" : value ?? 0}</p>
            </div>
          </div>
          {metric ? (
            <div className="flex items-center gap-3">
              <Sparkline data={metric.spark} color="rgba(255,255,255,0.6)" />
              {metric.delta === null ? (
                <span className="text-[11px] text-white/80">
                  {metric.current ? "No previous period data" : "No activity in this period"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
                  {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {positive ? "+" : ""}
                  {metric.delta}%
                  <span className="font-normal text-white/80">vs previous period</span>
                </span>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
              {footnote || "Active"}
            </span>
          )}
        </div>
      </Card>
    );
  }
`,
  "KpiCard wide variant",
);

// 3. how many KPI cards this user sees
once(
  "  const anything = canVacancies || canApplications || canInterviews || canOffers;\n",
  "  const anything = canVacancies || canApplications || canInterviews || canOffers;\n" +
    "  const kpiCount = (canVacancies ? 1 : 0) + (canApplications ? 2 : 0) + (canInterviews ? 1 : 0) + (canOffers ? 1 : 0);\n",
  "kpiCount",
);

// 4. KPI grid + wide cards
once(
  '<div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">',
  '<div className={`mt-5 grid grid-cols-1 gap-4 ${kpiCount > 1 ? "md:grid-cols-2" : ""} ${KPI_COLS[kpiCount] || KPI_COLS[5]}`}>',
  "KPI grid",
);
{
  const from = "<KpiCard icon={";
  const n = text.split(from).length - 1;
  if (n < 1) {
    console.error("  ! KpiCard usages not found.");
    failed = true;
  } else {
    text = text.split(from).join("<KpiCard wide={kpiCount <= 2} icon={");
  }
}

// 5. chart row (funnel / vacancies by status / top vacancies)
once(
  '<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">',
  '<div className={`grid grid-cols-1 gap-4 ${ROW_COLS[(funnel.length > 1 ? 1 : 0) + (canVacancies ? 1 : 0) + (canApplications ? 1 : 0)] || ROW_COLS[3]}`}>',
  "chart row",
);

// 6. donut: centred, legend does not stretch across a wide card
once(
  '<div className="flex items-center gap-5 pt-4">\n      <div className="relative h-32 w-32 shrink-0">',
  '<div className="flex items-center justify-center gap-6 pt-4">\n      <div className="relative h-32 w-32 shrink-0">',
  "donut container",
);
once(
  '<ul className="min-w-0 flex-1 space-y-1.5">',
  '<ul className="min-w-0 max-w-xs flex-1 space-y-1.5">',
  "donut legend",
);

if (failed) {
  console.error("Some edits were skipped, nothing was written. Send me the messages above.");
  process.exit(1);
}
fs.writeFileSync(file, text.replace(/\n/g, eol), "utf8");
console.log("Dashboard.jsx done");
console.log("Now run: npm run lint (inside hrm_frontend), then hard refresh.");