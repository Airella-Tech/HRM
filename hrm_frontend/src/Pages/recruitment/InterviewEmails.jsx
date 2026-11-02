
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Mail,
  Search,
  Filter,
  RefreshCw,
  Eye,
  X,
  CalendarDays,
  Clock3,
  UserRound,
  Video,
  MapPin,
  CircleAlert,
  CheckCircle2,
  Users,
  LoaderCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";

const statusStyles = {
  Pending: "bg-amber-50 text-amber-700",
  Sent: "bg-green-50 text-green-700",
  Failed: "bg-red-50 text-red-700",
};

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const unwrapResponse = (response) => {
  let value = response;

  for (let i = 0; i < 4; i += 1) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return value;

    for (const key of [
      "data",
      "result",
      "content",
      "items",
      "records",
      "emails",
      "logs",
    ]) {
      if (Array.isArray(value[key])) return value[key];
    }

    const nested = firstValue(value.data, value.result, value.content);

    if (nested && typeof nested === "object") {
      value = nested;
      continue;
    }

    return value;
  }

  return value;
};

const normalizeStatus = (value) => {
  const status = String(value || "Pending").trim().toLowerCase();

  if (["sent", "success", "successful", "delivered"].includes(status)) {
    return "Sent";
  }

  if (["failed", "failure", "error", "rejected"].includes(status)) {
    return "Failed";
  }

  return "Pending";
};

const normalizeRecipientType = (source) => {
  const raw = String(
    firstValue(
      source.recipientType,
      source.recipientRole,
      source.recipient_type,
      source.recipientKind,
      source.emailType,
      source.recipientCategory,
      source.targetType,
      "",
    ),
  ).toLowerCase();

  if (raw.includes("candidate")) return "Candidate";

  if (
    raw.includes("interviewer") ||
    raw.includes("interview_panel") ||
    raw.includes("panel")
  ) {
    return "Interviewer";
  }

  const context = String(
    firstValue(
      source.notificationType,
      source.templateType,
      source.type,
      source.eventType,
      "",
    ),
  ).toLowerCase();

  if (context.includes("candidate")) return "Candidate";
  if (context.includes("interviewer") || context.includes("panel")) {
    return "Interviewer";
  }

  return "Unknown";
};

const normalizeEmail = (item, index) => {
  const source = item && typeof item === "object" ? item : {};

  const interview =
    source.interview ||
    source.interviewDetails ||
    source.scheduledInterview ||
    {};

  const candidateObject =
    source.candidateDetails ||
    (source.candidate && typeof source.candidate === "object"
      ? source.candidate
      : null) ||
    interview.candidate ||
    {};

  const vacancyObject =
    source.vacancyDetails ||
    source.jobVacancy ||
    (source.vacancy && typeof source.vacancy === "object"
      ? source.vacancy
      : null) ||
    interview.vacancy ||
    {};

  const scheduledDateTime = firstValue(
    source.interviewDateTime,
    source.scheduledDateTime,
    source.scheduledAt,
    source.interviewStart,
    source.startDateTime,
    interview.interviewDateTime,
    interview.scheduledDateTime,
    interview.scheduledAt,
    interview.startDateTime,
    interview.startAt,
    interview.startTime,
  );

  const directDate = firstValue(
    source.interviewDate,
    source.scheduledDate,
    source.interview_date,
    source.scheduled_date,
    source.date,
    interview.interviewDate,
    interview.scheduledDate,
    interview.interview_date,
    interview.scheduled_date,
    interview.date,
  );

  const directTime = firstValue(
    source.interviewTime,
    source.scheduledTime,
    source.interview_time,
    source.scheduled_time,
    source.time,
    interview.interviewTime,
    interview.scheduledTime,
    interview.interview_time,
    interview.scheduled_time,
    interview.time,
  );

  let interviewDate = directDate || "";
  let interviewTime = directTime || "";

  if (scheduledDateTime) {
    const parsed = new Date(scheduledDateTime);

    if (!Number.isNaN(parsed.getTime())) {
      interviewDate = interviewDate || parsed.toISOString().slice(0, 10);

      interviewTime =
        interviewTime ||
        `${String(parsed.getHours()).padStart(2, "0")}:${String(
          parsed.getMinutes(),
        ).padStart(2, "0")}`;
    } else if (!interviewDate) {
      interviewDate = String(scheduledDateTime);
    }
  }

  const candidateName = firstValue(
    source.candidateName,
    source.candidateFullName,
    typeof source.candidate === "string" ? source.candidate : undefined,
    candidateObject.fullName,
    candidateObject.name,
    [candidateObject.firstName, candidateObject.lastName]
      .filter(Boolean)
      .join(" "),
    "",
  );

  const vacancyTitle = firstValue(
    source.vacancyTitle,
    source.jobTitle,
    typeof source.vacancy === "string" ? source.vacancy : undefined,
    vacancyObject.title,
    vacancyObject.jobTitle,
    "",
  );

  return {
    ...source,
    id: firstValue(
      source.id,
      source.emailId,
      source.emailLogId,
      source.email_log_id,
      `email-record-${index}`,
    ),
    recipientEmail: firstValue(
      source.recipientEmail,
      source.recipient_email,
      source.toEmail,
      source.email,
      source.to,
      typeof source.recipient === "string" ? source.recipient : undefined,
      source.recipient?.email,
      source.toAddress,
      "",
    ),
    recipientName: firstValue(
      source.recipientName,
      source.recipientFullName,
      source.toName,
      source.recipient?.name,
      source.interviewerName,
      candidateName,
      "",
    ),
    recipientType: normalizeRecipientType(source),
    candidate: candidateName || "Unknown candidate",
    vacancy: vacancyTitle || "No vacancy",
    round: firstValue(
      source.roundName,
      source.interviewRound,
      source.round,
      interview.roundName,
      interview.round,
      "",
    ),
    subject: firstValue(source.subject, source.emailSubject, ""),
    notificationType: firstValue(
      source.notificationType,
      source.templateType,
      source.type,
      source.eventType,
      "Interview notification",
    ),
    interviewDate,
    interviewTime,
    duration: firstValue(
      source.duration,
      source.durationMinutes,
      interview.duration,
      interview.durationMinutes,
      "",
    ),
    status: normalizeStatus(source.status),
    errorMessage: firstValue(
      source.errorMessage,
      source.error,
      source.failureReason,
      source.lastError,
      "",
    ),
    createdAt: firstValue(
      source.createdAt,
      source.created_at,
      source.createdDate,
      source.createdOn,
      "",
    ),
    sentAt: firstValue(
      source.sentAt,
      source.sent_at,
      source.sentDate,
      source.sentOn,
      "",
    ),
    meetingLink: firstValue(
      source.meetingLink,
      source.meetingUrl,
      source.videoLink,
      interview.meetingLink,
      interview.meetingUrl,
      "",
    ),
    location: firstValue(
      source.location,
      source.interviewLocation,
      interview.location,
      interview.interviewLocation,
      "",
    ),
  };
};

const formatDate = (value) => {
  if (!value) return "Not scheduled";

  const text = String(value);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T00:00:00`)
    : new Date(text);

  if (Number.isNaN(date.getTime())) return text;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "Not set";

  const text = String(value);
  const match = text.match(/^(\d{1,2}):(\d{2})/);

  if (match) {
    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);

      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    }
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime())
    ? text
    : date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const getStatusClass = (status) =>
  statusStyles[status] || "bg-slate-100 text-slate-700";

const getErrorMessage = (error) =>
  typeof error === "string"
    ? error
    : error?.message ||
      "The request failed. Please check the backend and try again.";

export default function InterviewEmails() {
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [loadError, setLoadError] = useState("");

  const showMessage = useCallback((text, type = "info") => {
    setMessage(text);
    setMessageType(type);
  }, []);

  const refreshLogs = useCallback(
    async (showConfirmation = false) => {
      setLoading(true);
      setLoadError("");

      try {
        const response = await recruitmentApi.getInterviewEmailLogs();
        const payload = unwrapResponse(response);

        if (!Array.isArray(payload)) {
          throw new Error(
            payload?.message ||
              "The backend response did not contain an email-record list.",
          );
        }

        setLogs(payload.map((item, index) => normalizeEmail(item, index)));

        if (showConfirmation) {
          showMessage(
            "Interview email history refreshed from the backend.",
            "success",
          );
        }
      } catch (error) {
        console.error("Failed to load interview email records:", error);

        const errorText = getErrorMessage(error);
        setLoadError(errorText);

        showMessage(
          `Could not load interview email records. ${errorText}`,
          "error",
        );
      } finally {
        setLoading(false);
      }
    },
    [showMessage],
  );

  useEffect(() => {
    refreshLogs(false);
  }, [refreshLogs]);

  const tabLogs = useMemo(() => {
    if (activeTab === "All") return logs;

    return logs.filter((email) => email.recipientType === activeTab);
  }, [logs, activeTab]);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tabLogs.filter((item) => {
      const searchableValues = [
        item.candidate,
        item.vacancy,
        item.round,
        item.recipientName,
        item.recipientEmail,
        item.recipientType,
        item.subject,
        item.notificationType,
      ];

      const matchesSearch =
        !query ||
        searchableValues.some((value) =>
          String(value || "").toLowerCase().includes(query),
        );

      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tabLogs, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: tabLogs.length,
      pending: tabLogs.filter((item) => item.status === "Pending").length,
      sent: tabLogs.filter((item) => item.status === "Sent").length,
      failed: tabLogs.filter((item) => item.status === "Failed").length,
    }),
    [tabLogs],
  );

  const retryEmail = async (email) => {
    if (!email?.id || String(email.id).startsWith("email-record-")) {
      showMessage(
        "This email record has no valid backend ID, so it cannot be retried.",
        "error",
      );
      return;
    }

    setRetryingId(email.id);

    try {
      const response = await recruitmentApi.retryInterviewEmail(email.id);
      const payload = unwrapResponse(response);

      const updated =
        payload && typeof payload === "object" && !Array.isArray(payload)
          ? normalizeEmail(payload, 0)
          : null;

      if (updated) {
        setLogs((current) =>
          current.map((item) =>
            String(item.id) === String(updated.id) ? updated : item,
          ),
        );
      }

      await refreshLogs(false);

      const responseMessage = response?.message || response?.data?.message;
      const status = updated?.status || normalizeStatus(payload?.status);

      if (status === "Sent") {
        showMessage(
          responseMessage || "The email was accepted by the SMTP server.",
          "success",
        );
      } else {
        showMessage(
          responseMessage ||
            "The retry request completed, but the status is not Sent. Check the email record for details.",
          "error",
        );
      }
    } catch (error) {
      console.error("Failed to retry interview email:", error);

      showMessage(
        `Could not retry this email. ${getErrorMessage(error)}`,
        "error",
      );
    } finally {
      setRetryingId(null);
    }
  };

  const messageStyles =
    messageType === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : messageType === "success"
        ? "border-green-200 bg-green-50 text-green-800"
        : "border-slate-200 bg-white text-slate-700";

  const tabs = [
    { label: "All Emails", value: "All", count: logs.length },
    {
      label: "Candidate Emails",
      value: "Candidate",
      count: logs.filter((item) => item.recipientType === "Candidate").length,
    },
    {
      label: "Interviewer Emails",
      value: "Interviewer",
      count: logs.filter((item) => item.recipientType === "Interviewer").length,
    },
  ];

  return (
    <PageLayout
      role="recruiter"
      activePage="Interviews"
      title="Interview Email History"
    >
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        {/* Back button stays above the title and action buttons. */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg py-2 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        {/* Title and actions share one row on desktop. */}
        <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <h1 className="min-w-0 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
            Interview Email History
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => refreshLogs(true)}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <RefreshCw size={17} />
              )}
              Refresh records
            </button>

            <button
              type="button"
              onClick={() => navigate("/recruitment/interviews")}
              className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
            >
              <CalendarDays size={17} />
              Interview Scheduling
            </button>
          </div>
        </div>

        {message && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-5 flex items-start justify-between gap-3 rounded-xl border p-4 text-sm ${messageStyles}`}
          >
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage("")}
              aria-label="Dismiss message"
              className="shrink-0 rounded p-0.5 hover:bg-black/5"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {loadError && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <CircleAlert size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Unable to load email history</p>
              <p className="mt-1 break-words">{loadError}</p>
              <p className="mt-2">
                Check that Recruitment Backend is running on port 5008, your
                login token is valid, and your account has the{" "}
                <code>INTERVIEW_SCHEDULE</code> permission.
              </p>
            </div>
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Email records", value: stats.total, icon: Mail },
            { label: "Pending", value: stats.pending, icon: Clock3 },
            { label: "Sent", value: stats.sent, icon: CheckCircle2 },
            { label: "Failed", value: stats.failed, icon: CircleAlert },
          ].map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">{card.label}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-800">
                      {card.value}
                    </p>
                  </div>
                  <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                    <Icon size={22} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-800">
                Email sending history
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose a recipient group to view the corresponding email
                records.
              </p>
            </div>

            <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-100">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${
                    activeTab === tab.value
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      activeTab === tab.value
                        ? "bg-indigo-50 text-indigo-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search candidate, recipient, subject..."
                  aria-label="Search email notifications"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="relative">
                <Filter
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter by email status"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="All">All statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Sent">Sent</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Candidate / Vacancy",
                    "Recipient",
                    "Email subject",
                    "Interview date",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center">
                      <LoaderCircle
                        size={28}
                        className="mx-auto mb-3 animate-spin text-indigo-500"
                      />
                      <p className="font-semibold text-slate-700">
                        Loading email records...
                      </p>
                    </td>
                  </tr>
                )}

                {!loading &&
                  filteredLogs.map((email) => (
                    <tr key={email.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">
                          {email.candidate}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {email.vacancy}
                          {email.round ? ` · ${email.round}` : ""}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {email.recipientType === "Candidate" ? (
                            <UserRound size={16} className="text-slate-400" />
                          ) : (
                            <Users size={16} className="text-slate-400" />
                          )}

                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              {email.recipientType === "Unknown"
                                ? "Recipient type unavailable"
                                : email.recipientType}
                            </p>

                            {email.recipientName && (
                              <p className="mt-1 text-xs text-slate-600">
                                {email.recipientName}
                              </p>
                            )}

                            <p className="mt-1 text-xs text-slate-500">
                              {email.recipientEmail || "Email not configured"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="max-w-xs px-5 py-4">
                        <p className="break-words text-sm text-slate-700">
                          {email.subject || "No subject"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {email.notificationType}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="whitespace-nowrap text-sm text-slate-700">
                          {formatDate(email.interviewDate)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatTime(email.interviewTime)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                            email.status,
                          )}`}
                        >
                          {email.status}
                        </span>

                        {email.errorMessage && (
                          <p className="mt-1 max-w-48 break-words text-xs text-red-600">
                            {email.errorMessage}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedEmail(email)}
                            title="View email details"
                            aria-label={`View notification for ${
                              email.recipientEmail || "recipient"
                            }`}
                            className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Eye size={17} />
                          </button>

                          {(email.status === "Failed" ||
                            email.status === "Pending") && (
                            <button
                              type="button"
                              onClick={() => retryEmail(email)}
                              disabled={retryingId !== null}
                              title="Retry sending this email"
                              aria-label="Retry sending email"
                              className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {retryingId === email.id ? (
                                <LoaderCircle
                                  size={17}
                                  className="animate-spin"
                                />
                              ) : (
                                <RefreshCw size={17} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                {!loading && filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center">
                      <Mail size={34} className="mx-auto mb-3 text-slate-300" />
                      <p className="font-semibold text-slate-700">
                        {loadError
                          ? "Email records are unavailable"
                          : "No email records found"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {loadError
                          ? "Resolve the API error above and refresh."
                          : logs.length === 0
                            ? "The backend returned no email logs. Confirm the email service saves a record for each recipient."
                            : activeTab !== "All"
                              ? `No ${activeTab.toLowerCase()} email records were found. Check that the backend returns recipientType for each email log.`
                              : "Try changing your search or status filter."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-5 py-4 text-sm text-slate-500">
            Showing {filteredLogs.length} of {tabLogs.length} records in this
            view ({logs.length} total).
          </div>
        </section>

        {selectedEmail && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedEmail(null);
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="email-details-title"
              className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-200 p-5">
                <div>
                  <h2
                    id="email-details-title"
                    className="text-xl font-bold text-slate-800"
                  >
                    Email notification details
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Details returned by the Recruitment backend.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedEmail(null)}
                  aria-label="Close email details"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5 sm:p-6">
                {[
                  ["Recipient type", selectedEmail.recipientType],
                  ["Recipient name", selectedEmail.recipientName],
                  [
                    "Recipient email",
                    selectedEmail.recipientEmail || "Not configured",
                  ],
                  ["Subject", selectedEmail.subject],
                  ["Candidate", selectedEmail.candidate],
                  ["Vacancy", selectedEmail.vacancy],
                  ["Interview round", selectedEmail.round],
                  ["Interview date", formatDate(selectedEmail.interviewDate)],
                  ["Interview time", formatTime(selectedEmail.interviewTime)],
                  [
                    "Duration",
                    selectedEmail.duration
                      ? `${selectedEmail.duration} minutes`
                      : "—",
                  ],
                  ["Notification type", selectedEmail.notificationType],
                  ["Status", selectedEmail.status],
                  ["Error", selectedEmail.errorMessage || "—"],
                  ["Created at", formatDateTime(selectedEmail.createdAt)],
                  ["Sent at", formatDateTime(selectedEmail.sentAt)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {label}
                    </p>
                    <p className="mt-1 break-words text-sm font-medium text-slate-800">
                      {value || "—"}
                    </p>
                  </div>
                ))}

                {selectedEmail.meetingLink ? (
                  <a
                    href={selectedEmail.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <Video size={16} /> Open meeting link
                  </a>
                ) : selectedEmail.location ? (
                  <p className="flex items-start gap-2 text-sm text-slate-700">
                    <MapPin size={16} /> {selectedEmail.location}
                  </p>
                ) : null}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                  A “Sent” status means the backend reports the email was
                  accepted by the SMTP server. It does not guarantee that it
                  reached the recipient’s inbox.
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-200 bg-slate-50 p-4">
                <button
                  type="button"
                  onClick={() => setSelectedEmail(null)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
