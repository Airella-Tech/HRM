import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness, Users, FileText, CalendarDays, CheckCircle2,
  Clock3, UserCheck, UserRoundCheck, Send, Award, Activity,
  ArrowUpRight, RefreshCw, CircleAlert, BarChart3, CalendarClock, Mail,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const COLORS = {
  indigo: "#6366f1", blue: "#0ea5e9", green: "#10b981",
  amber: "#f59e0b", violet: "#8b5cf6", rose: "#f43f5e", slate: "#94a3b8",
};

const normalize = (value) =>
  String(value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");

const getArray = (response) => {
  // Supports plain arrays, Axios responses, Spring Page responses,
  // and common { data: { data: [...] } } API wrappers.
  let value = response;
  for (let i = 0; i < 4 && value && !Array.isArray(value); i += 1) {
    if (Array.isArray(value.content)) return value.content;
    if (Array.isArray(value.data)) return value.data;
    if (value.data && typeof value.data === "object") value = value.data;
    else if (value.content && typeof value.content === "object") value = value.content;
    else break;
  }
  return Array.isArray(value) ? value : null;
};

const parseDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDate = (item, fields = []) => {
  const common = [
    "scheduledAt", "interviewDateTime", "interviewDate",
    "startDateTime", "date", "createdAt", "createdDate",
    "applicationDate", "submittedAt", "updatedAt",
  ];
  for (const field of [...fields, ...common]) {
    const date = parseDate(item?.[field]);
    if (date) return date;
  }
  return null;
};

const formatDate = (date) =>
  date ? new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(date) : "Date unavailable";

const formatTime = (date) =>
  date ? new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date) : "Time unavailable";

const getStatus = (item, field) => normalize(item?.status || item?.[field]);
const getVacancyStatus = (item) => getStatus(item, "vacancyStatus");
const getApplicationStatus = (item) => getStatus(item, "applicationStatus");
const getInterviewStatus = (item) => getStatus(item, "interviewStatus");
const getOfferStatus = (item) => getStatus(item, "offerStatus");

const getCandidateName = (item) =>
  item?.candidateName || item?.applicantName || item?.fullName ||
  item?.candidate?.fullName || item?.candidate?.name || item?.name || "Candidate";

const getVacancyName = (item) =>
  item?.vacancyTitle || item?.jobTitle || item?.position ||
  item?.vacancy?.title || item?.title || "Job Position";

const getInterviewTitle = (item) =>
  item?.interviewType || item?.roundName || item?.interviewRound || item?.title || "Interview";

const getId = (item, prefix = "item") =>
  item?.id ?? item?.applicationId ?? item?.interviewId ?? item?.vacancyId ??
  item?.offerId ?? `${prefix}-${item?.createdAt || item?.scheduledAt || getCandidateName(item)}`;

const percentage = (value, total) => total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;

const isSelected = (status) => ["SELECTED", "HIRED", "OFFER_ACCEPTED", "ACCEPTED"].includes(status);
const isRejected = (status) => ["REJECTED", "DECLINED", "NOT_SELECTED"].includes(status);
const isShortlisted = (status) => ["SHORTLISTED", "SHORTLIST"].includes(status);
const isInterviewStage = (status) => status.includes("INTERVIEW") || ["IN_PROGRESS", "INTERVIEWING"].includes(status);

const StatusBadge = ({ status }) => {
  const value = normalize(status);
  const styles = {
    PUBLISHED: "bg-emerald-50 text-emerald-700", APPROVED: "bg-green-50 text-green-700",
    PENDING_APPROVAL: "bg-amber-50 text-amber-700", DRAFT: "bg-slate-100 text-slate-600",
    CLOSED: "bg-slate-100 text-slate-600", SCHEDULED: "bg-blue-50 text-blue-700",
    IN_PROGRESS: "bg-indigo-50 text-indigo-700", COMPLETED: "bg-emerald-50 text-emerald-700",
    PENDING: "bg-amber-50 text-amber-700", CANCELLED: "bg-rose-50 text-rose-700",
    ACCEPTED: "bg-emerald-50 text-emerald-700", REJECTED: "bg-rose-50 text-rose-700",
    SENT: "bg-blue-50 text-blue-700", SELECTED: "bg-emerald-50 text-emerald-700",
    WITHDRAWN: "bg-slate-100 text-slate-600",
  };
  const label = value ? value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "Unknown";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value] || "bg-slate-100 text-slate-600"}`}>{label}</span>;
};

const SectionHeader = ({ title, description, action, onAction }) => (
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 className="text-base font-bold text-slate-800">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
    {action && <button type="button" onClick={onAction} className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800">{action}<ArrowUpRight size={15} /></button>}
  </div>
);

const EmptyState = ({ icon: Icon = FileText, title, description }) => (
  <div className="flex flex-col items-center justify-center py-9 text-center">
    <div className="rounded-full bg-slate-100 p-3"><Icon size={23} className="text-slate-400" /></div>
    <p className="mt-3 text-sm font-semibold text-slate-600">{title}</p>
    <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">{description}</p>
  </div>
);

const KpiCard = ({ title, value, description, icon: Icon, color, background, loading, onClick }) => (
  <button type="button" onClick={onClick} className="group w-full rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-md">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-3 text-3xl font-bold tracking-tight text-slate-800">
          {loading ? <span className="inline-block h-9 w-14 animate-pulse rounded-lg bg-slate-100" /> : value == null ? "—" : value.toLocaleString()}
        </p>
      </div>
      <div className={`rounded-xl p-3 ${background}`}><Icon size={22} className={color} /></div>
    </div>
    <div className="mt-4 flex items-center justify-between">
      <p className="text-xs text-slate-400">{description}</p>
      <ArrowUpRight size={16} className="text-slate-300 transition group-hover:text-indigo-600" />
    </div>
  </button>
);

const PipelineRow = ({ label, count, total, color }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <div className="flex items-center gap-2"><span className="text-sm font-bold text-slate-800">{count}</span><span className="w-9 text-right text-xs text-slate-400">{percentage(count, total)}%</span></div>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${percentage(count, total)}%`, backgroundColor: color }} /></div>
  </div>
);

const VacancyStatusRow = ({ label, count, color }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /><span className="text-sm text-slate-600">{label}</span></div>
    <span className="text-sm font-bold text-slate-800">{count}</span>
  </div>
);

const ApplicationTrendChart = ({ applications }) => {
  const monthlyData = useMemo(() => {
    const year = new Date().getFullYear();
    const result = MONTHS.map((month) => ({ month, count: 0 }));
    applications.forEach((application) => {
      const date = getDate(application, ["applicationDate", "submittedAt", "createdAt", "createdDate"]);
      if (date && date.getFullYear() === year) result[date.getMonth()].count += 1;
    });
    return result;
  }, [applications]);

  const maxValue = Math.max(...monthlyData.map((item) => item.count), 1);
  if (!monthlyData.some((item) => item.count > 0)) {
    return <EmptyState icon={BarChart3} title="No application trend available" description="Monthly application statistics will appear when application dates are available." />;
  }

  return (
    <div className="mt-5">
      <div className="flex h-52 items-end justify-between gap-2 border-b border-slate-100 pb-2">
        {monthlyData.map((item) => {
          const height = item.count ? Math.max(5, (item.count / maxValue) * 100) : 0;
          return <div key={item.month} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
            <div className="relative flex h-full w-full items-end justify-center">
              <div className="w-full max-w-7 rounded-t-md bg-indigo-500 transition-all group-hover:bg-indigo-700" style={{ height: `${height}%`, opacity: item.count ? 1 : 0.15 }} title={`${item.count} applications in ${item.month}`} />
            </div>
            <span className="text-[10px] text-slate-400 sm:text-xs">{item.month}</span>
          </div>;
        })}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" /><span className="text-xs text-slate-500">Applications received</span></div>
        <span className="text-xs font-semibold text-slate-600">{new Date().getFullYear()}</span>
      </div>
    </div>
  );
};

const InterviewItem = ({ interview }) => {
  const date = getDate(interview, ["scheduledAt", "interviewDateTime", "interviewDate", "startDateTime"]);
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-50">
        <span className="text-xs font-bold text-indigo-700">{date ? date.toLocaleDateString("en", { day: "2-digit" }) : "--"}</span>
        <span className="text-[10px] font-medium uppercase text-indigo-500">{date ? date.toLocaleDateString("en", { month: "short" }) : "---"}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{getInterviewTitle(interview)}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{getCandidateName(interview)} · {getVacancyName(interview)}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Clock3 size={12} />{formatTime(date)}</p>
      </div>
      <StatusBadge status={getInterviewStatus(interview)} />
    </div>
  );
};

const ActivityItem = ({ activity }) => {
  const config = {
    application: { icon: Users, color: "bg-blue-50 text-blue-600" },
    vacancy: { icon: BriefcaseBusiness, color: "bg-indigo-50 text-indigo-600" },
    interview: { icon: CalendarDays, color: "bg-amber-50 text-amber-600" },
    offer: { icon: Send, color: "bg-emerald-50 text-emerald-600" },
  };
  const item = config[activity.type] || config.application;
  const Icon = item.icon;
  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`rounded-xl p-2.5 ${item.color}`}><Icon size={17} /></div>
      <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-700">{activity.title}</p><p className="mt-1 text-xs text-slate-400">{activity.description}</p></div>
      <span className="shrink-0 text-[11px] text-slate-400">{formatDate(activity.date)}</span>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ vacancies: null, applications: null, interviews: null, offers: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState({});

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); }
    catch { return {}; }
  }, []);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const apiGroups = {
      vacancies: ["getVacancies"],
      applications: ["getApplications", "getAllApplications"],
      interviews: ["getInterviews", "getAllInterviews"],
      offers: ["getJobOffers", "getOffers", "getAllJobOffers"],
    };

    const results = {};
    const nextErrors = {};

    await Promise.all(Object.entries(apiGroups).map(async ([key, methodNames]) => {
      const methodName = methodNames.find((name) => typeof recruitmentApi?.[name] === "function");
      if (!methodName) {
        results[key] = null;
        nextErrors[key] = "API method not available";
        return;
      }
      try {
        const response = await recruitmentApi[methodName]();
        const records = getArray(response);
        if (records === null) {
          results[key] = null;
          nextErrors[key] = "Unexpected response format";
        } else {
          results[key] = records;
        }
      } catch (error) {
        console.error(`Failed to load ${key}:`, error);
        results[key] = null;
        nextErrors[key] = error?.response?.data?.message || "Unable to load data";
      }
    }));

    setData(results);
    setErrors(nextErrors);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const vacanciesAvailable = Array.isArray(data.vacancies);
  const applicationsAvailable = Array.isArray(data.applications);
  const interviewsAvailable = Array.isArray(data.interviews);
  const offersAvailable = Array.isArray(data.offers);
  const vacancies = data.vacancies || [];
  const applications = data.applications || [];
  const interviews = data.interviews || [];
  const offers = data.offers || [];

  const vacancyStats = useMemo(() => {
    const stats = { published: 0, pending: 0, approved: 0, draft: 0, closed: 0, total: vacancies.length };
    vacancies.forEach((item) => {
      const status = getVacancyStatus(item);
      if (status === "PUBLISHED") stats.published += 1;
      else if (["PENDING_APPROVAL", "PENDING"].includes(status)) stats.pending += 1;
      else if (status === "APPROVED") stats.approved += 1;
      else if (status === "DRAFT") stats.draft += 1;
      else if (status === "CLOSED") stats.closed += 1;
    });
    return stats;
  }, [vacancies]);

  const applicationStats = useMemo(() => {
    const stats = { total: applications.length, shortlisted: 0, interviewing: 0, selected: 0, rejected: 0, underReview: 0 };
    applications.forEach((item) => {
      const status = getApplicationStatus(item);
      if (isShortlisted(status)) stats.shortlisted += 1;
      else if (isInterviewStage(status)) stats.interviewing += 1;
      else if (isSelected(status)) stats.selected += 1;
      else if (isRejected(status)) stats.rejected += 1;
      else if (["SUBMITTED", "PENDING", "UNDER_REVIEW", "IN_REVIEW", "SCREENING"].includes(status)) stats.underReview += 1;
    });
    return stats;
  }, [applications]);

  const interviewStats = useMemo(() => {
    const now = new Date();
    return {
      total: interviews.length,
      upcoming: interviews.filter((item) => {
        const date = getDate(item, ["scheduledAt", "interviewDateTime", "interviewDate", "startDateTime"]);
        return date && date >= now && !["CANCELLED", "COMPLETED", "REJECTED"].includes(getInterviewStatus(item));
      }).length,
      completed: interviews.filter((item) => getInterviewStatus(item) === "COMPLETED").length,
    };
  }, [interviews]);

  const offerStats = useMemo(() => ({
    total: offers.length,
    accepted: offers.filter((item) => getOfferStatus(item) === "ACCEPTED").length,
    pending: offers.filter((item) => ["SENT", "PENDING", "PENDING_RESPONSE"].includes(getOfferStatus(item))).length,
    rejected: offers.filter((item) => ["REJECTED", "WITHDRAWN"].includes(getOfferStatus(item))).length,
  }), [offers]);

  const upcomingInterviews = useMemo(() => {
    const now = new Date();
    return interviews
      .filter((item) => {
        const date = getDate(item, ["scheduledAt", "interviewDateTime", "interviewDate", "startDateTime"]);
        return date && date >= now && !["CANCELLED", "COMPLETED"].includes(getInterviewStatus(item));
      })
      .sort((a, b) => getDate(a, ["scheduledAt", "interviewDateTime", "interviewDate", "startDateTime"]) - getDate(b, ["scheduledAt", "interviewDateTime", "interviewDate", "startDateTime"]))
      .slice(0, 5);
  }, [interviews]);

  const recentActivities = useMemo(() => {
    const items = [];
    applications.forEach((item) => {
      const date = getDate(item, ["applicationDate", "submittedAt", "createdAt", "createdDate"]);
      if (date) items.push({ id: `application-${getId(item, "application")}`, type: "application", title: "Candidate application received", description: `${getCandidateName(item)} · ${getVacancyName(item)}`, date });
    });
    vacancies.forEach((item) => {
      const date = getDate(item, ["updatedAt", "createdAt", "createdDate"]);
      if (date) items.push({ id: `vacancy-${getId(item, "vacancy")}`, type: "vacancy", title: `Vacancy ${getVacancyStatus(item).toLowerCase().replace(/_/g, " ")}`, description: getVacancyName(item), date });
    });
    interviews.forEach((item) => {
      const date = getDate(item, ["updatedAt", "createdAt", "createdDate", "scheduledAt", "interviewDateTime"]);
      if (date) items.push({ id: `interview-${getId(item, "interview")}`, type: "interview", title: "Interview activity", description: `${getInterviewTitle(item)} · ${getCandidateName(item)}`, date });
    });
    offers.forEach((item) => {
      const date = getDate(item, ["updatedAt", "createdAt", "createdDate", "sentAt"]);
      if (date) items.push({ id: `offer-${getId(item, "offer")}`, type: "offer", title: `Job offer ${getOfferStatus(item).toLowerCase().replace(/_/g, " ")}`, description: getCandidateName(item), date });
    });
    return items.sort((a, b) => b.date - a.date).slice(0, 6);
  }, [applications, vacancies, interviews, offers]);

  const kpiCards = [
    { title: "Total Vacancies", value: vacanciesAvailable ? vacancyStats.total : null, description: "All recorded job openings", icon: BriefcaseBusiness, color: "text-indigo-600", background: "bg-indigo-50", path: "/recruitment/vacancies" },
    { title: "Total Applications", value: applicationsAvailable ? applicationStats.total : null, description: "Candidate applications received", icon: Users, color: "text-sky-600", background: "bg-sky-50", path: "/recruitment/applications" },
    { title: "Shortlisted Candidates", value: applicationsAvailable ? applicationStats.shortlisted : null, description: "Candidates progressing in recruitment", icon: UserCheck, color: "text-emerald-600", background: "bg-emerald-50", path: "/recruitment/applications" },
    { title: "Scheduled Interviews", value: interviewsAvailable ? interviewStats.upcoming : null, description: "Upcoming interview sessions", icon: CalendarDays, color: "text-amber-600", background: "bg-amber-50", path: "/recruitment/interviews" },
  ];

  const today = new Date();
  const dateLabel = new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(today);
  const firstName = user.fullName ? user.fullName.trim().split(/\s+/)[0] : "";

  const vacancySegments = [
    { value: vacancyStats.published, color: COLORS.indigo },
    { value: vacancyStats.pending, color: COLORS.amber },
    { value: vacancyStats.approved, color: COLORS.green },
    { value: vacancyStats.draft, color: COLORS.blue },
    { value: vacancyStats.closed, color: COLORS.slate },
  ];
  let running = 0;
  const donutGradient = vacancyStats.total
    ? `conic-gradient(${vacancySegments.map((segment) => {
        const start = running;
        running += (segment.value / vacancyStats.total) * 100;
        return `${segment.color} ${start}% ${running}%`;
      }).join(", ")})`
    : "#e2e8f0";

  return (
    <PageLayout role="recruiter" activePage="Overview" title="Recruitment Dashboard" subtitle="Overview of recruitment performance and hiring activities">
      <div className="space-y-7 pb-6">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-800 px-6 py-7 text-white shadow-sm md:px-8 md:py-8">
          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-indigo-200"><Activity size={17} /><span className="text-xs font-semibold uppercase tracking-[0.15em]">Recruitment Analytics</span></div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Good {today.getHours() < 12 ? "Morning" : today.getHours() < 17 ? "Afternoon" : "Evening"}{firstName ? `, ${firstName}` : ""}!</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100">Get a complete overview of your organization's recruitment activities, candidate progress and hiring performance.</p>
              <div className="mt-5 flex items-center gap-2 text-xs text-indigo-200"><CalendarDays size={15} />{dateLabel}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => loadDashboard(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />Refresh</button>
              <button type="button" onClick={() => navigate("/recruitment/vacancies")} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-800 shadow-sm transition hover:bg-indigo-50"><BriefcaseBusiness size={16} />View Vacancies</button>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full border-[35px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-28 right-1/3 h-64 w-64 rounded-full bg-indigo-400/10 blur-2xl" />
        </section>

        <section>
          <SectionHeader title="Recruitment at a Glance" description="Key indicators showing the current state of recruitment." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((card) => <KpiCard key={card.title} {...card} loading={loading} onClick={() => navigate(card.path)} />)}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-3 md:p-6">
            <SectionHeader title="Application Pipeline" description="Track candidate progress through the recruitment stages." action="View Applications" onAction={() => navigate("/recruitment/applications")} />
            {loading ? <div className="animate-pulse space-y-7 py-4">{[1, 2, 3, 4].map((n) => <div key={n} className="space-y-2"><div className="h-3 w-1/3 rounded bg-slate-100" /><div className="h-2 rounded bg-slate-100" /></div>)}</div>
              : !applicationsAvailable ? <EmptyState icon={Users} title="Application data unavailable" description="Application statistics could not be retrieved from the backend." />
              : !applications.length ? <EmptyState icon={FileText} title="No applications available" description="Candidate progress will appear here when applications are received." />
              : <div className="space-y-6 pt-2">
                <div className="mb-6 rounded-xl bg-indigo-50/70 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Total Applications</p><div className="mt-1 flex items-end gap-2"><span className="text-3xl font-bold text-indigo-900">{applicationStats.total}</span><span className="mb-1 text-xs text-indigo-600">Candidates recorded</span></div></div>
                <PipelineRow label="Under Review" count={applicationStats.underReview} total={applicationStats.total} color={COLORS.blue} />
                <PipelineRow label="Shortlisted" count={applicationStats.shortlisted} total={applicationStats.total} color={COLORS.green} />
                <PipelineRow label="Interview Stage" count={applicationStats.interviewing} total={applicationStats.total} color={COLORS.amber} />
                <PipelineRow label="Selected" count={applicationStats.selected} total={applicationStats.total} color={COLORS.violet} />
                <PipelineRow label="Rejected" count={applicationStats.rejected} total={applicationStats.total} color={COLORS.rose} />
                <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">Pipeline figures are based on each application's current status. Each candidate is counted in one stage.</p>
              </div>}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-2 md:p-6">
            <SectionHeader title="Vacancy Overview" description="Current status of job openings." action="View All" onAction={() => navigate("/recruitment/vacancies")} />
            {loading ? <div className="animate-pulse space-y-5 py-5">{[1, 2, 3, 4].map((n) => <div key={n} className="h-4 rounded bg-slate-100" />)}</div>
              : !vacanciesAvailable ? <EmptyState icon={BriefcaseBusiness} title="Vacancy data unavailable" description="Vacancy statistics could not be retrieved." />
              : !vacancies.length ? <EmptyState icon={BriefcaseBusiness} title="No vacancies available" description="Created job openings will be summarized here." />
              : <>
                <div className="relative mx-auto my-5 flex h-40 w-40 items-center justify-center rounded-full" style={{ background: donutGradient }}>
                  <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white"><span className="text-3xl font-bold text-slate-800">{vacancyStats.total}</span><span className="text-xs text-slate-400">Total Vacancies</span></div>
                </div>
                <div className="divide-y divide-slate-100">
                  <VacancyStatusRow label="Published" count={vacancyStats.published} color={COLORS.indigo} />
                  <VacancyStatusRow label="Pending Approval" count={vacancyStats.pending} color={COLORS.amber} />
                  <VacancyStatusRow label="Approved" count={vacancyStats.approved} color={COLORS.green} />
                  <VacancyStatusRow label="Draft" count={vacancyStats.draft} color={COLORS.blue} />
                  <VacancyStatusRow label="Closed" count={vacancyStats.closed} color={COLORS.slate} />
                </div>
              </>}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <SectionHeader title="Application Trends" description="Monthly applications received during the current year." action="View Applications" onAction={() => navigate("/recruitment/applications")} />
          {loading ? <div className="flex h-52 animate-pulse items-end gap-3">{MONTHS.map((month, i) => <div key={month} className="flex-1 rounded-t-md bg-slate-100" style={{ height: `${30 + ((i * 17) % 65)}%` }} />)}</div>
            : !applicationsAvailable ? <EmptyState icon={BarChart3} title="Trend data unavailable" description="Monthly application statistics cannot be displayed because the application API is unavailable." />
            : <ApplicationTrendChart applications={applications} />}
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
            <SectionHeader title="Upcoming Interviews" description="A look at the next scheduled interview sessions." action="View Calendar" onAction={() => navigate("/recruitment/interviews")} />
            {loading ? <div className="animate-pulse space-y-5">{[1, 2, 3].map((n) => <div key={n} className="h-14 rounded-xl bg-slate-100" />)}</div>
              : !interviewsAvailable ? <EmptyState icon={CalendarDays} title="Interview data unavailable" description="Upcoming interviews could not be retrieved." />
              : !upcomingInterviews.length ? <EmptyState icon={CalendarClock} title="No upcoming interviews" description="Scheduled interview sessions will appear here." />
              : <div className="divide-y divide-slate-100">{upcomingInterviews.map((item) => <InterviewItem key={getId(item, "interview")} interview={item} />)}</div>}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
            <SectionHeader title="Recent Recruitment Activities" description="Latest recorded recruitment updates." />
            {loading ? <div className="animate-pulse space-y-5">{[1, 2, 3].map((n) => <div key={n} className="h-14 rounded-xl bg-slate-100" />)}</div>
              : !recentActivities.length ? <EmptyState icon={Activity} title="No recent activities" description="Recent recruitment records with available dates will appear here." />
              : <div className="divide-y divide-slate-100">{recentActivities.map((item) => <ActivityItem key={item.id} activity={item} />)}</div>}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <SectionHeader title="Hiring Summary" description="Overview of candidate selection and job offer progress." action="Manage Job Offers" onAction={() => navigate("/recruitment/job-offers")} />
          {!loading && !applicationsAvailable && !offersAvailable ? <EmptyState icon={Award} title="Hiring information unavailable" description="Hiring and offer statistics will appear when the corresponding backend data is available." />
            : <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">Selected Candidates</p><UserRoundCheck size={20} className="text-emerald-600" /></div><p className="mt-3 text-2xl font-bold text-slate-800">{loading ? "..." : applicationsAvailable ? applicationStats.selected : "—"}</p><p className="mt-1 text-xs text-slate-400">Based on application status</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">Offers Accepted</p><CheckCircle2 size={20} className="text-green-600" /></div><p className="mt-3 text-2xl font-bold text-slate-800">{loading ? "..." : offersAvailable ? offerStats.accepted : "—"}</p><p className="mt-1 text-xs text-slate-400">Candidates accepting offers</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">Pending Offers</p><Mail size={20} className="text-amber-600" /></div><p className="mt-3 text-2xl font-bold text-slate-800">{loading ? "..." : offersAvailable ? offerStats.pending : "—"}</p><p className="mt-1 text-xs text-slate-400">Offers awaiting candidate response</p></div>
            </div>}
          {!loading && offersAvailable && <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4"><span className="text-xs text-slate-500">Total recorded offers:</span><span className="text-sm font-bold text-slate-800">{offerStats.total}</span><span className="text-xs text-slate-400">Rejected / withdrawn: {offerStats.rejected}</span></div>}
          {!loading && interviewsAvailable && <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4"><span className="text-xs text-slate-500">Total interviews:</span><span className="text-sm font-bold text-slate-800">{interviewStats.total}</span><span className="text-xs text-slate-400">Completed: {interviewStats.completed}</span></div>}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 text-xs text-slate-400"><Activity size={14} />Recruitment Management System</div>
          <p className="text-xs text-slate-400">Dashboard information is based on available backend records.</p>
        </div>

        {!loading && Object.keys(errors).length > 0 && <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
          <CircleAlert size={19} className="mt-0.5 shrink-0 text-amber-600" />
          <div><p className="text-sm font-semibold text-amber-800">Some dashboard information is unavailable</p><p className="mt-1 text-xs leading-5 text-amber-700">Some recruitment APIs are not connected or could not return data. Available dashboard sections will continue to work.</p><ul className="mt-2 list-inside list-disc text-xs text-amber-700">{Object.entries(errors).map(([key, message]) => <li key={key}>{key}: {message}</li>)}</ul></div>
        </div>}
      </div>
    </PageLayout>
  );
};

export default Dashboard;
