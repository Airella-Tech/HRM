import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  BriefcaseBusiness,
  Users,
  FileText,
  CalendarDays,
  Handshake,
  Lock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock3,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";
import { useRecruitmentAccess } from "../../utils/useRecruitmentAccess";

/* ===========================================================================
 * Permissions (codes from DefaultRecruitmentSeeder)
 * ========================================================================= */
const P = {
  vacancies: ["VACANCY_CREATE", "VACANCY_APPROVE", "VACANCY_PUBLISH"],
  applications: ["APPLICATION_VIEW", "APPLICATION_SCREEN", "APPLICATION_SHORTLIST"],
  interviewsAll: ["INTERVIEW_SCHEDULE", "INTERVIEW_ASSIGN", "INTERVIEW_PROGRESS_VIEW", "INTERVIEW_DECIDE"],
  interviewsMine: ["INTERVIEW_EVALUATE"],
  offers: ["OFFER_MANAGE"],
};

/* ===========================================================================
 * Helpers
 * ========================================================================= */
const DAY = 86400000;
const ts = (v) => {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isNaN(t) ? null : t;
};
const appTime = (a) => ts(a.appliedAt || a.createdAt || a.submittedAt);
const ivTime = (i) => ts(i.scheduledAt || i.interviewDate || i.date);
const offerTime = (o) => ts(o.createdAt || o.sentAt || o.offerDate);
const actTime = (a) => ts(a.createdAt || a.timestamp || a.performedAt || a.time);
const pretty = (s) => (s ? String(s).replace(/_/g, " ").toLowerCase() : "");
const personName = (x) => x.candidateName || x.fullName || x.candidate?.fullName || x.candidate?.name || "Candidate";
const vacancyName = (x) => x.vacancyTitle || x.jobTitle || x.vacancy?.title || x.position || "Vacancy";
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "-";

const ago = (t) => {
  if (!t) return "";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : fmtDate(t);
};

// Counts in the selected period vs the period before it, plus a sparkline.
const buildMetric = (items, getT, days, buckets) => {
  const now = Date.now();
  const start = now - days * DAY;
  const prevStart = start - days * DAY;
  const spark = Array(buckets).fill(0);
  let current = 0;
  let previous = 0;
  items.forEach((x) => {
    const t = getT(x);
    if (t == null) return;
    if (t >= start && t <= now) {
      current += 1;
      spark[Math.min(buckets - 1, Math.floor(((t - start) / (days * DAY)) * buckets))] += 1;
    } else if (t >= prevStart && t < start) previous += 1;
  });
  const delta = previous ? Math.round(((current - previous) / previous) * 100) : null;
  return { current, previous, delta, spark };
};

const countBy = (list, pick) => {
  const m = {};
  list.forEach((x) => {
    const k = pick(x);
    if (k) m[k] = (m[k] || 0) + 1;
  });
  return Object.entries(m).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};

const useList = (enabled, fetcher) => {
  const [state, setState] = useState({ data: null, error: "" });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) {
      setState({ data: [], error: "" });
      return;
    }
    let cancelled = false;
    fetcher()
      .then((res) => !cancelled && setState({ data: Array.isArray(res.data) ? res.data : [], error: "" }))
      .catch((e) => !cancelled && setState({ data: [], error: e.message || "Could not load" }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tick]);
  return { ...state, loading: state.data === null, reload: () => setTick((t) => t + 1) };
};

/* ===========================================================================
 * Visual tokens
 * ========================================================================= */
const VACANCY_STATUS = [
  { key: "PUBLISHED", label: "Published", color: "#4f46e5" },
  { key: "PENDING_APPROVAL", label: "Pending approval", color: "#f59e0b" },
  { key: "APPROVED", label: "Approved", color: "#10b981" },
  { key: "DRAFT", label: "Draft", color: "#38bdf8" },
  { key: "CLOSED", label: "Closed", color: "#cbd5e1" },
];
const CHIP = {
  PUBLISHED: "bg-indigo-50 text-indigo-700",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  DRAFT: "bg-sky-50 text-sky-700",
  CLOSED: "bg-slate-100 text-slate-600",
  SHORTLISTED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-600",
  SCHEDULED: "bg-indigo-50 text-indigo-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-600",
  ACCEPTED: "bg-emerald-50 text-emerald-700",
  SENT: "bg-sky-50 text-sky-700",
};
const AVATAR = ["bg-indigo-100 text-indigo-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-sky-100 text-sky-700", "bg-violet-100 text-violet-700", "bg-rose-100 text-rose-700"];
const avatarTone = (name) => AVATAR[(name || "?").charCodeAt(0) % AVATAR.length];

/* ===========================================================================
 * Building blocks
 * ========================================================================= */
const Card = ({ children, className = "" }) => (
  <section className={`rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
    {children}
  </section>
);

const CardHead = ({ title, subtitle, right }) => (
  <div className="flex items-start justify-between gap-3 px-5 pt-5">
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
    </div>
    {right}
  </div>
);

const Empty = ({ text }) => <p className="px-5 py-10 text-center text-sm text-slate-400">{text}</p>;

const Skeleton = ({ rows = 3 }) => (
  <div className="space-y-3 p-5">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
    ))}
  </div>
);

const Chip = ({ status }) => (
  <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${CHIP[status] || "bg-slate-100 text-slate-600"}`}>
    {pretty(status) || "unknown"}
  </span>
);

const Avatar = ({ name }) => (
  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarTone(name)}`}>
    {(name || "?").charAt(0).toUpperCase()}
  </span>
);

const Sparkline = ({ data, color }) => {
  const max = Math.max(1, ...data);
  const W = 80, H = 28;
  const pts = data.map((v, i) => `${(i * W) / Math.max(1, data.length - 1)},${H - 3 - (v / max) * (H - 6)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-20" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const Delta = ({ metric, label }) => {
  if (metric.delta == null) {
    return <span className="text-xs text-slate-400">{metric.current ? "No previous period" : label}</span>;
  }
  const up = metric.delta >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${up ? "text-emerald-600" : "text-red-500"}`}>
      <Icon size={13} />
      {up ? "+" : ""}
      {metric.delta}%<span className="font-normal text-slate-400">vs previous</span>
    </span>
  );
};

const KpiCard = ({ icon: Icon, label, value, metric, color, tone, footnote }) => (
  <Card className="p-5">
    <div className="flex items-center justify-between">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
        <Icon size={18} />
      </span>
      {metric && <Sparkline data={metric.spark} color={color} />}
    </div>
    <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{value ?? "-"}</p>
    <p className="mt-0.5 text-sm text-slate-500">{label}</p>
    <div className="mt-3 border-t border-slate-100 pt-3">
      {metric ? <Delta metric={metric} label="No data in range" /> : <span className="text-xs text-slate-400">{footnote}</span>}
    </div>
  </Card>
);

const TrendChart = ({ series, labels }) => {
  const W = 600, H = 180, pad = 10;
  const max = Math.max(1, ...series.flatMap((s) => s.data));
  const n = labels.length;
  const x = (i) => (i * W) / Math.max(1, n - 1);
  const y = (v) => H - pad - (v / max) * (H - pad * 2);
  const line = (d) => d.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <div className="px-5 pb-5 pt-4">
      <div className="flex items-stretch gap-3">
        <div className="flex flex-col justify-between py-1 text-[11px] text-slate-400">
          <span>{max}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" preserveAspectRatio="none" role="img" aria-label="Trend over the selected period">
          {[0, 0.5, 1].map((f) => (
            <line key={f} x1="0" x2={W} y1={pad + f * (H - pad * 2)} y2={pad + f * (H - pad * 2)} stroke="#f1f5f9" strokeWidth="1" />
          ))}
          {series.map((s, si) => (
            <g key={s.name}>
              {si === 0 && <path d={`${line(s.data)} L${W},${H} L0,${H} Z`} fill={s.color} opacity="0.08" />}
              <path d={line(s.data)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              {s.data.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r="6" fill="transparent">
                  <title>{`${s.name}, ${labels[i]}: ${v}`}</title>
                </circle>
              ))}
            </g>
          ))}
        </svg>
      </div>
      <div className="ml-8 mt-2 flex justify-between text-[11px] text-slate-400">
        <span>{labels[0]}</span>
        <span>{labels[Math.floor(n / 2)]}</span>
        <span>{labels[n - 1]}</span>
      </div>
      <div className="ml-8 mt-3 flex gap-5">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-2 text-xs text-slate-600">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.name}
            <span className="font-semibold text-slate-900">{s.data.reduce((a, b) => a + b, 0)}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

const Donut = ({ data, label }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 42, C = 2 * Math.PI * R;
  let offset = 0;
  if (!total) return <Empty text="No data yet." />;
  return (
    <div className="flex items-center gap-5 px-5 pb-5 pt-4">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={label}>
          <circle cx="50" cy="50" r={R} fill="none" stroke="#f1f5f9" strokeWidth="11" />
          {data.map((d) => {
            if (!d.value) return null;
            const len = (d.value / total) * C;
            const el = (
              <circle key={d.label} cx="50" cy="50" r={R} fill="none" stroke={d.color} strokeWidth="11" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset}>
                <title>{`${d.name}: ${d.value}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{total}</span>
          <span className="text-[11px] text-slate-500">{label}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="truncate text-slate-600">{d.name}</span>
            <span className="ml-auto font-semibold text-slate-900">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Funnel = ({ steps }) => {
  const top = Math.max(1, steps[0]?.value || 1);
  return (
    <ul className="space-y-3 px-5 pb-5 pt-4">
      {steps.map((s, i) => {
        const prev = i ? steps[i - 1].value : null;
        return (
          <li key={s.label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs text-slate-500">{s.label}</span>
            <div className="h-8 flex-1 overflow-hidden rounded-lg bg-slate-100">
              <div className="flex h-full items-center rounded-lg px-3 text-xs font-semibold text-white" style={{ width: `${Math.max(8, (s.value / top) * 100)}%`, background: s.color }}>
                {s.value}
              </div>
            </div>
            <span className="w-10 shrink-0 text-right text-xs text-slate-500">{prev ? `${Math.round((s.value / prev) * 100)}%` : ""}</span>
          </li>
        );
      })}
    </ul>
  );
};

const BarList = ({ data }) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <Empty text="No applications in this period." />;
  return (
    <ul className="space-y-3.5 px-5 pb-5 pt-4">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="truncate pr-2 text-slate-600">{d.label}</span>
            <span className="font-semibold text-slate-900">{d.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
};

/* ===========================================================================
 * Dashboard
 * ========================================================================= */
const RANGES = [
  { days: 7, label: "7 days", buckets: 7 },
  { days: 30, label: "30 days", buckets: 10 },
  { days: 90, label: "90 days", buckets: 12 },
];

const Dashboard = () => {
  const access = useRecruitmentAccess();
  let storedUser = {};
  try {
    storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    storedUser = {};
  }
  const effective = access || (storedUser.role === "ADMIN" ? { fullAccess: true, permissions: [] } : null);
  const ready = Boolean(effective);
  const full = Boolean(effective?.fullAccess);
  const permSet = useMemo(() => new Set(effective?.permissions || []), [effective]);
  const has = (...codes) => full || codes.some((c) => permSet.has(c));

  const canVacancies = ready && has(...P.vacancies);
  const canApplications = ready && has(...P.applications);
  const canInterviewsAll = ready && has(...P.interviewsAll);
  const canInterviewsMine = ready && !canInterviewsAll && has(...P.interviewsMine);
  const canInterviews = canInterviewsAll || canInterviewsMine;
  const canOffers = ready && has(...P.offers);
  const anything = canVacancies || canApplications || canInterviews || canOffers;

  const vacancies = useList(canVacancies, () => recruitmentApi.getVacancies());
  const applications = useList(canApplications, () => recruitmentApi.getApplications());
  const interviews = useList(canInterviews, () => (canInterviewsAll ? recruitmentApi.getInterviews() : recruitmentApi.getMyAssignedInterviews()));
  const offers = useList(canOffers, () => recruitmentApi.getJobOffers());
  // HR Manager / Admin see the audit trail; everyone else sees their notifications.
  const activity = useList(ready && anything, () => (full ? recruitmentApi.getAuditLogs() : recruitmentApi.getNotifications()));

  const reloadAll = () => [vacancies, applications, interviews, offers, activity].forEach((l) => l.reload());

  const [days, setDays] = useState(30);
  const range = RANGES.find((r) => r.days === days);
  const [vacancyFilter, setVacancyFilter] = useState("ALL");
  const vacancyRef = useRef(null);

  const apps = applications.data || [];
  const ivs = interviews.data || [];
  const ofs = offers.data || [];
  const vacs = vacancies.data || [];

  const m = useMemo(() => {
    const shortlistedApps = apps.filter((a) => a.status === "SHORTLISTED");
    const acceptedOffers = ofs.filter((o) => o.status === "ACCEPTED").length;
    return {
      apps: buildMetric(apps, appTime, days, range.buckets),
      shortlisted: buildMetric(shortlistedApps, appTime, days, range.buckets),
      interviews: buildMetric(ivs, ivTime, days, range.buckets),
      offers: buildMetric(ofs, offerTime, days, range.buckets),
      acceptRate: ofs.length ? Math.round((acceptedOffers / ofs.length) * 100) : null,
    };
  }, [apps, ivs, ofs, days, range.buckets]);

  const vacancyCounts = useMemo(() => {
    const c = {};
    vacs.forEach((v) => (c[v.status] = (c[v.status] || 0) + 1));
    return c;
  }, [vacs]);

  const labels = useMemo(() => {
    const start = Date.now() - days * DAY;
    return Array.from({ length: range.buckets }, (_, i) =>
      new Date(start + ((i + 0.5) / range.buckets) * days * DAY).toLocaleDateString(undefined, { day: "numeric", month: "short" })
    );
  }, [days, range.buckets]);

  const inRange = (t) => t != null && t >= Date.now() - days * DAY && t <= Date.now();
  const topVacancies = useMemo(
    () => countBy(apps.filter((a) => inRange(appTime(a))), vacancyName).slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apps, days]
  );

  const agenda = useMemo(() => {
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    return ivs
      .map((i) => ({ i, t: ivTime(i) }))
      .filter(({ i, t }) => t != null && t >= startOfToday && t < startOfToday + 8 * DAY && !["COMPLETED", "CANCELLED"].includes(i.status))
      .sort((a, b) => a.t - b.t)
      .slice(0, 6);
  }, [ivs]);

  const dayLabel = (t) => {
    const diff = Math.floor((new Date(t).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return new Date(t).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  };

  const recentApps = useMemo(
    () => [...apps].sort((a, b) => (appTime(b) || 0) - (appTime(a) || 0)).slice(0, 6),
    [apps]
  );

  const applicantsByVacancy = useMemo(() => {
    const byId = {};
    const byTitle = {};
    apps.forEach((a) => {
      const id = a.vacancyId ?? a.vacancy?.id;
      if (id != null) byId[id] = (byId[id] || 0) + 1;
      const t = vacancyName(a);
      byTitle[t] = (byTitle[t] || 0) + 1;
    });
    return (v) => byId[v.id] ?? byTitle[v.title || v.jobTitle] ?? 0;
  }, [apps]);

  const filteredVacancies = vacs.filter((v) => vacancyFilter === "ALL" || v.status === vacancyFilter).slice(0, 8);

  const attention = [
    has("VACANCY_APPROVE") && canVacancies && { label: "to approve", value: vacancyCounts.PENDING_APPROVAL || 0, filter: "PENDING_APPROVAL" },
    has("VACANCY_PUBLISH") && canVacancies && { label: "ready to publish", value: vacancyCounts.APPROVED || 0, filter: "APPROVED" },
    has("VACANCY_CREATE") && canVacancies && { label: "drafts", value: vacancyCounts.DRAFT || 0, filter: "DRAFT" },
  ].filter(Boolean);

  const funnel = [
    canApplications && { label: "Applications", value: m.apps.current, color: "#4f46e5" },
    canApplications && { label: "Shortlisted", value: m.shortlisted.current, color: "#38bdf8" },
    canInterviewsAll && { label: "Interviews", value: m.interviews.current, color: "#8b5cf6" },
    canOffers && { label: "Offers", value: m.offers.current, color: "#10b981" },
  ].filter(Boolean);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (storedUser.fullName || "").split(" ")[0];

  return (
    <PageLayout role="recruiter" activePage="Overview" title="Recruitment Dashboard" subtitle="Hiring activity and performance">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {greeting}
              {firstName ? `, ${firstName}` : ""}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div role="group" aria-label="Date range" className="flex rounded-xl border border-slate-200 bg-white p-1">
              {RANGES.map((r) => (
                <button
                  key={r.days}
                  type="button"
                  aria-pressed={days === r.days}
                  onClick={() => setDays(r.days)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${days === r.days ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={reloadAll} aria-label="Refresh data" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:text-slate-800">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {!ready && <Card><Skeleton rows={4} /></Card>}

        {ready && !anything && (
          <Card className="flex flex-col items-center gap-2 p-10 text-center">
            <Lock className="text-slate-400" size={28} />
            <h3 className="font-semibold text-slate-900">No recruitment data available</h3>
            <p className="max-w-sm text-sm text-slate-500">Your recruitment roles do not include a view that applies here. Ask an HR Manager to update your roles.</p>
          </Card>
        )}

        {/* Needs attention */}
        {attention.some((a) => a.value > 0) && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3">
            <Clock3 size={16} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-900">Needs your attention</span>
            {attention.filter((a) => a.value > 0).map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => {
                  setVacancyFilter(a.filter);
                  vacancyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"
              >
                {a.value} {a.label}
              </button>
            ))}
          </div>
        )}

        {/* KPIs */}
        {anything && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {canVacancies && (
              <KpiCard icon={BriefcaseBusiness} tone="bg-indigo-50 text-indigo-600" color="#4f46e5" label="Open vacancies"
                value={vacancies.loading ? "-" : vacancyCounts.PUBLISHED || 0}
                footnote={`${vacancyCounts.PENDING_APPROVAL || 0} pending approval`} />
            )}
            {canApplications && (
              <KpiCard icon={FileText} tone="bg-sky-50 text-sky-600" color="#0ea5e9" label="Applications"
                value={applications.loading ? "-" : m.apps.current} metric={m.apps} />
            )}
            {canApplications && (
              <KpiCard icon={Users} tone="bg-emerald-50 text-emerald-600" color="#10b981" label="Shortlisted"
                value={applications.loading ? "-" : m.shortlisted.current} metric={m.shortlisted} />
            )}
            {canInterviews && (
              <KpiCard icon={CalendarDays} tone="bg-violet-50 text-violet-600" color="#8b5cf6" label={canInterviewsMine ? "My interviews" : "Interviews"}
                value={interviews.loading ? "-" : m.interviews.current} metric={m.interviews} />
            )}
            {canOffers && (
              <KpiCard icon={Handshake} tone="bg-amber-50 text-amber-600" color="#f59e0b" label="Offers"
                value={offers.loading ? "-" : m.offers.current} metric={m.offers} />
            )}
          </div>
        )}

        {/* Trend + agenda */}
        {(canApplications || canInterviews) && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {canApplications && (
              <Card className="lg:col-span-8">
                <CardHead title="Applications over time" subtitle={`Last ${days} days`}
                  right={canOffers && m.acceptRate != null ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{m.acceptRate}% offer acceptance</span>
                  ) : null} />
                {applications.loading ? <Skeleton /> : applications.error ? <Empty text={applications.error} /> : (
                  <TrendChart labels={labels} series={[
                    { name: "Applications", color: "#4f46e5", data: m.apps.spark },
                    { name: "Shortlisted", color: "#10b981", data: m.shortlisted.spark },
                  ]} />
                )}
              </Card>
            )}
            {canInterviews && (
              <Card className={canApplications ? "lg:col-span-4" : "lg:col-span-12"}>
                <CardHead title="Upcoming interviews" subtitle="Next 7 days" />
                {interviews.loading ? <Skeleton /> : interviews.error ? <Empty text={interviews.error} /> : agenda.length === 0 ? <Empty text="Nothing scheduled this week." /> : (
                  <ul className="mt-3 divide-y divide-slate-100 px-5 pb-3">
                    {agenda.map(({ i, t }) => {
                      const hasTime = String(i.scheduledAt || i.interviewDate || i.date).includes("T");
                      const time = i.interviewTime || i.startTime || (hasTime ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");
                      return (
                        <li key={i.id} className="flex items-center gap-3 py-3">
                          <div className="w-[72px] shrink-0">
                            <p className={`text-xs font-semibold ${dayLabel(t) === "Today" ? "text-indigo-600" : "text-slate-500"}`}>{dayLabel(t)}</p>
                            <p className="text-xs text-slate-400">{time || "-"}</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">{personName(i)}</p>
                            <p className="truncate text-xs text-slate-500">{vacancyName(i)}{i.round ? ` · Round ${i.round}` : ""}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            )}
          </div>
        )}

        {/* Funnel, vacancies, top vacancies */}
        {(funnel.length > 1 || canVacancies || canApplications) && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {funnel.length > 1 && (
              <Card>
                <CardHead title="Hiring funnel" subtitle={`Last ${days} days, % moved on from previous stage`} />
                <Funnel steps={funnel} />
              </Card>
            )}
            {canVacancies && (
              <Card>
                <CardHead title="Vacancies by status" subtitle="Current snapshot" />
                <Donut label="vacancies" data={VACANCY_STATUS.map((s) => ({ label: s.key, name: s.label, color: s.color, value: vacancyCounts[s.key] || 0 }))} />
              </Card>
            )}
            {canApplications && (
              <Card>
                <CardHead title="Top vacancies" subtitle={`Most applications, last ${days} days`} />
                <BarList data={topVacancies} />
              </Card>
            )}
          </div>
        )}

        {/* Recent applications + activity */}
        {(canApplications || anything) && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {canApplications && (
              <Card className="lg:col-span-8">
                <CardHead title="Recent applications" subtitle="Latest candidates to apply" />
                {applications.loading ? <Skeleton /> : applications.error ? <Empty text={applications.error} /> : recentApps.length === 0 ? <Empty text="No applications yet." /> : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-y border-slate-100 bg-slate-50/60 text-xs text-slate-500">
                          <th className="px-5 py-2.5 font-medium">Candidate</th>
                          <th className="px-3 py-2.5 font-medium">Vacancy</th>
                          <th className="px-3 py-2.5 font-medium">Status</th>
                          <th className="px-5 py-2.5 text-right font-medium">Applied</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentApps.map((a) => (
                          <tr key={a.id}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar name={personName(a)} />
                                <span className="font-medium text-slate-900">{personName(a)}</span>
                              </div>
                            </td>
                            <td className="max-w-[200px] truncate px-3 py-3 text-slate-600">{vacancyName(a)}</td>
                            <td className="px-3 py-3">{a.status && <Chip status={a.status} />}</td>
                            <td className="whitespace-nowrap px-5 py-3 text-right text-slate-500">{ago(appTime(a)) || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}
            <Card className={canApplications ? "lg:col-span-4" : "lg:col-span-12"}>
              <CardHead title="Recent activity" subtitle={full ? "Audit trail" : "Your notifications"} />
              {activity.loading ? <Skeleton /> : (activity.data || []).length === 0 ? <Empty text="No recent activity." /> : (
                <ol className="mt-4 space-y-4 px-5 pb-5">
                  {[...activity.data].sort((a, b) => (actTime(b) || 0) - (actTime(a) || 0)).slice(0, 7).map((a, idx) => (
                    <li key={a.id ?? idx} className="flex gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm text-slate-700">
                          {a.description || a.details || a.message || a.title || [a.action, a.entityType].filter(Boolean).join(" ") || "Activity"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {[a.performedBy || a.userName || a.user, ago(actTime(a))].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        )}

        {/* Vacancies table */}
        {canVacancies && (
          <Card>
            <div ref={vacancyRef} className="scroll-mt-4">
              <CardHead title="Vacancies" subtitle="Applicants and deadlines"
                right={
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {[{ key: "ALL", label: "All" }, ...VACANCY_STATUS].map((s) => (
                      <button key={s.key} type="button" onClick={() => setVacancyFilter(s.key)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${vacancyFilter === s.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                } />
            </div>
            {vacancies.loading ? <Skeleton /> : vacancies.error ? <Empty text={vacancies.error} /> : filteredVacancies.length === 0 ? <Empty text="No vacancies match." /> : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-y border-slate-100 bg-slate-50/60 text-xs text-slate-500">
                      <th className="px-5 py-2.5 font-medium">Vacancy</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5 font-medium">Applicants</th>
                      <th className="px-5 py-2.5 text-right font-medium">Deadline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVacancies.map((v) => {
                      const close = ts(v.closingDate || v.deadline);
                      const left = close ? Math.ceil((close - Date.now()) / DAY) : null;
                      return (
                        <tr key={v.id}>
                          <td className="px-5 py-3">
                            <p className="font-medium text-slate-900">{v.title || v.jobTitle}</p>
                            <p className="text-xs text-slate-500">{v.department?.name || v.department || "No department"}</p>
                          </td>
                          <td className="px-3 py-3"><Chip status={v.status} /></td>
                          <td className="px-3 py-3 font-semibold text-slate-700">{canApplications ? applicantsByVacancy(v) : "-"}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-right">
                            {left == null ? <span className="text-slate-400">-</span> : left < 0 ? <span className="text-slate-400">Closed</span> : (
                              <span className={`text-xs font-semibold ${left <= 3 ? "text-red-500" : "text-slate-600"}`}>{left === 0 ? "Today" : `${left}d left`}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </PageLayout>
  );
};

export default Dashboard;