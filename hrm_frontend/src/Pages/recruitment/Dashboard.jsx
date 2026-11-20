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
  Calendar,
  CheckCircle2,
  Send,
  PencilLine,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";
import { useRecruitmentAccess } from "../../utils/useRecruitmentAccess";
import { avatarColorClass } from "../../utils/avatarColor";
import GreetingCard from "./components/GreetingCard";


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
  { key: "PUBLISHED", label: "Published", color: "#16a34a" },
  { key: "PENDING_APPROVAL", label: "Pending approval", color: "#5563b0" },
  { key: "APPROVED", label: "Approved", color: "#22c55e" },
  { key: "DRAFT", label: "Draft", color: "#7c8ac8" },
  { key: "CLOSED", label: "Closed", color: "#ef4444" },
];
const CHIP = {
  PUBLISHED: "bg-green-50 text-green-700",
  PENDING_APPROVAL: "bg-primary-50 text-primary-700",
  APPROVED: "bg-green-50 text-green-700",
  DRAFT: "bg-primary-50 text-primary-700",
  CLOSED: "bg-red-50 text-red-600",
  SHORTLISTED: "bg-primary-100 text-primary-800",
  REJECTED: "bg-red-50 text-red-600",
  SCHEDULED: "bg-primary-50 text-primary-700",
  COMPLETED: "bg-green-50 text-green-700",
  CANCELLED: "bg-slate-100 text-slate-600",
  ACCEPTED: "bg-green-50 text-green-700",
  SENT: "bg-primary-50 text-primary-700",
};

/* ===========================================================================
 * Building blocks
 * ========================================================================= */
const Card = ({ children, className = "", style, ...props }) => (
  <section
    style={style}
    {...props}
    className={`h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
  >
    {children}
  </section>
);

const CardHead = ({ title, subtitle, right }) => (
  <div className="flex items-start justify-between gap-3">
    <div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {right}
  </div>
);

const Empty = ({ text }) => (
  <div className="flex min-h-36 flex-col items-center justify-center px-5 py-8 text-center">
    <Calendar className="mb-2 text-slate-400" size={24} strokeWidth={1.75} />
    <p className="text-sm text-slate-500">{text}</p>
    <p className="mt-1 text-xs text-slate-400">Check back for updates.</p>
  </div>
);

const Skeleton = ({ rows = 3 }) => (
  <div className="space-y-3 py-5">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
    ))}
  </div>
);

const Chip = ({ status }) => (
  <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${CHIP[status] || "bg-slate-100 text-slate-600"}`}>
    {pretty(status) || "unknown"}
  </span>
);

const Avatar = ({ name }) => (
  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColorClass(name)}`}>
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

const KpiCard = ({
  icon: Icon,
  label,
  value,
  metric,
  gradient = "bg-gradient-to-br from-primary-600 to-primary-700",
  footnote,
  loading,
}) => {
  const positive = metric?.delta >= 0;

  return (
    <Card className={`group relative overflow-hidden border-0 ${gradient} p-5 text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-md`}>
      <div className="relative flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-white">
          <Icon size={21} />
        </div>

        {metric && (
          <Sparkline
            data={metric.spark}
            color="rgba(255,255,255,0.6)"
          />
        )}
      </div>

      <div className="relative mt-4">
        <p className="text-3xl font-bold text-white tabular-nums">
          {loading ? "—" : value ?? 0}
        </p>

        <p className="mt-1 text-xs font-semibold text-white/85">
          {label}
        </p>
      </div>

      <div className="relative mt-4 flex min-h-6 items-center justify-between text-xs">
        {metric ? (
          metric.delta === null ? (
            <span className="text-[11px] text-white/80">
              {metric.current
                ? "No previous period data"
                : "No activity in this period"}
            </span>
          ) : (
            <div className="flex items-center gap-1.5 w-full justify-between">
              <span
                className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white"
              >
                {positive ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {positive ? "+" : ""}
                {metric.delta}%
              </span>
              <span className="text-[11px] font-normal text-white/80">
                vs previous period
              </span>
            </div>
          )
        ) : (
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-medium text-white/80">Status</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white">
              {footnote || "Active"}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};


const TrendChart = ({ series, labels }) => {
  const W = 600, H = 180, pad = 10;
  const max = Math.max(1, ...series.flatMap((s) => s.data));
  const n = labels.length;
  const x = (i) => (i * W) / Math.max(1, n - 1);
  const y = (v) => H - pad - (v / max) * (H - pad * 2);
  const line = (d) => d.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <div className="pt-4">
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
    <div className="flex items-center gap-5 pt-4">
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
    <ul className="space-y-3 pt-4">
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
    <ul className="space-y-3.5 pt-4">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="truncate pr-2 text-slate-600">{d.label}</span>
            <span className="font-semibold text-slate-900">{d.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-primary-600" style={{ width: `${(d.value / max) * 100}%` }} />
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

  const effective = useMemo(
    () =>
      access ||
      (storedUser.role === "ADMIN"
        ? {
          fullAccess: true,
          permissions: [],
        }
        : null),
    [access, storedUser.role]
  );

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

  const apps = useMemo(() => applications.data || [], [applications.data]);
  const ivs = useMemo(() => interviews.data || [], [interviews.data]);
  const ofs = useMemo(() => offers.data || [], [offers.data]);
  const vacs = useMemo(() => vacancies.data || [], [vacancies.data]);

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
    has("VACANCY_APPROVE") && canVacancies && { label: "to approve", value: vacancyCounts.PENDING_APPROVAL || 0, filter: "PENDING_APPROVAL", icon: CheckCircle2 },
    has("VACANCY_PUBLISH") && canVacancies && { label: "ready to publish", value: vacancyCounts.APPROVED || 0, filter: "APPROVED", icon: Send },
    has("VACANCY_CREATE") && canVacancies && { label: "drafts", value: vacancyCounts.DRAFT || 0, filter: "DRAFT", icon: PencilLine },
  ].filter(Boolean);

  const funnel = [
    canApplications && { label: "Applications", value: m.apps.current, color: "#5563b0" },
    canApplications && { label: "Shortlisted", value: m.shortlisted.current, color: "#7c8ac8" },
    canInterviewsAll && { label: "Interviews", value: m.interviews.current, color: "#34407d" },
    canOffers && { label: "Offers", value: m.offers.current, color: "#1b2142" },
  ].filter(Boolean);

  const firstName = (storedUser.fullName || "").split(" ")[0];

  return (
    <PageLayout role="recruiter" activePage="Overview" title="Recruitment Dashboard" subtitle="Hiring activity and performance">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Greeting */}
        <GreetingCard
          name={firstName}
          date={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          attention={attention}
          onChipClick={(item) => {
            setVacancyFilter(item.filter);
            vacancyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          controls={
            <>
              <div role="group" aria-label="Date range" className="flex rounded-xl border border-slate-200 bg-white/80 p-1 backdrop-blur">
                {RANGES.map((r) => (
                  <button
                    key={r.days}
                    type="button"
                    aria-pressed={days === r.days}
                    onClick={() => setDays(r.days)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${days === r.days ? "bg-primary-600 text-white shadow-sm" : "text-slate-500 hover:bg-white hover:text-slate-800"}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={reloadAll} aria-label="Refresh data" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800">
                <RefreshCw size={16} />
              </button>
            </>
          }
        />

        {!ready && <Card><Skeleton rows={4} /></Card>}

        {ready && !anything && (
          <Card className="flex flex-col items-center gap-2 p-10 text-center">
            <Lock className="text-slate-400" size={28} />
            <h3 className="font-semibold text-slate-900">No recruitment data available</h3>
            <p className="max-w-sm text-sm text-slate-500">Your recruitment roles do not include a view that applies here. Ask an HR Manager to update your roles.</p>
          </Card>
        )}

        {/* KPIs */}
        {anything && (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {canVacancies && (
              <KpiCard icon={BriefcaseBusiness} label="Open vacancies"
                value={vacancies.loading ? "-" : vacancyCounts.PUBLISHED || 0}
                gradient="bg-gradient-to-br from-primary-600 to-primary-700"
                footnote={`${vacancyCounts.PENDING_APPROVAL || 0} pending approval`} />
            )}
            {canApplications && (
              <KpiCard icon={FileText} label="Applications"
                value={applications.loading ? "-" : m.apps.current} metric={m.apps}
                gradient="bg-gradient-to-br from-primary-700 to-primary-800" />
            )}
            {canApplications && (
              <KpiCard icon={Users} label="Shortlisted"
                value={applications.loading ? "-" : m.shortlisted.current} metric={m.shortlisted}
                gradient="bg-gradient-to-br from-primary-800 to-primary-900" />
            )}
            {canInterviews && (
              <KpiCard icon={CalendarDays} label={canInterviewsMine ? "My interviews" : "Interviews"}
                value={interviews.loading ? "-" : m.interviews.current} metric={m.interviews}
                gradient="bg-gradient-to-br from-primary-600 to-primary-700" />
            )}
            {canOffers && (
              <KpiCard icon={Handshake} label="Offers"
                value={offers.loading ? "-" : m.offers.current} metric={m.offers}
                gradient="bg-gradient-to-br from-primary-700 to-primary-800" />
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
                    { name: "Applications", color: "#5563b0", data: m.apps.spark },
                    { name: "Shortlisted", color: "#94a3b8", data: m.shortlisted.spark },
                  ]} />
                )}
              </Card>
            )}
            {canInterviews && (
              <Card className={canApplications ? "lg:col-span-4" : "lg:col-span-12"}>
                <CardHead title="Upcoming interviews" subtitle="Next 7 days" />
                {interviews.loading ? <Skeleton /> : interviews.error ? <Empty text={interviews.error} /> : agenda.length === 0 ? <Empty text="Nothing scheduled this week." /> : (
                  <ul className="mt-3 divide-y divide-slate-100">
                    {agenda.map(({ i, t }) => {
                      const hasTime = String(i.scheduledAt || i.interviewDate || i.date).includes("T");
                      const time = i.interviewTime || i.startTime || (hasTime ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");
                      return (
                        <li key={i.id} className="flex items-center gap-3 py-3">
                          <div className="w-[72px] shrink-0">
                            <p className={`text-xs font-semibold ${dayLabel(t) === "Today" ? "text-primary-600" : "text-slate-500"}`}>{dayLabel(t)}</p>
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
                  <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <th className="whitespace-nowrap px-5 py-2.5 font-medium">Candidate</th>
                          <th className="whitespace-nowrap px-3 py-2.5 font-medium">Vacancy</th>
                          <th className="whitespace-nowrap px-3 py-2.5 font-medium">Status</th>
                          <th className="whitespace-nowrap px-5 py-2.5 text-right font-medium">Applied</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentApps.map((a) => (
                          <tr key={a.id}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar name={personName(a)} />
                                <span className="whitespace-nowrap font-medium text-slate-900">{personName(a)}</span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-slate-600">{vacancyName(a)}</td>
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
                <ol className="mt-4 space-y-4">
                  {[...activity.data].sort((a, b) => (actTime(b) || 0) - (actTime(a) || 0)).slice(0, 7).map((a, idx) => (
                    <li key={a.id ?? idx} className="flex gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
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
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <th className="whitespace-nowrap px-5 py-2.5 font-medium">Vacancy</th>
                      <th className="whitespace-nowrap px-3 py-2.5 font-medium">Status</th>
                      <th className="whitespace-nowrap px-3 py-2.5 font-medium">Applicants</th>
                      <th className="whitespace-nowrap px-5 py-2.5 text-right font-medium">Deadline</th>
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
