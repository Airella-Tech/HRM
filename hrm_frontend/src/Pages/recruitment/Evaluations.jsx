import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Search,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  Eye,
  X,
  Star,
  UserRound,
  CalendarDays,
  BriefcaseBusiness,
  MessageSquare,
  Send,
  AlertCircle,
  RefreshCw,
  Download,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";

// Each round has exactly six criteria.
// These keys must match InterviewEvaluationService.java.
const CRITERIA_BY_ROUND = {
  TECHNICAL: [
    { key: "programmingKnowledge", label: "Programming Knowledge" },
    { key: "technicalSkills", label: "Technical Skills" },
    { key: "problemSolvingAbility", label: "Problem-Solving Ability" },
    { key: "codingAndLogicalThinking", label: "Coding & Logical Thinking" },
    { key: "practicalExperience", label: "Practical Experience" },
    { key: "technicalAssessment", label: "Overall Technical Assessment" },
  ],

  HR: [
    { key: "communicationSkills", label: "Communication Skills" },
    { key: "confidence", label: "Confidence" },
    { key: "teamwork", label: "Teamwork" },
    { key: "adaptability", label: "Adaptability" },
    {
      key: "salaryExpectationsAndCulturalFit",
      label: "Salary Expectations & Cultural Fit",
    },
    { key: "behaviouralAssessment", label: "Behavioural Assessment" },
  ],

  "HIRING MANAGER": [
    { key: "roleSpecificKnowledge", label: "Role-specific Knowledge" },
    { key: "decisionMaking", label: "Decision Making" },
    { key: "leadershipOwnership", label: "Leadership & Ownership" },
    { key: "relevantWorkExperience", label: "Relevant Work Experience" },
    { key: "jobRoleSuitability", label: "Job Role Suitability" },
    { key: "strategicThinking", label: "Strategic Thinking" },
  ],

  FINAL: [
    { key: "overallSuitability", label: "Overall Suitability" },
    { key: "careerGoals", label: "Career Goals" },
    { key: "longTermCommitment", label: "Long-term Commitment" },
    { key: "professionalAttitude", label: "Professional Attitude" },
    {
      key: "finalHiringRecommendation",
      label: "Final Hiring Recommendation",
    },
    { key: "finalAssessment", label: "Final Assessment" },
  ],
};

const RECOMMENDATIONS = [
  { value: "STRONG_HIRE", label: "Strong Hire" },
  { value: "HIRE", label: "Hire" },
  { value: "HOLD", label: "Hold for Review" },
  { value: "NO_HIRE", label: "No Hire" },
  { value: "STRONG_NO_HIRE", label: "Strong No Hire" },
];

const normalizeRecommendation = (value) => {
  const raw = String(value ?? "")
    .trim()
    .toUpperCase();

  const aliases = {
    STRONGLY_RECOMMEND: "STRONG_HIRE",
    STRONG_RECOMMEND: "STRONG_HIRE",
    RECOMMEND: "HIRE",
    RECOMMENDED: "HIRE",
    NOT_RECOMMENDED: "NO_HIRE",
    STRONGLY_NOT_RECOMMENDED: "STRONG_NO_HIRE",
    STRONG_NOT_RECOMMENDED: "STRONG_NO_HIRE",
    REJECT: "NO_HIRE",
    REJECTED: "NO_HIRE",
    PENDING: "",
  };

  const normalized = aliases[raw] ?? raw;

  return RECOMMENDATIONS.some((item) => item.value === normalized)
    ? normalized
    : "";
};

const normalizeRound = (round) => {
  const value = String(round ?? "")
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (value.includes("TECHNICAL")) return "TECHNICAL";
  if (value === "HR" || value.includes("HR INTERVIEW")) return "HR";
  if (value.includes("HIRING MANAGER")) return "HIRING MANAGER";
  if (value.includes("FINAL")) return "FINAL";

  return null;
};

const getCriteriaForRound = (round) => {
  const normalized = normalizeRound(round);
  return normalized ? CRITERIA_BY_ROUND[normalized] : [];
};

const emptyEvaluation = () => ({
  criteriaScores: {},
  strengths: "",
  areasForImprovement: "",
  feedback: "",
  recommendation: "",
});

// Safely parse criteriaScores whether the API returns an object
// or a JSON string.
const parseCriteriaScores = (value) => {
  let scores = value;

  if (typeof scores === "string") {
    try {
      scores = JSON.parse(scores);
    } catch {
      return {};
    }
  }

  if (!scores || typeof scores !== "object" || Array.isArray(scores)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(scores).map(([key, value]) => [
      key,
      value == null ? 0 : Number(value),
    ]),
  );
};

const unwrap = (response) => {
  let data = response;

  for (let i = 0; i < 8; i += 1) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return [];

    const arrayKey = [
      "content",
      "items",
      "interviews",
      "evaluations",
      "records",
      "results",
    ].find((key) => Array.isArray(data[key]));

    if (arrayKey) return data[arrayKey];

    if (data.data !== undefined && data.data !== data) {
      data = data.data;
      continue;
    }

    const nestedKey = ["result", "payload"].find(
      (key) => data[key] && typeof data[key] === "object" && data[key] !== data,
    );

    if (nestedKey) {
      data = data[nestedKey];
      continue;
    }

    return [];
  }

  return [];
};

const normalizeInterviewStatus = (status) =>
  String(status ?? "PENDING")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

const normalizeInterview = (item) => {
  const candidate = item?.candidate ?? item?.applicant ?? {};

  const application =
    item?.application ??
    item?.jobApplication ??
    item?.candidateApplication ??
    candidate?.application ??
    {};

  const job =
    item?.jobVacancy ?? item?.job ?? item?.vacancy ?? item?.position ?? {};

  const interviewer =
    item?.interviewer ??
    item?.assignedInterviewer ??
    item?.assignedEmployee ??
    {};

  const rawName =
    item?.candidateName ||
    item?.applicantName ||
    candidate?.fullName ||
    candidate?.name ||
    [candidate?.firstName, candidate?.lastName].filter(Boolean).join(" ");

  const rawJobTitle =
    item?.jobTitle ||
    item?.vacancyTitle ||
    item?.positionTitle ||
    job?.title ||
    job?.jobTitle ||
    job?.positionTitle;

  const round =
    item?.round ??
    item?.interviewRound ??
    item?.stage ??
    item?.roundName ??
    item?.interviewType ??
    "Not specified";

  const scheduledAt = item?.scheduledAt ?? item?.interviewDateTime ?? "";

  const rawDate =
    item?.date ??
    item?.interviewDate ??
    item?.scheduledDate ??
    scheduledAt ??
    "";

  const rawTime =
    item?.time ?? item?.interviewTime ?? item?.scheduledTime ?? "";

  return {
    ...item,

    id:
      item?.id ??
      item?.interviewId ??
      item?.interview?.id ??
      item?.interview?.interviewId ??
      null,

    candidateId:
      item?.candidateId ?? candidate?.id ?? candidate?.candidateId ?? null,

    applicationId:
      item?.applicationId ??
      item?.application?.id ??
      item?.application?.applicationId ??
      item?.jobApplicationId ??
      item?.jobApplication?.id ??
      item?.jobApplication?.applicationId ??
      item?.candidateApplicationId ??
      item?.candidateApplication?.id ??
      item?.candidateApplication?.applicationId ??
      candidate?.applicationId ??
      candidate?.application?.id ??
      application?.id ??
      application?.applicationId ??
      null,

    candidateName: String(rawName ?? "").trim() || "Unnamed candidate",
    jobTitle: String(rawJobTitle ?? "").trim() || "Position not specified",
    round: String(round).replace(/_/g, " "),
    date: rawDate,
    time: rawTime,

    status:
      item?.status ??
      item?.interviewStatus ??
      item?.interview?.status ??
      "PENDING",

    interviewerName:
      item?.interviewerName ?? interviewer?.fullName ?? interviewer?.name ?? "",
  };
};

const normalizeEvaluation = (item) => {
  const status = normalizeInterviewStatus(item?.status);

  const interviewId =
    item?.interviewId ??
    item?.interview?.id ??
    item?.interview?.interviewId ??
    null;

  const criteriaScores = parseCriteriaScores(item?.criteriaScores);

  // Legacy fields are retained only for older evaluations.
  const legacyScores = {
    technicalKnowledge: Number(item?.technicalKnowledge ?? 0),
    problemSolving: Number(item?.problemSolving ?? 0),
    communication: Number(item?.communication ?? 0),
    roleSpecificSkills: Number(item?.roleSpecificSkills ?? 0),
    professionalism: Number(item?.professionalism ?? 0),
  };

  const scoreValues = Object.values(criteriaScores).filter(
    (score) => Number.isFinite(score) && score > 0,
  );

  const legacyValues = Object.values(legacyScores).filter(
    (score) => Number.isFinite(score) && score > 0,
  );

  const averageFromScores = (values) =>
    values.length
      ? values.reduce((sum, score) => sum + score, 0) / values.length
      : 0;

  const averageScore =
    item?.averageScore != null
      ? Number(item.averageScore)
      : averageFromScores(scoreValues.length ? scoreValues : legacyValues);

  const recommendation =
    item?.recommendation ??
    item?.hiringRecommendation ??
    item?.recommendationStatus ??
    item?.decision ??
    "";

  return {
    ...item,

    id: item?.id ?? item?.evaluationId ?? null,
    interviewId,
    criteriaScores,
    legacyScores,

    strengths:
      item?.strengths ??
      item?.candidateStrengths ??
      item?.strengthsDescription ??
      "",

    areasForImprovement:
      item?.areasForImprovement ??
      item?.weaknesses ??
      item?.improvementAreas ??
      "",

    feedback:
      item?.comments ?? item?.feedback ?? item?.interviewerFeedback ?? "",

    recommendation: normalizeRecommendation(recommendation),

    averageScore: Number.isFinite(averageScore) ? averageScore : 0,

    submitted:
      item?.submitted === true ||
      status === "SUBMITTED" ||
      status === "COMPLETED",
  };
};

const formatDate = (value) => {
  if (!value) return "Date not set";

  const datePart = String(value).slice(0, 10);
  const parsed = new Date(`${datePart}T00:00:00`);

  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const getScheduledDateTime = (interview) => {
  const dateValue = interview?.date;
  if (!dateValue) return null;

  if (String(dateValue).includes("T")) {
    const dateTime = new Date(dateValue);
    return Number.isNaN(dateTime.getTime()) ? null : dateTime;
  }

  const datePart = String(dateValue).slice(0, 10);
  const timePart = String(interview?.time ?? "").trim();
  const time = timePart ? timePart.slice(0, 8) : "23:59:59";

  const dateTime = new Date(
    `${datePart}T${time.length === 5 ? `${time}:00` : time}`,
  );

  return Number.isNaN(dateTime.getTime()) ? null : dateTime;
};

const hasInterviewEnded = (interview) => {
  const scheduledAt = getScheduledDateTime(interview);
  return Boolean(scheduledAt && Date.now() >= scheduledAt.getTime());
};

const formatRecommendation = (value) =>
  RECOMMENDATIONS.find((item) => item.value === value)?.label ??
  (value && value !== "PENDING"
    ? String(value).replace(/_/g, " ")
    : "Not selected");

function SummaryCard({ label, value, icon: Icon, color }) {
  const styles = {
    indigo: "bg-primary-50 text-primary-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        <div className={`rounded-xl p-2.5 ${styles[color]}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const submitted = status === "Submitted";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        submitted
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {submitted ? <CheckCircle2 size={13} /> : <Clock size={13} />}
      {status}
    </span>
  );
}

function InterviewStatusBadge({ status }) {
  const normalized = normalizeInterviewStatus(status);

  const style =
    normalized === "COMPLETED"
      ? "bg-emerald-50 text-emerald-700"
      : normalized === "CANCELLED"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}
    >
      {normalized.replace(/_/g, " ")}
    </span>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl bg-slate-50 p-3">
      <Icon size={17} className="mt-0.5 shrink-0 text-primary-500" />
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-800">
          {value || "Not available"}
        </p>
      </div>
    </div>
  );
}

export default function RecruitmentEvaluations() {
  const [interviews, setInterviews] = useState([]);
  const [evaluations, setEvaluations] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roundFilter, setRoundFilter] = useState("All");

  const [selectedInterview, setSelectedInterview] = useState(null);
  const [form, setForm] = useState(emptyEvaluation);

  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("warning");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [downloadingApplicationId, setDownloadingApplicationId] =
    useState(null);

  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Prevent overlapping automatic refresh requests.
  const loadingRequestRef = useRef(false);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (loadingRequestRef.current) return;

    loadingRequestRef.current = true;

    if (!silent) setLoading(true);

    try {
      if (typeof recruitmentApi?.getMyAssignedInterviews !== "function") {
        throw new Error(
          "getMyAssignedInterviews() is missing from src/services/api.js.",
        );
      }

      // This endpoint must return only interviews assigned to the logged-in interviewer.
      const interviewResponse = await recruitmentApi.getMyAssignedInterviews();

      const normalizedInterviews = unwrap(interviewResponse)
        .filter((item) => item && typeof item === "object")
        .map(normalizeInterview)
        .filter(
          (interview) =>
            interview.id != null && String(interview.id).trim() !== "",
        );

      setInterviews(normalizedInterviews);

      // IMPORTANT:
      // Use only the current interviewer's evaluation endpoint.
      // Do not fall back to getInterviewEvaluations(), because it may
      // expose evaluations submitted by other interviewers.
      if (typeof recruitmentApi?.getMyEvaluations !== "function") {
        throw new Error(
          "getMyEvaluations() is missing from src/services/api.js. Configure a backend endpoint that returns only the logged-in interviewer's evaluations.",
        );
      }

      const evaluationResponse = await recruitmentApi.getMyEvaluations();

      const normalizedEvaluations = unwrap(evaluationResponse)
        .filter((item) => item && typeof item === "object")
        .map(normalizeEvaluation)
        .filter((evaluation) => evaluation.interviewId != null);

      // Keep one evaluation per interview for the logged-in interviewer.
      // The backend endpoint must enforce this user-level restriction.
      const uniqueEvaluations = Array.from(
        new Map(
          normalizedEvaluations.map((evaluation) => [
            String(evaluation.interviewId),
            evaluation,
          ]),
        ).values(),
      );

      setEvaluations(uniqueEvaluations);

      if (normalizedInterviews.length === 0 && !silent) {
        setNotice("No interviews are currently assigned to your account.");
        setNoticeType("warning");
      } else if (!silent) {
        setNotice("");
      }
    } catch (error) {
      console.error("Failed to load interview evaluations:", error);

      if (!silent) {
        setInterviews([]);
        setEvaluations([]);
        setNotice(
          error?.message ||
            "Could not load assigned interviews from the backend.",
        );
        setNoticeType("error");
      }
    } finally {
      loadingRequestRef.current = false;

      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const intervalId = window.setInterval(() => {
      loadData({ silent: true });
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [loadData]);

  // This lookup is safe only because evaluations are loaded from
  // getMyEvaluations(), which must be scoped to the logged-in interviewer.
  const getEvaluation = useCallback(
    (interviewId) =>
      evaluations.find(
        (evaluation) => String(evaluation.interviewId) === String(interviewId),
      ),
    [evaluations],
  );

  const getStatus = useCallback(
    (interview) =>
      getEvaluation(interview.id)?.submitted ? "Submitted" : "Pending",
    [getEvaluation],
  );

  const filteredInterviews = useMemo(() => {
    const query = search.trim().toLowerCase();

    return interviews.filter((interview) => {
      const matchesSearch = [
        interview.candidateName,
        interview.jobTitle,
        interview.round,
        interview.interviewerName,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      );

      const evaluation = evaluations.find(
        (item) => String(item.interviewId) === String(interview.id),
      );

      const evaluationStatus = evaluation?.submitted ? "Submitted" : "Pending";

      const normalizedInterviewRound = normalizeRound(interview.round);
      const normalizedFilterRound =
        roundFilter === "All" ? "All" : normalizeRound(roundFilter);

      return (
        matchesSearch &&
        (statusFilter === "All" || evaluationStatus === statusFilter) &&
        (normalizedFilterRound === "All" ||
          normalizedInterviewRound === normalizedFilterRound)
      );
    });
  }, [interviews, evaluations, search, statusFilter, roundFilter]);

  const selectedCriteria = selectedInterview
    ? getCriteriaForRound(selectedInterview.round)
    : [];

  const selectedEvaluation = selectedInterview
    ? getEvaluation(selectedInterview.id)
    : null;

  const openEvaluation = (interview) => {
    const existing = getEvaluation(interview.id);
    const criteria = getCriteriaForRound(interview.round);

    const savedScores = existing?.criteriaScores ?? {};

    const criteriaScores = Object.fromEntries(
      criteria.map((criterion) => {
        let score = Number(savedScores[criterion.key] ?? 0);

        // Older evaluations used five general fields instead of
        // the new round-specific criteria.
        if (!score && existing?.legacyScores) {
          const legacyFallback = {
            programmingKnowledge: "technicalKnowledge",
            technicalSkills: "technicalKnowledge",
            problemSolvingAbility: "problemSolving",
            codingAndLogicalThinking: "problemSolving",
            practicalExperience: "roleSpecificSkills",
            technicalAssessment: "technicalKnowledge",

            communicationSkills: "communication",
            confidence: "professionalism",
            teamwork: "communication",
            adaptability: "professionalism",
            salaryExpectationsAndCulturalFit: "roleSpecificSkills",
            behaviouralAssessment: "professionalism",

            roleSpecificKnowledge: "roleSpecificSkills",
            decisionMaking: "problemSolving",
            leadershipOwnership: "professionalism",
            relevantWorkExperience: "technicalKnowledge",
            jobRoleSuitability: "roleSpecificSkills",
            strategicThinking: "problemSolving",

            overallSuitability: "roleSpecificSkills",
            careerGoals: "professionalism",
            longTermCommitment: "professionalism",
            professionalAttitude: "professionalism",
            finalHiringRecommendation: "technicalKnowledge",
            finalAssessment: "technicalKnowledge",
          };

          const fallbackKey = legacyFallback[criterion.key];
          score = Number(existing.legacyScores[fallbackKey] ?? 0);
        }

        return [criterion.key, score];
      }),
    );

    setForm({
      ...emptyEvaluation(),
      criteriaScores,
      strengths: existing?.strengths ?? "",
      areasForImprovement: existing?.areasForImprovement ?? "",
      feedback: existing?.feedback ?? "",
      recommendation: normalizeRecommendation(existing?.recommendation),
    });

    setSelectedInterview(interview);
    setNotice("");
  };

  const updateScore = (key, value) => {
    setForm((previous) => ({
      ...previous,
      criteriaScores: {
        ...previous.criteriaScores,
        [key]: Number(value),
      },
    }));
  };

  const downloadCandidateCV = async (interview) => {
    const applicationId = interview?.applicationId;

    if (applicationId == null || String(applicationId).trim() === "") {
      setNotice(
        `Cannot download ${interview?.candidateName || "candidate"}'s CV because the interview response does not contain an application ID.`,
      );
      setNoticeType("error");
      return;
    }

    if (typeof recruitmentApi?.downloadResume !== "function") {
      setNotice(
        "recruitmentApi.downloadResume() is missing in src/services/api.js.",
      );
      setNoticeType("error");
      return;
    }

    setDownloadingApplicationId(String(applicationId));
    setNotice("");

    try {
      const blob = await recruitmentApi.downloadResume(applicationId);

      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error("The server returned an empty or invalid CV file.");
      }

      const fileUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      const candidateName = (interview.candidateName || "Candidate").replace(
        /[^a-z0-9_-]/gi,
        "_",
      );

      const extension = blob.type.includes("pdf") ? "pdf" : "file";

      link.href = fileUrl;
      link.download = `CV_${candidateName}.${extension}`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => window.URL.revokeObjectURL(fileUrl), 1000);

      setNotice(`CV download started for ${interview.candidateName}.`);
      setNoticeType("success");
    } catch (error) {
      console.error("Candidate CV download failed:", error);
      setNotice(
        error?.message ||
          "Could not download the candidate's CV. Check your permissions and try again.",
      );
      setNoticeType("error");
    } finally {
      setDownloadingApplicationId(null);
    }
  };

  const markInterviewCompleted = async (interview) => {
    if (!interview?.id) return;

    if (!hasInterviewEnded(interview)) {
      setNotice(
        "You can mark this interview as completed only after its scheduled date and time.",
      );
      setNoticeType("warning");
      return;
    }

    const currentStatus = normalizeInterviewStatus(interview.status);

    if (currentStatus === "COMPLETED") {
      setNotice("This interview is already completed.");
      setNoticeType("warning");
      return;
    }

    if (currentStatus === "CANCELLED") {
      setNotice("A cancelled interview cannot be marked as completed.");
      setNoticeType("warning");
      return;
    }

    if (typeof recruitmentApi?.updateInterviewStatus !== "function") {
      setNotice(
        "recruitmentApi.updateInterviewStatus() is missing in src/services/api.js.",
      );
      setNoticeType("error");
      return;
    }

    setUpdatingStatusId(interview.id);
    setNotice("");

    try {
      await recruitmentApi.updateInterviewStatus(interview.id, "COMPLETED");

      setInterviews((previous) =>
        previous.map((item) =>
          String(item.id) === String(interview.id)
            ? { ...item, status: "COMPLETED" }
            : item,
        ),
      );

      setSelectedInterview((current) =>
        current && String(current.id) === String(interview.id)
          ? { ...current, status: "COMPLETED" }
          : current,
      );

      setNotice("Interview marked as completed successfully.");
      setNoticeType("success");

      await loadData({ silent: true });
    } catch (error) {
      console.error("Failed to update interview status:", error);
      setNotice(error?.message || "Could not update interview status.");
      setNoticeType("error");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const saveEvaluation = async (event) => {
    event.preventDefault();

    if (!selectedInterview) return;

    const interviewId = selectedInterview.id;
    const criteria = getCriteriaForRound(selectedInterview.round);

    if (interviewId == null || !/^\d+$/.test(String(interviewId))) {
      setNotice(
        "This interview has no valid numeric backend ID. Check the interview API response.",
      );
      setNoticeType("error");
      return;
    }

    if (getEvaluation(interviewId)?.submitted) {
      setNotice(
        "You have already submitted your evaluation for this interview.",
      );
      setNoticeType("warning");
      return;
    }

    if (normalizeInterviewStatus(selectedInterview.status) !== "COMPLETED") {
      setNotice(
        "You can submit an evaluation only after the interview is marked as completed.",
      );
      setNoticeType("warning");
      return;
    }

    if (criteria.length !== 6) {
      setNotice(
        "The interview round is not recognised. Please check the interview round name returned by the backend.",
      );
      setNoticeType("error");
      return;
    }

    const criteriaScores = {};

    for (const criterion of criteria) {
      const score = Number(form.criteriaScores?.[criterion.key]);

      if (!Number.isInteger(score) || score < 1 || score > 5) {
        setNotice(`Please provide a score from 1 to 5 for ${criterion.label}.`);
        setNoticeType("warning");
        return;
      }

      criteriaScores[criterion.key] = score;
    }

    const strengths = String(form.strengths ?? "").trim();
    const areasForImprovement = String(form.areasForImprovement ?? "").trim();
    const feedback = String(form.feedback ?? "").trim();

    if (!strengths) {
      setNotice("Please describe the candidate's strengths before submitting.");
      setNoticeType("warning");
      return;
    }

    if (!feedback) {
      setNotice("Please enter interview feedback.");
      setNoticeType("warning");
      return;
    }

    if (!RECOMMENDATIONS.some((item) => item.value === form.recommendation)) {
      setNotice("Please select a valid recommendation.");
      setNoticeType("warning");
      return;
    }

    if (typeof recruitmentApi?.submitInterviewEvaluation !== "function") {
      setNotice(
        "recruitmentApi.submitInterviewEvaluation() is missing in src/services/api.js.",
      );
      setNoticeType("error");
      return;
    }

    const averageScore =
      Object.values(criteriaScores).reduce((sum, score) => sum + score, 0) /
      criteria.length;

    // These property names match InterviewEvaluationRequestDTO.java.
    // The backend identifies the logged-in interviewer from authentication.
    const payload = {
      criteriaScores,
      strengths,
      areasForImprovement,
      comments: feedback,
      recommendation: form.recommendation,
    };

    setSaving(true);
    setNotice("");

    try {
      await recruitmentApi.submitInterviewEvaluation(interviewId, payload);

      setSelectedInterview(null);

      setNotice(
        `Your evaluation was submitted successfully. Average score: ${averageScore.toFixed(2)}/5.`,
      );
      setNoticeType("success");

      await loadData({ silent: true });
    } catch (error) {
      console.error("Failed to submit interview evaluation:", error);
      setNotice(
        error?.message || "Could not submit your evaluation to the backend.",
      );
      setNoticeType("error");
    } finally {
      setSaving(false);
    }
  };

  const submittedCount = interviews.filter(
    (interview) => getStatus(interview) === "Submitted",
  ).length;

  const pendingCount = interviews.length - submittedCount;

  const currentAverage = selectedCriteria.length
    ? selectedCriteria.reduce(
        (sum, criterion) =>
          sum + Number(form.criteriaScores?.[criterion.key] || 0),
        0,
      ) / selectedCriteria.length
    : 0;

  return (
    <PageLayout
      role="recruiter"
      activePage="Evaluations"
      title="Interview Evaluations"
      subtitle="Evaluate candidates assigned to your interviews"
    >
      <div className="space-y-6">
        {notice && (
          <div
            role="alert"
            className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
              noticeType === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : noticeType === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {noticeType === "success" ? (
              <CheckCircle2 size={18} className="shrink-0" />
            ) : (
              <AlertCircle size={18} className="shrink-0" />
            )}

            <span>{notice}</span>

            <button
              type="button"
              onClick={() => setNotice("")}
              className="ml-auto"
              aria-label="Dismiss message"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Assigned Interviews"
            value={interviews.length}
            icon={ClipboardCheck}
            color="indigo"
          />

          <SummaryCard
            label="Pending Evaluations"
            value={pendingCount}
            icon={Clock}
            color="amber"
          />

          <SummaryCard
            label="Submitted Evaluations"
            value={submittedCount}
            icon={CheckCircle2}
            color="emerald"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search candidates or job titles..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              aria-label="Filter by evaluation status"
            >
              <option value="All">All evaluation statuses</option>
              <option value="Pending">Pending evaluation</option>
              <option value="Submitted">Submitted evaluation</option>
            </select>

            <select
              value={roundFilter}
              onChange={(event) => setRoundFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              aria-label="Filter by interview round"
            >
              <option value="All">All rounds</option>
              <option value="Technical">Technical</option>
              <option value="HR">HR</option>
              <option value="Hiring Manager">Hiring Manager</option>
              <option value="Final">Final</option>
            </select>

            <button
              type="button"
              onClick={() => loadData()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-slate-800">My Assigned Interviews</h2>
            <p className="mt-1 text-sm text-slate-500">
              Only interviews assigned to the logged-in interviewer are shown.
              Your evaluation is private to your account.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-slate-500">
              <RefreshCw size={18} className="animate-spin" />
              Loading assigned interviews...
            </div>
          ) : filteredInterviews.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <ClipboardCheck className="mx-auto text-slate-400" size={30} />
              <h3 className="mt-3 font-semibold text-slate-800">
                No assigned interviews found
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
                There are no interviews matching your account and current
                filters. Check the backend assignment records if you expect
                interviews here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Candidate</th>
                    <th className="px-5 py-3">Interview Round</th>
                    <th className="px-5 py-3">Schedule</th>
                    <th className="px-5 py-3">Interview Status</th>
                    <th className="px-5 py-3">My Evaluation Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredInterviews.map((interview) => {
                    const evaluationStatus = getStatus(interview);
                    const evaluation = getEvaluation(interview.id);

                    const interviewStatus = normalizeInterviewStatus(
                      interview.status,
                    );

                    const isCancelled = interviewStatus === "CANCELLED";
                    const isCompleted = interviewStatus === "COMPLETED";

                    const canComplete =
                      hasInterviewEnded(interview) &&
                      !isCancelled &&
                      !isCompleted;

                    return (
                      <tr key={interview.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {interview.candidateName}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                            <BriefcaseBusiness size={12} />
                            {interview.jobTitle}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-primary-50 px-2.5 py-1.5 text-xs font-semibold text-primary-700">
                            {interview.round}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          <div className="flex items-center gap-2">
                            <CalendarDays
                              size={15}
                              className="text-slate-400"
                            />
                            {formatDate(interview.date)}
                          </div>
                          <p className="mt-1 pl-6 text-xs text-slate-400">
                            {interview.time || "Time not set"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <InterviewStatusBadge status={interview.status} />

                          {!isCompleted && !isCancelled && (
                            <div className="mt-2">
                              <button
                                type="button"
                                onClick={() =>
                                  markInterviewCompleted(interview)
                                }
                                disabled={
                                  !canComplete ||
                                  updatingStatusId === interview.id
                                }
                                title={
                                  canComplete
                                    ? "Mark interview as completed"
                                    : "Available after the scheduled interview date and time"
                                }
                                className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {updatingStatusId === interview.id
                                  ? "Updating..."
                                  : "Mark Completed"}
                              </button>

                              {!hasInterviewEnded(interview) && (
                                <p className="mt-1 max-w-[180px] text-[11px] text-slate-400">
                                  Available after the interview time
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={evaluationStatus} />

                          {evaluation && (
                            <p className="mt-1 text-xs text-slate-500">
                              Average:{" "}
                              {Number(evaluation.averageScore || 0).toFixed(2)}
                              /5
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => downloadCandidateCV(interview)}
                              disabled={
                                !interview.applicationId ||
                                downloadingApplicationId ===
                                  String(interview.applicationId)
                              }
                              title={
                                !interview.applicationId
                                  ? "Application ID is missing from the interview response"
                                  : "Download candidate CV"
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Download size={15} />
                              {downloadingApplicationId ===
                              String(interview.applicationId)
                                ? "Downloading..."
                                : "Download CV"}
                            </button>

                            <button
                              type="button"
                              onClick={() => openEvaluation(interview)}
                              disabled={
                                !isCompleted && evaluationStatus !== "Submitted"
                              }
                              title={
                                evaluationStatus === "Submitted"
                                  ? "View your submitted evaluation"
                                  : !isCompleted
                                    ? "Mark the interview completed before evaluating"
                                    : "Evaluate interview"
                              }
                              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Eye size={15} />
                              {evaluationStatus === "Submitted"
                                ? "View My Evaluation"
                                : "Evaluate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedInterview && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !saving) {
                setSelectedInterview(null);
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="evaluation-modal-title"
              className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-4">
                <div>
                  <h2
                    id="evaluation-modal-title"
                    className="text-lg font-bold text-slate-900"
                  >
                    Interview Evaluation
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedInterview.candidateName} ·{" "}
                    {selectedInterview.round}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedInterview(null)}
                  disabled={saving}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                  aria-label="Close evaluation"
                >
                  <X size={20} />
                </button>
              </div>

              {selectedEvaluation?.submitted ? (
                <div className="space-y-5 p-6">
                  <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                    <CheckCircle2 className="mr-2 inline" size={17} />
                    Your evaluation has been submitted and is read-only.
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoItem
                      icon={UserRound}
                      label="Candidate"
                      value={selectedInterview.candidateName}
                    />
                    <InfoItem
                      icon={BriefcaseBusiness}
                      label="Position"
                      value={selectedInterview.jobTitle}
                    />
                    <InfoItem
                      icon={ClipboardCheck}
                      label="Interview Round"
                      value={selectedInterview.round}
                    />
                    <InfoItem
                      icon={CalendarDays}
                      label="Interview Date"
                      value={formatDate(selectedInterview.date)}
                    />
                    <InfoItem
                      icon={CheckCircle2}
                      label="Interview Status"
                      value={normalizeInterviewStatus(
                        selectedInterview.status,
                      ).replace(/_/g, " ")}
                    />
                  </div>

                  <div>
                    <h3 className="mb-3 font-semibold text-slate-800">
                      Your Evaluation Scores
                    </h3>

                    {selectedCriteria.length === 0 ? (
                      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                        No criteria are configured for this interview round.
                      </p>
                    ) : (
                      selectedCriteria.map((criterion) => (
                        <div
                          key={criterion.key}
                          className="flex items-center justify-between gap-4 border-b border-slate-100 py-3"
                        >
                          <span className="text-sm text-slate-600">
                            {criterion.label}
                          </span>
                          <span className="flex items-center gap-1 font-semibold">
                            <Star size={15} className="text-amber-500" />
                            {form.criteriaScores?.[criterion.key] || 0}/5
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div>
                    <h3 className="mb-2 flex items-center gap-2 font-semibold">
                      <MessageSquare size={16} />
                      Candidate Strengths
                    </h3>
                    <p className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                      {form.strengths || "No strengths provided."}
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 flex items-center gap-2 font-semibold">
                      <MessageSquare size={16} />
                      Areas for Improvement
                    </h3>
                    <p className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                      {form.areasForImprovement ||
                        "No areas for improvement provided."}
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 flex items-center gap-2 font-semibold">
                      <MessageSquare size={16} />
                      Interview Feedback
                    </h3>
                    <p className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                      {form.feedback || "No feedback provided."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">
                      Your Recommendation
                    </p>
                    <p className="mt-1 font-semibold">
                      {formatRecommendation(form.recommendation)}
                    </p>

                    <p className="mt-3 text-sm text-slate-500">Average score</p>
                    <p className="mt-1 text-xl font-bold text-primary-600">
                      {Number(selectedEvaluation.averageScore ?? 0).toFixed(2)}
                      /5
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedInterview(null)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={saveEvaluation} className="space-y-6 p-6">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoItem
                      icon={UserRound}
                      label="Candidate"
                      value={selectedInterview.candidateName}
                    />
                    <InfoItem
                      icon={BriefcaseBusiness}
                      label="Position"
                      value={selectedInterview.jobTitle}
                    />
                    <InfoItem
                      icon={ClipboardCheck}
                      label="Interview Round"
                      value={selectedInterview.round}
                    />
                    <InfoItem
                      icon={CalendarDays}
                      label="Interview Date"
                      value={formatDate(selectedInterview.date)}
                    />
                    <InfoItem
                      icon={CheckCircle2}
                      label="Interview Status"
                      value={normalizeInterviewStatus(
                        selectedInterview.status,
                      ).replace(/_/g, " ")}
                    />
                  </div>

                  {normalizeInterviewStatus(selectedInterview.status) !==
                    "COMPLETED" && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      Mark this interview as completed after its scheduled date
                      and time before submitting an evaluation.
                    </div>
                  )}

                  <div>
                    <div className="mb-3">
                      <h3 className="font-bold text-slate-800">
                        {selectedInterview.round} Criteria
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Give each criterion a score from 1 (lowest) to 5
                        (highest).
                      </p>
                    </div>

                    {selectedCriteria.length !== 6 ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        This interview round is not recognised. Please check the
                        interview round value returned by the backend.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedCriteria.map((criterion) => (
                          <fieldset key={criterion.key}>
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <legend className="text-sm font-medium text-slate-700">
                                {criterion.label}
                              </legend>
                              <span className="text-xs text-slate-500">
                                {form.criteriaScores?.[criterion.key] || 0}/5
                              </span>
                            </div>

                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((score) => (
                                <button
                                  key={score}
                                  type="button"
                                  aria-label={`${criterion.label}: ${score} out of 5`}
                                  aria-pressed={
                                    form.criteriaScores?.[criterion.key] ===
                                    score
                                  }
                                  onClick={() =>
                                    updateScore(criterion.key, score)
                                  }
                                  className={`flex h-10 flex-1 items-center justify-center gap-1 rounded-lg border text-sm font-semibold ${
                                    form.criteriaScores?.[criterion.key] ===
                                    score
                                      ? "border-primary-600 bg-primary-600 text-white"
                                      : "border-slate-200 text-slate-600 hover:border-primary-300 hover:bg-primary-50"
                                  }`}
                                >
                                  <Star size={13} />
                                  {score}
                                </button>
                              ))}
                            </div>
                          </fieldset>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 rounded-xl bg-primary-50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-primary-800">
                          Current Average
                        </span>
                        <span className="text-lg font-bold text-primary-700">
                          {currentAverage.toFixed(2)}/5
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-primary-600">
                        The average is calculated from the six criteria for this
                        interview round.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="evaluation-strengths"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Candidate Strengths
                    </label>
                    <textarea
                      id="evaluation-strengths"
                      rows={3}
                      required
                      maxLength={3000}
                      value={form.strengths}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          strengths: event.target.value,
                        }))
                      }
                      placeholder="Describe the candidate's strengths demonstrated during the interview..."
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                    />
                    <p className="mt-1 text-right text-xs text-slate-400">
                      {form.strengths.length}/3000 characters
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="evaluation-improvements"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Areas for Improvement
                    </label>
                    <textarea
                      id="evaluation-improvements"
                      rows={3}
                      maxLength={3000}
                      value={form.areasForImprovement}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          areasForImprovement: event.target.value,
                        }))
                      }
                      placeholder="Describe areas where the candidate could improve..."
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                    />
                    <p className="mt-1 text-right text-xs text-slate-400">
                      {form.areasForImprovement.length}/3000 characters
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="evaluation-feedback"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Interview Feedback
                    </label>
                    <textarea
                      id="evaluation-feedback"
                      rows={4}
                      required
                      maxLength={5000}
                      value={form.feedback}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          feedback: event.target.value,
                        }))
                      }
                      placeholder="Enter interview observations and feedback..."
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                    />
                    <p className="mt-1 text-right text-xs text-slate-400">
                      {form.feedback.length}/5000 characters
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="evaluation-recommendation"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Recommendation
                    </label>
                    <select
                      id="evaluation-recommendation"
                      required
                      value={form.recommendation}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          recommendation: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-primary-400"
                    >
                      <option value="" disabled>
                        Select recommendation
                      </option>
                      {RECOMMENDATIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setSelectedInterview(null)}
                      disabled={saving}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={
                        saving ||
                        normalizeInterviewStatus(selectedInterview.status) !==
                          "COMPLETED" ||
                        selectedCriteria.length !== 6
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      <Send size={15} />
                      {saving ? "Submitting..." : "Submit Evaluation"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
