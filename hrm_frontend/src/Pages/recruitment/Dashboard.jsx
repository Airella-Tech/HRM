
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Sparkles,
  UserRound,
  CalendarCheck,
  Activity,
  Target,
  Building2,
} from "lucide-react";

import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";
import { useRecruitmentAccess } from "../../utils/useRecruitmentAccess";

/* =========================================================================
   PERMISSIONS
========================================================================= */

const P = {
  vacancies: [
    "VACANCY_CREATE",
    "VACANCY_APPROVE",
    "VACANCY_PUBLISH",
  ],
  applications: [
    "APPLICATION_VIEW",
    "APPLICATION_SCREEN",
    "APPLICATION_SHORTLIST",
  ],
  interviewsAll: [
    "INTERVIEW_SCHEDULE",
    "INTERVIEW_ASSIGN",
    "INTERVIEW_PROGRESS_VIEW",
    "INTERVIEW_DECIDE",
  ],
  interviewsMine: ["INTERVIEW_EVALUATE"],
  offers: ["OFFER_MANAGE"],
};

const DAY = 86400000;

const RANGES = [
  { days: 7, label: "7 Days", buckets: 7 },
  { days: 30, label: "30 Days", buckets: 10 },
  { days: 90, label: "90 Days", buckets: 12 },
];

/* =========================================================================
   HELPERS
========================================================================= */

const ts = (value) => {
  if (!value) return null;

  const result = new Date(value).getTime();

  return Number.isNaN(result) ? null : result;
};

const appTime = (a) =>
  ts(a.appliedAt || a.createdAt || a.submittedAt);

const ivTime = (i) =>
  ts(i.scheduledAt || i.interviewDate || i.date);

const offerTime = (o) =>
  ts(o.createdAt || o.sentAt || o.offerDate);

const actTime = (a) =>
  ts(a.createdAt || a.timestamp || a.performedAt || a.time);

const pretty = (value) =>
  value
    ? String(value).replace(/_/g, " ").toLowerCase()
    : "";

const personName = (item) =>
  item.candidateName ||
  item.fullName ||
  item.candidate?.fullName ||
  item.candidate?.name ||
  "Candidate";

const vacancyName = (item) =>
  item.vacancyTitle ||
  item.jobTitle ||
  item.vacancy?.title ||
  item.position ||
  "Vacancy";

const fmtDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

const ago = (value) => {
  if (!value) return "";

  const minutes = Math.floor(
    (Date.now() - value) / 60000
  );

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);

  return days < 7
    ? `${days}d ago`
    : fmtDate(value);
};

const countBy = (list, pick) => {
  const counts = {};

  list.forEach((item) => {
    const key = pick(item);

    if (key) {
      counts[key] = (counts[key] || 0) + 1;
    }
  });

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
};

const buildMetric = (items, getTime, days, buckets) => {
  const now = Date.now();
  const start = now - days * DAY;
  const previousStart = start - days * DAY;

  const spark = Array(buckets).fill(0);

  let current = 0;
  let previous = 0;

  items.forEach((item) => {
    const time = getTime(item);

    if (time == null) return;

    if (time >= start && time <= now) {
      current++;

      const index = Math.min(
        buckets - 1,
        Math.floor(
          ((time - start) / (days * DAY)) * buckets
        )
      );

      spark[index]++;
    } else if (
      time >= previousStart &&
      time < start
    ) {
      previous++;
    }
  });

  const delta = previous
    ? Math.round(((current - previous) / previous) * 100)
    : null;

  return {
    current,
    previous,
    delta,
    spark,
  };
};

/* =========================================================================
   DATA FETCHING
========================================================================= */

const useList = (enabled, fetcher) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setError("");
      return;
    }

    let cancelled = false;

    setData(null);
    setError("");

    fetcher()
      .then((response) => {
        if (cancelled) return;

        setData(
          Array.isArray(response?.data)
            ? response.data
            : []
        );
      })
      .catch((err) => {
        if (cancelled) return;

        setData([]);
        setError(
          err?.message || "Unable to load data."
        );
      });

    return () => {
      cancelled = true;
    };

    // Fetch again only when enabled state or refresh changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tick]);

  return {
    data,
    error,
    loading: data === null,
    reload: () => setTick((value) => value + 1),
  };
};

/* =========================================================================
   DESIGN TOKENS
========================================================================= */

const VACANCY_STATUS = [
  {
    key: "PUBLISHED",
    label: "Published",
    color: "#6366f1",
  },
  {
    key: "PENDING_APPROVAL",
    label: "Pending approval",
    color: "#f59e0b",
  },
  {
    key: "APPROVED",
    label: "Approved",
    color: "#10b981",
  },
  {
    key: "DRAFT",
    label: "Draft",
    color: "#0ea5e9",
  },
  {
    key: "CLOSED",
    label: "Closed",
    color: "#94a3b8",
  },
];

const STATUS_STYLES = {
  PUBLISHED: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700 ring-amber-100",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  DRAFT: "bg-sky-50 text-sky-700 ring-sky-100",
  CLOSED: "bg-slate-100 text-slate-600 ring-slate-200",
  SHORTLISTED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  REJECTED: "bg-red-50 text-red-600 ring-red-100",
  SCHEDULED: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
  ACCEPTED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  SENT: "bg-sky-50 text-sky-700 ring-sky-100",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-100",
};

const AVATAR_STYLES = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
];

const avatarTone = (name = "?") =>
  AVATAR_STYLES[
    name.charCodeAt(0) % AVATAR_STYLES.length
  ];

/* =========================================================================
   REUSABLE COMPONENTS
========================================================================= */

const Card = ({ children, className = "" }) => (
  <section
    className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.035)] ${className}`}
  >
    {children}
  </section>
);

const CardHead = ({
  title,
  subtitle,
  right,
  icon: Icon,
}) => (
  <div className="flex items-center justify-between gap-3 px-5 pt-5">
    <div className="flex min-w-0 items-center gap-3">
      {Icon && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon size={17} />
        </div>
      )}

      <div className="min-w-0">
        <h3 className="text-sm font-bold text-slate-900">
          {title}
        </h3>

        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-500">
            {subtitle}
          </p>
        )}
      </div>
    </div>

    {right}
  </div>
);

const Empty = ({ text }) => (
  <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
      <FileText size={20} />
    </div>

    <p className="text-sm text-slate-500">
      {text}
    </p>
  </div>
);

const ErrorMessage = ({ text, onRetry }) => (
  <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
    <CircleAlert size={22} className="text-red-400" />

    <p className="text-sm text-red-600">{text}</p>

    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 text-xs font-semibold text-indigo-600 hover:underline"
      >
        Try again
      </button>
    )}
  </div>
);

const Skeleton = ({ rows = 3 }) => (
  <div className="space-y-3 p-5">
    {Array.from({ length: rows }).map((_, index) => (
      <div
        key={index}
        className="h-10 animate-pulse rounded-xl bg-slate-100"
      />
    ))}
  </div>
);

const Chip = ({ status }) => (
  <span
    className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ring-inset ${
      STATUS_STYLES[status] ||
      "bg-slate-100 text-slate-600 ring-slate-200"
    }`}
  >
    {pretty(status) || "Unknown"}
  </span>
);

const Avatar = ({ name }) => (
  <span
    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarTone(name)}`}
  >
    {(name || "?").charAt(0).toUpperCase()}
  </span>
);

/* =========================================================================
   SPARKLINE
========================================================================= */

const Sparkline = ({ data, color }) => {
  const max = Math.max(1, ...data);
  const width = 90;
  const height = 34;

  const points = data
    .map((value, index) => {
      const x =
        (index * width) / Math.max(1, data.length - 1);

      const y =
        height - 4 - (value / max) * (height - 9);

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-9 w-[90px]"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/* =========================================================================
   KPI CARD
========================================================================= */

const KpiCard = ({
  icon: Icon,
  label,
  value,
  metric,
  color,
  tone,
  footnote,
  loading,
}) => {
  const positive = metric?.delta >= 0;

  return (
    <Card className="group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div
        className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.07] transition-transform duration-300 group-hover:scale-125"
        style={{ backgroundColor: color }}
      />

      <div className="relative flex items-center justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}
        >
          <Icon size={21} />
        </div>

        {metric && (
          <Sparkline
            data={metric.spark}
            color={color}
          />
        )}
      </div>

      <div className="relative mt-5">
        <p className="text-3xl font-extrabold tracking-tight text-slate-900">
          {loading ? "—" : value ?? 0}
        </p>

        <p className="mt-1 text-sm font-medium text-slate-500">
          {label}
        </p>
      </div>

      <div className="relative mt-4 flex min-h-6 items-center border-t border-slate-100 pt-3">
        {metric ? (
          metric.delta === null ? (
            <span className="text-xs text-slate-400">
              {metric.current
                ? "No previous period data"
                : "No activity in this period"}
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold ${
                positive
                  ? "text-emerald-600"
                  : "text-red-500"
              }`}
            >
              {positive ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}

              {positive ? "+" : ""}
              {metric.delta}%

              <span className="font-normal text-slate-400">
                vs previous period
              </span>
            </span>
          )
        ) : (
          <span className="text-xs text-slate-400">
            {footnote}
          </span>
        )}
      </div>
    </Card>
  );
};

/* =========================================================================
   TREND CHART
========================================================================= */

const TrendChart = ({ series, labels }) => {
  const width = 600;
  const height = 190;
  const padding = 12;

  const max = Math.max(
    1,
    ...series.flatMap((item) => item.data)
  );

  const x = (index) =>
    (index * width) / Math.max(1, labels.length - 1);

  const y = (value) =>
    height -
    padding -
    (value / max) * (height - padding * 2);

  const line = (data) =>
    data
      .map(
        (value, index) =>
          `${index ? "L" : "M"}${x(index)},${y(value)}`
      )
      .join(" ");

  return (
    <div className="px-5 pb-5 pt-5">
      <div className="flex gap-3">
        <div className="flex flex-col justify-between py-1 text-[10px] text-slate-400">
          <span>{max}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-48 w-full overflow-visible"
          preserveAspectRatio="none"
          role="img"
          aria-label="Recruitment activity trend chart"
        >
          {[0, 0.5, 1].map((value) => {
            const lineY =
              padding + value * (height - padding * 2);

            return (
              <line
                key={value}
                x1="0"
                x2={width}
                y1={lineY}
                y2={lineY}
                stroke="#e9edf5"
                strokeDasharray="4 5"
              />
            );
          })}

          {series.map((item, index) => (
            <g key={item.name}>
              {index === 0 && (
                <path
                  d={`${line(item.data)} L${width},${height} L0,${height} Z`}
                  fill={item.color}
                  opacity="0.07"
                />
              )}

              <path
                d={line(item.data)}
                fill="none"
                stroke={item.color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              {item.data.map((value, pointIndex) => (
                <circle
                  key={pointIndex}
                  cx={x(pointIndex)}
                  cy={y(value)}
                  r="3.5"
                  fill="white"
                  stroke={item.color}
                  strokeWidth="2"
                >
                  <title>
                    {`${item.name}: ${value}`}
                  </title>
                </circle>
              ))}
            </g>
          ))}
        </svg>
      </div>

      <div className="ml-8 mt-2 flex justify-between text-[10px] text-slate-400">
        <span>{labels[0]}</span>
        <span>{labels[Math.floor(labels.length / 2)]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>

      <div className="ml-8 mt-5 flex flex-wrap gap-x-6 gap-y-2">
        {series.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-2 text-xs text-slate-500"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />

            {item.name}

            <span className="font-bold text-slate-900">
              {item.data.reduce((a, b) => a + b, 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* =========================================================================
   DONUT CHART
========================================================================= */

const Donut = ({ data, label }) => {
  const total = data.reduce(
    (sum, item) => sum + item.value,
    0
  );

  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  if (!total) {
    return <Empty text="No vacancy data available yet." />;
  }

  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 px-5 pb-6 pt-5 sm:flex-row">
      <div className="relative h-36 w-36 shrink-0">
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label={label}
        >
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="11"
          />

          {data.map((item) => {
            if (!item.value) return null;

            const length =
              (item.value / total) * circumference;

            const currentOffset = offset;
            offset += length;

            return (
              <circle
                key={item.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="11"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-currentOffset}
                strokeLinecap="butt"
              >
                <title>
                  {`${item.name}: ${item.value}`}
                </title>
              </circle>
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-slate-900">
            {total}
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            Vacancies
          </span>
        </div>
      </div>

      <div className="w-full min-w-0 flex-1 space-y-3">
        {data.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 text-xs"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />

            <span className="min-w-0 flex-1 truncate text-slate-500">
              {item.name}
            </span>

            <span className="font-bold text-slate-900">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* =========================================================================
   HIRING FUNNEL
========================================================================= */

const Funnel = ({ steps }) => {
  const top = Math.max(
    1,
    steps[0]?.value || 1
  );

  return (
    <div className="space-y-5 px-5 pb-6 pt-5">
      {steps.map((step, index) => {
        const previous = index
          ? steps[index - 1].value
          : null;

        const percentage =
          previous > 0
            ? Math.round((step.value / previous) * 100)
            : null;

        const width = Math.max(
          2,
          (step.value / top) * 100
        );

        return (
          <div key={step.label}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">
                {step.label}
              </span>

              <div className="flex items-center gap-3">
                {percentage !== null && (
                  <span className="text-[10px] text-slate-400">
                    {percentage}% conversion
                  </span>
                )}

                <span className="text-sm font-bold text-slate-900">
                  {step.value}
                </span>
              </div>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${width}%`,
                  backgroundColor: step.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* =========================================================================
   TOP VACANCIES
========================================================================= */

const BarList = ({ data }) => {
  const max = Math.max(
    1,
    ...data.map((item) => item.value)
  );

  if (!data.length) {
    return <Empty text="No applications in this period." />;
  }

  return (
    <div className="space-y-5 px-5 pb-6 pt-5">
      {data.map((item, index) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-[10px] font-bold text-indigo-600">
                {index + 1}
              </span>

              <span className="truncate text-xs font-medium text-slate-600">
                {item.label}
              </span>
            </div>

            <span className="text-xs font-bold text-slate-900">
              {item.value}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
              style={{
                width: `${(item.value / max) * 100}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

/* =========================================================================
   ROLE-BASED WORKSPACE BANNER
========================================================================= */

const WorkspaceBanner = ({
  eyebrow,
  title,
  description,
}) => (
  <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-[#202b59] via-[#303f83] to-[#5045a5] px-6 py-8 text-white shadow-lg shadow-indigo-950/10 sm:px-9 sm:py-10">
    {/* Background decoration */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full border-[35px] border-white/[0.06]"
    />

    <div
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-36 right-48 h-72 w-72 rounded-full border-[30px] border-white/[0.05]"
    />

    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-20 top-10 h-28 w-28 rounded-full bg-indigo-300/10 blur-3xl"
    />

    <div className="relative z-10 max-w-3xl">
      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 backdrop-blur-sm">
        <Sparkles size={13} className="text-amber-300" />

        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-100">
          {eyebrow}
        </span>
      </div>

      <h2 className="max-w-2xl text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
        {title}
      </h2>

      <p className="mt-4 max-w-2xl text-sm leading-7 text-indigo-100 sm:text-base">
        {description}
      </p>

      <div className="mt-6 flex items-center gap-2 text-xs font-medium text-indigo-200">
        <CheckCircle2 size={15} />
        Recruitment workspace
      </div>
    </div>

    <div className="absolute bottom-7 right-9 hidden h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/10 backdrop-blur-md lg:flex">
      <Building2 size={42} className="text-white/80" />
    </div>
  </section>
);

/* =========================================================================
   SECTION LABEL
========================================================================= */

const SectionLabel = ({ children }) => (
  <div className="flex items-center gap-2">
    <span className="h-5 w-1 rounded-full bg-indigo-500" />
    <h2 className="text-sm font-bold text-slate-800">
      {children}
    </h2>
  </div>
);

/* =========================================================================
   DASHBOARD
========================================================================= */

const Dashboard = () => {
  const access = useRecruitmentAccess();

  let storedUser = {};

  try {
    storedUser = JSON.parse(
      localStorage.getItem("user") || "{}"
    );
  } catch {
    storedUser = {};
  }

  const effective =
    access ||
    (storedUser.role === "ADMIN"
      ? {
          fullAccess: true,
          permissions: [],
        }
      : null);

  const ready = Boolean(effective);
  const full = Boolean(effective?.fullAccess);

  const permSet = useMemo(
    () => new Set(effective?.permissions || []),
    [effective]
  );

  const has = (...codes) =>
    full || codes.some((code) => permSet.has(code));

  const canVacancies =
    ready && has(...P.vacancies);

  const canApplications =
    ready && has(...P.applications);

  const canInterviewsAll =
    ready && has(...P.interviewsAll);

  const canInterviewsMine =
    ready &&
    !canInterviewsAll &&
    has(...P.interviewsMine);

  const canInterviews =
    canInterviewsAll || canInterviewsMine;

  const canOffers =
    ready && has(...P.offers);

  const anything =
    canVacancies ||
    canApplications ||
    canInterviews ||
    canOffers;

  /* -----------------------------------------------------------------------
     ROLE-BASED WELCOME CONTENT
  ----------------------------------------------------------------------- */

  const workspaceInfo = !ready
    ? null
    : full
      ? {
          eyebrow: "HR MANAGEMENT WORKSPACE",
          title: "Manage your people and recruitment in one place.",
          description:
            "Oversee vacancies, candidate applications, interviews, job offers, and recruitment activities across your organization.",
        }
      : canInterviewsMine && !canInterviewsAll
        ? {
            eyebrow: "INTERVIEWER WORKSPACE",
            title: "Help us find the right talent.",
            description:
              "Review your assigned candidates, participate in interviews, evaluate candidate performance, and submit your feedback.",
          }
        : canVacancies &&
            canApplications &&
            canInterviewsAll &&
            canOffers
          ? {
              eyebrow: "RECRUITMENT MANAGER WORKSPACE",
              title: "Build your team with the right talent.",
              description:
                "Manage the complete hiring journey, monitor recruitment progress, coordinate interviews, and oversee job offers.",
            }
          : canApplications && canInterviewsAll
            ? {
                eyebrow: "RECRUITMENT OFFICER WORKSPACE",
                title: "Find the right people for your team.",
                description:
                  "Review candidate applications, shortlist potential employees, coordinate interviews, and support the hiring process.",
              }
            : canApplications
              ? {
                  eyebrow: "APPLICATION REVIEW WORKSPACE",
                  title: "Discover the next great addition to your team.",
                  description:
                    "Review candidate applications, assess qualifications, and identify promising candidates for your organization.",
                }
              : canVacancies && has("VACANCY_APPROVE")
                ? {
                    eyebrow: "RECRUITMENT APPROVAL WORKSPACE",
                    title: "Keep your recruitment process moving forward.",
                    description:
                      "Review vacancy requests, approve recruitment opportunities, and manage the publication of job openings.",
                  }
                : canVacancies
                  ? {
                      eyebrow: "VACANCY MANAGEMENT WORKSPACE",
                      title: "Create opportunities to find great talent.",
                      description:
                        "Create and manage job vacancies, define recruitment requirements, and help attract the right candidates.",
                    }
                  : canOffers
                    ? {
                        eyebrow: "JOB OFFER WORKSPACE",
                        title: "Welcome your next team member.",
                        description:
                          "Manage job offers, communicate hiring decisions, and support candidates through the final stage of recruitment.",
                      }
                    : canInterviews
                      ? {
                          eyebrow: "INTERVIEW WORKSPACE",
                          title: "Make every interview count.",
                          description:
                            "Coordinate interview activities, review candidate progress, and help your team make informed hiring decisions.",
                        }
                      : null;

  /* -----------------------------------------------------------------------
     API DATA
  ----------------------------------------------------------------------- */

  const vacancies = useList(
    canVacancies,
    () => recruitmentApi.getVacancies()
  );

  const applications = useList(
    canApplications,
    () => recruitmentApi.getApplications()
  );

  const interviews = useList(
    canInterviews,
    () =>
      canInterviewsAll
        ? recruitmentApi.getInterviews()
        : recruitmentApi.getMyAssignedInterviews()
  );

  const offers = useList(
    canOffers,
    () => recruitmentApi.getJobOffers()
  );

  const activity = useList(
    ready && anything,
    () =>
      full
        ? recruitmentApi.getAuditLogs()
        : recruitmentApi.getNotifications()
  );

  const reloadAll = () => {
    [
      vacancies,
      applications,
      interviews,
      offers,
      activity,
    ].forEach((item) => item.reload());
  };

  /* -----------------------------------------------------------------------
     FILTERS
  ----------------------------------------------------------------------- */

  const [days, setDays] = useState(30);
  const [vacancyFilter, setVacancyFilter] =
    useState("ALL");

  const vacancyRef = useRef(null);

  const range =
    RANGES.find((item) => item.days === days) ||
    RANGES[1];

  const apps = applications.data || [];
  const ivs = interviews.data || [];
  const ofs = offers.data || [];
  const vacs = vacancies.data || [];

  /* -----------------------------------------------------------------------
     METRICS
  ----------------------------------------------------------------------- */

  const metrics = useMemo(() => {
    const shortlistedApps = apps.filter(
      (item) => item.status === "SHORTLISTED"
    );

    const acceptedOffers = ofs.filter(
      (item) => item.status === "ACCEPTED"
    ).length;

    return {
      apps: buildMetric(
        apps,
        appTime,
        days,
        range.buckets
      ),

      shortlisted: buildMetric(
        shortlistedApps,
        appTime,
        days,
        range.buckets
      ),

      interviews: buildMetric(
        ivs,
        ivTime,
        days,
        range.buckets
      ),

      offers: buildMetric(
        ofs,
        offerTime,
        days,
        range.buckets
      ),

      acceptRate: ofs.length
        ? Math.round(
            (acceptedOffers / ofs.length) * 100
          )
        : null,
    };
  }, [apps, ivs, ofs, days, range.buckets]);

  const vacancyCounts = useMemo(() => {
    const counts = {};

    vacs.forEach((item) => {
      counts[item.status] =
        (counts[item.status] || 0) + 1;
    });

    return counts;
  }, [vacs]);

  /* -----------------------------------------------------------------------
     CHART LABELS
  ----------------------------------------------------------------------- */

  const labels = useMemo(() => {
    const start = Date.now() - days * DAY;

    return Array.from(
      { length: range.buckets },
      (_, index) =>
        new Date(
          start +
            ((index + 0.5) / range.buckets) *
              days *
              DAY
        ).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
        })
    );
  }, [days, range.buckets]);

  /* -----------------------------------------------------------------------
     TOP VACANCIES
  ----------------------------------------------------------------------- */

  const topVacancies = useMemo(() => {
    const start = Date.now() - days * DAY;

    return countBy(
      apps.filter((item) => {
        const time = appTime(item);
        return time !== null && time >= start && time <= Date.now();
      }),
      vacancyName
    ).slice(0, 5);
  }, [apps, days]);

  /* -----------------------------------------------------------------------
     UPCOMING INTERVIEWS
  ----------------------------------------------------------------------- */

  const agenda = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);

    return ivs
      .map((item) => ({
        item,
        time: ivTime(item),
      }))
      .filter(({ item, time }) => {
        return (
          time !== null &&
          time >= today &&
          time < today + 8 * DAY &&
          !["COMPLETED", "CANCELLED"].includes(
            item.status
          )
        );
      })
      .sort((a, b) => a.time - b.time)
      .slice(0, 6);
  }, [ivs]);

  const dayLabel = (time) => {
    const today = new Date().setHours(0, 0, 0, 0);

    const interviewDay = new Date(time).setHours(
      0,
      0,
      0,
      0
    );

    const difference = Math.floor(
      (interviewDay - today) / DAY
    );

    if (difference === 0) return "Today";
    if (difference === 1) return "Tomorrow";

    return new Date(time).toLocaleDateString(
      undefined,
      {
        weekday: "short",
        day: "numeric",
        month: "short",
      }
    );
  };

  /* -----------------------------------------------------------------------
     RECENT APPLICATIONS
  ----------------------------------------------------------------------- */

  const recentApps = useMemo(
    () =>
      [...apps]
        .sort(
          (a, b) =>
            (appTime(b) || 0) -
            (appTime(a) || 0)
        )
        .slice(0, 6),
    [apps]
  );

  /* -----------------------------------------------------------------------
     APPLICANTS PER VACANCY
  ----------------------------------------------------------------------- */

  const applicantsByVacancy = useMemo(() => {
    const byId = {};
    const byTitle = {};

    apps.forEach((item) => {
      const id =
        item.vacancyId ?? item.vacancy?.id;

      if (id != null) {
        byId[id] = (byId[id] || 0) + 1;
      }

      const title = vacancyName(item);

      byTitle[title] = (byTitle[title] || 0) + 1;
    });

    return (vacancy) =>
      byId[vacancy.id] ??
      byTitle[vacancy.title || vacancy.jobTitle] ??
      0;
  }, [apps]);

  const filteredVacancies = vacs
    .filter(
      (item) =>
        vacancyFilter === "ALL" ||
        item.status === vacancyFilter
    )
    .slice(0, 8);

  /* -----------------------------------------------------------------------
     ATTENTION ITEMS
  ----------------------------------------------------------------------- */

  const attention = [
    has("VACANCY_APPROVE") &&
      canVacancies && {
        label: "Pending approvals",
        value: vacancyCounts.PENDING_APPROVAL || 0,
        filter: "PENDING_APPROVAL",
      },

    has("VACANCY_PUBLISH") &&
      canVacancies && {
        label: "Ready to publish",
        value: vacancyCounts.APPROVED || 0,
        filter: "APPROVED",
      },

    has("VACANCY_CREATE") &&
      canVacancies && {
        label: "Draft vacancies",
        value: vacancyCounts.DRAFT || 0,
        filter: "DRAFT",
      },
  ].filter(Boolean);

  /* -----------------------------------------------------------------------
     HIRING FUNNEL
  ----------------------------------------------------------------------- */

  const funnel = [
    canApplications && {
      label: "Applications",
      value: metrics.apps.current,
      color: "#6366f1",
    },

    canApplications && {
      label: "Shortlisted",
      value: metrics.shortlisted.current,
      color: "#0ea5e9",
    },

    canInterviewsAll && {
      label: "Interviews",
      value: metrics.interviews.current,
      color: "#8b5cf6",
    },

    canOffers && {
      label: "Offers",
      value: metrics.offers.current,
      color: "#10b981",
    },
  ].filter(Boolean);

  /* -----------------------------------------------------------------------
     HEADER
  ----------------------------------------------------------------------- */

  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 18
        ? "Good afternoon"
        : "Good evening";

  const firstName = (
    storedUser.fullName ||
    storedUser.name ||
    ""
  ).split(" ")[0];

  const currentDate = new Date().toLocaleDateString(
    undefined,
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  /* -----------------------------------------------------------------------
     RENDER
  ----------------------------------------------------------------------- */

  return (
    <PageLayout
      role="recruiter"
      activePage="Overview"
      title="Recruitment Dashboard"
      subtitle="Hiring activity and performance"
    >
      <div className="mx-auto max-w-[1500px] space-y-7 pb-8">

        {/* ===============================================================
            PAGE HEADER
        =============================================================== */}

        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />

              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Recruitment overview
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {greeting}
              {firstName ? `, ${firstName}` : ""}!
            </h1>

            <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays size={15} />
              {currentDate}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Dashboard date range"
              className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
            >
              {RANGES.map((item) => (
                <button
                  key={item.days}
                  type="button"
                  aria-pressed={days === item.days}
                  onClick={() => setDays(item.days)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                    days === item.days
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={reloadAll}
              aria-label="Refresh dashboard data"
              title="Refresh dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* ===============================================================
            ROLE-BASED WELCOME BANNER
        =============================================================== */}

        {ready && anything && workspaceInfo && (
          <WorkspaceBanner
            eyebrow={workspaceInfo.eyebrow}
            title={workspaceInfo.title}
            description={workspaceInfo.description}
          />
        )}

        {!ready && (
          <Card>
            <Skeleton rows={4} />
          </Card>
        )}

        {ready && !anything && (
          <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Lock size={25} className="text-slate-400" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              No recruitment access
            </h3>

            <p className="max-w-md text-sm leading-6 text-slate-500">
              Your assigned recruitment roles do not
              include access to dashboard information.
              Please contact an HR Manager to update
              your permissions.
            </p>
          </Card>
        )}

        {ready && anything && (
          <>
            {/* =========================================================
                NEEDS ATTENTION
            ========================================================= */}

            {attention.some((item) => item.value > 0) && (
              <Card className="border-amber-200 bg-gradient-to-r from-amber-50/80 to-white p-4 shadow-none">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <Clock3 size={19} />
                  </div>

                  <div className="mr-auto">
                    <p className="text-sm font-bold text-slate-900">
                      Needs your attention
                    </p>

                    <p className="text-xs text-slate-500">
                      Some recruitment activities require action.
                    </p>
                  </div>

                  {attention
                    .filter((item) => item.value > 0)
                    .map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setVacancyFilter(item.filter);

                          vacancyRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }}
                        className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                      >
                        {item.value} {item.label}
                        <ArrowRight
                          size={12}
                          className="ml-1 inline"
                        />
                      </button>
                    ))}
                </div>
              </Card>
            )}

            {/* =========================================================
                KPI SECTION
            ========================================================= */}

            <div>
              <div className="mb-4 flex items-center justify-between">
                <SectionLabel>
                  Recruitment at a glance
                </SectionLabel>

                <span className="text-[11px] font-medium text-slate-400">
                  Last {days} days
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

                {canVacancies && (
                  <KpiCard
                    icon={BriefcaseBusiness}
                    tone="bg-indigo-50 text-indigo-600"
                    color="#6366f1"
                    label="Open vacancies"
                    value={vacancyCounts.PUBLISHED || 0}
                    loading={vacancies.loading}
                    footnote={`${vacancyCounts.PENDING_APPROVAL || 0} pending approval`}
                  />
                )}

                {canApplications && (
                  <KpiCard
                    icon={FileText}
                    tone="bg-sky-50 text-sky-600"
                    color="#0ea5e9"
                    label="Applications"
                    value={metrics.apps.current}
                    metric={metrics.apps}
                    loading={applications.loading}
                  />
                )}

                {canApplications && (
                  <KpiCard
                    icon={Users}
                    tone="bg-emerald-50 text-emerald-600"
                    color="#10b981"
                    label="Shortlisted"
                    value={metrics.shortlisted.current}
                    metric={metrics.shortlisted}
                    loading={applications.loading}
                  />
                )}

                {canInterviews && (
                  <KpiCard
                    icon={CalendarDays}
                    tone="bg-violet-50 text-violet-600"
                    color="#8b5cf6"
                    label={
                      canInterviewsMine
                        ? "My interviews"
                        : "Interviews"
                    }
                    value={metrics.interviews.current}
                    metric={metrics.interviews}
                    loading={interviews.loading}
                  />
                )}

                {canOffers && (
                  <KpiCard
                    icon={Handshake}
                    tone="bg-amber-50 text-amber-600"
                    color="#f59e0b"
                    label="Job offers"
                    value={metrics.offers.current}
                    metric={metrics.offers}
                    loading={offers.loading}
                  />
                )}

              </div>
            </div>

            {/* =========================================================
                ANALYTICS AND INTERVIEW AGENDA
            ========================================================= */}

            {(canApplications || canInterviews) && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">

                {canApplications && (
                  <Card className="lg:col-span-8">
                    <CardHead
                      icon={Activity}
                      title="Application analytics"
                      subtitle={`Application activity over the last ${days} days`}
                      right={
                        canOffers &&
                        metrics.acceptRate !== null ? (
                          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-right">
                            <p className="text-lg font-extrabold text-emerald-700">
                              {metrics.acceptRate}%
                            </p>

                            <p className="text-[10px] font-medium text-emerald-600">
                              Offer acceptance
                            </p>
                          </div>
                        ) : null
                      }
                    />

                    {applications.loading ? (
                      <Skeleton />
                    ) : applications.error ? (
                      <ErrorMessage
                        text={applications.error}
                        onRetry={applications.reload}
                      />
                    ) : (
                      <TrendChart
                        labels={labels}
                        series={[
                          {
                            name: "Applications",
                            color: "#6366f1",
                            data: metrics.apps.spark,
                          },
                          {
                            name: "Shortlisted",
                            color: "#10b981",
                            data: metrics.shortlisted.spark,
                          },
                        ]}
                      />
                    )}
                  </Card>
                )}

                {canInterviews && (
                  <Card
                    className={
                      canApplications
                        ? "lg:col-span-4"
                        : "lg:col-span-12"
                    }
                  >
                    <CardHead
                      icon={CalendarCheck}
                      title={
                        canInterviewsMine
                          ? "My upcoming interviews"
                          : "Upcoming interviews"
                      }
                      subtitle="Scheduled over the next 7 days"
                    />

                    {interviews.loading ? (
                      <Skeleton rows={4} />
                    ) : interviews.error ? (
                      <ErrorMessage
                        text={interviews.error}
                        onRetry={interviews.reload}
                      />
                    ) : agenda.length === 0 ? (
                      <Empty text="No upcoming interviews scheduled." />
                    ) : (
                      <ul className="mt-4 divide-y divide-slate-100 px-5 pb-3">
                        {agenda.map(({ item, time }) => {
                          const dateValue =
                            item.scheduledAt ||
                            item.interviewDate ||
                            item.date;

                          const hasTime =
                            String(dateValue).includes("T");

                          const interviewTime =
                            item.interviewTime ||
                            item.startTime ||
                            (hasTime
                              ? new Date(time).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )
                              : "");

                          const isToday =
                            dayLabel(time) === "Today";

                          return (
                            <li
                              key={item.id}
                              className="flex items-center gap-3 py-3.5"
                            >
                              <div
                                className={`flex h-12 w-[62px] shrink-0 flex-col items-center justify-center rounded-xl ${
                                  isToday
                                    ? "bg-indigo-600 text-white"
                                    : "bg-indigo-50 text-indigo-700"
                                }`}
                              >
                                <span className="text-[10px] font-semibold">
                                  {dayLabel(time)}
                                </span>

                                <span className="mt-0.5 text-[11px] font-bold">
                                  {interviewTime || "—"}
                                </span>
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-slate-800">
                                  {personName(item)}
                                </p>

                                <p className="mt-1 truncate text-[11px] text-slate-500">
                                  {vacancyName(item)}
                                </p>

                                {item.round && (
                                  <p className="mt-1 text-[10px] font-medium text-indigo-500">
                                    {String(item.round).includes("ROUND")
                                      ? pretty(item.round)
                                      : `Round ${item.round}`}
                                  </p>
                                )}
                              </div>

                              <ArrowUpRight
                                size={15}
                                className="shrink-0 text-slate-300"
                              />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </Card>
                )}
              </div>
            )}

            {/* =========================================================
                RECRUITMENT INSIGHTS
            ========================================================= */}

            {(funnel.length > 1 ||
              canVacancies ||
              canApplications) && (
              <div>
                <div className="mb-4">
                  <SectionLabel>
                    Recruitment insights
                  </SectionLabel>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

                  {funnel.length > 1 && (
                    <Card>
                      <CardHead
                        icon={Target}
                        title="Hiring funnel"
                        subtitle={`Performance over the last ${days} days`}
                      />

                      <Funnel steps={funnel} />
                    </Card>
                  )}

                  {canVacancies && (
                    <Card>
                      <CardHead
                        icon={BriefcaseBusiness}
                        title="Vacancy distribution"
                        subtitle="Current vacancy status"
                      />

                      {vacancies.loading ? (
                        <Skeleton rows={4} />
                      ) : vacancies.error ? (
                        <ErrorMessage
                          text={vacancies.error}
                          onRetry={vacancies.reload}
                        />
                      ) : (
                        <Donut
                          label="Vacancies"
                          data={VACANCY_STATUS.map((item) => ({
                            label: item.key,
                            name: item.label,
                            color: item.color,
                            value:
                              vacancyCounts[item.key] || 0,
                          }))}
                        />
                      )}
                    </Card>
                  )}

                  {canApplications && (
                    <Card>
                      <CardHead
                        icon={TrendingUp}
                        title="Top vacancies"
                        subtitle={`Most applications in ${days} days`}
                      />

                      {applications.loading ? (
                        <Skeleton rows={4} />
                      ) : applications.error ? (
                        <ErrorMessage
                          text={applications.error}
                          onRetry={applications.reload}
                        />
                      ) : (
                        <BarList data={topVacancies} />
                      )}
                    </Card>
                  )}

                </div>
              </div>
            )}

            {/* =========================================================
                RECENT APPLICATIONS AND ACTIVITY
            ========================================================= */}

            {(canApplications || anything) && (
              <div>
                <div className="mb-4">
                  <SectionLabel>
                    Latest updates
                  </SectionLabel>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">

                  {canApplications && (
                    <Card className="overflow-hidden lg:col-span-8">
                      <CardHead
                        icon={Users}
                        title="Recent applications"
                        subtitle="The latest candidates who applied"
                        right={
                          <span className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[10px] font-bold text-indigo-600">
                            {apps.length} Total
                          </span>
                        }
                      />

                      {applications.loading ? (
                        <Skeleton rows={5} />
                      ) : applications.error ? (
                        <ErrorMessage
                          text={applications.error}
                          onRetry={applications.reload}
                        />
                      ) : recentApps.length === 0 ? (
                        <Empty text="No applications received yet." />
                      ) : (
                        <div className="mt-4 overflow-x-auto">
                          <table className="w-full min-w-[620px] text-left text-sm">
                            <thead>
                              <tr className="border-y border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <th className="px-5 py-3">
                                  Candidate
                                </th>

                                <th className="px-3 py-3">
                                  Vacancy
                                </th>

                                <th className="px-3 py-3">
                                  Status
                                </th>

                                <th className="px-5 py-3 text-right">
                                  Applied
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                              {recentApps.map((item) => (
                                <tr
                                  key={item.id}
                                  className="transition hover:bg-slate-50/70"
                                >
                                  <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-3">
                                      <Avatar
                                        name={personName(item)}
                                      />

                                      <div className="min-w-0">
                                        <p className="max-w-[170px] truncate text-xs font-bold text-slate-800">
                                          {personName(item)}
                                        </p>

                                        <p className="mt-0.5 text-[10px] text-slate-400">
                                          Candidate
                                        </p>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="max-w-[180px] truncate px-3 py-3.5 text-xs font-medium text-slate-600">
                                    {vacancyName(item)}
                                  </td>

                                  <td className="px-3 py-3.5">
                                    {item.status ? (
                                      <Chip status={item.status} />
                                    ) : (
                                      <span className="text-xs text-slate-400">
                                        —
                                      </span>
                                    )}
                                  </td>

                                  <td className="whitespace-nowrap px-5 py-3.5 text-right text-[11px] font-medium text-slate-500">
                                    {ago(appTime(item)) || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                        <span className="text-[10px] text-slate-400">
                          Showing latest 6 applications
                        </span>

                        <span className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600">
                          Recruitment applications
                          <ArrowUpRight size={12} />
                        </span>
                      </div>
                    </Card>
                  )}

                  <Card
                    className={
                      canApplications
                        ? "lg:col-span-4"
                        : "lg:col-span-12"
                    }
                  >
                    <CardHead
                      icon={Activity}
                      title="Recent activity"
                      subtitle={
                        full
                          ? "Organization audit trail"
                          : "Your notifications"
                      }
                    />

                    {activity.loading ? (
                      <Skeleton rows={5} />
                    ) : activity.error ? (
                      <ErrorMessage
                        text={activity.error}
                        onRetry={activity.reload}
                      />
                    ) : (activity.data || []).length === 0 ? (
                      <Empty text="No recent activity." />
                    ) : (
                      <ol className="relative mt-5 space-y-5 px-5 pb-6">
                        <span className="absolute bottom-7 left-[29px] top-1 w-px bg-slate-100" />

                        {[...activity.data]
                          .sort(
                            (a, b) =>
                              (actTime(b) || 0) -
                              (actTime(a) || 0)
                          )
                          .slice(0, 7)
                          .map((item, index) => (
                            <li
                              key={item.id ?? index}
                              className="relative flex gap-3"
                            >
                              <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-4 border-white bg-indigo-100 text-indigo-600">
                                <Activity size={12} />
                              </span>

                              <div className="min-w-0 flex-1 pt-0.5">
                                <p className="line-clamp-2 text-xs font-medium leading-5 text-slate-700">
                                  {item.description ||
                                    item.details ||
                                    item.message ||
                                    item.title ||
                                    [
                                      item.action,
                                      item.entityType,
                                    ]
                                      .filter(Boolean)
                                      .join(" ") ||
                                    "Recruitment activity"}
                                </p>

                                <p className="mt-1 text-[10px] text-slate-400">
                                  {[
                                    item.performedBy ||
                                      item.userName ||
                                      item.user,
                                    ago(actTime(item)),
                                  ]
                                    .filter(Boolean)
                                    .join(" · ") ||
                                    "Recent activity"}
                                </p>
                              </div>
                            </li>
                          ))}
                      </ol>
                    )}
                  </Card>
                </div>
              </div>
            )}

            {/* =========================================================
                VACANCY MANAGEMENT
            ========================================================= */}

            {canVacancies && (
              <div ref={vacancyRef} className="scroll-mt-5">
                <Card className="overflow-hidden">
                  <div className="flex flex-col gap-4 px-5 pt-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <BriefcaseBusiness size={19} />
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Vacancy management
                        </h3>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Monitor open positions, applicants and deadlines
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { key: "ALL", label: "All" },
                        ...VACANCY_STATUS,
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() =>
                            setVacancyFilter(item.key)
                          }
                          className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
                            vacancyFilter === item.key
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {vacancies.loading ? (
                    <Skeleton rows={5} />
                  ) : vacancies.error ? (
                    <ErrorMessage
                      text={vacancies.error}
                      onRetry={vacancies.reload}
                    />
                  ) : filteredVacancies.length === 0 ? (
                    <Empty text="No vacancies match the selected filter." />
                  ) : (
                    <div className="mt-5 overflow-x-auto">
                      <table className="w-full min-w-[650px] text-left text-sm">
                        <thead>
                          <tr className="border-y border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="px-5 py-3">
                              Vacancy
                            </th>

                            <th className="px-3 py-3">
                              Status
                            </th>

                            <th className="px-3 py-3">
                              Applicants
                            </th>

                            <th className="px-5 py-3 text-right">
                              Deadline
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {filteredVacancies.map((item) => {
                            const closingDate = ts(
                              item.closingDate ||
                                item.deadline
                            );

                            const remainingDays =
                              closingDate !== null
                                ? Math.ceil(
                                    (closingDate - Date.now()) /
                                      DAY
                                  )
                                : null;

                            return (
                              <tr
                                key={item.id}
                                className="transition hover:bg-slate-50/70"
                              >
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                      <BriefcaseBusiness size={17} />
                                    </div>

                                    <div className="min-w-0">
                                      <p className="max-w-[250px] truncate text-xs font-bold text-slate-800">
                                        {item.title ||
                                          item.jobTitle ||
                                          "Untitled vacancy"}
                                      </p>

                                      <p className="mt-1 text-[10px] text-slate-400">
                                        {item.department?.name ||
                                          item.department ||
                                          "No department"}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-3 py-4">
                                  <Chip status={item.status} />
                                </td>

                                <td className="px-3 py-4">
                                  <div className="flex items-center gap-2">
                                    <Users
                                      size={14}
                                      className="text-slate-400"
                                    />

                                    <span className="text-xs font-bold text-slate-700">
                                      {canApplications
                                        ? applicantsByVacancy(item)
                                        : "—"}
                                    </span>
                                  </div>
                                </td>

                                <td className="whitespace-nowrap px-5 py-4 text-right">
                                  {remainingDays === null ? (
                                    <span className="text-xs text-slate-400">
                                      No deadline
                                    </span>
                                  ) : remainingDays < 0 ? (
                                    <span className="text-xs font-medium text-slate-400">
                                      Expired
                                    </span>
                                  ) : (
                                    <span
                                      className={`text-xs font-bold ${
                                        remainingDays <= 3
                                          ? "text-red-500"
                                          : remainingDays <= 7
                                            ? "text-amber-600"
                                            : "text-slate-600"
                                      }`}
                                    >
                                      {remainingDays === 0
                                        ? "Today"
                                        : `${remainingDays} days left`}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
                    <p className="text-[10px] text-slate-400">
                      Showing {filteredVacancies.length} of{" "}
                      {vacs.filter(
                        (item) =>
                          vacancyFilter === "ALL" ||
                          item.status === vacancyFilter
                      ).length}{" "}
                      matching vacancies
                    </p>

                    <button
                      type="button"
                      onClick={() => setVacancyFilter("ALL")}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Clear filters
                    </button>
                  </div>
                </Card>
              </div>
            )}

            {/* =========================================================
                FOOTER
            ========================================================= */}

            <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200/70 pt-5 sm:flex-row">
              <p className="text-[10px] text-slate-400">
                Airella HRM · Recruitment Management
              </p>

              <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Dashboard overview
              </p>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default Dashboard;
