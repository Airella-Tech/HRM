import React, {
  useCallback,
  useEffect,
  useMemo,
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

const CRITERIA = [
  { key: "technicalSkills", label: "Technical Knowledge" },
  { key: "roleSpecificSkills", label: "Role-specific Skills" },
  { key: "professionalism", label: "Professionalism" },
  { key: "communication", label: "Communication" },
  { key: "problemSolving", label: "Problem Solving" },
  { key: "experience", label: "Relevant Experience" },
  { key: "cultureFit", label: "Teamwork & Culture Fit" },
];

const RECOMMENDATIONS = [
  { value: "STRONG_HIRE", label: "Strong Hire" },
  { value: "HIRE", label: "Hire" },
  { value: "HOLD", label: "Hold for Review" },
  { value: "NO_HIRE", label: "No Hire" },
  { value: "STRONG_NO_HIRE", label: "Strong No Hire" },
];

const normalizeRecommendation = (value) => {
  const raw = String(value ?? "").trim().toUpperCase();

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

  return RECOMMENDATIONS.some(
    (item) => item.value === normalized
  )
    ? normalized
    : "";
};

const emptyEvaluation = () => ({
  technicalSkills: 0,
  roleSpecificSkills: 0,
  professionalism: 0,
  communication: 0,
  problemSolving: 0,
  experience: 0,
  cultureFit: 0,
  strengths: "",
  feedback: "",
  recommendation: "",
});

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
      (key) =>
        data[key] &&
        typeof data[key] === "object" &&
        data[key] !== data
    );

    if (nestedKey) {
      data = data[nestedKey];
      continue;
    }

    return [];
  }

  return [];
};

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const normalizeId = (value) => {
  if (value == null || value === "") return null;

  if (typeof value === "object") {
    return normalizeId(
      value.employeeId ??
        value.employeeCode ??
        value.employee?.employeeId ??
        value.employee?.employeeCode ??
        value.employee?.id ??
        value.interviewerId ??
        value.interviewerUserId ??
        value.userId ??
        value.id
    );
  }

  return String(value).trim().toLowerCase() || null;
};

const getCurrentUserIds = (user) => {
  const values = [
    user?.employeeId,
    user?.employeeCode,
    user?.employee?.employeeId,
    user?.employee?.employeeCode,
    user?.employee?.id,
    user?.userId,
    user?.user?.userId,
    user?.user?.id,
    user?.id,
  ];

  return [
    ...new Set(values.map(normalizeId).filter(Boolean)),
  ];
};

const getEmployeeId = (user) =>
  user?.employeeId ??
  user?.employee?.employeeId ??
  user?.employee?.id ??
  user?.user?.employeeId ??
  null;

const getInterviewerIds = (item) => {
  const assigned =
    item?.interviewers ??
    item?.assignedInterviewers ??
    item?.interviewerAssignments ??
    item?.assignments ??
    item?.evaluators ??
    item?.assignedEvaluators;

  const extractIds = (entry) => {
    if (entry == null) return [];

    if (typeof entry !== "object") {
      const id = normalizeId(entry);
      return id ? [id] : [];
    }

    return [
      entry.employeeId,
      entry.employeeCode,
      entry.employee?.employeeId,
      entry.employee?.employeeCode,
      entry.employee?.id,
      entry.interviewerId,
      entry.interviewerUserId,
      entry.userId,
      entry.interviewer?.employeeId,
      entry.interviewer?.employeeCode,
      entry.interviewer?.id,
      entry.interviewer?.userId,
      entry.assignedEmployee?.employeeId,
      entry.assignedEmployee?.employeeCode,
      entry.assignedEmployee?.id,
      entry.assignedInterviewer?.employeeId,
      entry.assignedInterviewer?.employeeCode,
      entry.assignedInterviewer?.id,
      entry.assignedInterviewer?.userId,
      entry.id,
    ]
      .map(normalizeId)
      .filter(Boolean);
  };

  const fromArray = Array.isArray(assigned)
    ? assigned.flatMap(extractIds)
    : assigned
      ? extractIds(assigned)
      : [];

  const singleFields = [
    item?.interviewerId,
    item?.interviewerUserId,
    item?.assignedInterviewerId,
    item?.assignedEmployeeId,
    item?.employeeId,
    item?.interviewerEmployeeId,
    item?.interviewer,
    item?.assignedInterviewer,
    item?.assignedEmployee,
  ];

  return [
    ...new Set([
      ...fromArray,
      ...singleFields.flatMap(extractIds),
    ]),
  ];
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
    item?.jobVacancy ??
    item?.job ??
    item?.vacancy ??
    item?.position ??
    {};

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
    [candidate?.firstName, candidate?.lastName]
      .filter(Boolean)
      .join(" ");

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

  const scheduledAt =
    item?.scheduledAt ??
    item?.interviewDateTime ??
    "";

  const rawDate =
    item?.date ??
    item?.interviewDate ??
    item?.scheduledDate ??
    scheduledAt ??
    "";

  const rawTime =
    item?.time ??
    item?.interviewTime ??
    item?.scheduledTime ??
    "";

  return {
    ...item,

    id:
      item?.id ??
      item?.interviewId ??
      item?.interview?.id ??
      item?.interview?.interviewId ??
      null,

    candidateId:
      item?.candidateId ??
      candidate?.id ??
      candidate?.candidateId ??
      null,

    // Required by downloadResume(): this must be the application ID.
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

    candidateName:
      String(rawName ?? "").trim() || "Unnamed candidate",

    jobTitle:
      String(rawJobTitle ?? "").trim() ||
      "Position not specified",

    round: String(round).replace(/_/g, " "),

    date: rawDate,
    time: rawTime,

    status:
      item?.status ??
      item?.interviewStatus ??
      item?.interview?.status ??
      "PENDING",

    interviewerName:
      item?.interviewerName ??
      interviewer?.fullName ??
      interviewer?.name ??
      "",

    interviewerIds: getInterviewerIds(item),
  };
};

const normalizeEvaluation = (item) => {
  const status = normalizeInterviewStatus(item?.status);

  const readNumber = (...values) => {
    const value = values.find(
      (entry) =>
        entry !== undefined &&
        entry !== null &&
        entry !== ""
    );

    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number : 0;
  };

  const interviewId =
    item?.interviewId ??
    item?.interview?.id ??
    item?.interview?.interviewId ??
    null;

  const technicalSkills = readNumber(
    item?.technicalKnowledgeScore,
    item?.technicalKnowledge,
    item?.technicalSkills,
    item?.technicalScore
  );

  const roleSpecificSkills = readNumber(
    item?.roleSpecificSkillsScore,
    item?.roleSpecificSkillScore,
    item?.roleSpecificSkills,
    item?.roleSpecificSkill,
    item?.roleSkillsScore,
    item?.roleSpecificScore
  );

  const professionalism = readNumber(
    item?.professionalismScore,
    item?.professionalism,
    item?.professionalismRating
  );

  const communication = readNumber(
    item?.communication,
    item?.communicationScore,
    item?.communicationSkillsScore
  );

  const problemSolving = readNumber(
    item?.problemSolving,
    item?.problemSolvingScore
  );

  const experience = readNumber(
    item?.relevantExperienceScore,
    item?.experience,
    item?.experienceScore
  );

  const cultureFit = readNumber(
    item?.cultureFit,
    item?.teamworkScore,
    item?.cultureFitScore
  );

  const scoreValues = [
    technicalSkills,
    roleSpecificSkills,
    professionalism,
    communication,
    problemSolving,
    experience,
    cultureFit,
  ].filter((score) => score > 0);

  const averageScore = readNumber(
    item?.averageScore,
    item?.overallScore
  );

  return {
    ...item,
    id: item?.id ?? item?.evaluationId ?? null,
    interviewId,

    technicalSkills,
    roleSpecificSkills,
    professionalism,
    communication,
    problemSolving,
    experience,
    cultureFit,

    strengths:
      item?.strengths ??
      item?.candidateStrengths ??
      item?.strengthsDescription ??
      "",

    feedback: item?.feedback ?? item?.comments ?? "",

    recommendation: normalizeRecommendation(
      item?.recommendation
    ),

    averageScore:
      averageScore ||
      (scoreValues.length
        ? scoreValues.reduce((sum, score) => sum + score, 0) /
          scoreValues.length
        : 0),

    submitted:
      item?.submitted === true ||
      status === "SUBMITTED",
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

    return Number.isNaN(dateTime.getTime())
      ? null
      : dateTime;
  }

  const datePart = String(dateValue).slice(0, 10);
  const timePart = String(interview?.time ?? "").trim();
  const time = timePart ? timePart.slice(0, 8) : "23:59:59";

  const dateTime = new Date(
    `${datePart}T${
      time.length === 5 ? `${time}:00` : time
    }`
  );

  return Number.isNaN(dateTime.getTime())
    ? null
    : dateTime;
};

const hasInterviewEnded = (interview) => {
  const scheduledAt = getScheduledDateTime(interview);

  return Boolean(
    scheduledAt && Date.now() >= scheduledAt.getTime()
  );
};

const formatRecommendation = (value) =>
  RECOMMENDATIONS.find((item) => item.value === value)?.label ??
  (value && value !== "PENDING"
    ? String(value).replace(/_/g, " ")
    : "Not selected");

function SummaryCard({ label, value, icon: Icon, color }) {
  const styles = {
    indigo: "bg-indigo-50 text-indigo-600",
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
      <p className="mt-4 text-3xl font-bold text-slate-900">
        {value}
      </p>
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
      {submitted ? (
        <CheckCircle2 size={13} />
      ) : (
        <Clock size={13} />
      )}
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
      <Icon
        size={17}
        className="mt-0.5 shrink-0 text-indigo-500"
      />
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
  const [user] = useState(getCurrentUser);

  const employeeId = getEmployeeId(user);

  const currentUserIds = useMemo(
    () => getCurrentUserIds(user),
    [user]
  );

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

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);

      try {
        let rawInterviews = [];
        let usingAssignedEndpoint = false;

        if (
          typeof recruitmentApi?.getMyAssignedInterviews ===
          "function"
        ) {
          const response =
            await recruitmentApi.getMyAssignedInterviews();

          rawInterviews = unwrap(response);
          usingAssignedEndpoint = true;
        } else if (
          typeof recruitmentApi?.getInterviews === "function"
        ) {
          const response = await recruitmentApi.getInterviews();
          rawInterviews = unwrap(response);
        } else {
          throw new Error(
            "Interview API methods are missing. Add getMyAssignedInterviews() to src/services/api.js."
          );
        }

        const normalizedInterviews = rawInterviews
          .filter(
            (item) => item && typeof item === "object"
          )
          .map(normalizeInterview)
          .filter(
            (interview) =>
              interview.id != null &&
              String(interview.id).trim() !== ""
          );

        let visibleInterviews = [];

        if (usingAssignedEndpoint) {
          visibleInterviews = normalizedInterviews;
        } else if (currentUserIds.length > 0) {
          visibleInterviews = normalizedInterviews.filter(
            (interview) =>
              interview.interviewerIds.some((assignedId) =>
                currentUserIds.includes(assignedId)
              )
          );
        }

        setInterviews(visibleInterviews);

        let allEvaluations = [];

        if (
          typeof recruitmentApi?.getMyEvaluations === "function"
        ) {
          try {
            allEvaluations = unwrap(
              await recruitmentApi.getMyEvaluations()
            );
          } catch (error) {
            console.warn(
              "Could not load current employee evaluations:",
              error
            );
          }
        }

        if (
          allEvaluations.length === 0 &&
          typeof recruitmentApi?.getInterviewEvaluations ===
            "function"
        ) {
          const responses = await Promise.all(
            visibleInterviews.map(async (interview) => {
              if (!/^\d+$/.test(String(interview.id))) {
                return [];
              }

              try {
                return unwrap(
                  await recruitmentApi.getInterviewEvaluations(
                    interview.id
                  )
                );
              } catch (error) {
                console.warn(
                  `Could not load evaluations for interview ${interview.id}:`,
                  error
                );
                return [];
              }
            })
          );

          allEvaluations = responses.flat();
        }

        const normalizedEvaluations = allEvaluations
          .filter(
            (item) => item && typeof item === "object"
          )
          .map(normalizeEvaluation);

        const uniqueEvaluations = Array.from(
          new Map(
            normalizedEvaluations.map(
              (evaluation, index) => [
                evaluation.id != null
                  ? `id-${evaluation.id}`
                  : `interview-${evaluation.interviewId}-record-${index}`,
                evaluation,
              ]
            )
          ).values()
        );

        setEvaluations(uniqueEvaluations);

        if (visibleInterviews.length === 0 && !silent) {
          if (
            !usingAssignedEndpoint &&
            currentUserIds.length === 0
          ) {
            setNotice(
              "Your employee/user ID could not be found. Check the logged-in user object or add the assigned-interviews backend endpoint."
            );
          } else {
            setNotice(
              "No interviews are currently assigned to your account."
            );
          }

          setNoticeType("warning");
        } else if (!silent) {
          setNotice("");
        }
      } catch (error) {
        console.error(
          "Failed to load interview evaluations:",
          error
        );

        if (!silent) {
          setInterviews([]);
          setEvaluations([]);
          setNotice(
            error?.message ||
              "Could not load interview data from the backend."
          );
          setNoticeType("error");
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [currentUserIds]
  );

  useEffect(() => {
    loadData();

    const intervalId = window.setInterval(() => {
      loadData({ silent: true });
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [loadData]);

  const getEvaluation = useCallback(
    (interviewId) =>
      evaluations.find(
        (evaluation) =>
          String(evaluation.interviewId) ===
          String(interviewId)
      ),
    [evaluations]
  );

  const getStatus = useCallback(
    (interview) =>
      getEvaluation(interview.id)?.submitted
        ? "Submitted"
        : "Pending",
    [getEvaluation]
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
        String(value ?? "").toLowerCase().includes(query)
      );

      const evaluation = evaluations.find(
        (item) =>
          String(item.interviewId) === String(interview.id)
      );

      const evaluationStatus = evaluation?.submitted
        ? "Submitted"
        : "Pending";

      return (
        matchesSearch &&
        (statusFilter === "All" ||
          evaluationStatus === statusFilter) &&
        (roundFilter === "All" ||
          interview.round
            .toLowerCase()
            .includes(roundFilter.toLowerCase()))
      );
    });
  }, [
    interviews,
    evaluations,
    search,
    statusFilter,
    roundFilter,
  ]);

  const openEvaluation = (interview) => {
    const existing = getEvaluation(interview.id);

    setForm(
      existing
        ? {
            ...emptyEvaluation(),
            technicalSkills: existing.technicalSkills,
            communication: existing.communication,
            problemSolving: existing.problemSolving,
            experience: existing.experience,
            cultureFit: existing.cultureFit,
            strengths: existing.strengths ?? "",
            feedback: existing.feedback ?? "",
            roleSpecificSkills:
              existing.roleSpecificSkills ?? 0,
            professionalism: existing.professionalism ?? 0,
            recommendation: normalizeRecommendation(
              existing.recommendation
            ),
          }
        : emptyEvaluation()
    );

    setSelectedInterview(interview);
    setNotice("");
  };

  const updateScore = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: Number(value),
    }));
  };

  // Download the candidate's CV using the application ID.
  const downloadCandidateCV = async (interview) => {
    const applicationId = interview?.applicationId;

    if (
      applicationId == null ||
      String(applicationId).trim() === ""
    ) {
      setNotice(
        `Cannot download ${interview?.candidateName || "candidate"}'s CV because the interview response does not contain an application ID.`
      );
      setNoticeType("error");
      return;
    }

    if (
      typeof recruitmentApi?.downloadResume !== "function"
    ) {
      setNotice(
        "recruitmentApi.downloadResume() is missing in src/services/api.js."
      );
      setNoticeType("error");
      return;
    }

    setDownloadingApplicationId(String(applicationId));
    setNotice("");

    try {
      const blob =
        await recruitmentApi.downloadResume(applicationId);

      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error(
          "The server returned an empty or invalid CV file."
        );
      }

      const fileUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      const candidateName = (
        interview.candidateName || "Candidate"
      ).replace(/[^a-z0-9_-]/gi, "_");

      const extension =
        blob.type === "application/pdf" ||
        blob.type.includes("pdf")
          ? "pdf"
          : "file";

      link.href = fileUrl;
      link.download = `CV_${candidateName}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Revoke after the browser has had time to start the download.
      window.setTimeout(
        () => window.URL.revokeObjectURL(fileUrl),
        1000
      );

      setNotice(
        `CV download started for ${interview.candidateName}.`
      );
      setNoticeType("success");
    } catch (error) {
      console.error("Candidate CV download failed:", error);

      setNotice(
        error?.message ||
          "Could not download the candidate's CV. Check your permissions and try again."
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
        "You can mark this interview as completed only after its scheduled date and time."
      );
      setNoticeType("warning");
      return;
    }

    const currentStatus = normalizeInterviewStatus(
      interview.status
    );

    if (currentStatus === "COMPLETED") {
      setNotice("This interview is already completed.");
      setNoticeType("warning");
      return;
    }

    if (currentStatus === "CANCELLED") {
      setNotice(
        "A cancelled interview cannot be marked as completed."
      );
      setNoticeType("warning");
      return;
    }

    if (
      typeof recruitmentApi?.updateInterviewStatus !==
      "function"
    ) {
      setNotice(
        "recruitmentApi.updateInterviewStatus() is missing in src/services/api.js."
      );
      setNoticeType("error");
      return;
    }

    setUpdatingStatusId(interview.id);
    setNotice("");

    try {
      await recruitmentApi.updateInterviewStatus(
        interview.id,
        "COMPLETED"
      );

      setInterviews((previous) =>
        previous.map((item) =>
          String(item.id) === String(interview.id)
            ? { ...item, status: "COMPLETED" }
            : item
        )
      );

      setSelectedInterview((current) =>
        current &&
        String(current.id) === String(interview.id)
          ? { ...current, status: "COMPLETED" }
          : current
      );

      setNotice("Interview marked as completed successfully.");
      setNoticeType("success");

      await loadData({ silent: true });
    } catch (error) {
      console.error(
        "Failed to update interview status:",
        error
      );

      setNotice(
        error?.message ||
          "Could not update interview status."
      );
      setNoticeType("error");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const saveEvaluation = async (event) => {
    event.preventDefault();

    if (!selectedInterview) return;

    const interviewId = selectedInterview.id;

    if (
      interviewId == null ||
      !/^\d+$/.test(String(interviewId))
    ) {
      setNotice(
        "This interview has no valid numeric backend ID. Check the interview API response."
      );
      setNoticeType("error");
      return;
    }

    if (getEvaluation(interviewId)?.submitted) {
      setNotice("This evaluation has already been submitted.");
      setNoticeType("warning");
      return;
    }

    if (
      normalizeInterviewStatus(selectedInterview.status) !==
      "COMPLETED"
    ) {
      setNotice(
        "You can submit an evaluation only after the interview is marked as completed."
      );
      setNoticeType("warning");
      return;
    }

    const scores = CRITERIA.map((criterion) =>
      Number(form[criterion.key])
    );

    if (
      scores.some(
        (score) =>
          !Number.isFinite(score) || score < 1 || score > 5
      )
    ) {
      setNotice(
        "Please provide a score from 1 to 5 for every criterion."
      );
      setNoticeType("warning");
      return;
    }

    if (!String(form.strengths ?? "").trim()) {
      setNotice(
        "Please describe the candidate's strengths before submitting."
      );
      setNoticeType("warning");
      return;
    }

    if (!String(form.feedback ?? "").trim()) {
      setNotice("Please enter interview feedback.");
      setNoticeType("warning");
      return;
    }

    if (
      !RECOMMENDATIONS.some(
        (item) => item.value === form.recommendation
      )
    ) {
      setNotice("Please select a valid recommendation.");
      setNoticeType("warning");
      return;
    }

    if (
      typeof recruitmentApi?.submitInterviewEvaluation !==
      "function"
    ) {
      setNotice(
        "recruitmentApi.submitInterviewEvaluation() is missing in src/services/api.js."
      );
      setNoticeType("error");
      return;
    }

    const averageScore =
      scores.reduce((sum, score) => sum + score, 0) /
      scores.length;

    const strengths = String(form.strengths).trim();
    const feedback = String(form.feedback).trim();

    const payload = {
      interviewId,

      ...(selectedInterview.candidateId != null && {
        candidateId: selectedInterview.candidateId,
      }),

      ...(employeeId != null &&
        String(employeeId).trim() !== "" && {
          interviewerId: employeeId,
        }),

      technicalKnowledgeScore: Number(form.technicalSkills),
      technicalKnowledge: Number(form.technicalSkills),
      technicalSkills: Number(form.technicalSkills),

      roleSpecificSkillsScore: Number(
        form.roleSpecificSkills
      ),
      roleSpecificSkillScore: Number(
        form.roleSpecificSkills
      ),
      roleSpecificSkills: Number(form.roleSpecificSkills),
      roleSpecificSkill: Number(form.roleSpecificSkills),
      roleSkillsScore: Number(form.roleSpecificSkills),
      roleSpecificScore: Number(form.roleSpecificSkills),

      professionalismScore: Number(form.professionalism),
      professionalism: Number(form.professionalism),
      professionalismRating: Number(form.professionalism),

      communicationSkillsScore: Number(form.communication),
      communicationScore: Number(form.communication),
      communication: Number(form.communication),

      problemSolvingScore: Number(form.problemSolving),
      problemSolving: Number(form.problemSolving),

      relevantExperienceScore: Number(form.experience),
      experienceScore: Number(form.experience),
      experience: Number(form.experience),

      cultureFitScore: Number(form.cultureFit),
      teamworkScore: Number(form.cultureFit),
      cultureFit: Number(form.cultureFit),

      strengths,
      candidateStrengths: strengths,
      strengthsDescription: strengths,

      feedback,
      recommendation: form.recommendation,
      averageScore,
      submitted: true,
      status: "SUBMITTED",
    };

    setSaving(true);
    setNotice("");

    try {
      await recruitmentApi.submitInterviewEvaluation(
        interviewId,
        payload
      );

      setSelectedInterview(null);

      setNotice("Evaluation submitted successfully.");
      setNoticeType("success");

      await loadData({ silent: true });
    } catch (error) {
      console.error(
        "Failed to submit evaluation:",
        error
      );

      setNotice(
        error?.message ||
          "Could not submit evaluation to the backend."
      );
      setNoticeType("error");
    } finally {
      setSaving(false);
    }
  };

  const submittedCount = interviews.filter(
    (interview) => getStatus(interview) === "Submitted"
  ).length;

  const pendingCount = interviews.length - submittedCount;

  const selectedEvaluation = selectedInterview
    ? getEvaluation(selectedInterview.id)
    : null;

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
              <CheckCircle2
                size={18}
                className="shrink-0"
              />
            ) : (
              <AlertCircle
                size={18}
                className="shrink-0"
              />
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
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search candidates or job titles..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              aria-label="Filter by evaluation status"
            >
              <option value="All">All evaluation statuses</option>
              <option value="Pending">Pending evaluation</option>
              <option value="Submitted">Submitted evaluation</option>
            </select>

            <select
              value={roundFilter}
              onChange={(event) =>
                setRoundFilter(event.target.value)
              }
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
              <RefreshCw
                size={15}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-slate-800">
              My Assigned Interviews
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Only interviews assigned to the logged-in interviewer
              are shown.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-slate-500">
              <RefreshCw size={18} className="animate-spin" />
              Loading assigned interviews...
            </div>
          ) : filteredInterviews.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <ClipboardCheck
                className="mx-auto text-slate-400"
                size={30}
              />

              <h3 className="mt-3 font-semibold text-slate-800">
                No assigned interviews found
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
                There are no interviews matching your account and
                current filters. Check the backend assignment records
                and logged-in interviewer identity if you expect
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
                    <th className="px-5 py-3">Evaluation Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredInterviews.map((interview) => {
                    const evaluationStatus = getStatus(interview);
                    const evaluation = getEvaluation(interview.id);
                    const interviewStatus =
                      normalizeInterviewStatus(interview.status);

                    const isCancelled =
                      interviewStatus === "CANCELLED";

                    const isCompleted =
                      interviewStatus === "COMPLETED";

                    const canComplete =
                      hasInterviewEnded(interview) &&
                      !isCancelled &&
                      !isCompleted;

                    return (
                      <tr
                        key={interview.id}
                        className="hover:bg-slate-50/70"
                      >
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
                          <span className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700">
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
                          <InterviewStatusBadge
                            status={interview.status}
                          />

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
                              {Number(
                                evaluation.averageScore || 0
                              ).toFixed(1)}
                              /5
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                downloadCandidateCV(interview)
                              }
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
                              onClick={() =>
                                openEvaluation(interview)
                              }
                              disabled={
                                !isCompleted ||
                                evaluationStatus === "Submitted"
                              }
                              title={
                                !isCompleted
                                  ? "Mark the interview completed before evaluating"
                                  : evaluationStatus === "Submitted"
                                    ? "Evaluation already submitted"
                                    : "Evaluate interview"
                              }
                              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Eye size={15} />
                              {evaluationStatus === "Submitted"
                                ? "View Evaluation"
                                : "Evaluate"}
                            </button>

                            {evaluationStatus === "Submitted" && (
                              <button
                                type="button"
                                onClick={() =>
                                  openEvaluation(interview)
                                }
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                              >
                                View
                              </button>
                            )}
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
              if (
                event.target === event.currentTarget &&
                !saving
              ) {
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
                    <CheckCircle2
                      className="mr-2 inline"
                      size={17}
                    />
                    This evaluation has been submitted and is
                    read-only.
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
                        selectedInterview.status
                      ).replace(/_/g, " ")}
                    />
                  </div>

                  <h3 className="font-semibold text-slate-800">
                    Evaluation Scores
                  </h3>

                  {CRITERIA.map((criterion) => (
                    <div
                      key={criterion.key}
                      className="flex items-center justify-between gap-4 py-1"
                    >
                      <span className="text-sm text-slate-600">
                        {criterion.label}
                      </span>

                      <span className="flex items-center gap-1 font-semibold">
                        <Star
                          size={15}
                          className="text-amber-500"
                        />
                        {form[criterion.key]}/5
                      </span>
                    </div>
                  ))}

                  <div>
                    <h3 className="mb-2 flex items-center gap-2 font-semibold">
                      <MessageSquare size={16} />
                      Candidate Strengths
                    </h3>

                    <p className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                      {form.strengths ||
                        "No strengths provided."}
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 flex items-center gap-2 font-semibold">
                      <MessageSquare size={16} />
                      Feedback
                    </h3>

                    <p className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                      {form.feedback || "No feedback provided."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">
                      Recommendation
                    </p>

                    <p className="mt-1 font-semibold">
                      {formatRecommendation(form.recommendation)}
                    </p>

                    <p className="mt-3 text-sm text-slate-500">
                      Average score
                    </p>

                    <p className="mt-1 text-xl font-bold text-indigo-600">
                      {Number(
                        selectedEvaluation.averageScore ?? 0
                      ).toFixed(1)}
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
                <form
                  onSubmit={saveEvaluation}
                  className="space-y-6 p-6"
                >
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
                        selectedInterview.status
                      ).replace(/_/g, " ")}
                    />
                  </div>

                  {normalizeInterviewStatus(
                    selectedInterview.status
                  ) !== "COMPLETED" && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      Mark this interview as completed after its
                      scheduled date and time before submitting an
                      evaluation.
                    </div>
                  )}

                  <div>
                    <h3 className="mb-3 font-bold text-slate-800">
                      Evaluation Criteria
                    </h3>

                    <p className="mb-4 text-sm text-slate-500">
                      Give each criterion a score from 1 (lowest)
                      to 5 (highest).
                    </p>

                    <div className="space-y-4">
                      {CRITERIA.map((criterion) => (
                        <fieldset key={criterion.key}>
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <legend className="text-sm font-medium text-slate-700">
                              {criterion.label}
                            </legend>

                            <span className="text-xs text-slate-500">
                              {form[criterion.key]}/5
                            </span>
                          </div>

                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <button
                                key={score}
                                type="button"
                                aria-label={`${criterion.label}: ${score} out of 5`}
                                aria-pressed={
                                  form[criterion.key] === score
                                }
                                onClick={() =>
                                  updateScore(
                                    criterion.key,
                                    score
                                  )
                                }
                                className={`flex h-10 flex-1 items-center justify-center gap-1 rounded-lg border text-sm font-semibold ${
                                  form[criterion.key] === score
                                    ? "border-indigo-600 bg-indigo-600 text-white"
                                    : "border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50"
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
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />

                    <p className="mt-1 text-right text-xs text-slate-400">
                      {form.strengths.length}/3000 characters
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
                      placeholder="Enter strengths, weaknesses, and interview observations..."
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
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
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400"
                    >
                      <option value="" disabled>
                        Select recommendation
                      </option>

                      {RECOMMENDATIONS.map((item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
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
                        normalizeInterviewStatus(
                          selectedInterview.status
                        ) !== "COMPLETED"
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Send size={15} />
                      {saving
                        ? "Submitting..."
                        : "Submit Evaluation"}
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