
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Filter,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  Circle,
  XCircle,
  Eye,
  X,
  UserRound,
  CalendarDays,
  BriefcaseBusiness,
  ArrowRight,
  RotateCcw,
  Users,
  TrendingUp,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";

const ROUNDS = [
  "Technical Interview",
  "HR Interview",
  "Hiring Manager Interview",
  "Final Interview",
];

const STATUS_OPTIONS = ["Pending", "In Progress", "Completed", "Rejected"];

const first = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ");

const normalizeRecommendation = (value) =>
  normalizeText(value).toUpperCase().replaceAll(" ", "_");

function unwrap(response) {
  let data = response?.data ?? response;

  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return [];

    const key = ["content", "items", "interviews", "results", "data", "result"]
      .find((name) => data[name] && typeof data[name] === "object");

    if (!key) return [];
    data = data[key];
  }

  return Array.isArray(data) ? data : [];
}

function dateOnly(value) {
  if (!value) return null;

  if (Array.isArray(value)) {
    const [year, month, day] = value;
    if (year && month && day) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const text = String(value);
  return text.length >= 10 ? text.slice(0, 10) : text;
}

function formatDate(value) {
  if (!value) return "Not scheduled";

  const raw = dateOnly(value);
  const date = new Date(`${raw}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function getRoundIndex(item) {
  const raw = normalizeText(
    first(
      item.round,
      item.interviewRound,
      item.stage,
      item.interviewType,
      item.type,
      item.roundName,
      item.interviewStage,
      ""
    )
  );

  if (raw.includes("technical") || raw.includes("tech interview")) return 0;
  if (raw === "hr" || raw.includes("hr interview") || raw.includes("human resource")) return 1;
  if (raw.includes("hiring manager") || raw.includes("manager interview")) return 2;
  if (raw.includes("final")) return 3;

  const numericRound = Number(
    first(item.roundNumber, item.stageNumber, item.interviewRoundNumber)
  );

  return numericRound >= 1 && numericRound <= ROUNDS.length
    ? numericRound - 1
    : -1;
}

function getEvaluation(item) {
  const evaluation = first(
    item?.evaluation,
    item?.interviewEvaluation,
    item?.latestEvaluation
  );

  if (evaluation && typeof evaluation === "object") return evaluation;
  return {};
}

function evaluationWasSubmitted(evaluation, item) {
  const status = normalizeText(
    first(
      evaluation.status,
      evaluation.evaluationStatus,
      item.evaluationStatus,
      item.evaluationSubmissionStatus,
      ""
    )
  );

  return (
    evaluation.submitted === true ||
    evaluation.isSubmitted === true ||
    Boolean(evaluation.submittedAt) ||
    Boolean(item.evaluationSubmittedAt) ||
    ["submitted", "completed", "complete", "evaluated"].includes(status)
  );
}

function normalizeStatus(interviewStatus, evaluation, item, recommendation) {
  const rec = normalizeRecommendation(recommendation);
  const interview = normalizeText(interviewStatus);
  const evaluationStatus = normalizeText(
    first(evaluation.status, evaluation.evaluationStatus, item.evaluationStatus, "")
  );

  if (
    ["NO_HIRE", "STRONG_NO_HIRE", "REJECT", "REJECTED", "NOT_RECOMMENDED"].includes(rec) ||
    interview.includes("reject") ||
    interview === "no hire" ||
    interview === "strong no hire" ||
    interview === "not recommended"
  ) {
    return "Rejected";
  }

  if (
    interview.includes("skip") ||
    interview === "cancelled" ||
    interview === "canceled"
  ) {
    return "Skipped";
  }

  if (
    evaluationWasSubmitted(evaluation, item) ||
    ["completed", "complete", "evaluated", "passed", "done"].includes(interview) ||
    ["completed", "complete", "evaluated"].includes(evaluationStatus)
  ) {
    return "Completed";
  }

  if (
    interview.includes("progress") ||
    interview.includes("scheduled") ||
    interview.includes("confirmed") ||
    interview.includes("ongoing") ||
    interview === "started"
  ) {
    return "In Progress";
  }

  return "Pending";
}

const getStatusStyle = (status) =>
  ({
    Completed: "bg-green-100 text-green-700",
    "In Progress": "bg-blue-100 text-blue-700",
    Pending: "bg-amber-100 text-amber-700",
    Rejected: "bg-red-100 text-red-700",
    Skipped: "bg-slate-100 text-slate-500",
  })[status] || "bg-slate-100 text-slate-600";

const getStageIcon = (status) =>
  status === "Completed"
    ? CheckCircle2
    : status === "In Progress"
      ? Clock
      : status === "Rejected"
        ? XCircle
        : Circle;

const getCompletedStages = (candidate) =>
  candidate.stages.filter((stage) => stage.status === "Completed").length;

const getProgress = (candidate) =>
  Math.round((getCompletedStages(candidate) / ROUNDS.length) * 100);

function getCurrentStage(candidate) {
  if (candidate.overallStatus === "Completed") return "All rounds completed";
  if (candidate.overallStatus === "Rejected") return "Recruitment stopped";

  return (
    candidate.stages.find((stage) => stage.status === "In Progress")?.name ||
    candidate.stages.find((stage) => stage.status === "Pending")?.name ||
    "Not assigned"
  );
}

function getRecordTimestamp(item) {
  const evaluation = getEvaluation(item);
  const raw = first(
    item.updatedAt,
    evaluation.submittedAt,
    evaluation.updatedAt,
    item.submittedAt,
    item.createdAt,
    item.scheduledDate,
    item.interviewDate,
    item.scheduledAt
  );

  if (!raw) return 0;

  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeInterviews(rows) {
  const groups = new Map();

  rows.forEach((item) => {
    if (!item || typeof item !== "object") return;

    const application = item.application || item.jobApplication || {};
    const candidateInfo = item.candidate || item.applicant || {};
    const vacancy = item.jobVacancy || item.vacancy || {};

    const applicationId = first(
      item.applicationId,
      item.jobApplicationId,
      application.id,
      application.applicationId
    );

    const candidateEmail = first(
      item.candidateEmail,
      candidateInfo.email,
      item.applicantEmail,
      application.email,
      application.candidateEmail,
      ""
    );

    const candidateId = first(
      item.candidateId,
      candidateInfo.id,
      item.applicantId,
      application.candidateId,
      null
    );

    const jobId = first(
      item.jobVacancyId,
      item.vacancyId,
      vacancy.id,
      application.jobVacancyId,
      application.vacancyId,
      null
    );

    const jobTitle = first(
      item.jobTitle,
      item.vacancyTitle,
      vacancy.title,
      application.jobTitle,
      application.vacancyTitle,
      "Not specified"
    );

    const candidateName = first(
      item.candidateName,
      candidateInfo.fullName,
      candidateInfo.name,
      item.applicantName,
      application.candidateName,
      application.applicantName,
      "Candidate"
    );

    // Never use the interview record ID as a candidate ID.
    // One application may have several interview records.
    const groupKey =
      applicationId != null
        ? `application:${applicationId}`
        : candidateEmail
          ? `email:${String(candidateEmail).trim().toLowerCase()}:job:${jobId ?? jobTitle}`
          : candidateId != null
            ? `candidate:${candidateId}:job:${jobId ?? jobTitle}`
            : `interview:${item.id ?? item.interviewId ?? Math.random()}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        id: applicationId ?? groupKey,
        applicationId: applicationId ?? null,
        candidateId: candidateId ?? null,
        candidateName,
        candidateEmail,
        phone: first(
          item.candidatePhone,
          item.phone,
          candidateInfo.phone,
          application.phone,
          ""
        ),
        jobTitle,
        appliedDate: dateOnly(
          first(
            item.appliedDate,
            application.appliedAt,
            application.createdAt,
            item.applicationCreatedAt
          )
        ),
        stages: ROUNDS.map((name) => ({
          name,
          status: "Pending",
          date: null,
          interviewer: "Not assigned",
          score: null,
          recommendation: "",
          feedback: "",
          _timestamp: -1,
        })),
      });
    }

    const candidate = groups.get(groupKey);
    const roundIndex = getRoundIndex(item);

    // Records without a recognizable round cannot be assigned to a stage.
    if (roundIndex < 0) return;

    const evaluation = getEvaluation(item);
    const recommendation = first(
      evaluation.recommendation,
      item.recommendation,
      item.result,
      ""
    );

    const interviewStatus = first(
      item.interviewStatus,
      item.status,
      item.statusName,
      ""
    );

    const status = normalizeStatus(
      interviewStatus,
      evaluation,
      item,
      recommendation
    );

    const timestamp = getRecordTimestamp(item);
    const stage = candidate.stages[roundIndex];

    // Keep the newest record if multiple interviews exist for one round.
    if (timestamp >= stage._timestamp) {
      const interviewers = Array.isArray(item.interviewers)
        ? item.interviewers
            .map((person) => person?.fullName || person?.name || person?.employeeName)
            .filter(Boolean)
            .join(", ")
        : "";

      Object.assign(stage, {
        status,
        date: dateOnly(
          first(
            item.scheduledDate,
            item.interviewDate,
            item.date,
            item.scheduledAt,
            item.startTime
          )
        ),
        interviewer: first(
          item.interviewerName,
          item.interviewer?.fullName,
          item.interviewer?.name,
          interviewers,
          stage.interviewer
        ),
        score: first(
          evaluation.overallScore,
          evaluation.score,
          item.score,
          item.overallScore,
          null
        ),
        recommendation,
        feedback: first(
          evaluation.feedback,
          evaluation.comments,
          item.feedback,
          item.comments,
          ""
        ),
        _timestamp: timestamp,
      });
    }
  });

  return [...groups.values()].map((candidate) => {
    const rejected = candidate.stages.some(
      (stage) => stage.status === "Rejected"
    );

    const allCompleted = candidate.stages.every(
      (stage) => stage.status === "Completed"
    );

    const hasProgress = candidate.stages.some(
      (stage) =>
        stage.status === "Completed" || stage.status === "In Progress"
    );

    candidate.overallStatus = rejected
      ? "Rejected"
      : allCompleted
        ? "Completed"
        : hasProgress
          ? "In Progress"
          : "Pending";

    if (rejected) {
      let rejectionReached = false;

      candidate.stages = candidate.stages.map((stage) => {
        if (stage.status === "Rejected") {
          rejectionReached = true;
          return stage;
        }

        if (rejectionReached && stage.status === "Pending") {
          return { ...stage, status: "Skipped" };
        }

        return stage;
      });
    }

    candidate.currentRound = getCurrentStage(candidate);
    candidate.stages = candidate.stages.map(({ _timestamp, ...stage }) => stage);

    return candidate;
  });
}

function StatCard({ title, value, description, icon: Icon, iconStyle }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <div className={`rounded-xl p-3 ${iconStyle}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ candidate }) {
  const completed = getCompletedStages(candidate);
  const progress = getProgress(candidate);

  return (
    <div className="min-w-32">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700">
          {completed}/{ROUNDS.length} rounds
        </span>
        <span className="text-xs text-slate-500">{progress}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={`${candidate.candidateName} interview progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div
          className={`h-full rounded-full transition-all ${
            candidate.overallStatus === "Rejected"
              ? "bg-red-400"
              : "bg-indigo-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function CandidateProgressModal({ candidate, onClose }) {
  if (!candidate) return null;

  const completed = getCompletedStages(candidate);
  const progress = getProgress(candidate);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="progress-modal-title"
        className="my-4 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Candidate Interview Journey
            </p>
            <h2
              id="progress-modal-title"
              className="mt-1 text-xl font-bold text-slate-900"
            >
              {candidate.candidateName}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{candidate.jobTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(100vh-180px)] space-y-6 overflow-y-auto p-5 sm:p-7">
          <div className="grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                <UserRound size={22} />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{candidate.candidateName}</p>
                <p className="mt-1 break-all text-sm text-slate-500">
                  {candidate.candidateEmail || "Email not available"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {candidate.phone || "Phone not available"}
                </p>
                {candidate.applicationId != null && (
                  <p className="mt-1 text-xs text-slate-400">
                    Application ID: {candidate.applicationId}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2">
                <BriefcaseBusiness size={16} /> {candidate.jobTitle}
              </p>
              <p className="flex items-center gap-2">
                <CalendarDays size={16} /> Applied: {formatDate(candidate.appliedDate)}
              </p>
              <p className="flex items-center gap-2">
                <ClipboardCheck size={16} /> {candidate.overallStatus}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">Overall Progress</h3>
              <span className="text-sm font-bold text-indigo-700">{progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  candidate.overallStatus === "Rejected"
                    ? "bg-red-400"
                    : "bg-indigo-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
              <span>{completed} of {ROUNDS.length} stages completed</span>
              <span>{getCurrentStage(candidate)}</span>
            </div>
          </div>

          <section>
            <h3 className="mb-5 font-semibold text-slate-900">
              Interview Stage Timeline
            </h3>
            <div className="space-y-4">
              {ROUNDS.map((round, index) => {
                const stage = candidate.stages.find((item) => item.name === round);
                const Icon = getStageIcon(stage.status);

                return (
                  <div key={round} className="flex gap-4">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        stage.status === "Completed"
                          ? "bg-green-100 text-green-700"
                          : stage.status === "In Progress"
                            ? "bg-blue-100 text-blue-700"
                            : stage.status === "Rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0 flex-1 rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {index + 1}. {round}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Interviewer: {stage.interviewer}
                          </p>
                        </div>
                        <span
                          className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(stage.status)}`}
                        >
                          {stage.status}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays size={14} /> {formatDate(stage.date)}
                        </span>
                        {stage.score != null && (
                          <span className="font-semibold text-slate-700">
                            Score: {stage.score}/5
                          </span>
                        )}
                      </div>

                      {stage.recommendation && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Recommendation
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {stage.recommendation}
                          </p>
                        </div>
                      )}

                      {stage.feedback && (
                        <div className="mt-3 rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Interview Feedback
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                            {stage.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {candidate.overallStatus === "Rejected" && (
            <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle size={19} />
              <p>This candidate's recruitment process has stopped.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 px-5 py-4 sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InterviewProgress() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roundFilter, setRoundFilter] = useState("All");
  const [jobFilter, setJobFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const requestInFlight = useRef(false);
  const mounted = useRef(false);

  const loadProgress = useCallback(async ({ silent = false } = {}) => {
    if (requestInFlight.current) return;

    requestInFlight.current = true;
    if (!silent) {
      if (candidates.length === 0) setLoading(true);
      else setRefreshing(true);
    }
    setError("");

    try {
      if (typeof recruitmentApi?.getInterviews !== "function") {
        throw new Error(
          "recruitmentApi.getInterviews() is unavailable. Add it in src/services/api.js."
        );
      }

      const response = await recruitmentApi.getInterviews();
      const rows = unwrap(response);
      const normalized = normalizeInterviews(rows);

      if (!mounted.current) return;

      setCandidates(normalized);
      setSelectedCandidate((current) => {
        if (!current) return null;

        return (
          normalized.find(
            (candidate) => String(candidate.id) === String(current.id)
          ) ?? null
        );
      });
    } catch (e) {
      console.error("Could not load interview progress:", e);

      if (!silent && mounted.current) {
        setError(
          e?.response?.data?.message ||
            e?.message ||
            "Could not load interview progress from the backend."
        );
      }
    } finally {
      requestInFlight.current = false;

      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [candidates.length]);

  useEffect(() => {
    mounted.current = true;
    loadProgress();

    const handleFocus = () => loadProgress({ silent: true });
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadProgress({ silent: true });
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadProgress({ silent: true });
      }
    }, 15000);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted.current = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadProgress]);

  const jobTitles = useMemo(
    () => [...new Set(candidates.map((candidate) => candidate.jobTitle).filter(Boolean))],
    [candidates]
  );

  const stats = useMemo(
    () => ({
      total: candidates.length,
      completed: candidates.filter((candidate) => candidate.overallStatus === "Completed").length,
      inProgress: candidates.filter((candidate) => candidate.overallStatus === "In Progress").length,
      pending: candidates.filter((candidate) => candidate.overallStatus === "Pending").length,
      rejected: candidates.filter((candidate) => candidate.overallStatus === "Rejected").length,
      stageCompletions: candidates.reduce(
        (total, candidate) => total + getCompletedStages(candidate),
        0
      ),
    }),
    [candidates]
  );

  const filteredCandidates = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const order = { "In Progress": 0, Pending: 1, Completed: 2, Rejected: 3 };

    return candidates
      .filter((candidate) => {
        const searchable = [
          candidate.candidateName,
          candidate.candidateEmail,
          candidate.jobTitle,
          candidate.currentRound,
          candidate.applicationId,
        ]
          .filter((value) => value != null && value !== "")
          .join(" ")
          .toLowerCase();

        const currentStage = getCurrentStage(candidate);

        return (
          searchable.includes(query) &&
          (statusFilter === "All" || candidate.overallStatus === statusFilter) &&
          (jobFilter === "All" || candidate.jobTitle === jobFilter) &&
          (roundFilter === "All" || currentStage === roundFilter)
        );
      })
      .sort(
        (a, b) => (order[a.overallStatus] ?? 4) - (order[b.overallStatus] ?? 4)
      );
  }, [candidates, searchTerm, statusFilter, jobFilter, roundFilter]);

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setRoundFilter("All");
    setJobFilter("All");
  };

  return (
    <PageLayout
      role="recruiter"
      activePage="Interview Progress"
      title="Interview Progress"
      subtitle="Track candidate progress through every interview stage"
    >
      <div className="min-h-full bg-slate-50/70 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <BriefcaseBusiness size={16} />
                <span>Recruitment</span>
                <ChevronRight size={14} />
                <span className="text-slate-700">Interview Progress</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Interview Progress
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">
                Monitor candidate journeys from technical interviews to final interviews and review stage outcomes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadProgress()}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              <RotateCcw size={16} className={refreshing ? "animate-spin" : ""} />
              {loading ? "Loading..." : refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Unable to load interview progress</p>
                <p className="mt-1">{error}</p>
                <p className="mt-2 text-xs">
                  Check that the recruitment backend is running and that GET interviews returns interview rounds and evaluation details.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Candidates"
              value={stats.total}
              description="Applications with interview records"
              icon={Users}
              iconStyle="bg-indigo-50 text-indigo-600"
            />
            <StatCard
              title="In Progress"
              value={stats.inProgress}
              description="Candidates in active interview stages"
              icon={Clock}
              iconStyle="bg-blue-50 text-blue-600"
            />
            <StatCard
              title="Completed"
              value={stats.completed}
              description="Candidates completing all four rounds"
              icon={CheckCircle2}
              iconStyle="bg-green-50 text-green-600"
            />
            <StatCard
              title="Completed Stages"
              value={stats.stageCompletions}
              description="Total interview stages completed"
              icon={TrendingUp}
              iconStyle="bg-violet-50 text-violet-600"
            />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="font-semibold text-slate-900">Interview Pipeline</h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a stage to filter candidates by their current stage.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {ROUNDS.map((round, index) => {
                const stageCandidates = candidates.filter((candidate) => {
                  const currentStage = getCurrentStage(candidate);
                  return currentStage === round;
                }).length;

                const completed = candidates.filter((candidate) =>
                  candidate.stages.some(
                    (stage) => stage.name === round && stage.status === "Completed"
                  )
                ).length;

                const selected = roundFilter === round;

                return (
                  <button
                    type="button"
                    key={round}
                    onClick={() =>
                      setRoundFilter((current) => (current === round ? "All" : round))
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-100"
                        : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                        {index + 1}
                      </span>
                      <span className="text-xs text-slate-500">{completed} completed</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-800">{round}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {stageCandidates} current candidates
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Candidate Progress</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {loading
                    ? "Loading candidates..."
                    : `${filteredCandidates.length} candidate${filteredCandidates.length !== 1 ? "s" : ""} found`}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search candidates..."
                    aria-label="Search candidates"
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-64"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowFilters((value) => !value)}
                  aria-expanded={showFilters}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium ${
                    showFilters
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Filter size={16} /> Filters
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 gap-4 border-b border-slate-200 bg-slate-50 p-5 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label
                    htmlFor="progress-status-filter"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Overall Status
                  </label>
                  <select
                    id="progress-status-filter"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  >
                    <option value="All">All</option>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="progress-round-filter"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Current Interview Round
                  </label>
                  <select
                    id="progress-round-filter"
                    value={roundFilter}
                    onChange={(event) => setRoundFilter(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  >
                    <option value="All">All</option>
                    {ROUNDS.map((round) => (
                      <option key={round} value={round}>{round}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="progress-job-filter"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Job Position
                  </label>
                  <select
                    id="progress-job-filter"
                    value={jobFilter}
                    onChange={(event) => setJobFilter(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  >
                    <option value="All">All</option>
                    {jobTitles.map((job) => (
                      <option key={job} value={job}>{job}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    {["Candidate", "Job Position", "Current Stage", "Progress", "Overall Status"].map(
                      (heading) => (
                        <th key={heading} className="px-5 py-4 font-semibold">{heading}</th>
                      )
                    )}
                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {!loading && filteredCandidates.map((candidate) => (
                    <tr key={candidate.id} className="transition hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700">
                            {(candidate.candidateName || "Candidate")
                              .split(" ")
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{candidate.candidateName}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {candidate.candidateEmail || "Email unavailable"}
                            </p>
                            {candidate.applicationId != null && (
                              <p className="mt-1 text-xs text-slate-400">
                                Application #{candidate.applicationId}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-700">{candidate.jobTitle}</span>
                        <p className="mt-1 text-xs text-slate-400">
                          Applied {formatDate(candidate.appliedDate)}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-slate-700">
                        {getCurrentStage(candidate)}
                      </td>

                      <td className="px-5 py-4">
                        <ProgressBar candidate={candidate} />
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(candidate.overallStatus)}`}
                        >
                          {candidate.overallStatus}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setSelectedCandidate(candidate)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            <Eye size={15} /> View Progress <ArrowRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {loading && (
                    <tr>
                      <td colSpan={6} className="px-5 py-14 text-center text-sm text-slate-500">
                        Loading interview progress from backend...
                      </td>
                    </tr>
                  )}

                  {!loading && filteredCandidates.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-14 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <Search size={22} />
                        </div>
                        <p className="mt-3 font-semibold text-slate-700">
                          No interview progress records found
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          No backend interview records match these filters.
                        </p>
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="mt-3 text-sm font-semibold text-indigo-600"
                        >
                          Clear filters
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
              Showing {loading ? "…" : filteredCandidates.length} of {candidates.length} applications returned by the backend. Auto-refreshes every 15 seconds.
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Stage Status Guide</h2>
            <div className="mt-4 flex flex-wrap gap-4">
              {[
                { label: "Completed", icon: CheckCircle2 },
                { label: "In Progress", icon: Clock },
                { label: "Pending", icon: Circle },
                { label: "Rejected", icon: XCircle },
              ].map(({ label, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon
                    size={17}
                    className={
                      label === "Completed"
                        ? "text-green-600"
                        : label === "In Progress"
                          ? "text-blue-600"
                          : label === "Rejected"
                            ? "text-red-600"
                            : "text-slate-400"
                    }
                  />
                  <span className="text-sm text-slate-600">{label}</span>
                </div>
              ))}
            </div>

            {stats.rejected > 0 && (
              <p className="mt-4 text-xs text-slate-500">
                {stats.rejected} candidate{stats.rejected !== 1 ? "s have" : " has"} stopped progressing through the interview pipeline.
              </p>
            )}
          </section>
        </div>
      </div>

      {selectedCandidate && (
        <CandidateProgressModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}
    </PageLayout>
  );
}
