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
  ClipboardList,
  ChevronRight,
  Clock3,
  CircleAlert,
  RefreshCw,
  LoaderCircle,
  X,
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

const normalizeRecommendation = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const aliases = {
    PASS: "HIRE",
    RECOMMEND: "HIRE",
    RECOMMENDED: "HIRE",
    MOVE_TO_NEXT_ROUND: "HIRE",
    STRONGLY_RECOMMEND: "STRONG_HIRE",
    STRONG_RECOMMEND: "STRONG_HIRE",
    FAIL: "NO_HIRE",
    REJECT: "NO_HIRE",
    REJECTED: "NO_HIRE",
    DO_NOT_RECOMMEND: "NO_HIRE",
    NOT_RECOMMENDED: "NO_HIRE",
    HOLD_FOR_DISCUSSION: "HOLD",
  };

  return aliases[normalized] ?? normalized;
};

const sameText = (a, b) =>
  String(a ?? "")
    .trim()
    .toLowerCase() ===
  String(b ?? "")
    .trim()
    .toLowerCase();

const getResponseData = (response) => {
  let result = response?.data ?? response;

  for (let i = 0; i < 10; i += 1) {
    if (Array.isArray(result)) return result;

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

    if (!nestedKey) return [];

    result = result[nestedKey];
  }

  return Array.isArray(result) ? result : [];
};

// Extract evaluation records from common API response shapes. Some endpoints
// return an array, while others wrap it in data/result/payload or return one
// evaluation object directly.
const getEvaluationRecords = (response) => {
  let result = response?.data ?? response;

  for (let i = 0; i < 10; i += 1) {
    if (Array.isArray(result)) return result.filter(Boolean);
    if (!result || typeof result !== "object") return [];

    const listKey = [
      "content",
      "items",
      "evaluations",
      "interviewEvaluations",
      "results",
      "records",
    ].find((key) => Array.isArray(result[key]));
    if (listKey) return result[listKey].filter(Boolean);

    const nestedKey = ["data", "result", "payload"].find(
      (key) => result[key] && typeof result[key] === "object",
    );
    if (nestedKey) {
      result = result[nestedKey];
      continue;
    }

    // A single evaluation DTO usually has an id, status, recommendation,
    // submittedAt, or evaluation criteria fields.
    if (
      [
        "id",
        "status",
        "recommendation",
        "submittedAt",
        "submitted_at",
        "feedback",
        "overallRating",
      ].some((key) => key in result)
    ) {
      return [result];
    }
    return [];
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
// APPLICATION NORMALIZATION
// CandidateApplicationDTO.id represents application ID.
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
// EVALUATION HELPERS
// --------------------------------------------------

const isTruthyFlag = (value) =>
  value === true ||
  value === 1 ||
  (typeof value === "string" && value.trim().toLowerCase() === "true");

const getEvaluation = (item = {}) => {
  // Prefer submitted evaluations from collections. A direct `evaluation`
  // property can be stale when the backend also returns evaluation history.
  const evaluationLists = [
    item.evaluations,
    item.interviewEvaluations,
    item.interview_evaluations,
  ].filter(Array.isArray);

  const allEvaluations = evaluationLists
    .flat()
    .filter((evaluation) => evaluation && typeof evaluation === "object");

  const submittedEvaluations = allEvaluations
    .filter((evaluation) => {
      const status = normalizeStatus(
        first(
          evaluation.status,
          evaluation.evaluationStatus,
          evaluation.evaluation_status,
          "",
        ),
      );

      return (
        isTruthyFlag(evaluation.submitted) ||
        isTruthyFlag(evaluation.isSubmitted) ||
        isTruthyFlag(evaluation.is_submitted) ||
        Boolean(
          first(
            evaluation.submittedAt,
            evaluation.submitted_at,
            evaluation.submittedOn,
          ),
        ) ||
        ["submitted", "completed", "complete", "evaluated"].includes(status)
      );
    })
    .sort((a, b) => {
      const getTime = (evaluation) => {
        const raw = first(
          evaluation.submittedAt,
          evaluation.submitted_at,
          evaluation.updatedAt,
          evaluation.updated_at,
          evaluation.createdAt,
          evaluation.created_at,
        );
        const parsed = raw ? new Date(raw).getTime() : 0;
        return Number.isFinite(parsed) ? parsed : Number(evaluation.id) || 0;
      };

      return getTime(b) - getTime(a);
    });

  if (submittedEvaluations.length) return submittedEvaluations[0];

  const directEvaluations = [
    item.latestEvaluation,
    item.latest_evaluation,
    item.interviewEvaluation,
    item.interview_evaluation,
    item.evaluation,
  ];

  const direct = directEvaluations.find(
    (value) => value && typeof value === "object" && !Array.isArray(value),
  );

  if (direct) return direct;

  // If the backend returns a collection but no submission flag, use the
  // newest entry rather than blindly using the first entry.
  if (allEvaluations.length) {
    return [...allEvaluations].sort((a, b) => {
      const getTime = (evaluation) => {
        const raw = first(
          evaluation.updatedAt,
          evaluation.updated_at,
          evaluation.createdAt,
          evaluation.created_at,
        );
        const parsed = raw ? new Date(raw).getTime() : 0;
        return Number.isFinite(parsed) ? parsed : Number(evaluation.id) || 0;
      };
      return getTime(b) - getTime(a);
    })[0];
  }

  return {};
};

const hasSubmittedEvaluation = (interview) => {
  const evaluation = getEvaluation(interview);

  const status = normalizeStatus(
    first(
      evaluation.status,
      evaluation.evaluationStatus,
      evaluation.evaluation_status,
      interview.evaluationStatus,
      interview.evaluation_status,
      interview.submissionStatus,
      interview.submission_status,
      "",
    ),
  );

  return (
    isTruthyFlag(evaluation.submitted) ||
    isTruthyFlag(evaluation.isSubmitted) ||
    isTruthyFlag(evaluation.is_submitted) ||
    isTruthyFlag(interview.evaluationSubmitted) ||
    isTruthyFlag(interview.evaluation_submitted) ||
    Boolean(
      first(
        evaluation.submittedAt,
        evaluation.submitted_at,
        evaluation.submittedOn,
        interview.evaluationSubmittedAt,
        interview.evaluation_submitted_at,
      ),
    ) ||
    ["submitted", "completed", "complete", "evaluated"].includes(status)
  );
};

const getRecommendation = (interview) => {
  const evaluation = getEvaluation(interview);

  return normalizeRecommendation(
    first(
      evaluation.recommendation,
      evaluation.hiringRecommendation,
      evaluation.hiring_recommendation,
      evaluation.result,
      interview.recommendation,
      interview.hiringRecommendation,
      interview.hiring_recommendation,
      interview.result,
      "",
    ),
  );
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

    id: first(item.id, item.interviewId, item.interview_id, null),

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

    status: first(
      item.interviewStatus,
      item.interview_status,
      item.status,
      item.statusName,
      item.status_name,
      "",
    ),

    evaluation: getEvaluation(item),
  };
};

// --------------------------------------------------
// COMPLETION AND REJECTION LOGIC
// --------------------------------------------------

const isCancelledInterview = (interview) => {
  const status = normalizeStatus(
    first(
      interview.status,
      interview.interviewStatus,
      interview.interview_status,
      "",
    ),
  );

  return ["cancelled", "canceled", "deleted"].includes(status);
};

const isRejectedInterview = (interview) => {
  if (isCancelledInterview(interview)) return false;

  const recommendation = getRecommendation(interview);
  const evaluation = getEvaluation(interview);

  const status = normalizeStatus(
    first(
      evaluation.status,
      evaluation.evaluationStatus,
      evaluation.evaluation_status,
      interview.interviewStatus,
      interview.interview_status,
      interview.status,
      "",
    ),
  );

  return (
    [
      "NO_HIRE",
      "STRONG_NO_HIRE",
      "REJECT",
      "REJECTED",
      "NOT_RECOMMENDED",
    ].includes(recommendation) ||
    status.includes("reject") ||
    status.includes("not recommend") ||
    status === "no hire" ||
    status === "strong no hire"
  );
};

const isCompletedInterview = (interview) => {
  if (isCancelledInterview(interview)) return false;
  if (isRejectedInterview(interview)) return false;
  if (!hasSubmittedEvaluation(interview)) return false;

  return ["HIRE", "STRONG_HIRE"].includes(getRecommendation(interview));
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
// SHORTLISTED CANDIDATES / INTERVIEW PROGRESS PAGE
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
              : Promise.reject(
                  new Error(
                    "getInterviews() is not configured in services/api.js.",
                  ),
                ),
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

        // The interviews list endpoint may not embed evaluation history.
        // Fetch each interview's evaluation collection explicitly, then attach
        // it before normalization so progress reflects submitted evaluations.
        const interviewsWithEvaluations = await Promise.all(
          interviewItems.map(async (item) => {
            const interviewId = first(
              item.id,
              item.interviewId,
              item.interview_id,
            );
            const embedded =
              [
                item.evaluations,
                item.interviewEvaluations,
                item.interview_evaluations,
              ].find(Array.isArray) || [];

            if (
              !interviewId ||
              typeof recruitmentApi?.getInterviewEvaluations !== "function"
            ) {
              return { ...item, evaluations: embedded };
            }

            try {
              const evaluationResponse =
                await recruitmentApi.getInterviewEvaluations(interviewId);
              const fetchedEvaluations =
                getEvaluationRecords(evaluationResponse);
              return {
                ...item,
                evaluations: fetchedEvaluations.length
                  ? fetchedEvaluations
                  : embedded,
              };
            } catch (evaluationError) {
              // Keep embedded evaluations if the separate endpoint is forbidden,
              // unavailable, or not implemented; do not fail the whole page.
              console.warn(
                `Could not load evaluations for interview ${interviewId}:`,
                evaluationError,
              );
              return { ...item, evaluations: embedded };
            }
          }),
        );

        const interviewRecords =
          interviewsWithEvaluations.map(normalizeInterview);

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

  // Check whether this candidate already has an active schedule
  // for the specified round.
  const hasExistingRoundSchedule = useCallback(
    (candidate, round) => {
      if (!candidate || !round) return false;

      return getCandidateInterviews(candidate).some((interview) => {
        const sameRound = sameText(normalizeRound(interview.round), round);

        return (
          sameRound &&
          !isCancelledInterview(interview) &&
          !isCompletedInterview(interview) &&
          !isRejectedInterview(interview)
        );
      });
    },
    [getCandidateInterviews],
  );

  const getCompletedRounds = useCallback(
    (candidate) => {
      const relatedInterviews = getCandidateInterviews(candidate);
      const completedRounds = [];

      for (const round of ROUNDS) {
        const interviewsForRound = relatedInterviews.filter(
          (interview) =>
            sameText(normalizeRound(interview.round), round) &&
            !isCancelledInterview(interview),
        );

        if (interviewsForRound.some(isRejectedInterview)) {
          break;
        }

        const roundPassed = interviewsForRound.some(isCompletedInterview);

        if (!roundPassed) break;

        completedRounds.push(round);
      }

      return completedRounds;
    },
    [getCandidateInterviews],
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

    // Prevent duplicate active schedules for the same round.
    if (hasExistingRoundSchedule(candidate, nextRound)) {
      setNotice(
        `${candidate.name} already has a ${nextRound} scheduled. You cannot schedule the same round again.`,
      );
      setSelectedCandidate(null);
      return;
    }

    if (!isValidApplicationId(candidate.applicationId)) {
      setNotice(
        `A valid application ID is missing for ${candidate.name}. Refresh the applications list before scheduling this interview.`,
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
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
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
            className="mb-5 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"
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
              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                <Users size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Interview Stages
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-800">
                  {ROUNDS.length}
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <ClipboardList size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  All Stages Completed
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-800">
                  {loading ? "—" : completedAllStages}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Based on submitted passing evaluations
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
                  Choose a candidate to schedule their next stage or review
                  their current interview progress.
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
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-72"
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
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm outline-none focus:border-indigo-500"
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
                className="mb-3 animate-spin text-indigo-600"
              />
              <p className="font-semibold text-slate-700">
                Loading shortlisted candidates...
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Retrieving applications and interview records.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left">
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
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
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

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              {ROUNDS.map((round) => (
                                <span
                                  key={round}
                                  title={
                                    completedRounds.includes(round)
                                      ? `${round}: Passed`
                                      : `${round}: Not passed`
                                  }
                                  className={`h-2.5 w-7 rounded-full ${
                                    completedRounds.includes(round)
                                      ? "bg-green-500"
                                      : "bg-slate-200"
                                  }`}
                                />
                              ))}
                              <span className="ml-1 text-xs text-slate-500">
                                {completed}/{ROUNDS.length}
                              </span>
                            </div>

                            <p className="mt-2 text-xs text-slate-500">
                              {rejected
                                ? "Recruitment stopped"
                                : alreadyScheduled
                                  ? `${nextRound} already scheduled`
                                  : completed === 0
                                    ? "No passing evaluations recorded"
                                    : `${completed} stage(s) passed`}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            {rejected ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                                Recruitment stopped
                              </span>
                            ) : alreadyScheduled ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                                <Clock3 size={14} />
                                Already scheduled
                              </span>
                            ) : nextRound ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
                                <Clock3 size={14} />
                                {nextRound}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                                <CheckCircle2 size={14} />
                                All stages completed
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                                normalizeStatus(candidate.applicationStatus) ===
                                "interview scheduled"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-green-50 text-green-700"
                              }`}
                            >
                              <CheckCircle2 size={14} />
                              {candidate.applicationStatus || "Unknown"}
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
                                  hasExistingRoundSchedule(candidate, nextRound)
                                }
                                onClick={() => scheduleNextStage(candidate)}
                                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                <CalendarCheck size={15} />
                                {nextRound &&
                                hasExistingRoundSchedule(candidate, nextRound)
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
                              className="mt-3 text-sm font-semibold text-indigo-600"
                            >
                              Clear filters
                            </button>
                          )}

                          {candidates.length === 0 && (
                            <button
                              type="button"
                              onClick={() => loadData(true)}
                              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
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

        {/* WORKFLOW INFORMATION */}
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
          <div className="flex items-start gap-3">
            <CircleAlert size={18} className="mt-0.5 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Interview workflow
              </p>
              <p className="mt-1 text-sm leading-6 text-blue-700">
                Candidates progress through Technical Interview, HR Interview,
                Hiring Manager Interview, and Final Interview in that order. A
                stage counts as passed when its evaluation is submitted with a
                HIRE or STRONG_HIRE recommendation. An active schedule prevents
                another schedule for the same round. Cancelled interviews may be
                scheduled again. Rejected candidates cannot progress to further
                stages. The backend must enforce the same workflow rules.
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
                  const completed =
                    getCompletedRounds(selectedCandidate).includes(round);

                  const next = getNextRound(selectedCandidate) === round;

                  const rejected =
                    getCandidateInterviews(selectedCandidate).some(
                      isRejectedInterview,
                    );

                  const scheduled = hasExistingRoundSchedule(
                    selectedCandidate,
                    round,
                  );

                  return (
                    <div
                      key={round}
                      className={`flex items-center gap-3 rounded-xl border p-3 ${
                        completed
                          ? "border-green-200 bg-green-50"
                          : scheduled
                            ? "border-amber-200 bg-amber-50"
                            : next
                              ? "border-indigo-200 bg-indigo-50"
                              : "border-slate-200"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full ${
                          completed
                            ? "bg-green-100 text-green-700"
                            : scheduled
                              ? "bg-amber-100 text-amber-700"
                              : next
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {completed ? <CheckCircle2 size={18} /> : index + 1}
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">
                          {round}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {completed
                            ? "Passing evaluation submitted"
                            : rejected
                              ? "Recruitment process stopped"
                              : scheduled
                                ? "An interview is already scheduled or in progress"
                                : next
                                  ? "Next stage to schedule"
                                  : "Awaiting previous stages"}
                        </p>
                      </div>

                      {next && !scheduled && (
                        <ChevronRight size={18} className="text-indigo-600" />
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
                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {getNextRound(selectedCandidate) &&
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
