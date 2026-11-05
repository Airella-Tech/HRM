
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BriefcaseBusiness,
  Users,
  FileText,
  CalendarDays,
  CheckCircle2,
  Clock3,
  UserRoundCheck,
  Award,
  Activity,
  ArrowUpRight,
  ArrowRight,
  RefreshCw,
  CircleAlert,
  Mail,
  Plus,
  TrendingUp,
  ShieldCheck,
  BarChart3,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";

// ==================================================
// CONSTANTS
// ==================================================

const COLORS = {
  indigo: "#6366f1",
  blue: "#0ea5e9",
  green: "#10b981",
  amber: "#f59e0b",
  violet: "#8b5cf6",
  rose: "#f43f5e",
  slate: "#94a3b8",
};

const INITIAL_ACCESS = {
  fullAccess: false,
  hasRecruitmentAccess: false,
  permissions: [],
  roles: [],
};

const INITIAL_AVAILABILITY = {
  vacancies: null,
  applications: null,
  interviews: null,
  offers: null,
};

// ==================================================
// RECRUITMENT MODULES
// ==================================================

const recruitmentModules = [
  {
    title: "Job Vacancies",
    description: "Create, update, and manage job openings.",
    icon: BriefcaseBusiness,
    path: "/recruitment/vacancies",
    color: "bg-indigo-50 text-indigo-600",
    permissions: [
      "VACANCY_CREATE",
      "VACANCY_APPROVE",
      "VACANCY_PUBLISH",
    ],
  },
  {
    title: "Applications",
    description: "Review applications submitted by candidates.",
    icon: FileText,
    path: "/recruitment/applications",
    color: "bg-sky-50 text-sky-600",
    permissions: ["APPLICATION_VIEW"],
  },
  {
    title: "Candidate Records",
    description: "View and manage candidate application records.",
    icon: Users,
    path: "/recruitment/candidates",
    color: "bg-emerald-50 text-emerald-600",
    permissions: ["APPLICATION_VIEW"],
  },
  {
    title: "Interview Scheduling",
    description: "Organize interviews and view scheduled sessions.",
    icon: CalendarDays,
    path: "/recruitment/interviews",
    color: "bg-amber-50 text-amber-600",
    permissions: [
      "INTERVIEW_SCHEDULE",
      "INTERVIEW_EVALUATE",
    ],
  },
  {
    title: "Job Offers",
    description: "Manage candidate job offers and responses.",
    icon: Award,
    path: "/recruitment/job-offers",
    color: "bg-violet-50 text-violet-600",
    permissions: ["OFFER_MANAGE"],
  },
];

// ==================================================
// HELPER FUNCTIONS
// ==================================================

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

const getLoggedInUser = () => {
  try {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      return JSON.parse(storedUser);
    }
  } catch (error) {
    console.warn("Unable to read logged-in user:", error);
  }

  return {};
};

// Supports common Spring Boot and API response wrappers.
const getArray = (response) => {
  let value = response;

  const possibleKeys = [
    "content",
    "data",
    "items",
    "results",
    "applications",
    "vacancies",
    "interviews",
    "offers",
    "jobOffers",
  ];

  for (let i = 0; i < 6; i += 1) {
    if (Array.isArray(value)) {
      return value;
    }

    if (!value || typeof value !== "object") {
      return null;
    }

    let found = false;

    for (const key of possibleKeys) {
      if (Array.isArray(value[key])) {
        return value[key];
      }
    }

    for (const key of ["data", "content", "result"]) {
      if (
        value[key] &&
        typeof value[key] === "object" &&
        !Array.isArray(value[key])
      ) {
        value = value[key];
        found = true;
        break;
      }
    }

    if (!found) {
      break;
    }
  }

  return Array.isArray(value) ? value : null;
};

const unwrapObject = (response) => {
  let value = response;

  for (let i = 0; i < 5; i += 1) {
    if (
      value?.data &&
      typeof value.data === "object" &&
      !Array.isArray(value.data)
    ) {
      value = value.data;
    } else {
      break;
    }
  }

  return value || {};
};

const getPermissionCode = (permission) => {
  if (typeof permission === "string") {
    return normalize(permission);
  }

  return normalize(
    permission?.permissionCode ||
      permission?.code ||
      permission?.name ||
      permission?.permission
  );
};

const getRoleCode = (role) => {
  if (typeof role === "string") {
    return normalize(role);
  }

  return normalize(
    role?.roleCode ||
      role?.code ||
      role?.roleName ||
      role?.name
  );
};

const parseAccess = (response) => {
  const data = unwrapObject(response);

  const permissions = Array.isArray(data.permissions)
    ? data.permissions.map(getPermissionCode).filter(Boolean)
    : [];

  const roles = Array.isArray(data.roles)
    ? data.roles.map(getRoleCode).filter(Boolean)
    : [];

  const fullAccess =
    data.fullAccess === true ||
    roles.includes("ADMIN") ||
    roles.includes("HR_MANAGER");

  return {
    fullAccess,
    hasRecruitmentAccess:
      data.hasRecruitmentAccess === true,
    permissions,
    roles,
  };
};

const getStatus = (item, field) =>
  normalize(item?.[field] || item?.status);

const getVacancyStatus = (item) =>
  getStatus(item, "vacancyStatus");

const getApplicationStatus = (item) =>
  getStatus(item, "applicationStatus");

const getOfferStatus = (item) =>
  getStatus(item, "offerStatus");

const getInterviewStatus = (item) =>
  getStatus(item, "interviewStatus");

const isSelected = (status) =>
  [
    "SELECTED",
    "HIRED",
    "OFFER_ACCEPTED",
    "ACCEPTED",
  ].includes(status);

const isRejected = (status) =>
  [
    "REJECTED",
    "DECLINED",
    "NOT_SELECTED",
  ].includes(status);

const isShortlisted = (status) =>
  [
    "SHORTLISTED",
    "SHORTLIST",
  ].includes(status);

const isInterviewStage = (status) =>
  status.includes("INTERVIEW") ||
  [
    "IN_PROGRESS",
    "INTERVIEWING",
  ].includes(status);

const isUnderReview = (status) =>
  [
    "PENDING",
    "APPLIED",
    "SUBMITTED",
    "UNDER_REVIEW",
    "APPLICATION_RECEIVED",
    "SCREENING",
    "IN_REVIEW",
  ].includes(status);

const percentage = (value, total) =>
  total > 0
    ? Math.min(100, Math.round((value / total) * 100))
    : 0;

const getErrorMessage = (error) => {
  const status = error?.response?.status;

  if (status === 403) {
    return "403 Forbidden: Your recruitment role does not have permission to access this API endpoint.";
  }

  if (status === 401) {
    return "401 Unauthorized: Your session may have expired. Please log in again.";
  }

  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Unable to retrieve data."
  );
};

// Calls the first available method.
// If the selected method returns 403, it does not silently
// try another endpoint with potentially different permissions.
const callAvailableApi = async (methodNames) => {
  const methodName = methodNames.find(
    (name) =>
      typeof recruitmentApi?.[name] === "function"
  );

  if (!methodName) {
    throw new Error(
      `API method not found. Expected one of: ${methodNames.join(", ")}`
    );
  }

  return recruitmentApi[methodName]();
};

const hasAnyPermission = (permissions, required) =>
  required.some((permission) =>
    permissions.includes(permission)
  );

// ==================================================
// REUSABLE COMPONENTS
// ==================================================

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
    disabled={loading}
    className="group w-full rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-100 hover:shadow-lg disabled:cursor-default"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <p className="mt-3 text-3xl font-bold tracking-tight text-slate-800">
          {loading ? (
            <span className="inline-block h-9 w-14 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            Number(value ?? 0).toLocaleString()
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

const PipelineRow = ({
  label,
  count,
  total,
  color,
}) => (
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
          {percentage(count, total)}%
        </span>
      </div>
    </div>

    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${percentage(count, total)}%`,
          backgroundColor: color,
        }}
      />
    </div>
  </div>
);

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

const RoleBadge = ({ role }) => (
  <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white">
    {role.replace(/_/g, " ")}
  </span>
);

// ==================================================
// MAIN DASHBOARD COMPONENT
// ==================================================

const Dashboard = () => {
  const navigate = useNavigate();

  const [user] = useState(getLoggedInUser);

  // ----------------------------------------------
  // ACCESS INFORMATION
  // ----------------------------------------------

  const [access, setAccess] = useState(INITIAL_ACCESS);
  const [accessLoaded, setAccessLoaded] = useState(false);

  // ----------------------------------------------
  // DASHBOARD DATA
  // ----------------------------------------------

  const [vacancies, setVacancies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [offers, setOffers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [availability, setAvailability] = useState(
    INITIAL_AVAILABILITY
  );

  const [errors, setErrors] = useState({});

  // ----------------------------------------------
  // PERMISSION CHECKS
  // ----------------------------------------------

  const hasPermission = useCallback(
    (permission) =>
      access.fullAccess ||
      access.permissions.includes(permission),
    [access]
  );

  const canViewVacancies =
    hasPermission("VACANCY_CREATE") ||
    hasPermission("VACANCY_APPROVE") ||
    hasPermission("VACANCY_PUBLISH");

  const canViewApplications =
    hasPermission("APPLICATION_VIEW");

  const canScheduleInterviews =
    hasPermission("INTERVIEW_SCHEDULE");

  const canEvaluateInterviews =
    hasPermission("INTERVIEW_EVALUATE");

  const canViewInterviews =
    canScheduleInterviews || canEvaluateInterviews;

  const canViewOffers =
    hasPermission("OFFER_MANAGE");

  const canViewAnySection =
    canViewVacancies ||
    canViewApplications ||
    canViewInterviews ||
    canViewOffers;

  // ----------------------------------------------
  // LOAD DASHBOARD DATA
  // ----------------------------------------------

  const loadDashboardData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrors({});

      try {
        // 1. Load the current user's permissions.

        if (
          typeof recruitmentApi?.getMyAccess !== "function"
        ) {
          throw new Error(
            "getMyAccess() is missing from recruitmentApi."
          );
        }

        const accessResponse =
          await recruitmentApi.getMyAccess();

        const userAccess = parseAccess(accessResponse);

        setAccess(userAccess);
        setAccessLoaded(true);

        // 2. Check whether the user has recruitment access.

        const hasAccess =
          userAccess.fullAccess ||
          userAccess.hasRecruitmentAccess ||
          userAccess.permissions.length > 0;

        if (!hasAccess) {
          setVacancies([]);
          setApplications([]);
          setInterviews([]);
          setOffers([]);

          setAvailability(INITIAL_AVAILABILITY);

          setErrors({
            access:
              "Your account does not currently have recruitment access. Please contact your administrator.",
          });

          return;
        }

        // 3. Prepare requests only for permitted sections.

        const requests = [];

        const canLoadVacancies =
          userAccess.fullAccess ||
          hasAnyPermission(userAccess.permissions, [
            "VACANCY_CREATE",
            "VACANCY_APPROVE",
            "VACANCY_PUBLISH",
          ]);

        const canLoadApplications =
          userAccess.fullAccess ||
          userAccess.permissions.includes(
            "APPLICATION_VIEW"
          );

        const canLoadInterviews =
          userAccess.fullAccess ||
          hasAnyPermission(userAccess.permissions, [
            "INTERVIEW_SCHEDULE",
            "INTERVIEW_EVALUATE",
          ]);

        const canLoadOffers =
          userAccess.fullAccess ||
          userAccess.permissions.includes("OFFER_MANAGE");

        if (canLoadVacancies) {
          requests.push({
            key: "vacancies",
            methods: ["getVacancies"],
            setter: setVacancies,
          });
        } else {
          setVacancies([]);
        }

        if (canLoadApplications) {
          requests.push({
            key: "applications",
            methods: [
              "getApplications",
              "getAllApplications",
            ],
            setter: setApplications,
          });
        } else {
          setApplications([]);
        }

        // Interview endpoint depends on the user's role.
        //
        // Schedulers need the general interview list.
        // Evaluation-only users should see assigned interviews.
        //
        // Do not fall back from an assigned-interview endpoint
        // to a general endpoint for an evaluator-only user.

        if (canLoadInterviews) {
          const isEvaluatorOnly =
            !userAccess.fullAccess &&
            userAccess.permissions.includes(
              "INTERVIEW_EVALUATE"
            ) &&
            !userAccess.permissions.includes(
              "INTERVIEW_SCHEDULE"
            );

          requests.push({
            key: "interviews",
            methods: isEvaluatorOnly
              ? ["getMyAssignedInterviews"]
              : ["getInterviews", "getAllInterviews"],
            setter: setInterviews,
          });
        } else {
          setInterviews([]);
        }

        if (canLoadOffers) {
          requests.push({
            key: "offers",
            methods: [
              "getJobOffers",
              "getOffers",
              "getAllJobOffers",
            ],
            setter: setOffers,
          });
        } else {
          setOffers([]);
        }

        // 4. Execute permitted requests independently.

        const newAvailability = {
          ...INITIAL_AVAILABILITY,
        };

        const newErrors = {};

        const results = await Promise.allSettled(
          requests.map((request) =>
            callAvailableApi(request.methods)
          )
        );

        results.forEach((result, index) => {
          const request = requests[index];

          if (result.status === "fulfilled") {
            const data = getArray(result.value);

            if (data !== null) {
              request.setter(data);
              newAvailability[request.key] = true;
            } else {
              request.setter([]);
              newAvailability[request.key] = false;

              newErrors[request.key] =
                "The API returned an unsupported response format. Check the API response structure.";
            }
          } else {
            request.setter([]);
            newAvailability[request.key] = false;

            newErrors[request.key] = getErrorMessage(
              result.reason
            );

            console.error(
              `Unable to load ${request.key}:`,
              result.reason
            );
          }
        });

        setAvailability(newAvailability);
        setErrors(newErrors);
      } catch (error) {
        console.error(
          "Unable to load recruitment dashboard:",
          error
        );

        setAccess(INITIAL_ACCESS);
        setAccessLoaded(false);

        setVacancies([]);
        setApplications([]);
        setInterviews([]);
        setOffers([]);

        setAvailability(INITIAL_AVAILABILITY);

        setErrors({
          access: getErrorMessage(error),
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // ----------------------------------------------
  // APPLICATION STATISTICS
  // ----------------------------------------------

  const applicationStats = useMemo(() => {
    const stats = {
      total: applications.length,
      underReview: 0,
      shortlisted: 0,
      interviewing: 0,
      selected: 0,
      rejected: 0,
      other: 0,
    };

    applications.forEach((application) => {
      const status = getApplicationStatus(application);

      if (isSelected(status)) {
        stats.selected += 1;
      } else if (isRejected(status)) {
        stats.rejected += 1;
      } else if (isShortlisted(status)) {
        stats.shortlisted += 1;
      } else if (isInterviewStage(status)) {
        stats.interviewing += 1;
      } else if (isUnderReview(status)) {
        stats.underReview += 1;
      } else {
        stats.other += 1;
      }
    });

    return stats;
  }, [applications]);

  // ----------------------------------------------
  // VACANCY STATISTICS
  // ----------------------------------------------

  const vacancyStats = useMemo(() => {
    const stats = {
      total: vacancies.length,
      published: 0,
      pending: 0,
      approved: 0,
      draft: 0,
      closed: 0,
      other: 0,
    };

    vacancies.forEach((vacancy) => {
      const status = getVacancyStatus(vacancy);

      if (status === "PUBLISHED") {
        stats.published += 1;
      } else if (
        ["PENDING_APPROVAL", "PENDING"].includes(status)
      ) {
        stats.pending += 1;
      } else if (status === "APPROVED") {
        stats.approved += 1;
      } else if (status === "DRAFT") {
        stats.draft += 1;
      } else if (
        ["CLOSED", "EXPIRED", "ARCHIVED"].includes(status)
      ) {
        stats.closed += 1;
      } else {
        stats.other += 1;
      }
    });

    return stats;
  }, [vacancies]);

  // ----------------------------------------------
  // INTERVIEW STATISTICS
  // ----------------------------------------------

  const interviewStats = useMemo(
    () => ({
      total: interviews.length,

      completed: interviews.filter(
        (item) =>
          getInterviewStatus(item) === "COMPLETED"
      ).length,

      scheduled: interviews.filter(
        (item) =>
          getInterviewStatus(item) === "SCHEDULED"
      ).length,

      inProgress: interviews.filter(
        (item) =>
          getInterviewStatus(item) === "IN_PROGRESS"
      ).length,
    }),
    [interviews]
  );

  // ----------------------------------------------
  // JOB OFFER STATISTICS
  // ----------------------------------------------

  const offerStats = useMemo(() => {
    const stats = {
      total: offers.length,
      accepted: 0,
      pending: 0,
      rejected: 0,
      draft: 0,
      sent: 0,
    };

    offers.forEach((offer) => {
      const status = getOfferStatus(offer);

      if (
        ["ACCEPTED", "OFFER_ACCEPTED"].includes(status)
      ) {
        stats.accepted += 1;
      } else if (
        ["SENT", "PENDING"].includes(status)
      ) {
        stats.pending += 1;
        stats.sent += 1;
      } else if (status === "DRAFT") {
        stats.draft += 1;
      } else if (
        [
          "REJECTED",
          "WITHDRAWN",
          "DECLINED",
        ].includes(status)
      ) {
        stats.rejected += 1;
      }
    });

    return stats;
  }, [offers]);

  // ----------------------------------------------
  // KPI CARDS
  // ----------------------------------------------

  const kpiCards = [
    {
      title: "Total Vacancies",
      value: vacancyStats.total,
      description: "Recorded job openings",
      icon: BriefcaseBusiness,
      color: "text-indigo-600",
      background: "bg-indigo-50",
      path: "/recruitment/vacancies",
      visible: canViewVacancies,
      available: availability.vacancies,
    },
    {
      title: "Applications",
      value: applicationStats.total,
      description: "Candidate applications",
      icon: Users,
      color: "text-sky-600",
      background: "bg-sky-50",
      path: "/recruitment/applications",
      visible: canViewApplications,
      available: availability.applications,
    },
    {
      title: "Interviews",
      value: interviewStats.total,
      description: "Accessible interview records",
      icon: CalendarDays,
      color: "text-amber-600",
      background: "bg-amber-50",
      path: "/recruitment/interviews",
      visible: canViewInterviews,
      available: availability.interviews,
    },
    {
      title: "Job Offers",
      value: offerStats.total,
      description: "Recorded job offers",
      icon: Award,
      color: "text-emerald-600",
      background: "bg-emerald-50",
      path: "/recruitment/job-offers",
      visible: canViewOffers,
      available: availability.offers,
    },
  ];

  const visibleKpiCards = kpiCards.filter(
    (card) => card.visible
  );

  // ----------------------------------------------
  // RECRUITMENT MODULE VISIBILITY
  // ----------------------------------------------

  const visibleRecruitmentModules =
    recruitmentModules.filter((module) => {
      if (access.fullAccess) {
        return true;
      }

      return hasAnyPermission(
        access.permissions,
        module.permissions
      );
    });

  // ----------------------------------------------
  // VACANCY DONUT CHART
  // ----------------------------------------------

  const donutGradient = useMemo(() => {
    const values = [
      {
        value: vacancyStats.published,
        color: COLORS.indigo,
      },
      {
        value: vacancyStats.pending,
        color: COLORS.amber,
      },
      {
        value: vacancyStats.approved,
        color: COLORS.green,
      },
      {
        value: vacancyStats.draft,
        color: COLORS.blue,
      },
      {
        value: vacancyStats.closed,
        color: COLORS.slate,
      },
    ];

    if (vacancyStats.total === 0) {
      return "conic-gradient(#e2e8f0 0% 100%)";
    }

    let current = 0;

    const segments = values
      .filter((item) => item.value > 0)
      .map((item) => {
        const start = current;

        current +=
          (item.value / vacancyStats.total) * 100;

        return `${item.color} ${start}% ${current}%`;
      });

    return `conic-gradient(${segments.join(", ")})`;
  }, [vacancyStats]);

  // ----------------------------------------------
  // HERO BUTTON DESTINATION
  // ----------------------------------------------

  const primaryDestination = canViewVacancies
    ? "/recruitment/vacancies"
    : canViewApplications
      ? "/recruitment/applications"
      : canViewInterviews
        ? "/recruitment/interviews"
        : canViewOffers
          ? "/recruitment/job-offers"
          : "/recruitment";

  const primaryActionLabel = canViewVacancies
    ? "Manage Vacancies"
    : canViewApplications
      ? "View Applications"
      : canViewInterviews
        ? "View Interviews"
        : canViewOffers
          ? "Manage Job Offers"
          : "Recruitment Overview";

  // ----------------------------------------------
  // RENDER
  // ----------------------------------------------

  return (
    <PageLayout
      role="recruiter"
      activePage="Overview"
      title={`Welcome${user?.fullName ? `, ${user.fullName}` : ""}!`}
      subtitle="Recruitment overview and hiring activities"
    >
      <div className="space-y-6">

        {/* REFRESH AND ROLE INFORMATION */}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
              <ShieldCheck size={14} />
              Role-based dashboard
            </span>

            {accessLoaded &&
              access.roles.map((role) => (
                <span
                  key={role}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
                >
                  {role.replace(/_/g, " ")}
                </span>
              ))}
          </div>

          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                refreshing ? "animate-spin" : ""
              }
            />

            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* WELCOME SECTION */}

        <section className="relative overflow-hidden rounded-2xl bg-primary-800 p-6 text-white shadow-sm md:p-8">
          <div className="relative z-10 max-w-2xl">
            <p className="mb-2 text-xs font-bold tracking-[0.18em] text-primary-100">
              RECRUITMENT WORKSPACE
            </p>

            <h2 className="text-2xl font-bold leading-tight md:text-3xl">
              Find the right people for your team.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-primary-100 md:text-base">
              Manage vacancies, review candidate applications,
              coordinate interviews, and support your hiring
              process from one place.
            </p>

            <button
              type="button"
              onClick={() => navigate(primaryDestination)}
              disabled={
                !accessLoaded ||
                !canViewAnySection
              }
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary-700 shadow-sm transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={17} />
              {primaryActionLabel}
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full border-[35px] border-white/5" />

          <div className="pointer-events-none absolute -bottom-28 right-1/3 h-64 w-64 rounded-full bg-indigo-400/10 blur-2xl" />

          <div className="pointer-events-none absolute bottom-5 right-8 hidden opacity-10 md:block">
            <BriefcaseBusiness size={120} />
          </div>
        </section>

        {/* KPI CARDS */}

        <section>
          <SectionHeader
            title="Recruitment at a Glance"
            description="Key indicators available to your assigned recruitment role."
          />

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-36 animate-pulse rounded-2xl border border-slate-100 bg-white"
                />
              ))}
            </div>
          ) : visibleKpiCards.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {visibleKpiCards.map((card) => (
                <KpiCard
                  key={card.title}
                  {...card}
                  loading={false}
                  onClick={() => navigate(card.path)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white">
              <EmptyState
                icon={BriefcaseBusiness}
                title="No dashboard sections available"
                description="Your current recruitment role does not have permissions to view these dashboard statistics."
              />
            </div>
          )}
        </section>

        {/* APPLICATION PIPELINE AND VACANCY OVERVIEW */}

        {(canViewApplications || canViewVacancies) && (
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">

            {/* APPLICATION PIPELINE */}

            {canViewApplications && (
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-3 md:p-6">
                <SectionHeader
                  title="Application Pipeline"
                  description="Track candidate progress through recruitment stages."
                  action="View Applications"
                  onAction={() =>
                    navigate("/recruitment/applications")
                  }
                />

                {loading ? (
                  <div className="animate-pulse space-y-7 py-4">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className="space-y-2"
                      >
                        <div className="h-3 w-1/3 rounded bg-slate-100" />
                        <div className="h-2 rounded bg-slate-100" />
                      </div>
                    ))}
                  </div>
                ) : availability.applications === false ? (
                  <EmptyState
                    icon={Users}
                    title="Application data unavailable"
                    description="The application API request failed. Check the error details below and verify the backend permission."
                  />
                ) : !applications.length ? (
                  <EmptyState
                    icon={FileText}
                    title="No applications available"
                    description="Candidate progress will appear here when applications are received."
                  />
                ) : (
                  <div className="space-y-6 pt-2">
                    <div className="rounded-xl bg-indigo-50/70 p-4">
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
                      Pipeline figures are based on each
                      application's current status. Applications
                      with unrecognized statuses are not included
                      in the displayed stages.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* VACANCY OVERVIEW */}

            {canViewVacancies && (
              <div
                className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6 ${
                  canViewApplications
                    ? "xl:col-span-2"
                    : "xl:col-span-5"
                }`}
              >
                <SectionHeader
                  title="Vacancy Overview"
                  description="Current status of job openings."
                  action="View All"
                  onAction={() =>
                    navigate("/recruitment/vacancies")
                  }
                />

                {loading ? (
                  <div className="animate-pulse space-y-5 py-5">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className="h-4 rounded bg-slate-100"
                      />
                    ))}
                  </div>
                ) : availability.vacancies === false ? (
                  <EmptyState
                    icon={BriefcaseBusiness}
                    title="Vacancy data unavailable"
                    description="The vacancy API request failed. Check the backend permission and API method."
                  />
                ) : !vacancies.length ? (
                  <EmptyState
                    icon={BriefcaseBusiness}
                    title="No vacancies available"
                    description="Created job openings will be summarized here."
                  />
                ) : (
                  <>
                    <div
                      className="relative mx-auto my-5 flex h-40 w-40 items-center justify-center rounded-full"
                      style={{
                        background: donutGradient,
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

                      {vacancyStats.other > 0 && (
                        <VacancyStatusRow
                          label="Other statuses"
                          count={vacancyStats.other}
                          color="#cbd5e1"
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {/* RECRUITMENT MODULES */}

        {visibleRecruitmentModules.length > 0 && (
          <section>
            <SectionHeader
              title="Recruitment Management"
              description="Open a section available to your assigned role."
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleRecruitmentModules.map((module) => {
                const Icon = module.icon;

                return (
                  <button
                    key={module.title}
                    type="button"
                    onClick={() => navigate(module.path)}
                    className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg"
                  >
                    <div
                      className={`rounded-xl p-3 ${module.color}`}
                    >
                      <Icon size={22} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-800 group-hover:text-primary-700">
                        {module.title}
                      </h3>

                      <p className="mt-1 text-sm leading-5 text-slate-500">
                        {module.description}
                      </p>

                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-600">
                        Open section

                        <ArrowRight
                          size={15}
                          className="transition group-hover:translate-x-1"
                        />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* RECRUITMENT WORKFLOW */}

        {(canViewApplications || canViewInterviews) && (
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary-50 p-3 text-primary-600">
                <TrendingUp size={21} />
              </div>

              <div>
                <h2 className="font-bold text-slate-800">
                  Recruitment Workflow
                </h2>

                <p className="text-sm text-slate-500">
                  Follow the recruitment process through its stages.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Applications",
                  icon: FileText,
                  color: "text-sky-600",
                  visible: canViewApplications,
                },
                {
                  label: "Shortlisting",
                  icon: CheckCircle2,
                  color: "text-emerald-600",
                  visible: canViewApplications,
                },
                {
                  label: "Interviews",
                  icon: CalendarDays,
                  color: "text-amber-600",
                  visible: canViewInterviews,
                },
                {
                  label: "Final Decision",
                  icon: Clock3,
                  color: "text-primary-600",
                  visible: canViewInterviews,
                },
              ]
                .filter((step) => step.visible)
                .map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.label}
                      className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"
                    >
                      <Icon
                        size={20}
                        className={step.color}
                      />

                      <div>
                        <p className="text-xs text-slate-400">
                          STEP {index + 1}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {step.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* HIRING SUMMARY */}

        {(canViewApplications ||
          canViewOffers ||
          canViewInterviews) && (
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
            <SectionHeader
              title="Hiring Summary"
              description="Overview of hiring activities available to your role."
              action={
                canViewOffers
                  ? "Manage Job Offers"
                  : undefined
              }
              onAction={() =>
                navigate("/recruitment/job-offers")
              }
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

              {/* SELECTED CANDIDATES */}

              {canViewApplications && (
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
                      : availability.applications === true
                        ? applicationStats.selected
                        : "—"}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Based on application status
                  </p>
                </div>
              )}

              {/* ACCEPTED OFFERS */}

              {canViewOffers && (
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
                      : availability.offers === true
                        ? offerStats.accepted
                        : "—"}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Candidates accepting offers
                  </p>
                </div>
              )}

              {/* PENDING OFFERS */}

              {canViewOffers && (
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
                      : availability.offers === true
                        ? offerStats.pending
                        : "—"}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Offers awaiting candidate response
                  </p>
                </div>
              )}

              {/* INTERVIEW SUMMARY */}

              {canViewInterviews && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500">
                      Completed Interviews
                    </p>

                    <CalendarDays
                      size={20}
                      className="text-amber-600"
                    />
                  </div>

                  <p className="mt-3 text-2xl font-bold text-slate-800">
                    {loading
                      ? "..."
                      : availability.interviews === true
                        ? interviewStats.completed
                        : "—"}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    From accessible interview records
                  </p>
                </div>
              )}
            </div>

            {canViewOffers &&
              !loading &&
              availability.offers === true && (
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

                  <span className="text-xs text-slate-400">
                    Draft: {offerStats.draft}
                  </span>
                </div>
              )}

            {canViewInterviews &&
              !loading &&
              availability.interviews === true && (
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                  <span className="text-xs text-slate-500">
                    Total accessible interviews:
                  </span>

                  <span className="text-sm font-bold text-slate-800">
                    {interviewStats.total}
                  </span>

                  <span className="text-xs text-slate-400">
                    Scheduled: {interviewStats.scheduled}
                  </span>

                  <span className="text-xs text-slate-400">
                    In progress: {interviewStats.inProgress}
                  </span>
                </div>
              )}
          </section>
        )}

        {/* NO ACCESS MESSAGE */}

        {accessLoaded && !canViewAnySection && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={20}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <div>
                <h3 className="text-sm font-semibold text-amber-800">
                  No recruitment permissions assigned
                </h3>

                <p className="mt-1 text-sm leading-5 text-amber-700">
                  Your account can access the recruitment
                  workspace, but no dashboard permissions are
                  currently assigned. Please contact your
                  Recruitment Manager or administrator.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Activity size={14} />
            Recruitment Management System
          </div>

          <p className="text-xs text-slate-400">
            Dashboard information is based on the permissions
            assigned to your recruitment role.
          </p>
        </div>

        {/* API ERRORS */}

        {!loading &&
          Object.keys(errors).length > 0 && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <CircleAlert
                  size={19}
                  className="mt-0.5 shrink-0 text-amber-600"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-amber-800">
                    Some dashboard information is unavailable
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-700">
                    One or more permitted API requests failed.
                    Check the details below. A 403 response
                    usually requires a backend permission
                    correction.
                  </p>

                  <ul className="mt-3 space-y-2">
                    {Object.entries(errors).map(
                      ([key, message]) => (
                        <li
                          key={key}
                          className="rounded-lg border border-amber-100 bg-white/70 p-3"
                        >
                          <p className="text-xs font-bold capitalize text-amber-800">
                            {key}
                          </p>

                          <p className="mt-1 break-words text-xs leading-5 text-amber-700">
                            {message}
                          </p>
                        </li>
                      )
                    )}
                  </ul>

                  <button
                    type="button"
                    onClick={() => loadDashboardData(true)}
                    disabled={refreshing}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-200 disabled:opacity-50"
                  >
                    <RefreshCw
                      size={13}
                      className={
                        refreshing ? "animate-spin" : ""
                      }
                    />
                    Retry failed requests
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </PageLayout>
  );
};

export default Dashboard;
