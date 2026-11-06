import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Eye,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  UserRound,
  CalendarDays,
  Star,
  MessageSquare,
  AlertCircle,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";

// Interview rounds must follow this order.
const ROUND_ORDER = [
  "Technical Interview",
  "HR Interview",
  "Hiring Manager Interview",
  "Final Interview",
];

// Round-specific criteria.
// These keys must exactly match the backend InterviewEvaluationService.
const ROUND_CRITERIA = {
  "TECHNICAL INTERVIEW": [
    { key: "programmingKnowledge", label: "Programming Knowledge" },
    { key: "technicalSkills", label: "Technical Skills" },
    { key: "problemSolvingAbility", label: "Problem-Solving Ability" },
    {
      key: "codingAndLogicalThinking",
      label: "Coding & Logical Thinking",
    },
    { key: "practicalExperience", label: "Practical Experience" },
    {
      key: "technicalAssessment",
      label: "Overall Technical Assessment",
    },
  ],

  "HR INTERVIEW": [
    { key: "communicationSkills", label: "Communication Skills" },
    { key: "confidence", label: "Confidence" },
    { key: "teamwork", label: "Teamwork" },
    { key: "adaptability", label: "Adaptability" },
    {
      key: "salaryExpectationsAndCulturalFit",
      label: "Salary Expectations & Cultural Fit",
    },
    {
      key: "behaviouralAssessment",
      label: "Behavioural Assessment",
    },
  ],

  "HIRING MANAGER INTERVIEW": [
    { key: "roleSpecificKnowledge", label: "Role-Specific Knowledge" },
    { key: "decisionMaking", label: "Decision-Making" },
    { key: "leadershipOwnership", label: "Leadership & Ownership" },
    {
      key: "relevantWorkExperience",
      label: "Relevant Work Experience",
    },
    { key: "jobRoleSuitability", label: "Job Role Suitability" },
    { key: "strategicThinking", label: "Strategic Thinking" },
  ],

  "FINAL INTERVIEW": [
    { key: "overallSuitability", label: "Overall Suitability" },
    { key: "careerGoals", label: "Career Goals" },
    { key: "longTermCommitment", label: "Long-Term Commitment" },
    { key: "professionalAttitude", label: "Professional Attitude" },
    {
      key: "finalHiringRecommendation",
      label: "Final Hiring Recommendation",
    },
    { key: "finalAssessment", label: "Final Assessment" },
  ],
};

const RECOMMENDATIONS = {
  STRONG_HIRE: "Strong Hire",
  HIRE: "Hire",
  HOLD: "Hold",
  NO_HIRE: "No Hire",
  STRONG_NO_HIRE: "Strong No Hire",
};

/* -------------------------------------------------------
   API RESPONSE HELPERS
------------------------------------------------------- */

// Handles Axios responses and Spring Boot ApiResponse wrappers.
const unwrapApiData = (response) => {
  let value = response?.data ?? response;

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.prototype.hasOwnProperty.call(value, "data") &&
    (
      Object.prototype.hasOwnProperty.call(value, "success") ||
      Object.prototype.hasOwnProperty.call(value, "message")
    )
  ) {
    value = value.data;
  }

  return value;
};

const getArray = (response) => {
  const value = unwrapApiData(response);

  if (Array.isArray(value)) return value;

  const candidates = [
    value?.content,
    value?.items,
    value?.interviews,
    value?.evaluations,
    value?.data,
    value?.data?.content,
    value?.data?.items,
    value?.data?.interviews,
    value?.data?.evaluations,
  ];

  return candidates.find(Array.isArray) || [];
};

const getValue = (...values) =>
  values.find(
    (value) => value !== undefined && value !== null && value !== "",
  );

const getInterviewId = (interview) =>
  getValue(interview?.id, interview?.interviewId);

const getCandidateName = (interview) =>
  getValue(
    interview?.candidateName,
    interview?.candidate?.candidateName,
    interview?.candidate?.name,
    interview?.application?.candidateName,
    interview?.application?.candidate?.name,
    "Unknown Candidate",
  );

const getVacancyName = (interview) =>
  getValue(
    interview?.vacancyTitle,
    interview?.jobTitle,
    interview?.vacancy?.title,
    interview?.application?.vacancyTitle,
    interview?.application?.vacancy?.title,
    "Not specified",
  );

const getRoundName = (interview) =>
  getValue(
    interview?.round,
    interview?.interviewRound,
    interview?.interviewType,
    "Interview",
  );

// Normalizes names such as:
// "Technical Interview"
// "TECHNICAL_INTERVIEW"
// "technical-interview"
const normalizeRoundName = (round) =>
  String(round || "")
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const getCriteriaForRound = (round) => {
  return ROUND_CRITERIA[normalizeRoundName(round)] || [];
};

const getInterviewStatus = (interview) =>
  String(
    getValue(interview?.status, interview?.interviewStatus, ""),
  ).toUpperCase();

const isCompleted = (interview) =>
  ["COMPLETED", "COMPLETE"].includes(getInterviewStatus(interview));

const isSubmitted = (evaluation) => {
  const status = String(evaluation?.status || "").toUpperCase();

  return (
    evaluation?.submitted === true ||
    evaluation?.isSubmitted === true ||
    status === "SUBMITTED" ||
    Boolean(evaluation?.submittedAt)
  );
};

const getInterviewerName = (evaluation) =>
  getValue(
    evaluation?.interviewerName,
    evaluation?.evaluatorName,
    evaluation?.employeeName,
    evaluation?.interviewer?.name,
    evaluation?.evaluator?.name,
    evaluation?.employee?.name,
    "Interviewer",
  );

const getRecommendation = (evaluation) => {
  const value = String(
    getValue(
      evaluation?.recommendation,
      evaluation?.overallRecommendation,
      "",
    ),
  ).toUpperCase();

  return (
    RECOMMENDATIONS[value] ||
    value.replace(/_/g, " ") ||
    "Not provided"
  );
};

/* -------------------------------------------------------
   SCORE HELPERS
------------------------------------------------------- */

// Supports both the new criteriaScores JSON map and old records.
const getScore = (evaluation, criterion) => {
  let scores = evaluation?.criteriaScores;

  // Some API responses may return JSONB as a JSON string.
  if (typeof scores === "string") {
    try {
      scores = JSON.parse(scores);
    } catch (error) {
      console.warn("Could not parse evaluation criteriaScores:", error);
      scores = {};
    }
  }

  // New backend format.
  const value = scores?.[criterion.key];

  if (value !== undefined && value !== null && value !== "") {
    return value;
  }

  // Fallback for older evaluation records.
  const legacyFields = {
    programmingKnowledge: ["technicalKnowledge"],
    technicalSkills: ["technicalSkills", "technicalKnowledge"],
    problemSolvingAbility: ["problemSolving"],
    codingAndLogicalThinking: ["technicalKnowledge"],
    practicalExperience: ["experience"],
    technicalAssessment: ["technicalKnowledge"],

    communicationSkills: ["communication"],
    confidence: ["professionalism"],
    teamwork: ["communication"],
    adaptability: ["professionalism"],
    salaryExpectationsAndCulturalFit: ["cultureFit"],
    behaviouralAssessment: ["professionalism"],

    roleSpecificKnowledge: ["roleSpecificSkills"],
    decisionMaking: ["problemSolving"],
    leadershipOwnership: ["professionalism"],
    relevantWorkExperience: ["experience"],
    jobRoleSuitability: ["roleSpecificSkills"],
    strategicThinking: ["problemSolving"],

    overallSuitability: ["professionalism"],
    careerGoals: ["professionalism"],
    longTermCommitment: ["professionalism"],
    professionalAttitude: ["professionalism"],
    finalHiringRecommendation: ["professionalism"],
    finalAssessment: ["professionalism"],
  };

  const fields = legacyFields[criterion.key] || [];

  for (const field of fields) {
    const legacyValue = evaluation?.[field];

    if (
      legacyValue !== undefined &&
      legacyValue !== null &&
      legacyValue !== ""
    ) {
      return legacyValue;
    }
  }

  return "—";
};

const getEvaluationFeedback = (evaluation) =>
  getValue(
    evaluation?.comments,
    evaluation?.feedback,
    evaluation?.overallFeedback,
    evaluation?.interviewerFeedback,
    "No feedback provided.",
  );

const getEvaluationStrengths = (evaluation) =>
  getValue(
    evaluation?.strengths,
    evaluation?.keyStrengths,
    "Not provided",
  );

const getEvaluationWeaknesses = (evaluation) =>
  getValue(
    evaluation?.areasForImprovement,
    evaluation?.weaknesses,
    evaluation?.improvementAreas,
    "Not provided",
  );

const formatDate = (value) => {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
};

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  "Something went wrong. Please try again.";

const getHttpStatus = (error) =>
  error?.response?.status ||
  Number(String(error?.message || "").match(/^(\d{3})/)?.[1]) ||
  null;

/* -------------------------------------------------------
   INTERVIEWER ASSIGNMENT HELPERS
------------------------------------------------------- */

const getAssignments = (interview) => {
  const possibleAssignments = [
    interview?.interviewerIds,
    interview?.interviewers,
    interview?.evaluators,
    interview?.assignments,
    interview?.interviewerAssignments,
    interview?.evaluatorAssignments,
  ];

  return (
    possibleAssignments.find(
      (value) => Array.isArray(value) && value.length > 0,
    ) || []
  );
};

const getAssignmentId = (assignment) => {
  if (
    typeof assignment === "string" ||
    typeof assignment === "number"
  ) {
    return String(assignment);
  }

  return getValue(
    assignment?.employeeId,
    assignment?.evaluatorId,
    assignment?.userId,
    assignment?.employeeUserId,
    assignment?.id,
  );
};

/*
 * Compare assigned interviewer IDs with submitted evaluator IDs.
 *
 * This assumes interviewerIds and evaluatorId represent the same
 * employee identifier in the backend.
 */
const checkEvaluationCompletion = (interview, evaluations = []) => {
  const assignments = getAssignments(interview);

  const assignedIds = [
    ...new Set(
      assignments
        .map(getAssignmentId)
        .filter((id) => id !== undefined && id !== null && id !== "")
        .map(String),
    ),
  ];

  if (assignedIds.length === 0) {
    return {
      complete: false,
      assignedCount: 0,
      submittedCount: 0,
      message:
        "Assigned interviewer information is unavailable or no interviewers are assigned.",
    };
  }

  const submittedIds = new Set(
    evaluations
      .filter(isSubmitted)
      .map((evaluation) =>
        getValue(
          evaluation?.evaluatorId,
          evaluation?.interviewerId,
          evaluation?.employeeId,
        ),
      )
      .filter((id) => id !== undefined && id !== null && id !== "")
      .map(String),
  );

  const submittedCount = assignedIds.filter((id) =>
    submittedIds.has(id),
  ).length;

  const complete = submittedCount === assignedIds.length;

  return {
    complete,
    assignedCount: assignedIds.length,
    submittedCount,
    message: complete
      ? "All assigned interviewers have submitted their evaluations."
      : `${submittedCount} of ${assignedIds.length} assigned interviewers have submitted evaluations.`,
  };
};

/* -------------------------------------------------------
   API METHOD HELPER
------------------------------------------------------- */

const callFirstAvailable = async (methodNames, ...args) => {
  for (const methodName of methodNames) {
    if (typeof recruitmentApi?.[methodName] === "function") {
      return recruitmentApi[methodName](...args);
    }
  }

  throw new Error(
    `API method not found. Expected one of: ${methodNames.join(
      ", ",
    )}. Check src/services/api.js.`,
  );
};

/* =======================================================
   MAIN COMPONENT
======================================================= */

export default function InterviewEvaluationReview() {
  const [interviews, setInterviews] = useState([]);
  const [evaluationsByInterview, setEvaluationsByInterview] = useState({});
  const [decisionsByInterview, setDecisionsByInterview] = useState({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [roundFilter, setRoundFilter] = useState("ALL");

  const [selectedInterview, setSelectedInterview] = useState(null);
  const [expandedEvaluations, setExpandedEvaluations] = useState({});

  const [decisionComments, setDecisionComments] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

  /* -------------------------------------------------------
     LOAD INTERVIEWS, EVALUATIONS AND DECISIONS
  ------------------------------------------------------- */

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      // 1. Load all interviews.
      const interviewResponse = await callFirstAvailable([
        "getAllInterviews",
        "getRecruitmentInterviews",
        "getInterviews",
      ]);

      const interviewList = getArray(interviewResponse);

      // 2. Load individual interview details.
      const detailedInterviews = await Promise.all(
        interviewList.map(async (interview) => {
          const id = getInterviewId(interview);

          if (!id || typeof recruitmentApi.getInterview !== "function") {
            return interview;
          }

          try {
            const detailResponse = await recruitmentApi.getInterview(id);
            const details = unwrapApiData(detailResponse);

            return {
              ...interview,
              ...(details && typeof details === "object" ? details : {}),
            };
          } catch (detailError) {
            console.warn(
              `Could not load interview details for ${id}:`,
              detailError,
            );

            return interview;
          }
        }),
      );

      setInterviews(detailedInterviews);

      const completedInterviews = detailedInterviews.filter(isCompleted);

      // 3. Load evaluations for completed interviews.
      const evaluationResults = await Promise.all(
        completedInterviews.map(async (interview) => {
          const id = getInterviewId(interview);

          if (!id) return null;

          try {
            const response =
              await recruitmentApi.getInterviewEvaluations(id);

            return [String(id), getArray(response)];
          } catch (evaluationError) {
            console.error(
              `Could not load evaluations for interview ${id}:`,
              evaluationError,
            );

            return [String(id), []];
          }
        }),
      );

      // 4. Load manager decisions.
      const decisionResults = await Promise.all(
        completedInterviews.map(async (interview) => {
          const id = getInterviewId(interview);

          if (
            !id ||
            typeof recruitmentApi.getInterviewDecision !== "function"
          ) {
            return id ? [String(id), null] : null;
          }

          try {
            const response =
              await recruitmentApi.getInterviewDecision(id);

            const decisionData = unwrapApiData(response);

            return [String(id), decisionData ?? null];
          } catch (decisionError) {
            const status = getHttpStatus(decisionError);

            if (status === 404) {
              return [String(id), null];
            }

            console.error(
              `Could not load manager decision for interview ${id}:`,
              decisionError,
            );

            return [
              String(id),
              {
                _loadError: true,
                message: getErrorMessage(decisionError),
              },
            ];
          }
        }),
      );

      setEvaluationsByInterview(
        Object.fromEntries(evaluationResults.filter(Boolean)),
      );

      setDecisionsByInterview(
        Object.fromEntries(decisionResults.filter(Boolean)),
      );
    } catch (loadError) {
      console.error("Failed to load interview review data:", loadError);
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* -------------------------------------------------------
     FILTER AND SORT INTERVIEWS
  ------------------------------------------------------- */

  const reviewableInterviews = useMemo(() => {
    return interviews
      .filter(isCompleted)
      .sort((a, b) => {
        const aRound = ROUND_ORDER.findIndex(
          (round) =>
            normalizeRoundName(round) ===
            normalizeRoundName(getRoundName(a)),
        );

        const bRound = ROUND_ORDER.findIndex(
          (round) =>
            normalizeRoundName(round) ===
            normalizeRoundName(getRoundName(b)),
        );

        const safeA = aRound === -1 ? ROUND_ORDER.length : aRound;
        const safeB = bRound === -1 ? ROUND_ORDER.length : bRound;

        return safeA - safeB;
      });
  }, [interviews]);

  const filteredInterviews = useMemo(() => {
    return reviewableInterviews.filter((interview) => {
      const id = getInterviewId(interview);

      const candidateName = String(
        getCandidateName(interview),
      ).toLowerCase();

      const vacancyName = String(
        getVacancyName(interview),
      ).toLowerCase();

      const round = normalizeRoundName(getRoundName(interview));

      const matchesSearch =
        candidateName.includes(search.toLowerCase()) ||
        vacancyName.includes(search.toLowerCase());

      const matchesRound =
        roundFilter === "ALL" ||
        round === normalizeRoundName(roundFilter);

      return matchesSearch && matchesRound && Boolean(id);
    });
  }, [reviewableInterviews, search, roundFilter]);

  /* -------------------------------------------------------
     SELECTED INTERVIEW DATA
  ------------------------------------------------------- */

  const selectedId = selectedInterview
    ? String(getInterviewId(selectedInterview))
    : null;

  const selectedEvaluations = selectedId
    ? evaluationsByInterview[selectedId] || []
    : [];

  const decision = selectedId
    ? decisionsByInterview[selectedId]
    : null;

  const evaluationCompletion = selectedInterview
    ? checkEvaluationCompletion(
        selectedInterview,
        selectedEvaluations,
      )
    : {
        complete: false,
        assignedCount: 0,
        submittedCount: 0,
        message: "",
      };

  const allEvaluationsSubmitted = evaluationCompletion.complete;

  const decisionStatus = String(
    decision?.decision || decision?.status || "",
  ).toUpperCase();

  const decisionLoadError = Boolean(decision?._loadError);

  const alreadyDecided =
    decisionStatus === "APPROVED" ||
    decisionStatus === "REJECTED";

  /* -------------------------------------------------------
     MODAL FUNCTIONS
  ------------------------------------------------------- */

  const toggleEvaluation = (id) => {
    setExpandedEvaluations((previous) => ({
      ...previous,
      [id]: !previous[id],
    }));
  };

  const openReview = (interview) => {
    setSelectedInterview(interview);
    setDecisionComments("");
    setDecisionReason("");
    setExpandedEvaluations({});
    setSuccessMessage("");
    setError("");
  };

  const closeReview = () => {
    if (submittingDecision) return;

    setSelectedInterview(null);
    setDecisionComments("");
    setDecisionReason("");
  };

  /* -------------------------------------------------------
     MANAGER APPROVE / REJECT
  ------------------------------------------------------- */

  const submitManagerDecision = async (managerDecision) => {
    if (!selectedInterview || submittingDecision) return;

    if (decisionLoadError) {
      setError(
        "The existing manager decision could not be loaded. Refresh the page before making another decision.",
      );
      return;
    }

    if (!allEvaluationsSubmitted) {
      setError(
        "You cannot make a decision until all assigned interviewers submit their evaluations.",
      );
      return;
    }

    if (alreadyDecided) {
      setError(
        "A manager decision has already been recorded for this round.",
      );
      return;
    }

    if (
      managerDecision === "REJECTED" &&
      !decisionReason.trim()
    ) {
      setError("Please enter a reason for rejecting this candidate.");
      return;
    }

    const interviewId = getInterviewId(selectedInterview);

    const payload = {
      decision: managerDecision,
      comments:
        managerDecision === "REJECTED"
          ? decisionReason.trim()
          : decisionComments.trim(),
    };

    setSubmittingDecision(true);
    setError("");
    setSuccessMessage("");

    try {
      await callFirstAvailable(
        [
          "decideInterviewRound",
          "submitInterviewDecision",
          "createInterviewDecision",
          "saveInterviewDecision",
          "approveInterviewRound",
        ],
        interviewId,
        payload,
      );

      setSuccessMessage(
        managerDecision === "APPROVED"
          ? "Interview round approved successfully. The next round can now be scheduled."
          : "Candidate rejected successfully.",
      );

      await loadData(true);

      setSelectedInterview(null);
      setDecisionComments("");
      setDecisionReason("");
    } catch (decisionError) {
      console.error(
        "Failed to submit manager decision:",
        decisionError,
      );

      setError(getErrorMessage(decisionError));
    } finally {
      setSubmittingDecision(false);
    }
  };

  /* -------------------------------------------------------
     STATUS HELPERS
  ------------------------------------------------------- */

  const getEvaluationStatus = (interview) => {
    const id = String(getInterviewId(interview));
    const evaluations = evaluationsByInterview[id] || [];

    return checkEvaluationCompletion(interview, evaluations);
  };

  const getDecisionLabel = (interview) => {
    const id = String(getInterviewId(interview));
    const currentDecision = decisionsByInterview[id];

    if (currentDecision?._loadError) {
      return "Unable to Load";
    }

    if (!currentDecision) {
      return "Pending Review";
    }

    const value = String(
      currentDecision.decision || currentDecision.status || "",
    ).toUpperCase();

    if (value === "APPROVED") return "Approved";
    if (value === "REJECTED") return "Rejected";

    return "Pending Review";
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <PageLayout
      role="recruiter"
      activePage="Evaluation Review"
      title="Interview Evaluation Review"
      subtitle="Review interviewer feedback and approve candidates for the next round"
    >
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-primary-600">
                <ClipboardCheck size={17} />
                Recruitment Management
              </div>

              <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                Interview Evaluation Review
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Review interviewer evaluations and make decisions for
                the next interview round.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0"
              />

              <span>{error}</span>

              <button
                type="button"
                onClick={() => setError("")}
                className="ml-auto"
                aria-label="Close error"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {/* Success message */}
          {successMessage && (
            <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              <CheckCircle2
                size={19}
                className="mt-0.5 shrink-0"
              />

              <span>{successMessage}</span>

              <button
                type="button"
                onClick={() => setSuccessMessage("")}
                className="ml-auto"
                aria-label="Close message"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Completed Interviews
                </span>

                <CalendarDays
                  className="text-primary-500"
                  size={21}
                />
              </div>

              <p className="mt-3 text-3xl font-bold text-slate-900">
                {reviewableInterviews.length}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Awaiting Manager Review
                </span>

                <Clock
                  className="text-amber-500"
                  size={21}
                />
              </div>

              <p className="mt-3 text-3xl font-bold text-slate-900">
                {
                  reviewableInterviews.filter(
                    (interview) =>
                      getDecisionLabel(interview) === "Pending Review",
                  ).length
                }
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Approved Rounds
                </span>

                <CheckCircle2
                  className="text-green-500"
                  size={21}
                />
              </div>

              <p className="mt-3 text-3xl font-bold text-slate-900">
                {
                  reviewableInterviews.filter(
                    (interview) =>
                      getDecisionLabel(interview) === "Approved",
                  ).length
                }
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search candidate or vacancy..."
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </div>

              <select
                value={roundFilter}
                onChange={(event) => setRoundFilter(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary-500"
              >
                <option value="ALL">All Interview Rounds</option>

                {ROUND_ORDER.map((round) => (
                  <option key={round} value={round}>
                    {round}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interview list */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-900">
                Completed Interview Rounds
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Review all submitted evaluations before making a decision.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-500">
                <RefreshCw className="animate-spin" size={19} />
                Loading interview reviews...
              </div>
            ) : filteredInterviews.length === 0 ? (
              <div className="p-12 text-center">
                <ClipboardCheck
                  size={36}
                  className="mx-auto text-slate-300"
                />

                <h3 className="mt-3 font-semibold text-slate-700">
                  No completed interviews found
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Completed interviews will appear here for manager review.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">
                          Candidate
                        </th>

                        <th className="px-5 py-3 font-semibold">
                          Vacancy
                        </th>

                        <th className="px-5 py-3 font-semibold">
                          Round
                        </th>

                        <th className="px-5 py-3 font-semibold">
                          Evaluations
                        </th>

                        <th className="px-5 py-3 font-semibold">
                          Decision
                        </th>

                        <th className="px-5 py-3 text-right font-semibold">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredInterviews.map((interview) => {
                        const id = String(getInterviewId(interview));
                        const evaluationStatus =
                          getEvaluationStatus(interview);
                        const managerDecision =
                          getDecisionLabel(interview);

                        return (
                          <tr key={id} className="hover:bg-slate-50">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                                  <UserRound size={17} />
                                </div>

                                <span className="font-semibold text-slate-800">
                                  {getCandidateName(interview)}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {getVacancyName(interview)}
                            </td>

                            <td className="px-5 py-4">
                              <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                                {getRoundName(interview)}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`font-semibold ${
                                  evaluationStatus.complete
                                    ? "text-green-700"
                                    : "text-amber-700"
                                }`}
                              >
                                {evaluationStatus.submittedCount}/
                                {evaluationStatus.assignedCount} submitted
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  managerDecision === "Approved"
                                    ? "bg-green-100 text-green-700"
                                    : managerDecision === "Rejected"
                                      ? "bg-red-100 text-red-700"
                                      : managerDecision === "Unable to Load"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {managerDecision}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => openReview(interview)}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700"
                              >
                                <Eye size={15} />
                                View Reviews
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile list */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {filteredInterviews.map((interview) => {
                    const id = String(getInterviewId(interview));
                    const evaluationStatus =
                      getEvaluationStatus(interview);

                    return (
                      <div key={id} className="space-y-3 p-4">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {getCandidateName(interview)}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {getVacancyName(interview)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full bg-primary-50 px-3 py-1 text-primary-700">
                            {getRoundName(interview)}
                          </span>

                          <span className="text-slate-600">
                            {evaluationStatus.submittedCount}/
                            {evaluationStatus.assignedCount} evaluations
                            submitted
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => openReview(interview)}
                          className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white"
                        >
                          View Evaluations
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* =================================================
            EVALUATION REVIEW MODAL
        ================================================= */}

        {selectedInterview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-6">
            <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              {/* Modal header */}
              <div className="flex items-start justify-between border-b border-slate-200 p-5 sm:p-6">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-primary-600">
                    <ClipboardCheck size={17} />
                    Manager Evaluation Review
                  </div>

                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    {getCandidateName(selectedInterview)}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {getVacancyName(selectedInterview)} ·{" "}
                    {getRoundName(selectedInterview)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeReview}
                  disabled={submittingDecision}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  aria-label="Close review"
                >
                  <X size={21} />
                </button>
              </div>

              {/* Modal content */}
              <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
                {/* Interview summary */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">
                      Interview Round
                    </p>

                    <p className="mt-1 font-semibold text-slate-800">
                      {getRoundName(selectedInterview)}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">
                      Interview Date
                    </p>

                    <p className="mt-1 font-semibold text-slate-800">
                      {formatDate(
                        getValue(
                          selectedInterview.interviewDateTime,
                          selectedInterview.scheduledAt,
                          selectedInterview.interviewDate,
                        ),
                      )}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">
                      Submitted Evaluations
                    </p>

                    <p className="mt-1 font-semibold text-slate-800">
                      {evaluationCompletion.submittedCount} /{" "}
                      {evaluationCompletion.assignedCount}
                    </p>
                  </div>
                </div>

                {/* Interviewer evaluations */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">
                      Interviewer Evaluation Forms
                    </h3>

                    <span className="text-xs text-slate-500">
                      {selectedEvaluations.length} evaluation(s)
                    </span>
                  </div>

                  {selectedEvaluations.length === 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      No evaluation records were returned for this
                      interview. Check the evaluation API response and
                      assigned interviewers.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedEvaluations.map((evaluation, index) => {
                        const evaluationId =
                          evaluation.id ||
                          evaluation.evaluationId ||
                          index;

                        const submitted = isSubmitted(evaluation);

                        const expanded =
                          expandedEvaluations[evaluationId] ?? true;

                        // Select criteria using the current interview round.
                        const roundCriteria = getCriteriaForRound(
                          getRoundName(selectedInterview),
                        );

                        return (
                          <div
                            key={evaluationId}
                            className="overflow-hidden rounded-xl border border-slate-200"
                          >
                            {/* Evaluation header */}
                            <button
                              type="button"
                              onClick={() =>
                                toggleEvaluation(evaluationId)
                              }
                              className="flex w-full items-center justify-between gap-3 bg-slate-50 p-4 text-left hover:bg-slate-100"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                                  <UserRound size={19} />
                                </div>

                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {getInterviewerName(evaluation)}
                                  </p>

                                  <div className="mt-1 flex items-center gap-2">
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                        submitted
                                          ? "bg-green-100 text-green-700"
                                          : "bg-amber-100 text-amber-700"
                                      }`}
                                    >
                                      {submitted
                                        ? "Submitted"
                                        : "Not submitted"}
                                    </span>

                                    <span className="text-xs text-slate-500">
                                      {formatDate(
                                        evaluation.submittedAt ||
                                          evaluation.updatedAt,
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {expanded ? (
                                <ChevronUp
                                  size={19}
                                  className="shrink-0 text-slate-500"
                                />
                              ) : (
                                <ChevronDown
                                  size={19}
                                  className="shrink-0 text-slate-500"
                                />
                              )}
                            </button>

                            {/* Evaluation details */}
                            {expanded && (
                              <div className="space-y-5 p-4 sm:p-5">
                                {/* Scores */}
                                <div>
                                  <h4 className="mb-3 text-sm font-semibold text-slate-800">
                                    Evaluation Scores
                                  </h4>

                                  {roundCriteria.length === 0 ? (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                      Could not identify the evaluation
                                      criteria for this interview round:
                                      {" "}
                                      {getRoundName(selectedInterview)}.
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {roundCriteria.map((criterion) => {
                                        const score = getScore(
                                          evaluation,
                                          criterion,
                                        );

                                        const numericScore = Number(score);

                                        const validScore =
                                          score !== "—" &&
                                          Number.isFinite(numericScore) &&
                                          numericScore >= 1 &&
                                          numericScore <= 5;

                                        return (
                                          <div
                                            key={criterion.key}
                                            className="flex flex-col gap-2 rounded-lg border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                                          >
                                            <span className="text-sm font-medium text-slate-700">
                                              {criterion.label}
                                            </span>

                                            <div className="flex items-center gap-3">
                                              <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(
                                                  (star) => (
                                                    <Star
                                                      key={star}
                                                      size={18}
                                                      className={
                                                        validScore &&
                                                        star <= numericScore
                                                          ? "fill-amber-400 text-amber-400"
                                                          : "text-slate-200"
                                                      }
                                                    />
                                                  ),
                                                )}
                                              </div>

                                              <span className="w-10 text-right text-sm font-bold text-slate-800">
                                                {validScore
                                                  ? `${numericScore}/5`
                                                  : "—"}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* Strengths and improvement areas */}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div className="rounded-lg bg-green-50 p-4">
                                    <h4 className="text-xs font-bold uppercase text-green-800">
                                      Strengths
                                    </h4>

                                    <p className="mt-2 whitespace-pre-wrap text-sm text-green-900">
                                      {getEvaluationStrengths(evaluation)}
                                    </p>
                                  </div>

                                  <div className="rounded-lg bg-amber-50 p-4">
                                    <h4 className="text-xs font-bold uppercase text-amber-800">
                                      Areas for Improvement
                                    </h4>

                                    <p className="mt-2 whitespace-pre-wrap text-sm text-amber-900">
                                      {getEvaluationWeaknesses(evaluation)}
                                    </p>
                                  </div>
                                </div>

                                {/* Feedback */}
                                <div className="rounded-lg border border-slate-200 p-4">
                                  <div className="flex items-center gap-2">
                                    <MessageSquare
                                      size={16}
                                      className="text-slate-500"
                                    />

                                    <h4 className="text-sm font-semibold text-slate-800">
                                      Interviewer Feedback
                                    </h4>
                                  </div>

                                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                    {getEvaluationFeedback(evaluation)}
                                  </p>
                                </div>

                                {/* Interviewer recommendation */}
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium text-slate-600">
                                    Interviewer Recommendation:
                                  </span>

                                  <span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-semibold text-primary-700">
                                    {getRecommendation(evaluation)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Manager decision */}
                <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-4 sm:p-5">
                  <h3 className="font-bold text-slate-900">
                    Recruitment Manager Decision
                  </h3>

                  <p className="mt-1 text-sm text-slate-600">
                    Review all submitted evaluations before approving
                    or rejecting this interview round. The manager
                    decision is independent of interviewer recommendations.
                  </p>

                  {/* Decision loading error */}
                  {decisionLoadError && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      The existing manager decision could not be loaded:
                      {" "}
                      {decision.message} Refresh the page before making
                      a decision.
                    </div>
                  )}

                  {/* Approved decision */}
                  {decisionStatus === "APPROVED" && (
                    <div className="mt-4 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                      <CheckCircle2 size={19} className="shrink-0" />

                      <div>
                        <p className="font-semibold">
                          This round has been approved.
                        </p>

                        <p className="mt-1">
                          The candidate is allowed to proceed to the next
                          interview round.
                        </p>

                        {decision?.comments && (
                          <p className="mt-2">
                            Manager comments: {decision.comments}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rejected decision */}
                  {decisionStatus === "REJECTED" && (
                    <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                      <XCircle size={19} className="shrink-0" />

                      <div>
                        <p className="font-semibold">
                          This candidate has been rejected.
                        </p>

                        <p className="mt-1">
                          {decision?.comments ||
                            decision?.reason ||
                            "No rejection reason was provided."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Decision form */}
                  {!alreadyDecided && (
                    <>
                      {!allEvaluationsSubmitted && (
                        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                          <AlertCircle
                            size={18}
                            className="mt-0.5 shrink-0"
                          />

                          <div>
                            <p className="font-semibold">
                              Waiting for all interviewer evaluations.
                            </p>

                            <p className="mt-1">
                              {evaluationCompletion.message} Approval
                              and rejection are disabled until all assigned
                              interviewers have submitted.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Manager Comments
                        </label>

                        <textarea
                          rows={3}
                          value={decisionComments}
                          onChange={(event) =>
                            setDecisionComments(event.target.value)
                          }
                          placeholder="Add your review comments..."
                          className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                        />
                      </div>

                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Rejection Reason
                        </label>

                        <textarea
                          rows={2}
                          value={decisionReason}
                          onChange={(event) =>
                            setDecisionReason(event.target.value)
                          }
                          placeholder="Required only if you reject the candidate..."
                          className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                        />
                      </div>

                      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            submitManagerDecision("REJECTED")
                          }
                          disabled={
                            submittingDecision ||
                            decisionLoadError ||
                            !allEvaluationsSubmitted ||
                            !decisionReason.trim()
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <XCircle size={17} />
                          Reject Candidate
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            submitManagerDecision("APPROVED")
                          }
                          disabled={
                            submittingDecision ||
                            decisionLoadError ||
                            !allEvaluationsSubmitted
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {submittingDecision ? (
                            <RefreshCw
                              size={17}
                              className="animate-spin"
                            />
                          ) : (
                            <CheckCircle2 size={17} />
                          )}

                          Approve & Proceed
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex justify-end border-t border-slate-200 bg-slate-50 p-4">
                <button
                  type="button"
                  onClick={closeReview}
                  disabled={submittingDecision}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
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