
import React, { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Users,
  FileText,
  CalendarDays,
  CheckCircle2,
  Clock3,
  TrendingUp,
  TrendingDown,
  UserCheck,
  UserRoundCheck,
  Send,
  Award,
  Activity,
  ArrowUpRight,
  ArrowRight,
  RefreshCw,
  ClipboardCheck,
  CircleAlert,
  Building2,
  BarChart3,
  CalendarClock,
  Mail,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";

// ======================================================
// CONFIGURATION
// ======================================================

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const COLORS = {
  indigo: "#6366f1",
  blue: "#0ea5e9",
  green: "#10b981",
  amber: "#f59e0b",
  violet: "#8b5cf6",
  rose: "#f43f5e",
  slate: "#94a3b8",
};

// ======================================================
// HELPER FUNCTIONS
// ======================================================

const normalize = (value) =>
  String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

const getArray = (response) => {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.data)) return response.data;

  if (Array.isArray(response?.data?.content)) {
    return response.data.content;
  }

  if (Array.isArray(response?.content)) {
    return response.content;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  return null;
};

const getDate = (item) => {
  const value =
    item?.scheduledAt ||
    item?.interviewDateTime ||
    item?.interviewDate ||
    item?.startDateTime ||
    item?.date ||
    item?.createdAt ||
    item?.createdDate ||
    item?.applicationDate ||
    item?.submittedAt;

  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (date) => {
  if (!date) return "Date unavailable";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatTime = (date) => {
  if (!date) return "Time unavailable";

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getVacancyStatus = (item) =>
  normalize(item?.status || item?.vacancyStatus);

const getApplicationStatus = (item) =>
  normalize(item?.status || item?.applicationStatus);

const getInterviewStatus = (item) =>
  normalize(item?.status || item?.interviewStatus);

const getOfferStatus = (item) =>
  normalize(item?.status || item?.offerStatus);

const getCandidateName = (item) =>
  item?.candidateName ||
  item?.applicantName ||
  item?.fullName ||
  item?.candidate?.fullName ||
  item?.candidate?.name ||
  item?.name ||
  "Candidate";

const getVacancyName = (item) =>
  item?.vacancyTitle ||
  item?.jobTitle ||
  item?.position ||
  item?.vacancy?.title ||
  item?.title ||
  "Job Position";

const getInterviewTitle = (item) =>
  item?.interviewType ||
  item?.roundName ||
  item?.interviewRound ||
  item?.title ||
  "Interview";

const getId = (item) =>
  item?.id ||
  item?.applicationId ||
  item?.interviewId ||
  item?.vacancyId ||
  Math.random().toString(36).slice(2);

const isWithinCurrentYear = (date) => {
  return (
    date &&
    date.getFullYear() === new Date().getFullYear()
  );
};

const getPercentage = (value, total) => {
  if (!total || total <= 0) return 0;

  return Math.min(100, Math.round((value / total) * 100));
};

const isSelectedStatus = (status) =>
  ["SELECTED", "HIRED", "OFFER_ACCEPTED", "ACCEPTED"].includes(status);

const isRejectedStatus = (status) =>
  ["REJECTED", "DECLINED", "NOT_SELECTED"].includes(status);

const isShortlistedStatus = (status) =>
  ["SHORTLISTED", "SHORTLIST", "INTERVIEW_SCHEDULED"].includes(status);

const isInterviewStatus = (status) =>
  status.includes("INTERVIEW");

const getInitials = (name) =>
  String(name || "C")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

// ======================================================
// STATUS BADGE
// ======================================================

const StatusBadge = ({ status }) => {
  const value = normalize(status);

  const styles = {
    PUBLISHED: "bg-emerald-50 text-emerald-700",
    APPROVED: "bg-green-50 text-green-700",
    PENDING_APPROVAL: "bg-amber-50 text-amber-700",
    DRAFT: "bg-slate-100 text-slate-600",
    CLOSED: "bg-slate-100 text-slate-600",
    SCHEDULED: "bg-blue-50 text-blue-700",
    COMPLETED: "bg-emerald-50 text-emerald-700",
    PENDING: "bg-amber-50 text-amber-700",
    CANCELLED: "bg-rose-50 text-rose-700",
    ACCEPTED: "bg-emerald-50 text-emerald-700",
    REJECTED: "bg-rose-50 text-rose-700",
    SENT: "bg-blue-50 text-blue-700",
    SELECTED: "bg-emerald-50 text-emerald-700",
  };

  const label = value
    ? value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    : "Unknown";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[value] || "bg-slate-100 text-slate-600"
      }`}
    >
      {label}
    </span>
  );
};

// ======================================================
// SECTION HEADER
// ======================================================

const SectionHeader = ({
  title,
  description,
  action,
  onAction,
}) => (
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 className="text-base font-bold text-slate-800">
        {title}
      </h2>

      {description && (
        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      )}
    </div>

    {action && (
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 transition hover:text-indigo-800"
      >
        {action}
        <ArrowUpRight size={15} />
      </button>
    )}
  </div>
);

// ======================================================
// EMPTY STATE
// ======================================================

const EmptyState = ({
  icon: Icon = FileText,
  title,
  description,
}) => (
  <div className="flex flex-col items-center justify-center py-9 text-center">
    <div className="rounded-full bg-slate-100 p-3">
      <Icon size={23} className="text-slate-400" />
    </div>

    <p className="mt-3 text-sm font-semibold text-slate-600">
      {title}
    </p>

    <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
      {description}
    </p>
  </div>
);

// ======================================================
// KPI CARD
// ======================================================

const KpiCard = ({
  title,
  value,
  description,
  icon: Icon,
  color,
  background,
  loading,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="group w-full rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-md"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <p className="mt-3 text-3xl font-bold tracking-tight text-slate-800">
          {loading ? (
            <span className="inline-block h-9 w-14 animate-pulse rounded-lg bg-slate-100" />
          ) : value === null ? (
            "—"
          ) : (
            value.toLocaleString()
          )}
        </p>
      </div>

      <div className={`rounded-xl p-3 ${background}`}>
        <Icon size={22} className={color} />
      </div>
    </div>

    <div className="mt-4 flex items-center justify-between">
      <p className="text-xs text-slate-400">
        {description}
      </p>

      <ArrowUpRight
        size={16}
        className="text-slate-300 transition group-hover:text-indigo-600"
      />
    </div>
  </button>
);

// ======================================================
// APPLICATION PIPELINE
// ======================================================

const PipelineRow = ({
  label,
  count,
  total,
  color,
}) => {
  const percentage = getPercentage(count, total);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-600">
          {label}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800">
            {count}
          </span>

          <span className="w-9 text-right text-xs text-slate-400">
            {percentage}%
          </span>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
};

// ======================================================
// VACANCY STATUS ROW
// ======================================================

const VacancyStatusRow = ({
  label,
  count,
  color,
}) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center gap-3">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />

      <span className="text-sm text-slate-600">
        {label}
      </span>
    </div>

    <span className="text-sm font-bold text-slate-800">
      {count}
    </span>
  </div>
);

// ======================================================
// APPLICATION TREND CHART
// ======================================================

const ApplicationTrendChart = ({ applications }) => {
  const monthlyData = useMemo(() => {
    const currentYear = new Date().getFullYear();

    const data = MONTHS.map((month) => ({
      month,
      count: 0,
    }));

    applications.forEach((application) => {
      const date = getDate(application);

      if (date && date.getFullYear() === currentYear) {
        data[date.getMonth()].count += 1;
      }
    });

    return data;
  }, [applications]);

  const maxValue = Math.max(
    ...monthlyData.map((item) => item.count),
    1
  );

  const hasData = monthlyData.some((item) => item.count > 0);

  return (
    <div className="mt-5">
      {!hasData ? (
        <EmptyState
          icon={BarChart3}
          title="No application trend available"
          description="Monthly application statistics will appear when application dates are available from the backend."
        />
      ) : (
        <>
          <div className="flex h-52 items-end justify-between gap-2 border-b border-slate-100 pb-2">
            {monthlyData.map((item) => {
              const height =
                item.count > 0
                  ? Math.max(5, (item.count / maxValue) * 100)
                  : 0;

              return (
                <div
                  key={item.month}
                  className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                >
                  <div className="relative flex h-full w-full items-end justify-center">
                    <div
                      className="w-full max-w-7 rounded-t-md bg-indigo-500 transition-all duration-500 group-hover:bg-indigo-700"
                      style={{
                        height: `${height}%`,
                        opacity: item.count > 0 ? 1 : 0.15,
                      }}
                      title={`${item.count} applications in ${item.month}`}
                    />
                  </div>

                  <span className="text-[10px] text-slate-400 sm:text-xs">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />
              <span className="text-xs text-slate-500">
                Applications received
              </span>
            </div>

            <span className="text-xs font-semibold text-slate-600">
              {new Date().getFullYear()}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

// ======================================================
// UPCOMING INTERVIEW ITEM
// ======================================================

const InterviewItem = ({ interview }) => {
  const date = getDate(interview);

  return (
    <div className="flex items-center gap-3 py-4">
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-50">
        <span className="text-xs font-bold text-indigo-700">
          {date
            ? date.toLocaleDateString("en", { day: "2-digit" })
            : "--"}
        </span>

        <span className="text-[10px] font-medium uppercase text-indigo-500">
          {date
            ? date.toLocaleDateString("en", { month: "short" })
            : "---"}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {getInterviewTitle(interview)}
        </p>

        <p className="mt-1 truncate text-xs text-slate-500">
          {getCandidateName(interview)}
          {" · "}
          {getVacancyName(interview)}
        </p>

        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
          <Clock3 size={12} />
          {formatTime(date)}
        </p>
      </div>

      <StatusBadge status={getInterviewStatus(interview)} />
    </div>
  );
};

// ======================================================
// RECENT ACTIVITY ITEM
// ======================================================

const ActivityItem = ({ activity }) => {
  const type = activity.type;

  const config = {
    application: {
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      label: "New application",
    },
    vacancy: {
      icon: BriefcaseBusiness,
      color: "bg-indigo-50 text-indigo-600",
      label: "Vacancy update",
    },
    interview: {
      icon: CalendarDays,
      color: "bg-amber-50 text-amber-600",
      label: "Interview update",
    },
    offer: {
      icon: Send,
      color: "bg-emerald-50 text-emerald-600",
      label: "Job offer update",
    },
  };

  const item = config[type] || config.application;
  const Icon = item.icon;

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`rounded-xl p-2.5 ${item.color}`}>
        <Icon size={17} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-700">
          {activity.title}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          {activity.description}
        </p>
      </div>

      <span className="shrink-0 text-[11px] text-slate-400">
        {activity.date
          ? formatDate(activity.date)
          : ""}
      </span>
    </div>
  );
};

// ======================================================
// MAIN DASHBOARD
// ======================================================

const Dashboard = () => {
  const navigate = useNavigate();

  const [data, setData] = useState({
    vacancies: [],
    applications: [],
    interviews: [],
    offers: [],
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState({});

  // Logged-in user
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  // --------------------------------------------------
  // LOAD BACKEND DATA
  // --------------------------------------------------

  const loadDashboard = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    // Known API from the existing dashboard:
    // getVacancies()
    //
    // Other methods are checked before calling so this
    // dashboard remains compatible with your API service.

    const apiGroups = {
      vacancies: ["getVacancies"],
      applications: [
        "getApplications",
        "getAllApplications",
      ],
      interviews: [
        "getInterviews",
        "getAllInterviews",
      ],
      offers: [
        "getJobOffers",
        "getOffers",
        "getAllJobOffers",
      ],
    };

    const results = {};
    const nextErrors = {};

    const requests = Object.entries(apiGroups).map(
      async ([key, methodNames]) => {
        const methodName = methodNames.find(
          (name) =>
            typeof recruitmentApi?.[name] === "function"
        );

        if (!methodName) {
          results[key] = null;
          nextErrors[key] = "API not available";
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
          console.error(
            `Failed to load ${key}:`,
            error
          );

          results[key] = null;
          nextErrors[key] = "Unable to load data";
        }
      }
    );

    await Promise.all(requests);

    setData(results);
    setErrors(nextErrors);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboard();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------
  // DATA AVAILABILITY
  // --------------------------------------------------

  const vacanciesAvailable = Array.isArray(data.vacancies);
  const applicationsAvailable = Array.isArray(data.applications);
  const interviewsAvailable = Array.isArray(data.interviews);
  const offersAvailable = Array.isArray(data.offers);

  const vacancies = data.vacancies || [];
  const applications = data.applications || [];
  const interviews = data.interviews || [];
  const offers = data.offers || [];

  // --------------------------------------------------
  // VACANCY STATISTICS
  // --------------------------------------------------

  const vacancyStats = useMemo(() => {
    const stats = {
      published: 0,
      pending: 0,
      approved: 0,
      draft: 0,
      closed: 0,
      total: vacancies.length,
    };

    vacancies.forEach((vacancy) => {
      const status = getVacancyStatus(vacancy);

      if (status === "PUBLISHED") stats.published++;
      else if (status === "PENDING_APPROVAL") stats.pending++;
      else if (status === "APPROVED") stats.approved++;
      else if (status === "DRAFT") stats.draft++;
      else if (status === "CLOSED") stats.closed++;
    });

    return stats;
  }, [vacancies]);

  // --------------------------------------------------
  // APPLICATION STATISTICS
  // --------------------------------------------------

  const applicationStats = useMemo(() => {
    const stats = {
      total: applications.length,
      shortlisted: 0,
      interviewing: 0,
      selected: 0,
      rejected: 0,
      underReview: 0,
    };

    applications.forEach((application) => {
      const status = getApplicationStatus(application);

      if (isShortlistedStatus(status)) {
        stats.shortlisted++;
      }

      if (isInterviewStatus(status)) {
        stats.interviewing++;
      }

      if (isSelectedStatus(status)) {
        stats.selected++;
      }

      if (isRejectedStatus(status)) {
        stats.rejected++;
      }

      if (
        [
          "SUBMITTED",
          "PENDING",
          "UNDER_REVIEW",
          "IN_REVIEW",
          "SCREENING",
        ].includes(status)
      ) {
        stats.underReview++;
      }
    });

    return stats;
  }, [applications]);

  // --------------------------------------------------
  // INTERVIEW STATISTICS
  // --------------------------------------------------

  const interviewStats = useMemo(() => {
    const now = new Date();

    return {
      total: interviews.length,

      upcoming: interviews.filter((interview) => {
        const date = getDate(interview);
        const status = getInterviewStatus(interview);

        return (
          date &&
          date >= now &&
          !["CANCELLED", "COMPLETED"].includes(status)
        );
      }).length,

      completed: interviews.filter(
        (interview) =>
          getInterviewStatus(interview) === "COMPLETED"
      ).length,
    };
  }, [interviews]);

  // --------------------------------------------------
  // OFFER STATISTICS
  // --------------------------------------------------

  const offerStats = useMemo(() => {
    return {
      total: offers.length,

      accepted: offers.filter((offer) =>
        ["ACCEPTED"].includes(getOfferStatus(offer))
      ).length,

      pending: offers.filter((offer) =>
        ["SENT", "PENDING"].includes(getOfferStatus(offer))
      ).length,

      rejected: offers.filter((offer) =>
        ["REJECTED", "WITHDRAWN"].includes(getOfferStatus(offer))
      ).length,
    };
  }, [offers]);

  // --------------------------------------------------
  // UPCOMING INTERVIEWS
  // --------------------------------------------------

  const upcomingInterviews = useMemo(() => {
    const now = new Date();

    return interviews
      .filter((interview) => {
        const date = getDate(interview);
        const status = getInterviewStatus(interview);

        return (
          date &&
          date >= now &&
          !["CANCELLED", "COMPLETED"].includes(status)
        );
      })
      .sort((a, b) => getDate(a) - getDate(b))
      .slice(0, 5);
  }, [interviews]);

  // --------------------------------------------------
  // RECENT ACTIVITIES
  // --------------------------------------------------

  const recentActivities = useMemo(() => {
    const activities = [];

    applications.forEach((application) => {
      const date = getDate(application);

      activities.push({
        id: `application-${getId(application)}`,
        type: "application",
        title: "Candidate application received",
        description: `${getCandidateName(application)} · ${getVacancyName(application)}`,
        date,
      });
    });

    vacancies.forEach((vacancy) => {
      const date = getDate(vacancy);

      activities.push({
        id: `vacancy-${getId(vacancy)}`,
        type: "vacancy",
        title: `Vacancy ${getVacancyStatus(vacancy).toLowerCase().replace(/_/g, " ")}`,
        description: getVacancyName(vacancy),
        date,
      });
    });

    interviews.forEach((interview) => {
      const date = getDate(interview);

      activities.push({
        id: `interview-${getId(interview)}`,
        type: "interview",
        title: "Interview activity",
        description: `${getInterviewTitle(interview)} · ${getCandidateName(interview)}`,
        date,
      });
    });

    offers.forEach((offer) => {
      const date = getDate(offer);

      activities.push({
        id: `offer-${getId(offer)}`,
        type: "offer",
        title: `Job offer ${getOfferStatus(offer).toLowerCase()}`,
        description: getCandidateName(offer),
        date,
      });
    });

    return activities
      .filter((activity) => activity.date)
      .sort((a, b) => b.date - a.date)
      .slice(0, 6);
  }, [applications, vacancies, interviews, offers]);

  // --------------------------------------------------
  // KPI CARDS
  // --------------------------------------------------

  const kpiCards = [
    {
      title: "Total Vacancies",
      value: vacanciesAvailable ? vacancyStats.total : null,
      description: "All recorded job openings",
      icon: BriefcaseBusiness,
      color: "text-indigo-600",
      background: "bg-indigo-50",
      path: "/recruitment/vacancies",
    },
    {
      title: "Total Applications",
      value: applicationsAvailable ? applicationStats.total : null,
      description: "Candidate applications received",
      icon: Users,
      color: "text-sky-600",
      background: "bg-sky-50",
      path: "/recruitment/applications",
    },
    {
      title: "Shortlisted Candidates",
      value: applicationsAvailable ? applicationStats.shortlisted : null,
      description: "Candidates progressing in recruitment",
      icon: UserCheck,
      color: "text-emerald-600",
      background: "bg-emerald-50",
      path: "/recruitment/applications",
    },
    {
      title: "Scheduled Interviews",
      value: interviewsAvailable ? interviewStats.upcoming : null,
      description: "Upcoming interview sessions",
      icon: CalendarDays,
      color: "text-amber-600",
      background: "bg-amber-50",
      path: "/recruitment/interviews",
    },
  ];

  // --------------------------------------------------
  // GREETING
  // --------------------------------------------------

  const today = new Date();

  const dateLabel = new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(today);

  const firstName = user.fullName
    ? user.fullName.split(" ")[0]
    : "";

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <PageLayout
      role="recruiter"
      activePage="Overview"
      title="Recruitment Dashboard"
      subtitle="Overview of recruitment performance and hiring activities"
    >
      <div className="space-y-7 pb-6">

        {/* ==========================================
            HEADER / WELCOME
        ========================================== */}

        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-800 px-6 py-7 text-white shadow-sm md:px-8 md:py-8">

          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">

            <div className="max-w-2xl">

              <div className="mb-3 flex items-center gap-2 text-indigo-200">
                <Activity size={17} />

                <span className="text-xs font-semibold uppercase tracking-[0.15em]">
                  Recruitment Analytics
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Good {today.getHours() < 12
                  ? "Morning"
                  : today.getHours() < 17
                    ? "Afternoon"
                    : "Evening"}
                {firstName ? `, ${firstName}` : ""}!
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100">
                Get a complete overview of your organization's
                recruitment activities, candidate progress and
                hiring performance.
              </p>

              <div className="mt-5 flex items-center gap-2 text-xs text-indigo-200">
                <CalendarDays size={15} />
                {dateLabel}
              </div>

            </div>

            <div className="flex flex-wrap items-center gap-2">

              <button
                type="button"
                onClick={() => loadDashboard(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />

                Refresh
              </button>

              <button
                type="button"
                onClick={() => navigate("/recruitment/vacancies")}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-800 shadow-sm transition hover:bg-indigo-50"
              >
                <BriefcaseBusiness size={16} />
                View Vacancies
              </button>

            </div>

          </div>

          <div className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full border-[35px] border-white/5" />

          <div className="pointer-events-none absolute -bottom-28 right-1/3 h-64 w-64 rounded-full bg-indigo-400/10 blur-2xl" />

        </section>

        {/* ==========================================
            KPI CARDS
        ========================================== */}

        <section>

          <SectionHeader
            title="Recruitment at a Glance"
            description="Key indicators showing the current state of recruitment."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {kpiCards.map((card) => (
              <KpiCard
                key={card.title}
                {...card}
                loading={loading}
                onClick={() => navigate(card.path)}
              />
            ))}

          </div>

        </section>

        {/* ==========================================
            APPLICATION PIPELINE + VACANCY STATUS
        ========================================== */}

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">

          {/* Application Pipeline */}

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-3 md:p-6">

            <SectionHeader
              title="Application Pipeline"
              description="Track candidate progress through the recruitment stages."
              action="View Applications"
              onAction={() => navigate("/recruitment/applications")}
            />

            {loading ? (
              <div className="space-y-7 py-4">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="animate-pulse space-y-2">
                    <div className="h-3 w-1/3 rounded bg-slate-100" />
                    <div className="h-2 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : !applicationsAvailable ? (
              <EmptyState
                icon={Users}
                title="Application data unavailable"
                description="Application statistics could not be retrieved from the backend."
              />
            ) : applications.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No applications available"
                description="Candidate progress will appear here when applications are received."
              />
            ) : (
              <div className="space-y-6 pt-2">

                <div className="mb-6 rounded-xl bg-indigo-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    Total Applications
                  </p>

                  <div className="mt-1 flex items-end gap-2">
                    <span className="text-3xl font-bold text-indigo-900">
                      {applicationStats.total}
                    </span>

                    <span className="mb-1 text-xs text-indigo-600">
                      Candidates recorded
                    </span>
                  </div>
                </div>

                <PipelineRow
                  label="Under Review"
                  count={applicationStats.underReview}
                  total={applicationStats.total}
                  color={COLORS.blue}
                />

                <PipelineRow
                  label="Shortlisted"
                  count={applicationStats.shortlisted}
                  total={applicationStats.total}
                  color={COLORS.green}
                />

                <PipelineRow
                  label="Interview Stage"
                  count={applicationStats.interviewing}
                  total={applicationStats.total}
                  color={COLORS.amber}
                />

                <PipelineRow
                  label="Selected"
                  count={applicationStats.selected}
                  total={applicationStats.total}
                  color={COLORS.violet}
                />

                <PipelineRow
                  label="Rejected"
                  count={applicationStats.rejected}
                  total={applicationStats.total}
                  color={COLORS.rose}
                />

                <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">
                  Pipeline figures are calculated from application
                  statuses returned by the backend. Candidates may
                  move between stages, so these are current status
                  counts rather than cumulative conversion totals.
                </p>

              </div>
            )}

          </div>

          {/* Vacancy Overview */}

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-2 md:p-6">

            <SectionHeader
              title="Vacancy Overview"
              description="Current status of job openings."
              action="View All"
              onAction={() => navigate("/recruitment/vacancies")}
            />

            {loading ? (
              <div className="animate-pulse space-y-5 py-5">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-4 rounded bg-slate-100"
                  />
                ))}
              </div>
            ) : !vacanciesAvailable ? (
              <EmptyState
                icon={BriefcaseBusiness}
                title="Vacancy data unavailable"
                description="Vacancy statistics could not be retrieved."
              />
            ) : vacancies.length === 0 ? (
              <EmptyState
                icon={BriefcaseBusiness}
                title="No vacancies available"
                description="Created job openings will be summarized here."
              />
            ) : (
              <>
                <div className="relative mx-auto my-5 flex h-40 w-40 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(
                      ${COLORS.indigo} 0% ${getPercentage(vacancyStats.published, vacancyStats.total)}%,
                      ${COLORS.amber} ${getPercentage(vacancyStats.published, vacancyStats.total)}% ${getPercentage(vacancyStats.published + vacancyStats.pending, vacancyStats.total)}%,
                      ${COLORS.green} ${getPercentage(vacancyStats.published + vacancyStats.pending, vacancyStats.total)}% ${getPercentage(vacancyStats.published + vacancyStats.pending + vacancyStats.approved, vacancyStats.total)}%,
                      ${COLORS.blue} ${getPercentage(vacancyStats.published + vacancyStats.pending + vacancyStats.approved, vacancyStats.total)}% ${getPercentage(vacancyStats.published + vacancyStats.pending + vacancyStats.approved + vacancyStats.draft, vacancyStats.total)}%,
                      ${COLORS.slate} ${getPercentage(vacancyStats.published + vacancyStats.pending + vacancyStats.approved + vacancyStats.draft, vacancyStats.total)}% 100%
                    )`,
                  }}
                >
                  <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white">
                    <span className="text-3xl font-bold text-slate-800">
                      {vacancyStats.total}
                    </span>

                    <span className="text-xs text-slate-400">
                      Total Vacancies
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">

                  <VacancyStatusRow
                    label="Published"
                    count={vacancyStats.published}
                    color={COLORS.indigo}
                  />

                  <VacancyStatusRow
                    label="Pending Approval"
                    count={vacancyStats.pending}
                    color={COLORS.amber}
                  />

                  <VacancyStatusRow
                    label="Approved"
                    count={vacancyStats.approved}
                    color={COLORS.green}
                  />

                  <VacancyStatusRow
                    label="Draft"
                    count={vacancyStats.draft}
                    color={COLORS.blue}
                  />

                  <VacancyStatusRow
                    label="Closed"
                    count={vacancyStats.closed}
                    color={COLORS.slate}
                  />

                </div>
              </>
            )}

          </div>

        </section>

        {/* ==========================================
            APPLICATION TRENDS
        ========================================== */}

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">

          <SectionHeader
            title="Application Trends"
            description="Monthly applications received during the current year."
            action="View Applications"
            onAction={() => navigate("/recruitment/applications")}
          />

          {loading ? (
            <div className="flex h-52 items-end gap-3 animate-pulse">
              {MONTHS.map((month, index) => (
                <div
                  key={month}
                  className="flex-1 rounded-t-md bg-slate-100"
                  style={{
                    height: `${30 + ((index * 17) % 65)}%`,
                  }}
                />
              ))}
            </div>
          ) : !applicationsAvailable ? (
            <EmptyState
              icon={TrendingUp}
              title="Trend data unavailable"
              description="Monthly application statistics will appear when the application API is available."
            />
          ) : (
            <ApplicationTrendChart
              applications={applications}
            />
          )}

        </section>

        {/* ==========================================
            INTERVIEWS + RECENT ACTIVITIES
        ========================================== */}

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">

          {/* Upcoming Interviews */}

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">

            <SectionHeader
              title="Upcoming Interviews"
              description="A look at the next scheduled interview sessions."
              action="View Calendar"
              onAction={() => navigate("/recruitment/interviews")}
            />

            {loading ? (
              <div className="animate-pulse space-y-5">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-14 rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : !interviewsAvailable ? (
              <EmptyState
                icon={CalendarDays}
                title="Interview data unavailable"
                description="Upcoming interviews could not be retrieved."
              />
            ) : upcomingInterviews.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No upcoming interviews"
                description="Scheduled interview sessions will appear here."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {upcomingInterviews.map((interview) => (
                  <InterviewItem
                    key={getId(interview)}
                    interview={interview}
                  />
                ))}
              </div>
            )}

          </div>

          {/* Recent Activities */}

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">

            <SectionHeader
              title="Recent Recruitment Activities"
              description="Latest recorded recruitment updates."
            />

            {loading ? (
              <div className="animate-pulse space-y-5">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-14 rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : recentActivities.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No recent activities"
                description="Recent recruitment records with available dates will appear here."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {recentActivities.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                  />
                ))}
              </div>
            )}

          </div>

        </section>

        {/* ==========================================
            HIRING & JOB OFFER SUMMARY
        ========================================== */}

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">

          <SectionHeader
            title="Hiring Summary"
            description="Overview of candidate selection and job offer progress."
            action="Manage Job Offers"
            onAction={() => navigate("/recruitment/offers")}
          />

          {!loading && !applicationsAvailable && !offersAvailable ? (
            <EmptyState
              icon={Award}
              title="Hiring information unavailable"
              description="Hiring and offer statistics will appear when the corresponding backend data is available."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    Selected Candidates
                  </p>

                  <UserRoundCheck
                    size={20}
                    className="text-emerald-600"
                  />
                </div>

                <p className="mt-3 text-2xl font-bold text-slate-800">
                  {loading
                    ? "..."
                    : applicationsAvailable
                      ? applicationStats.selected
                      : "—"}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Based on application status
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    Offers Accepted
                  </p>

                  <CheckCircle2
                    size={20}
                    className="text-green-600"
                  />
                </div>

                <p className="mt-3 text-2xl font-bold text-slate-800">
                  {loading
                    ? "..."
                    : offersAvailable
                      ? offerStats.accepted
                      : "—"}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Candidates accepting offers
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    Pending Offers
                  </p>

                  <Mail
                    size={20}
                    className="text-amber-600"
                  />
                </div>

                <p className="mt-3 text-2xl font-bold text-slate-800">
                  {loading
                    ? "..."
                    : offersAvailable
                      ? offerStats.pending
                      : "—"}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Offers awaiting candidate response
                </p>
              </div>

            </div>
          )}

          {!loading && offersAvailable && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-500">
                Total recorded offers:
              </span>

              <span className="text-sm font-bold text-slate-800">
                {offerStats.total}
              </span>

              <span className="text-xs text-slate-400">
                Rejected / withdrawn: {offerStats.rejected}
              </span>
            </div>
          )}

        </section>

        {/* ==========================================
            FOOTER
        ========================================== */}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Activity size={14} />
            Recruitment Management System
          </div>

          <p className="text-xs text-slate-400">
            Dashboard information is based on available backend records.
          </p>

        </div>

        {/* API ERROR INFORMATION */}

        {!loading && Object.keys(errors).length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">

            <CircleAlert
              size={19}
              className="mt-0.5 shrink-0 text-amber-600"
            />

            <div>
              <p className="text-sm font-semibold text-amber-800">
                Some dashboard information is unavailable
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-700">
                Some recruitment APIs are not connected or could
                not return data. Available dashboard sections
                will continue to work.
              </p>

            </div>

          </div>
        )}

      </div>
    </PageLayout>
  );
};

export default Dashboard;
