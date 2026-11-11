import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  CalendarCheck,
  ArrowLeft,
  CheckCircle2,
  Filter,
  Clock3,
  CircleAlert,
  RefreshCw,
  LoaderCircle,
  X,
  ShieldCheck,
  Hourglass,
  XCircle,
} from "lucide-react";

import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";

const ROUNDS = [
  "Technical Interview",
  "HR Interview",
  "Hiring Manager Interview",
  "Final Interview",
];

const REFRESH_INTERVAL_MS = 15000;

// --------------------------------------------------
// GENERAL HELPERS
// --------------------------------------------------

const first = (...values) =>
  values.find(
    (value) =>
      value !== undefined && value !== null && String(value).trim() !== "",
  );

const normalizeId = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value).trim();
};

const isValidApplicationId = (value) => {
  const id = normalizeId(value);
  return id !== null && /^\d+$/.test(id) && Number(id) > 0;
};

const normalizeStatus = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const sameText = (a, b) =>
  String(a ?? "")
    .trim()
    .toLowerCase() ===
  String(b ?? "")
    .trim()
    .toLowerCase();

const isTruthyFlag = (value) =>
  value === true ||
  value === 1 ||
  (typeof value === "string" &&
    ["true", "1", "yes"].includes(value.trim().toLowerCase()));

// --------------------------------------------------
// HTTP ERROR HELPERS
// --------------------------------------------------

/*
 * The request() helper in api.js may return a normal Error
 * containing "404: ..." without setting response.status.
 *
 * This helper checks all common places where the HTTP status
 * might be stored, including the error message.
 */
const getHttpStatus = (error) => {
  const directStatus =
    error?.status ??
    error?.response?.status ??
    error?.statusCode ??
    error?.cause?.status;

  if (directStatus !== undefined && directStatus !== null) {
    const parsedStatus = Number(directStatus);

    if (Number.isFinite(parsedStatus)) {
      return parsedStatus;
    }
  }

  const message = String(error?.message ?? "");

  const match = message.match(
    /(?:^|\D)(400|401|403|404|409|422|500|502|503)(?=\s*:|\s|$)/,
  );

  return match ? Number(match[1]) : null;
};

// --------------------------------------------------
// API RESPONSE HELPERS
// --------------------------------------------------

const unwrapResponse = (response) => {
  let result = response?.data ?? response;

  for (let i = 0; i < 8; i += 1) {
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      return result;
    }

    const nestedKey = ["data", "result", "payload"].find(
      (key) =>
        result[key] !== undefined &&
        result[key] !== null &&
        typeof result[key] === "object",
    );

    if (!nestedKey) {
      return result;
    }

    result = result[nestedKey];
  }

  return result;
};

const getResponseData = (response) => {
  let result = response?.data ?? response;

  for (let i = 0; i < 10; i += 1) {
    if (Array.isArray(result)) {
      return result;
    }

    if (!result || typeof result !== "object") {
      return [];
    }

    const arrayKeys = [
      "content",
      "items",
      "interviews",
      "applications",
      "shortlistedApplications",
      "shortlistedCandidates",
      "results",
      "records",
    ];

    for (const key of arrayKeys) {
      if (Array.isArray(result[key])) {
        return result[key];
      }
    }

    const nestedKey = ["data", "result", "payload"].find(
      (key) => result[key] && typeof result[key] === "object",
    );

    if (!nestedKey) {
      return [];
    }

    result = result[nestedKey];
  }

  return Array.isArray(result) ? result : [];
};

const getEvaluationRecords = (response) => {
  let result = unwrapResponse(response);

  for (let i = 0; i < 8; i += 1) {
    if (Array.isArray(result)) {
      return result.filter(Boolean);
    }

    if (!result || typeof result !== "object") {
      return [];
    }

    const listKey = [
      "content",
      "items",
      "evaluations",
      "interviewEvaluations",
      "interview_evaluations",
      "results",
      "records",
    ].find((key) => Array.isArray(result[key]));

    if (listKey) {
      return result[listKey].filter(Boolean);
    }

    const nestedKey = ["data", "result", "payload"].find(
      (key) => result[key] && typeof result[key] === "object",
    );

    if (!nestedKey) {
      return [];
    }

    result = result[nestedKey];
  }

  return [];
};

// --------------------------------------------------
// ROUND NORMALIZATION
// --------------------------------------------------

const normalizeRound = (round) => {
  const value = String(round ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (
    value === "1" ||
    value === "technical" ||
    value === "tech" ||
    value.includes("technical")
  ) {
    return ROUNDS[0];
  }

  if (
    value === "2" ||
    value === "hr" ||
    value.includes("hr interview") ||
    value.includes("human resource")
  ) {
    return ROUNDS[1];
  }

  if (
    value === "3" ||
    value.includes("hiring manager") ||
    value.includes("manager interview")
  ) {
    return ROUNDS[2];
  }

  if (value === "4" || value.includes("final")) {
    return ROUNDS[3];
  }

  return String(round ?? "").trim();
};

// --------------------------------------------------
// CANDIDATE NORMALIZATION
// --------------------------------------------------

const normalizeCandidate = (item = {}) => {
  const candidate = item.candidate ?? item.applicant ?? {};
  const application = item.application ?? {};
  const vacancy = item.vacancy ?? {};
  const jobVacancy = item.jobVacancy ?? item.job_vacancy ?? {};

  const applicationId = first(
    item.applicationId,
    item.application_id,
    item.jobApplicationId,
    item.job_application_id,
    application.id,
    application.applicationId,
    application.application_id,
    item.id,
    null,
  );

  const candidateId = first(
    item.candidateId,
    item.candidate_id,
    candidate.id,
    item.applicantId,
    item.applicant_id,
    application.candidateId,
    application.candidate_id,
    null,
  );

  const email = first(
    item.email,
    item.candidateEmail,
    item.candidate_email,
    candidate.email,
    application.email,
    application.candidateEmail,
    application.candidate_email,
    item.applicantEmail,
    item.applicant_email,
    "",
  );

  return {
    ...item,

    id: applicationId ?? candidateId ?? email ?? null,
    applicationId: applicationId ?? null,
    candidateId: candidateId ?? null,
    email,

    name: first(
      item.name,
      item.candidateName,
      item.candidate_name,
      item.fullName,
      item.full_name,
      candidate.name,
      candidate.fullName,
      candidate.full_name,
      item.applicantName,
      item.applicant_name,
      application.candidateName,
      application.applicantName,
      "Unnamed Candidate",
    ),

    vacancyId: first(
      item.vacancyId,
      item.vacancy_id,
      item.jobVacancyId,
      item.job_vacancy_id,
      item.jobId,
      item.job_id,
      application.vacancyId,
      application.vacancy_id,
      application.jobVacancyId,
      application.job_vacancy_id,
      vacancy.id,
      jobVacancy.id,
      null,
    ),

    vacancy: first(
      item.vacancyTitle,
      item.vacancy_title,
      item.jobTitle,
      item.job_title,
      item.position,
      application.vacancyTitle,
      application.vacancy_title,
      application.jobTitle,
      application.jobTitleName,
      jobVacancy.title,
      jobVacancy.jobTitle,
      vacancy.title,
      vacancy.jobTitle,
      typeof item.vacancy === "string" ? item.vacancy : "",
      "Vacancy not specified",
    ),

    applicationStatus: first(
      item.applicationStatus,
      item.application_status,
      application.applicationStatus,
      application.application_status,
      application.status,
      item.status,
      "",
    ),
  };
};

// --------------------------------------------------
// EVALUATION NORMALIZATION
// --------------------------------------------------

const getEvaluationStatus = (evaluation = {}) =>
  normalizeStatus(
    first(
      evaluation.status,
      evaluation.evaluationStatus,
      evaluation.evaluation_status,
      "",
    ),
  );

const isEvaluationSubmitted = (evaluation = {}) => {
  const status = getEvaluationStatus(evaluation);

  return (
    isTruthyFlag(evaluation.submitted) ||
    isTruthyFlag(evaluation.isSubmitted) ||
    isTruthyFlag(evaluation.is_submitted) ||
    Boolean(
      first(
        evaluation.submittedAt,
        evaluation.submitted_at,
        evaluation.submittedOn,
        evaluation.submitted_on,
      ),
    ) ||
    status === "submitted"
  );
};

const getEvaluatorId = (evaluation = {}) =>
  normalizeId(
    first(
      evaluation.employeeId,
      evaluation.employee_id,
      evaluation.evaluatorId,
      evaluation.evaluator_id,
      evaluation.interviewerId,
      evaluation.interviewer_id,
      evaluation.userId,
      evaluation.user_id,
      evaluation.evaluator?.id,
      evaluation.evaluator?.employeeId,
      evaluation.evaluator?.employee_id,
      evaluation.employee?.id,
      evaluation.interviewer?.id,
    ),
  );

// --------------------------------------------------
// ASSIGNED INTERVIEWER HELPERS
// --------------------------------------------------

const getAssignedEvaluatorIds = (interview = {}) => {
  const possibleLists = [
    interview.assignments,
    interview.evaluatorAssignments,
    interview.evaluator_assignments,
    interview.interviewerAssignments,
    interview.interviewer_assignments,
    interview.interviewEvaluatorAssignments,
    interview.interview_evaluator_assignments,
    interview.interviewEvaluators,
    interview.interview_evaluators,
    interview.interviewers,
    interview.assignedInterviewers,
    interview.assigned_interviewers,
    interview.evaluators,
    interview.interviewersList,
  ];

  const ids = [];

  possibleLists.forEach((list) => {
    if (!Array.isArray(list)) {
      return;
    }

    list.forEach((item) => {
      const id =
        typeof item === "object" && item !== null
          ? first(
              item.employeeId,
              item.employee_id,
              item.evaluatorId,
              item.evaluator_id,
              item.interviewerId,
              item.interviewer_id,
              item.userId,
              item.user_id,
              item.employee?.id,
              item.evaluator?.id,
              item.interviewer?.id,
              item.id,
            )
          : item;

      const normalized = normalizeId(id);

      if (normalized) {
        ids.push(normalized);
      }
    });
  });

  [
    interview.interviewerIds,
    interview.interviewer_ids,
    interview.evaluatorIds,
    interview.evaluator_ids,
    interview.assignedInterviewerIds,
    interview.assigned_interviewer_ids,
  ].forEach((list) => {
    if (!Array.isArray(list)) {
      return;
    }

    list.forEach((id) => {
      const normalized = normalizeId(id);

      if (normalized) {
        ids.push(normalized);
      }
    });
  });

  return [...new Set(ids)];
};

const getAssignedEvaluatorCount = (interview = {}) => {
  const explicitCount = first(
    interview.assignedInterviewerCount,
    interview.assigned_interviewer_count,
    interview.evaluatorCount,
    interview.evaluator_count,
    interview.interviewerCount,
    interview.interviewer_count,
  );

  if (explicitCount !== undefined) {
    const count = Number(explicitCount);

    if (Number.isFinite(count) && count >= 0) {
      return count;
    }
  }

  return getAssignedEvaluatorIds(interview).length;
};

// --------------------------------------------------
// EVALUATION COMPLETION
// --------------------------------------------------

const getEvaluationProgress = (interview = {}) => {
  const evaluations = Array.isArray(interview.evaluations)
    ? interview.evaluations
    : [];

  const submitted = evaluations.filter(isEvaluationSubmitted);

  const assignedIds = getAssignedEvaluatorIds(interview);
  const assignedCount = getAssignedEvaluatorCount(interview);

  let submittedCount = 0;
  let allAssignedSubmitted = false;

  if (assignedIds.length > 0) {
    const submittedIds = new Set(submitted.map(getEvaluatorId).filter(Boolean));

    submittedCount = assignedIds.filter((id) => submittedIds.has(id)).length;

    allAssignedSubmitted = assignedIds.every((id) => submittedIds.has(id));
  } else if (assignedCount > 0) {
    submittedCount = submitted.length;
    allAssignedSubmitted = submitted.length >= assignedCount;
  }

  return {
    assignedCount,
    submittedCount,
    allAssignedSubmitted,
    hasAssignmentInformation: assignedCount > 0,
    submittedEvaluations: submitted,
  };
};

// --------------------------------------------------
// INTERVIEW STATUS AND MANAGER DECISION HELPERS
// --------------------------------------------------

const getInterviewStatus = (interview = {}) =>
  normalizeStatus(
    first(
      interview.interviewStatus,
      interview.interview_status,
      interview.status,
      interview.statusName,
      interview.status_name,
      "",
    ),
  );

const isCancelledInterview = (interview) =>
  ["cancelled", "canceled", "deleted"].includes(getInterviewStatus(interview));

const isInterviewStatusCompleted = (interview) =>
  ["completed", "complete", "done"].includes(getInterviewStatus(interview));

const getManagerDecision = (interview = {}) => {
  const decisionObject =
    interview.managerDecision ??
    interview.manager_decision ??
    interview.roundDecision ??
    interview.round_decision ??
    interview.decisionRecord ??
    interview.decision_record ??
    interview.decision ??
    {};

  const rawDecision =
    typeof decisionObject === "string"
      ? decisionObject
      : first(
          decisionObject.decision,
          decisionObject.status,
          decisionObject.managerDecision,
          decisionObject.manager_decision,
          "",
        );

  return String(rawDecision ?? "")
    .trim()
    .toUpperCase();
};

const getDecisionComments = (interview = {}) => {
  const decisionObject =
    interview.managerDecision ??
    interview.manager_decision ??
    interview.roundDecision ??
    interview.round_decision ??
    interview.decisionRecord ??
    interview.decision_record ??
    interview.decision ??
    {};

  return typeof decisionObject === "object"
    ? first(
        decisionObject.comments,
        decisionObject.comment,
        decisionObject.managerComments,
        decisionObject.manager_comments,
        "",
      )
    : "";
};

const getDecisionDate = (interview = {}) => {
  const decisionObject =
    interview.managerDecision ??
    interview.manager_decision ??
    interview.roundDecision ??
    interview.round_decision ??
    interview.decisionRecord ??
    interview.decision_record ??
    interview.decision ??
    {};

  return typeof decisionObject === "object"
    ? first(
        decisionObject.decidedAt,
        decisionObject.decided_at,
        decisionObject.createdAt,
        decisionObject.created_at,
        "",
      )
    : "";
};

const getInterviewId = (interview = {}) =>
  first(interview.id, interview.interviewId, interview.interview_id, null);

const isRejectedInterview = (interview) =>
  !isCancelledInterview(interview) &&
  getManagerDecision(interview) === "REJECTED";

// A round passes only when the interview is completed
// and the Recruitment Manager has approved it.
//
// The backend must validate all assigned interviewer evaluations
// before saving APPROVED. The saved approval is authoritative.
const isApprovedRound = (interview) =>
  !isCancelledInterview(interview) &&
  isInterviewStatusCompleted(interview) &&
  getManagerDecision(interview) === "APPROVED";

const isEvaluationPending = (interview) => {
  if (isCancelledInterview(interview)) return false;
  if (!isInterviewStatusCompleted(interview)) return false;
  if (isRejectedInterview(interview)) return false;
  if (isApprovedRound(interview)) return false;

  const progress = getEvaluationProgress(interview);

  return !progress.hasAssignmentInformation || !progress.allAssignedSubmitted;
};

const isManagerDecisionPending = (interview) => {
  if (isCancelledInterview(interview)) return false;
  if (!isInterviewStatusCompleted(interview)) return false;
  if (isRejectedInterview(interview)) return false;
  if (isApprovedRound(interview)) return false;

  const progress = getEvaluationProgress(interview);

  return progress.hasAssignmentInformation && progress.allAssignedSubmitted;
};

// --------------------------------------------------
// INTERVIEW NORMALIZATION
// --------------------------------------------------

const normalizeInterview = (item = {}) => {
  const candidate = item.candidate ?? item.applicant ?? {};
  const application = item.application ?? {};
  const vacancy = item.vacancy ?? {};
  const jobVacancy = item.jobVacancy ?? item.job_vacancy ?? {};

  const rawRound = first(
    item.round,
    item.interviewRound,
    item.interview_round,
    item.interviewRoundName,
    item.interview_round_name,
    item.roundName,
    item.round_name,
    item.stage,
    item.interviewType,
    item.interview_type,
    item.roundNumber,
    item.round_number,
    item.stageNumber,
    item.stage_number,
    item.interviewRoundNumber,
    "",
  );

  return {
    ...item,

    id: getInterviewId(item),

    applicationId: first(
      item.applicationId,
      item.application_id,
      item.jobApplicationId,
      item.job_application_id,
      application.id,
      application.applicationId,
      application.application_id,
      null,
    ),

    candidateId: first(
      item.candidateId,
      item.candidate_id,
      candidate.id,
      item.applicantId,
      item.applicant_id,
      application.candidateId,
      application.candidate_id,
      null,
    ),

    candidate: first(
      item.candidateName,
      item.candidate_name,
      candidate.name,
      candidate.fullName,
      candidate.full_name,
      item.applicantName,
      item.applicant_name,
      application.candidateName,
      application.applicantName,
      typeof item.candidate === "string" ? item.candidate : "",
      item.name,
      "",
    ),

    email: first(
      item.candidateEmail,
      item.candidate_email,
      candidate.email,
      item.applicantEmail,
      item.applicant_email,
      application.email,
      application.candidateEmail,
      application.candidate_email,
      item.email,
      "",
    ),

    vacancy: first(
      item.vacancyTitle,
      item.vacancy_title,
      item.jobTitle,
      item.job_title,
      jobVacancy.title,
      jobVacancy.jobTitle,
      application.vacancyTitle,
      application.vacancy_title,
      application.jobTitle,
      vacancy.title,
      vacancy.jobTitle,
      typeof item.vacancy === "string" ? item.vacancy : "",
      "",
    ),

    vacancyId: first(
      item.vacancyId,
      item.vacancy_id,
      item.jobVacancyId,
      item.job_vacancy_id,
      jobVacancy.id,
      item.jobId,
      item.job_id,
      application.vacancyId,
      application.vacancy_id,
      application.jobVacancyId,
      application.job_vacancy_id,
      vacancy.id,
      null,
    ),

    round: normalizeRound(rawRound),
    status: getInterviewStatus(item),
  };
};

// --------------------------------------------------
// CANDIDATE MATCHING
// --------------------------------------------------

const isSameCandidate = (candidate, interview) => {
  const candidateApplicationId = normalizeId(candidate.applicationId);
  const interviewApplicationId = normalizeId(interview.applicationId);

  if (candidateApplicationId && interviewApplicationId) {
    return candidateApplicationId === interviewApplicationId;
  }

  const candidateId = normalizeId(candidate.candidateId);
  const interviewCandidateId = normalizeId(interview.candidateId);

  if (candidateId && interviewCandidateId) {
    return candidateId === interviewCandidateId;
  }

  const candidateEmail = first(candidate.email, candidate.candidateEmail, "");

  const interviewEmail = first(interview.email, interview.candidateEmail, "");

  return (
    Boolean(candidateEmail) &&
    Boolean(interviewEmail) &&
    sameText(candidateEmail, interviewEmail)
  );
};

const isSameVacancy = (candidate, interview) => {
  const candidateVacancyId = normalizeId(candidate.vacancyId);
  const interviewVacancyId = normalizeId(interview.vacancyId);

  if (candidateVacancyId && interviewVacancyId) {
    return candidateVacancyId === interviewVacancyId;
  }

  const candidateVacancy = candidate.vacancy;
  const interviewVacancy = interview.vacancy;

  if (
    candidateVacancy &&
    candidateVacancy !== "Vacancy not specified" &&
    interviewVacancy
  ) {
    return sameText(candidateVacancy, interviewVacancy);
  }

  return true;
};

const isShortlisted = (candidate) => {
  const status = normalizeStatus(candidate.applicationStatus);

  return [
    "shortlisted",
    "short listed",
    "shortlisted for interview",
    "short listed for interview",
    "interview in progress",
    "interview scheduled",
  ].includes(status);
};

const initials = (name = "") =>
  String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const candidateFromInterview = (interview) =>
  normalizeCandidate({
    applicationId: interview.applicationId ?? null,
    candidateId: interview.candidateId ?? null,
    candidateName: first(interview.candidate, "Candidate"),
    candidateEmail: interview.email,
    vacancyId: interview.vacancyId,
    vacancyTitle: first(interview.vacancy, "Vacancy not specified"),
    applicationStatus: "Interview in Progress",
  });

// --------------------------------------------------
// DATE HELPERS
// --------------------------------------------------

const formatDate = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// --------------------------------------------------
// PAGE
// --------------------------------------------------

export default function ShortlistedCandidates() {
  const navigate = useNavigate();
  const location = useLocation();

  const [candidates, setCandidates] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roundFilter, setRoundFilter] = useState("All");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const requestInFlight = useRef(false);
  const mountedRef = useRef(false);

  const fetchShortlistedApplications = useCallback(() => {
    if (typeof recruitmentApi?.getApplications !== "function") {
      return Promise.reject(
        new Error("getApplications() is not configured in services/api.js."),
      );
    }

    return recruitmentApi.getApplications({
      status: "SHORTLISTED",
    });
  }, []);

  // --------------------------------------------------
  // LOAD APPLICATIONS, INTERVIEWS, EVALUATIONS AND DECISIONS
  // --------------------------------------------------

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (requestInFlight.current) return;

      requestInFlight.current = true;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setNotice("");

      try {
        const [applicationsResult, interviewsResult] = await Promise.allSettled(
          [
            fetchShortlistedApplications(),
            typeof recruitmentApi?.getInterviews === "function"
              ? recruitmentApi.getInterviews()
              : Promise.reject(new Error("getInterviews() is not configured.")),
          ],
        );

        const applicationsFailed = applicationsResult.status === "rejected";

        const interviewsFailed = interviewsResult.status === "rejected";

        const applicationItems = applicationsFailed
          ? []
          : getResponseData(applicationsResult.value).filter(
              (item) => item && typeof item === "object",
            );

        const interviewItems = interviewsFailed
          ? []
          : getResponseData(interviewsResult.value).filter(
              (item) => item && typeof item === "object",
            );

        if (applicationsFailed) {
          console.error(
            "Failed to load applications:",
            applicationsResult.reason,
          );
        }

        if (interviewsFailed) {
          console.error("Failed to load interviews:", interviewsResult.reason);
        }

        const normalizedApplications = applicationItems.map(normalizeCandidate);

        // Load evaluations and manager decisions separately.
        // A missing manager decision (404) is normal.
        const interviewsWithDetails = await Promise.all(
          interviewItems.map(async (item) => {
            const interviewId = getInterviewId(item);

            const embeddedEvaluations =
              [
                item.evaluations,
                item.interviewEvaluations,
                item.interview_evaluations,
              ].find(Array.isArray) || [];

            let evaluations = embeddedEvaluations;

            let managerDecision =
              item.managerDecision ??
              item.manager_decision ??
              item.roundDecision ??
              item.round_decision ??
              item.decisionRecord ??
              item.decision_record ??
              item.decision ??
              null;

            let decisionLoadFailed = false;

            const detailRequests = [];

            if (
              interviewId &&
              typeof recruitmentApi?.getInterviewEvaluations === "function"
            ) {
              detailRequests.push({
                type: "evaluations",
                promise: Promise.resolve().then(() =>
                  recruitmentApi.getInterviewEvaluations(interviewId),
                ),
              });
            }

            if (
              interviewId &&
              typeof recruitmentApi?.getInterviewDecision === "function"
            ) {
              detailRequests.push({
                type: "decision",
                promise: Promise.resolve().then(() =>
                  recruitmentApi.getInterviewDecision(interviewId),
                ),
              });
            } else if (interviewId) {
              decisionLoadFailed = true;
            }

            const detailResults = await Promise.allSettled(
              detailRequests.map((request) => request.promise),
            );

            detailResults.forEach((result, index) => {
              const request = detailRequests[index];

              if (result.status === "rejected") {
                if (request.type === "decision") {
                  const status = getHttpStatus(result.reason);

                  // 404 means that the manager has not decided yet.
                  // Keep managerDecision as null and do not flag an error.
                  if (status === 404) {
                    // No manager decision has been saved yet.
                    // Preserve any decision already included in the interview response.
                    return;
                  }

                  decisionLoadFailed = true;

                  console.warn(
                    `Could not load manager decision for interview ${interviewId}:`,
                    result.reason,
                  );
                } else {
                  console.warn(
                    `Could not load evaluations for interview ${interviewId}:`,
                    result.reason,
                  );
                }

                return;
              }

              if (request.type === "evaluations") {
                const fetchedEvaluations = getEvaluationRecords(result.value);

                if (fetchedEvaluations.length > 0) {
                  evaluations = fetchedEvaluations;
                }
              }

              if (request.type === "decision") {
                const decisionData = unwrapResponse(result.value);

                if (decisionData && typeof decisionData === "object") {
                  const decisionValue =
                    decisionData.decision ??
                    decisionData.status ??
                    decisionData.managerDecision ??
                    decisionData.manager_decision ??
                    null;

                  // Keep the complete decision object so comments
                  // and decision date can also be displayed.
                  managerDecision = {
                    ...decisionData,
                    decision: decisionValue,
                  };
                } else if (typeof decisionData === "string") {
                  managerDecision = decisionData;
                }
              }
            });

            return {
              ...item,
              evaluations,
              managerDecision,
              decisionLoadFailed,
            };
          }),
        );

        const interviewRecords = interviewsWithDetails.map(normalizeInterview);

        if (!mountedRef.current) return;

        setInterviews(interviewRecords);

        const visibleCandidates = normalizedApplications.filter(
          (candidate) =>
            isShortlisted(candidate) ||
            interviewRecords.some(
              (interview) =>
                isSameCandidate(candidate, interview) &&
                isSameVacancy(candidate, interview),
            ),
        );

        interviewRecords.forEach((interview) => {
          if (
            !interview.applicationId &&
            !interview.candidateId &&
            !interview.email
          ) {
            return;
          }

          const fallbackCandidate = candidateFromInterview(interview);

          const alreadyIncluded = visibleCandidates.some(
            (candidate) =>
              isSameCandidate(candidate, fallbackCandidate) &&
              isSameVacancy(candidate, fallbackCandidate),
          );

          if (!alreadyIncluded) {
            visibleCandidates.push(fallbackCandidate);
          }
        });

        setCandidates(visibleCandidates);

        setSelectedCandidate((current) => {
          if (!current) return null;

          return (
            visibleCandidates.find(
              (candidate) =>
                normalizeId(candidate.applicationId) ===
                  normalizeId(current.applicationId) &&
                isSameVacancy(candidate, current),
            ) ?? null
          );
        });

        if (applicationsFailed && interviewsFailed) {
          setError(
            "Applications and interviews could not be loaded. Check the backend, authentication, and browser Network tab.",
          );
        } else if (visibleCandidates.length === 0) {
          setNotice(
            "No shortlisted applications or usable interview records were returned by the backend.",
          );
        } else if (interviewsFailed) {
          setNotice(
            "Applications loaded, but interview history could not be retrieved. Progress may be incomplete.",
          );
        } else if (applicationsFailed) {
          setNotice(
            "Applications could not be loaded. Only candidates with existing interview records can be displayed.",
          );
        } else if (
          interviewRecords.some((interview) => interview.decisionLoadFailed)
        ) {
          setNotice(
            "Some manager decisions could not be retrieved. Candidates will not progress without confirmed manager approval.",
          );
        } else if (interviewRecords.length === 0) {
          setNotice(
            "Shortlisted candidates loaded, but no interview records were returned yet.",
          );
        }
      } catch (requestError) {
        console.error("Unable to load shortlisted candidates:", requestError);

        if (mountedRef.current) {
          setError(
            requestError?.response?.data?.message ||
              requestError?.message ||
              "Unable to load candidates. Check the backend connection and try again.",
          );
        }
      } finally {
        requestInFlight.current = false;

        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [fetchShortlistedApplications],
  );

  useEffect(() => {
    mountedRef.current = true;
    loadData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadData, location.key]);

  useEffect(() => {
    const refreshProgress = () => {
      if (document.visibilityState === "visible" && mountedRef.current) {
        loadData(true);
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible" && mountedRef.current) {
        loadData(true);
      }
    }, REFRESH_INTERVAL_MS);

    window.addEventListener("focus", refreshProgress);
    document.addEventListener("visibilitychange", refreshProgress);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshProgress);
      document.removeEventListener("visibilitychange", refreshProgress);
    };
  }, [loadData]);

  // --------------------------------------------------
  // SEQUENTIAL INTERVIEW PROGRESS
  // --------------------------------------------------

  const getCandidateInterviews = useCallback(
    (candidate) =>
      interviews.filter(
        (interview) =>
          isSameCandidate(candidate, interview) &&
          isSameVacancy(candidate, interview),
      ),
    [interviews],
  );

  const getRoundInterviews = useCallback(
    (candidate, round) =>
      getCandidateInterviews(candidate)
        .filter(
          (interview) =>
            sameText(normalizeRound(interview.round), round) &&
            !isCancelledInterview(interview),
        )
        .sort((a, b) => {
          const dateA = new Date(
            first(a.updatedAt, a.updated_at, a.createdAt, a.created_at, 0),
          ).getTime();

          const dateB = new Date(
            first(b.updatedAt, b.updated_at, b.createdAt, b.created_at, 0),
          ).getTime();

          return dateA - dateB;
        }),
    [getCandidateInterviews],
  );

  const getLatestRoundInterview = useCallback(
    (candidate, round) => {
      const roundInterviews = getRoundInterviews(candidate, round);

      return roundInterviews.length > 0
        ? roundInterviews[roundInterviews.length - 1]
        : null;
    },
    [getRoundInterviews],
  );

  const getRoundState = useCallback(
    (candidate, round) => {
      const roundInterviews = getRoundInterviews(candidate, round);

      if (roundInterviews.some(isRejectedInterview)) {
        return "rejected";
      }

      if (roundInterviews.some(isApprovedRound)) {
        return "passed";
      }

      if (roundInterviews.some(isManagerDecisionPending)) {
        return "manager-pending";
      }

      if (roundInterviews.some(isEvaluationPending)) {
        return "evaluation-pending";
      }

      if (roundInterviews.length > 0) {
        return "scheduled";
      }

      return "not-started";
    },
    [getRoundInterviews],
  );

  const hasExistingRoundSchedule = useCallback(
    (candidate, round) =>
      getRoundInterviews(candidate, round).some(
        (interview) =>
          !isApprovedRound(interview) && !isRejectedInterview(interview),
      ),
    [getRoundInterviews],
  );

  const getCompletedRounds = useCallback(
    (candidate) => {
      const completedRounds = [];

      for (const round of ROUNDS) {
        const state = getRoundState(candidate, round);

        if (state === "rejected") break;
        if (state !== "passed") break;

        completedRounds.push(round);
      }

      return completedRounds;
    },
    [getRoundState],
  );

  const getNextRound = useCallback(
    (candidate) => {
      const relatedInterviews = getCandidateInterviews(candidate);

      if (relatedInterviews.some(isRejectedInterview)) {
        return null;
      }

      const completedRounds = getCompletedRounds(candidate);

      return ROUNDS[completedRounds.length] ?? null;
    },
    [getCandidateInterviews, getCompletedRounds],
  );

  const getRoundMessage = useCallback(
    (candidate, round) => {
      const state = getRoundState(candidate, round);
      const latestInterview = getLatestRoundInterview(candidate, round);

      if (state === "passed") {
        return "Interview completed and approved by Recruitment Manager";
      }

      if (state === "rejected") {
        return "Recruitment Manager rejected this round";
      }

      if (state === "manager-pending") {
        return "All assigned interviewer evaluations submitted - manager decision pending";
      }

      if (state === "evaluation-pending" && latestInterview) {
        const progress = getEvaluationProgress(latestInterview);

        if (!progress.hasAssignmentInformation) {
          return "Interviewer assignment information is unavailable";
        }

        return `${progress.submittedCount}/${progress.assignedCount} interviewer evaluations submitted`;
      }

      if (state === "scheduled") {
        return "Interview scheduled or in progress";
      }

      return "Awaiting previous stages";
    },
    [getLatestRoundInterview, getRoundState],
  );

  const getPendingEvaluation = useCallback(
    (candidate, round) =>
      getRoundState(candidate, round) === "evaluation-pending",
    [getRoundState],
  );

  const getPendingManagerDecision = useCallback(
    (candidate, round) => getRoundState(candidate, round) === "manager-pending",
    [getRoundState],
  );

  // --------------------------------------------------
  // SEARCH AND FILTER
  // --------------------------------------------------

  const filteredCandidates = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    return candidates.filter((candidate) => {
      const matchesSearch = [
        candidate.name,
        candidate.email,
        candidate.vacancy,
        candidate.applicationStatus,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

      const matchesRound =
        roundFilter === "All" || getNextRound(candidate) === roundFilter;

      return matchesSearch && matchesRound;
    });
  }, [candidates, searchTerm, roundFilter, getNextRound]);

  const resetFilters = () => {
    setSearchTerm("");
    setRoundFilter("All");
  };

  // --------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------

  const scheduleNextStage = (candidate) => {
    const nextRound = getNextRound(candidate);
    const completedRounds = getCompletedRounds(candidate);

    if (!nextRound) {
      setNotice(
        `${candidate.name} cannot be scheduled for another stage because recruitment has stopped or all stages are complete.`,
      );
      setSelectedCandidate(null);
      return;
    }

    if (hasExistingRoundSchedule(candidate, nextRound)) {
      const evaluationPending = getPendingEvaluation(candidate, nextRound);

      const managerPending = getPendingManagerDecision(candidate, nextRound);

      setNotice(
        evaluationPending
          ? `${nextRound} is completed, but interviewer evaluations are still pending.`
          : managerPending
            ? `${nextRound} evaluations are complete. Wait for the Recruitment Manager's approval before scheduling the next stage.`
            : `${candidate.name} already has a ${nextRound} interview.`,
      );

      setSelectedCandidate(null);
      return;
    }

    if (!isValidApplicationId(candidate.applicationId)) {
      setNotice(
        `A valid application ID is missing for ${candidate.name}. Refresh the applications list before scheduling.`,
      );
      setSelectedCandidate(null);
      return;
    }

    const candidatePayload = {
      id: Number(candidate.applicationId),
      applicationId: Number(candidate.applicationId),
      candidateId: candidate.candidateId ?? null,
      name: candidate.name,
      candidateName: candidate.name,
      email: candidate.email,
      candidateEmail: candidate.email,
      vacancy: candidate.vacancy,
      vacancyTitle: candidate.vacancy,
      vacancyId: candidate.vacancyId ?? null,
      round: nextRound,
      completedRounds,
      applicationStatus: candidate.applicationStatus,
    };

    setSelectedCandidate(null);

    navigate("/recruitment/interviews", {
      state: {
        openScheduleForm: true,
        candidate: candidatePayload,
      },
    });
  };

  // --------------------------------------------------
  // SUMMARY STATISTICS
  // --------------------------------------------------

  const completedAllStages = candidates.filter(
    (candidate) => getCompletedRounds(candidate).length === ROUNDS.length,
  ).length;

  const managerPendingCount = candidates.filter((candidate) => {
    const nextRound = getNextRound(candidate);

    return nextRound && getPendingManagerDecision(candidate, nextRound);
  }).length;

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <PageLayout
      role="recruiter"
      activePage="Interviews"
      title="Shortlisted Candidates"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => navigate("/recruitment/interviews")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft size={17} />
            Back to Interviews
          </button>
        </div>
      }
    >
      <div className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
          >
            <CircleAlert size={19} className="mt-0.5 shrink-0" />

            <div className="flex-1">
              <p className="font-semibold">
                Could not load shortlisted candidates
              </p>

              <p className="mt-1">{error}</p>

              <button
                type="button"
                onClick={() => loadData(true)}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 font-semibold hover:bg-red-200"
              >
                <RefreshCw size={14} />
                Try again
              </button>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="rounded-lg p-1 hover:bg-red-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-5 flex items-start gap-2 rounded-xl border border-primary-200 bg-primary-50 p-4 text-sm text-primary-800"
          >
            <CircleAlert size={18} className="mt-0.5 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* SUMMARY CARDS */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Shortlisted Candidates
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-800">
                  {loading ? "—" : candidates.length}
                </p>
              </div>

              <div className="rounded-xl bg-primary-50 p-3 text-primary-600">
                <Users size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Manager Decisions Pending
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-800">
                  {loading ? "—" : managerPendingCount}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  All interviewer evaluations submitted
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                <Hourglass size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  All Stages Approved
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-800">
                  {loading ? "—" : completedAllStages}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Four rounds approved by Recruitment Manager
                </p>
              </div>

              <div className="rounded-xl bg-green-50 p-3 text-green-600">
                <CheckCircle2 size={23} />
              </div>
            </div>
          </div>
        </div>

        {/* CANDIDATES TABLE */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Candidates Ready for Interview
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Candidates can proceed only after all interviewer evaluations
                  are submitted and the Recruitment Manager approves the round.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search name, email, vacancy..."
                    aria-label="Search shortlisted candidates"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 sm:w-72"
                  />
                </div>

                <div className="relative">
                  <Filter
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <select
                    value={roundFilter}
                    onChange={(event) => setRoundFilter(event.target.value)}
                    aria-label="Filter by next interview round"
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm outline-none focus:border-primary-500"
                  >
                    <option value="All">All next rounds</option>

                    {ROUNDS.map((round) => (
                      <option key={round} value={round}>
                        {round}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <LoaderCircle
                size={34}
                className="mb-3 animate-spin text-primary-600"
              />

              <p className="font-semibold text-slate-700">
                Loading shortlisted candidates...
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Retrieving applications, evaluations and manager decisions.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Candidate",
                        "Job Vacancy",
                        "Interview Progress",
                        "Next Stage",
                        "Application Status",
                        "Action",
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
                    {filteredCandidates.map((candidate) => {
                      const completedRounds = getCompletedRounds(candidate);

                      const completed = completedRounds.length;
                      const nextRound = getNextRound(candidate);

                      const rejected =
                        getCandidateInterviews(candidate).some(
                          isRejectedInterview,
                        );

                      const alreadyScheduled =
                        Boolean(nextRound) &&
                        hasExistingRoundSchedule(candidate, nextRound);

                      const evaluationPending =
                        Boolean(nextRound) &&
                        getPendingEvaluation(candidate, nextRound);

                      const managerPending =
                        Boolean(nextRound) &&
                        getPendingManagerDecision(candidate, nextRound);

                      return (
                        <tr
                          key={
                            candidate.applicationId ??
                            candidate.id ??
                            candidate.email
                          }
                          className="transition hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                                {initials(candidate.name)}
                              </div>

                              <div>
                                <p className="font-semibold text-slate-800">
                                  {candidate.name}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {candidate.email || "No email provided"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 font-medium text-slate-700">
                            {candidate.vacancy}
                          </td>

                          {/* INTERVIEW PROGRESS */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              {ROUNDS.map((round) => {
                                const state = getRoundState(candidate, round);

                                const progressColor =
                                  state === "passed"
                                    ? "bg-green-500"
                                    : state === "rejected"
                                      ? "bg-red-500"
                                      : state === "manager-pending"
                                        ? "bg-amber-500"
                                        : state === "evaluation-pending"
                                          ? "bg-orange-400"
                                          : state === "scheduled"
                                            ? "bg-primary-500"
                                            : "bg-slate-200";

                                return (
                                  <span
                                    key={round}
                                    title={`${round}: ${getRoundMessage(
                                      candidate,
                                      round,
                                    )}`}
                                    className={`h-2.5 w-7 rounded-full ${progressColor}`}
                                  />
                                );
                              })}

                              <span className="ml-1 text-xs text-slate-500">
                                {completed}/{ROUNDS.length}
                              </span>
                            </div>

                            <p className="mt-2 text-xs text-slate-500">
                              {rejected
                                ? "Recruitment stopped by manager"
                                : evaluationPending
                                  ? "Interviewer evaluations pending"
                                  : managerPending
                                    ? "Waiting for manager approval"
                                    : alreadyScheduled
                                      ? `${nextRound} scheduled or in progress`
                                      : completed === 0
                                        ? "No manager-approved rounds"
                                        : `${completed} round(s) approved`}
                            </p>
                          </td>

                          {/* NEXT STAGE */}
                          <td className="px-5 py-4">
                            {rejected ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                                <XCircle size={14} />
                                Recruitment stopped
                              </span>
                            ) : evaluationPending ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">
                                <Clock3 size={14} />
                                Evaluations pending
                              </span>
                            ) : managerPending ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                                <Hourglass size={14} />
                                Manager approval pending
                              </span>
                            ) : alreadyScheduled ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700">
                                <Clock3 size={14} />
                                Already scheduled
                              </span>
                            ) : nextRound ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700">
                                <Clock3 size={14} />
                                {nextRound}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                                <CheckCircle2 size={14} />
                                All stages approved
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                                rejected
                                  ? "bg-red-50 text-red-700"
                                  : normalizeStatus(
                                        candidate.applicationStatus,
                                      ) === "interview scheduled"
                                    ? "bg-primary-50 text-primary-700"
                                    : "bg-green-50 text-green-700"
                              }`}
                            >
                              {rejected ? (
                                <XCircle size={14} />
                              ) : (
                                <CheckCircle2 size={14} />
                              )}

                              {rejected
                                ? "Rejected by manager"
                                : candidate.applicationStatus || "Unknown"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedCandidate(candidate)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                View workflow
                              </button>

                              <button
                                type="button"
                                disabled={
                                  !nextRound ||
                                  !isValidApplicationId(
                                    candidate.applicationId,
                                  ) ||
                                  alreadyScheduled
                                }
                                onClick={() => scheduleNextStage(candidate)}
                                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-primary-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                <CalendarCheck size={15} />

                                {evaluationPending
                                  ? "Evaluation pending"
                                  : managerPending
                                    ? "Approval pending"
                                    : alreadyScheduled
                                      ? "Already scheduled"
                                      : "Schedule next stage"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredCandidates.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-14 text-center">
                          <Users
                            size={34}
                            className="mx-auto mb-3 text-slate-300"
                          />

                          <p className="font-semibold text-slate-700">
                            {error
                              ? "Unable to display candidates"
                              : candidates.length === 0
                                ? "No shortlisted candidates available"
                                : "No matching candidates found"}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {error
                              ? "Check the API error and refresh the page."
                              : candidates.length === 0
                                ? "No usable candidate records were returned by the backend."
                                : "Try changing the search term or round filter."}
                          </p>

                          {candidates.length > 0 && (
                            <button
                              type="button"
                              onClick={resetFilters}
                              className="mt-3 text-sm font-semibold text-primary-600"
                            >
                              Clear filters
                            </button>
                          )}

                          {candidates.length === 0 && (
                            <button
                              type="button"
                              onClick={() => loadData(true)}
                              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
                            >
                              <RefreshCw size={16} />
                              Retry loading
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {filteredCandidates.length} of {candidates.length}{" "}
                  candidates
                </span>

                <span>
                  Progress refreshes automatically while this page is open
                </span>
              </div>
            </>
          )}
        </section>

        {/* PROGRESS LEGEND */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-slate-800">
            Interview progress legend
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-7 rounded-full bg-green-500" />
              Manager approved
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2.5 w-7 rounded-full bg-amber-500" />
              Manager decision pending
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2.5 w-7 rounded-full bg-orange-400" />
              Interviewer evaluations pending
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2.5 w-7 rounded-full bg-primary-500" />
              Scheduled / in progress
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2.5 w-7 rounded-full bg-red-500" />
              Manager rejected
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2.5 w-7 rounded-full bg-slate-200" />
              Not started
            </div>
          </div>
        </div>

        {/* WORKFLOW INFORMATION */}
        <div className="mt-5 rounded-xl border border-primary-100 bg-primary-50/70 p-4">
          <div className="flex items-start gap-3">
            <CircleAlert size={18} className="mt-0.5 shrink-0 text-primary-600" />

            <div>
              <p className="text-sm font-semibold text-primary-800">
                Interview workflow
              </p>

              <p className="mt-1 text-sm leading-6 text-primary-700">
                Candidates progress through Technical Interview, HR Interview,
                Hiring Manager Interview, and Final Interview in that order.
                Every assigned interviewer must submit an evaluation before the
                Recruitment Manager can decide. The next stage can only be
                scheduled after the manager approves the completed round. An
                evaluator recommendation alone does not reject a candidate. A
                manager rejection stops further progression. Cancelled
                interviews can be scheduled again.
              </p>
            </div>
          </div>
        </div>

        {/* CANDIDATE WORKFLOW MODAL */}
        {selectedCandidate && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedCandidate(null);
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="workflow-title"
              className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b p-5">
                <div>
                  <h2
                    id="workflow-title"
                    className="text-xl font-bold text-slate-800"
                  >
                    Candidate Interview Workflow
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {selectedCandidate.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {selectedCandidate.vacancy}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  aria-label="Close workflow"
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="space-y-3 p-5">
                {ROUNDS.map((round, index) => {
                  const state = getRoundState(selectedCandidate, round);

                  const completed = state === "passed";
                  const evaluationPending = state === "evaluation-pending";
                  const managerPending = state === "manager-pending";
                  const scheduled = state === "scheduled";
                  const rejected = state === "rejected";

                  const next = getNextRound(selectedCandidate) === round;

                  const latestInterview = getLatestRoundInterview(
                    selectedCandidate,
                    round,
                  );

                  const evaluationProgress = latestInterview
                    ? getEvaluationProgress(latestInterview)
                    : null;

                  const decisionComments = latestInterview
                    ? getDecisionComments(latestInterview)
                    : "";

                  const decisionDate = latestInterview
                    ? getDecisionDate(latestInterview)
                    : "";

                  const managerDecision = latestInterview
                    ? getManagerDecision(latestInterview)
                    : "";

                  const stateStyle = completed
                    ? "border-green-200 bg-green-50"
                    : evaluationPending
                      ? "border-orange-200 bg-orange-50"
                      : managerPending
                        ? "border-amber-200 bg-amber-50"
                        : scheduled
                          ? "border-primary-200 bg-primary-50"
                          : rejected
                            ? "border-red-200 bg-red-50"
                            : next
                              ? "border-primary-200 bg-primary-50"
                              : "border-slate-200";

                  const iconStyle = completed
                    ? "bg-green-100 text-green-700"
                    : evaluationPending
                      ? "bg-orange-100 text-orange-700"
                      : managerPending
                        ? "bg-amber-100 text-amber-700"
                        : scheduled
                          ? "bg-primary-100 text-primary-700"
                          : rejected
                            ? "bg-red-100 text-red-700"
                            : next
                              ? "bg-primary-100 text-primary-700"
                              : "bg-slate-100 text-slate-500";

                  return (
                    <div
                      key={round}
                      className={`rounded-xl border p-3 ${stateStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconStyle}`}
                        >
                          {completed ? (
                            <CheckCircle2 size={18} />
                          ) : rejected ? (
                            <XCircle size={18} />
                          ) : managerPending ? (
                            <Hourglass size={18} />
                          ) : (
                            index + 1
                          )}
                        </div>

                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">
                            {round}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {getRoundMessage(selectedCandidate, round)}
                          </p>
                        </div>

                        {next &&
                          !scheduled &&
                          !evaluationPending &&
                          !managerPending && (
                            <span className="text-primary-600">
                              <CalendarCheck size={17} />
                            </span>
                          )}
                      </div>

                      {evaluationProgress &&
                        evaluationProgress.hasAssignmentInformation && (
                          <div className="ml-12 mt-2 text-xs text-slate-600">
                            Evaluations submitted:{" "}
                            <strong>
                              {evaluationProgress.submittedCount}/
                              {evaluationProgress.assignedCount}
                            </strong>
                          </div>
                        )}

                      {latestInterview && (
                        <div className="ml-12 mt-2 text-xs text-slate-600">
                          <p>
                            <strong>Manager decision:</strong>{" "}
                            {managerDecision || "Pending Review"}
                          </p>

                          {decisionDate && (
                            <p className="mt-1">
                              <strong>Decision date:</strong>{" "}
                              {formatDate(decisionDate)}
                            </p>
                          )}
                        </div>
                      )}

                      {decisionComments && (
                        <div className="ml-12 mt-2 rounded-lg bg-white/70 p-2 text-xs text-slate-600">
                          <strong>Manager comments:</strong> {decisionComments}
                        </div>
                      )}

                      {completed && (
                        <div className="ml-12 mt-2 flex items-center gap-1.5 text-xs font-semibold text-green-700">
                          <ShieldCheck size={14} />
                          Approved by Recruitment Manager
                        </div>
                      )}

                      {rejected && (
                        <div className="ml-12 mt-2 text-xs font-semibold text-red-700">
                          Rejected by Recruitment Manager
                        </div>
                      )}

                      {evaluationPending && (
                        <div className="ml-12 mt-2 text-xs font-semibold text-orange-700">
                          Waiting for all assigned interviewer evaluations
                        </div>
                      )}

                      {managerPending && (
                        <div className="ml-12 mt-2 text-xs font-semibold text-amber-700">
                          Waiting for Recruitment Manager approval
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCandidate(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={() => scheduleNextStage(selectedCandidate)}
                    disabled={
                      !getNextRound(selectedCandidate) ||
                      !isValidApplicationId(selectedCandidate.applicationId) ||
                      hasExistingRoundSchedule(
                        selectedCandidate,
                        getNextRound(selectedCandidate),
                      )
                    }
                    className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {getNextRound(selectedCandidate) &&
                    getPendingEvaluation(
                      selectedCandidate,
                      getNextRound(selectedCandidate),
                    )
                      ? "Evaluations pending"
                      : getNextRound(selectedCandidate) &&
                          getPendingManagerDecision(
                            selectedCandidate,
                            getNextRound(selectedCandidate),
                          )
                        ? "Manager approval pending"
                        : getNextRound(selectedCandidate) &&
                            hasExistingRoundSchedule(
                              selectedCandidate,
                              getNextRound(selectedCandidate),
                            )
                          ? "Already scheduled"
                          : "Schedule next stage"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
