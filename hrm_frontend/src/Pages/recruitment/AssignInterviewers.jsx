
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  UserPlus,
  Users,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Pencil,
  Filter,
  ChevronDown,
  RefreshCw,
  LoaderCircle,
  Ban,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";

const STAGES = [
  "Technical Interview",
  "HR Interview",
  "Hiring Manager Interview",
  "Final Interview",
];

const LOCKED_STATUSES = new Set([
  "completed",
  "complete",
  "cancelled",
  "canceled",
  "evaluated",
  "submitted",
  "finished",
]);

const unwrapList = (response) => {
  let value = response;

  for (let i = 0; i < 6; i += 1) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];

    for (const key of [
      "content",
      "items",
      "interviews",
      "employees",
      "users",
      "data",
      "results",
    ]) {
      if (Array.isArray(value[key])) return value[key];
    }

    if (value.data !== undefined) {
      value = value.data;
      continue;
    }

    if (value.result !== undefined) {
      value = value.result;
      continue;
    }

    break;
  }

  return [];
};

const asArray = (value) =>
  Array.isArray(value) ? value : value == null ? [] : [value];

const getPersonId = (item) => {
  if (item == null) return "";

  if (typeof item !== "object") {
    return String(item);
  }

  // Assignment objects may contain an interviewer, employee, or user object.
  const nested = item.interviewer ?? item.employee ?? item.user;

  if (nested && typeof nested === "object") {
    return String(
      nested.userId ??
        nested.employeeId ??
        nested.idUser ??
        nested.id ??
        "",
    );
  }

  return String(
    item.userId ??
      item.employeeId ??
      item.idUser ??
      item.interviewerId ??
      item.interviewer_id ??
      item.employee?.id ??
      item.user?.id ??
      item.id ??
      "",
  );
};

const asStringIds = (value) =>
  [...new Set(asArray(value).map(getPersonId).filter(Boolean))];

const normalizeStatus = (value) =>
  String(value ?? "unknown")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const isInterviewLocked = (interview) => {
  const statuses = [
    interview?.status,
    interview?.interviewStatus,
    interview?.interview_status,
    interview?.state,
  ].map(normalizeStatus);

  return statuses.some((status) => LOCKED_STATUSES.has(status));
};

const getDisplayStatus = (interview) => {
  const status = normalizeStatus(
    interview?.status ??
      interview?.interviewStatus ??
      interview?.interview_status ??
      interview?.state,
  );

  if (
    ["completed", "complete", "evaluated", "submitted", "finished"].includes(
      status,
    )
  ) {
    return "Completed";
  }

  if (["cancelled", "canceled"].includes(status)) {
    return "Cancelled";
  }

  if (status === "unknown") return "Scheduled";

  return status.replace(/\b\w/g, (character) => character.toUpperCase());
};

const getInterviewDate = (item) =>
  item?.date ??
  item?.interviewDate ??
  item?.interview_date ??
  item?.scheduledDate ??
  item?.scheduled_date ??
  "";

const getInterviewTime = (item) =>
  item?.time ??
  item?.interviewTime ??
  item?.interview_time ??
  item?.scheduledTime ??
  item?.scheduled_time ??
  "";

const getDuration = (item) =>
  Number(
    item?.duration ??
      item?.durationMinutes ??
      item?.duration_minutes ??
      item?.durationInMinutes ??
      0,
  );

const normalizeInterview = (item) => {
  const candidate =
    item?.candidate && typeof item.candidate === "object"
      ? item.candidate
      : {};

  const vacancy =
    item?.vacancy && typeof item.vacancy === "object" ? item.vacancy : {};

  const assigned =
    item?.interviewers ??
    item?.assignedInterviewers ??
    item?.evaluatorAssignments ??
    item?.interviewerAssignments ??
    item?.interviewerIds ??
    item?.interviewerId ??
    item?.assignedInterviewerIds ??
    [];

  const rawDate = getInterviewDate(item);
  const rawTime = getInterviewTime(item);

  const applicationId =
    item?.applicationId ??
    item?.application_id ??
    item?.application?.id ??
    item?.application?.applicationId ??
    null;

  const candidateId =
    item?.candidateId ??
    item?.candidate_id ??
    candidate?.candidateId ??
    candidate?.id ??
    null;

  const candidateName =
    item?.candidateName ??
    item?.candidate_name ??
    candidate?.name ??
    candidate?.fullName ??
    item?.name ??
    (typeof item?.candidate === "string" ? item.candidate : "");

  const stage =
    item?.stage ??
    item?.round ??
    item?.interviewRound ??
    item?.interview_round ??
    item?.interviewType ??
    item?.interview_type ??
    "Interview stage not set";

  return {
    ...item,

    id: item?.id ?? item?.interviewId ?? item?.interview_id,

    // Keep application identity separate from candidate identity.
    applicationId:
      applicationId == null ? "" : String(applicationId),

    candidateId: candidateId == null ? "" : String(candidateId),

    candidate: candidateName || "Unnamed candidate",

    position:
      item?.vacancyTitle ??
      item?.vacancy_title ??
      item?.jobTitle ??
      item?.job_title ??
      item?.positionTitle ??
      vacancy?.title ??
      vacancy?.jobTitle ??
      (typeof item?.vacancy === "string"
        ? item.vacancy
        : "Vacancy not specified"),

    stage,

    date: String(rawDate ?? "").slice(0, 10),
    time: String(rawTime ?? "").slice(0, 5),
    duration: getDuration(item),

    status:
      item?.status ??
      item?.interviewStatus ??
      item?.interview_status ??
      item?.state ??
      "Unknown",

    interviewers: asStringIds(assigned),
  };
};

const getRoleName = (role) => {
  if (typeof role === "string") return role;

  if (!role || typeof role !== "object") return "";

  return [
    role.roleName,
    role.name,
    role.displayName,
    role.title,
    role.code,
    role.roleCode,
    role.authority,
    role.permission,
  ]
    .filter(Boolean)
    .join(" ");
};

const hasInterviewerRole = (employee) => {
  const roles = [
    ...asArray(employee?.recruitmentRoles),
    ...asArray(employee?.assignedRecruitmentRoles),
    ...asArray(employee?.recruitmentRoleAssignments),
    ...asArray(employee?.roles),
    ...asArray(employee?.roleAssignments),
    ...asArray(employee?.authorities),
  ];

  const roleText = roles
    .map(getRoleName)
    .join(" ")
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  return (
    roleText.includes("interviewer") ||
    roleText.includes("interview evaluator") ||
    roleText.includes("interview evaluate") ||
    roleText.includes("interview evaluation")
  );
};

const normalizeInterviewer = (employee) => {
  if (!employee || !hasInterviewerRole(employee)) return null;

  const id =
    employee?.userId ??
    employee?.idUser ??
    employee?.employeeId ??
    employee?.user?.id ??
    employee?.id;

  const name =
    employee?.fullName ??
    employee?.name ??
    employee?.employeeName ??
    [employee?.firstName, employee?.lastName].filter(Boolean).join(" ");

  if (id == null || !String(name ?? "").trim()) return null;

  const status = String(
    employee?.status ?? employee?.employmentStatus ?? "active",
  )
    .trim()
    .toLowerCase();

  if (
    ["inactive", "terminated", "disabled", "deactivated"].includes(status)
  ) {
    return null;
  }

  return {
    id: String(id),
    name: String(name).trim(),
    email: employee?.email ?? employee?.workEmail ?? "",
    role:
      employee?.designation ??
      employee?.jobTitle ??
      employee?.position ??
      "Interviewer / Evaluator",
    department:
      employee?.departmentName ?? employee?.department ?? "Not specified",
  };
};

const formatDate = (date) => {
  if (!date) return "Date not set";

  const parsed = new Date(`${date}T00:00:00`);

  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

const formatTime = (time) => {
  if (!time) return "Time not set";

  const [hours, minutes] = time.split(":").map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return time;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const getMinutes = (time) => {
  if (!/^\d{2}:\d{2}/.test(String(time ?? ""))) return null;

  const [hours, minutes] = time.split(":").map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
};

const getInitials = (name = "") =>
  String(name)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const toNumericIds = (ids) =>
  ids.map((id) => {
    const numericId = Number(id);
    return String(id).trim() !== "" && Number.isFinite(numericId)
      ? numericId
      : id;
  });

export default function AssignInterviewers() {
  const [interviews, setInterviews] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [employeeLoadError, setEmployeeLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All Stages");
  const [assignmentFilter, setAssignmentFilter] = useState("All Interviews");
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [selectedInterviewers, setSelectedInterviewers] = useState([]);
  const [modalError, setModalError] = useState("");
  const [notice, setNotice] = useState("");

  const loadInterviews = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setLoadError("");

    try {
      if (typeof recruitmentApi.getInterviews !== "function") {
        throw new Error(
          "recruitmentApi.getInterviews() is not configured in services/api.js.",
        );
      }

      const response = await recruitmentApi.getInterviews();

      const records = unwrapList(response)
        .map(normalizeInterview)
        .filter((item) => item.id != null && String(item.id).trim() !== "");

      setInterviews(records);
    } catch (error) {
      console.error("Unable to load interviews:", error);
      setLoadError(
        error?.message || "Unable to load interviews from the backend.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadInterviewers = useCallback(async () => {
    setEmployeesLoading(true);
    setEmployeeLoadError("");

    try {
      if (typeof recruitmentApi.getCompanyUsersWithRoles !== "function") {
        throw new Error(
          "recruitmentApi.getCompanyUsersWithRoles() is not configured in services/api.js.",
        );
      }

      const response = await recruitmentApi.getCompanyUsersWithRoles();

      const people = [
        ...new Map(
          unwrapList(response)
            .map(normalizeInterviewer)
            .filter(Boolean)
            .map((person) => [person.id, person]),
        ).values(),
      ];

      setInterviewers(people);

      if (!people.length) {
        setEmployeeLoadError(
          "No active employees with a recognized Interviewer / Evaluator recruitment role were returned. Check the backend response and role names.",
        );
      }
    } catch (error) {
      console.error("Unable to load interviewers:", error);
      setEmployeeLoadError(
        error?.message || "Unable to load interviewers from the backend.",
      );
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  const refreshAll = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);

      await Promise.all([loadInterviews(isRefresh), loadInterviewers()]);
    },
    [loadInterviews, loadInterviewers],
  );

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const assignedCount = interviews.filter(
    (item) => item.interviewers.length > 0,
  ).length;

  const unassignedCount = interviews.length - assignedCount;

  const totalAssignments = interviews.reduce(
    (total, item) => total + item.interviewers.length,
    0,
  );

  const filteredInterviews = useMemo(() => {
    const query = search.trim().toLowerCase();

    return interviews.filter((item) => {
      const matchesSearch = [
        item.candidate,
        item.candidateId,
        item.applicationId,
        item.position,
        item.stage,
        getDisplayStatus(item),
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      );

      const matchesStage =
        stageFilter === "All Stages" || item.stage === stageFilter;

      const matchesAssignment =
        assignmentFilter === "All Interviews" ||
        (assignmentFilter === "Assigned" && item.interviewers.length > 0) ||
        (assignmentFilter === "Unassigned" && item.interviewers.length === 0);

      return matchesSearch && matchesStage && matchesAssignment;
    });
  }, [interviews, search, stageFilter, assignmentFilter]);

  const findInterviewer = useCallback(
    (id) =>
      interviewers.find((person) => String(person.id) === String(id)),
    [interviewers],
  );

  const openAssignmentModal = (interview) => {
    if (isInterviewLocked(interview)) return;

    setSelectedInterview(interview);
    setSelectedInterviewers([...interview.interviewers]);
    setModalError("");
    setNotice("");
  };

  const closeModal = () => {
    if (saving) return;

    setSelectedInterview(null);
    setSelectedInterviewers([]);
    setModalError("");
  };

  const getConflicts = (interviewerId) => {
    if (!selectedInterview) return [];

    const currentStart = getMinutes(selectedInterview.time);
    const currentDuration = Number(selectedInterview.duration);

    // A conflict check is only reliable when the schedule is valid.
    if (
      !selectedInterview.date ||
      currentStart == null ||
      !Number.isFinite(currentDuration) ||
      currentDuration <= 0
    ) {
      return [];
    }

    const currentEnd = currentStart + currentDuration;

    return interviews.filter((other) => {
      if (String(other.id) === String(selectedInterview.id)) return false;
      if (other.date !== selectedInterview.date) return false;
      if (isInterviewLocked(other)) return false;

      if (
        !other.interviewers.some(
          (id) => String(id) === String(interviewerId),
        )
      ) {
        return false;
      }

      const otherStart = getMinutes(other.time);
      const otherDuration = Number(other.duration);

      if (
        otherStart == null ||
        !Number.isFinite(otherDuration) ||
        otherDuration <= 0
      ) {
        return false;
      }

      const otherEnd = otherStart + otherDuration;

      return currentStart < otherEnd && otherStart < currentEnd;
    });
  };

  const toggleInterviewer = (id) => {
    const value = String(id);

    setModalError("");

    setSelectedInterviewers((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const saveAssignments = async () => {
    if (!selectedInterview) return;

    if (isInterviewLocked(selectedInterview)) {
      setModalError(
        "Interviewers cannot be changed for completed or cancelled interviews.",
      );
      return;
    }

    if (typeof recruitmentApi.assignInterviewers !== "function") {
      setModalError(
        "The interviewer assignment API is not configured. Add assignInterviewers() to services/api.js and verify the backend endpoint.",
      );
      return;
    }

    if (
      selectedInterview.date &&
      selectedInterview.time &&
      (!Number.isFinite(Number(selectedInterview.duration)) ||
        Number(selectedInterview.duration) <= 0)
    ) {
      setModalError(
        "This interview has an invalid duration. Update its schedule before assigning interviewers.",
      );
      return;
    }

    const conflicts = selectedInterviewers.flatMap((id) =>
      getConflicts(id).map((interview) => ({ id, interview })),
    );

    if (conflicts.length) {
      const names = [
        ...new Set(
          conflicts.map(
            ({ id }) => findInterviewer(id)?.name || "Selected interviewer",
          ),
        ),
      ];

      setModalError(
        `Scheduling conflict: ${names.join(", ")} already have an overlapping interview. Remove them or change the schedule before saving.`,
      );
      return;
    }

    setSaving(true);
    setModalError("");
    setNotice("");

    try {
      await recruitmentApi.assignInterviewers(
        selectedInterview.id,
        toNumericIds(selectedInterviewers),
      );

      const candidateName = selectedInterview.candidate;

      setSelectedInterview(null);
      setSelectedInterviewers([]);
      setNotice(`Interviewer assignments saved for ${candidateName}.`);

      await loadInterviews(true);
    } catch (error) {
      console.error("Unable to save interviewer assignments:", error);

      setModalError(
        error?.response?.data?.message ??
          error?.message ??
          "The backend could not save these interviewer assignments.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeAssignment = async (interview, interviewerId) => {
    if (isInterviewLocked(interview)) {
      setNotice(
        "Assignments cannot be changed for completed or cancelled interviews.",
      );
      return;
    }

    if (typeof recruitmentApi.assignInterviewers !== "function") {
      setNotice(
        "Cannot remove this assignment because assignInterviewers() is not configured in services/api.js.",
      );
      return;
    }

    const remaining = interview.interviewers.filter(
      (id) => String(id) !== String(interviewerId),
    );

    setNotice("");
    setLoadError("");

    try {
      await recruitmentApi.assignInterviewers(
        interview.id,
        toNumericIds(remaining),
      );

      const person = findInterviewer(interviewerId);

      setNotice(
        `${person?.name || "Interviewer"} was removed from the assignment.`,
      );

      await loadInterviews(true);
    } catch (error) {
      console.error("Unable to remove interviewer assignment:", error);

      setLoadError(
        error?.response?.data?.message ??
          error?.message ??
          "The backend could not remove this interviewer assignment.",
      );
    }
  };

  const stageColor = (stage) => {
    if (stage === "Technical Interview") return "bg-blue-50 text-blue-700";
    if (stage === "HR Interview") return "bg-purple-50 text-purple-700";
    if (stage === "Hiring Manager Interview")
      return "bg-amber-50 text-amber-700";

    return "bg-emerald-50 text-emerald-700";
  };

  const statusBadge = (interview) => {
    const status = getDisplayStatus(interview);
    const locked = isInterviewLocked(interview);

    const className =
      status === "Completed"
        ? "bg-emerald-50 text-emerald-700"
        : status === "Cancelled"
          ? "bg-red-50 text-red-700"
          : locked
            ? "bg-slate-100 text-slate-600"
            : "bg-blue-50 text-blue-700";

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
      >
        {status === "Completed" && <CheckCircle2 size={14} />}
        {status === "Cancelled" && <Ban size={14} />}
        {status}
      </span>
    );
  };

  const renderAssigned = (interview, compact = false) => {
    const assignedIds = interview.interviewers;
    const assignedPeople = assignedIds.map((id) => ({
      id,
      person: findInterviewer(id),
    }));

    if (!assignedIds.length) {
      return (
        <span className="text-sm text-slate-400">
          No interviewers assigned
        </span>
      );
    }

    return (
      <div className={compact ? "space-y-1" : "space-y-2"}>
        {assignedPeople.map(({ id, person }) => (
          <div key={id} className="flex items-center gap-2">
            {!compact && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                {getInitials(person?.name ?? "Unknown")}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">
                {person?.name ?? `Interviewer ID: ${id}`}
              </p>

              {!compact && (
                <p className="text-xs text-slate-500">
                  {person?.role ?? "Previously assigned interviewer"}
                </p>
              )}
            </div>

            {!isInterviewLocked(interview) && (
              <button
                type="button"
                onClick={() => removeAssignment(interview, id)}
                title={`Remove ${person?.name ?? "interviewer"}`}
                aria-label={`Remove ${person?.name ?? "interviewer"}`}
                className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <X size={15} />
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <PageLayout role="recruiter" activePage="Assign Interviewers">
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="mb-2 text-sm font-medium text-indigo-600">
                Recruitment / Interviews
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Assign Interviewers
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Assign the right interview panel to every interview stage.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
              <Users size={18} className="text-indigo-600" />
              <span>
                <strong className="text-slate-900">
                  {interviewers.length}
                </strong>{" "}
                available interviewers
              </span>

              <button
                type="button"
                onClick={() => refreshAll(true)}
                disabled={refreshing || loading || employeesLoading}
                title="Refresh lists"
                aria-label="Refresh lists"
                className="ml-2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <RefreshCw
                  size={15}
                  className={
                    refreshing || loading || employeesLoading
                      ? "animate-spin"
                      : ""
                  }
                />
              </button>
            </div>
          </div>

          {(loading || employeesLoading) && (
            <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-700">
              <LoaderCircle size={17} className="animate-spin" />
              Loading data from the backend...
            </div>
          )}

          {loadError && (
            <div
              role="alert"
              className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <span>
                <AlertTriangle size={17} className="mr-2 inline" />
                {loadError}
              </span>
              <button
                type="button"
                onClick={() => loadInterviews(true)}
                className="shrink-0 underline"
              >
                Retry
              </button>
            </div>
          )}

          {employeeLoadError && !employeesLoading && (
            <div
              role="alert"
              className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
            >
              <span>
                <AlertTriangle size={17} className="mr-2 inline" />
                {employeeLoadError}
              </span>
              <button
                type="button"
                onClick={loadInterviewers}
                className="shrink-0 underline"
              >
                Retry
              </button>
            </div>
          )}

          {notice && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={18} />
                {notice}
              </span>
              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="Dismiss message"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Interviews"
              value={loading ? "—" : interviews.length}
              icon={<CalendarDays size={21} />}
              color="indigo"
            />
            <StatCard
              label="Assigned Interviews"
              value={loading ? "—" : assignedCount}
              icon={<CheckCircle2 size={21} />}
              color="emerald"
            />
            <StatCard
              label="Awaiting Assignment"
              value={loading ? "—" : unassignedCount}
              icon={<AlertTriangle size={21} />}
              color="amber"
            />
            <StatCard
              label="Total Assignments"
              value={loading ? "—" : totalAssignments}
              icon={<Users size={21} />}
              color="purple"
            />
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Interview Assignments
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Manage interview panels for interviews returned by the
                    backend.
                  </p>
                </div>

                <div className="relative w-full lg:max-w-xs">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search candidates or positions..."
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="relative">
                  <Filter
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    value={stageFilter}
                    onChange={(event) => setStageFilter(event.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-700 outline-none focus:border-indigo-500"
                  >
                    <option>All Stages</option>
                    {STAGES.map((stage) => (
                      <option key={stage}>{stage}</option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>

                <div className="relative">
                  <select
                    value={assignmentFilter}
                    onChange={(event) =>
                      setAssignmentFilter(event.target.value)
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-700 outline-none focus:border-indigo-500"
                  >
                    <option>All Interviews</option>
                    <option>Assigned</option>
                    <option>Unassigned</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {[
                      "Candidate",
                      "Interview Stage",
                      "Schedule",
                      "Interviewers",
                      "Status",
                      "Actions",
                    ].map((heading) => (
                      <th key={heading} className="px-6 py-4 font-semibold">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredInterviews.map((interview) => {
                    const assignedCountForRow = interview.interviewers.length;
                    const locked = isInterviewLocked(interview);

                    return (
                      <tr
                        key={interview.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-5">
                          <p className="font-semibold text-slate-900">
                            {interview.candidate}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {interview.position}
                          </p>
                          {interview.applicationId && (
                            <p className="mt-1 text-xs text-slate-400">
                              Application ID: {interview.applicationId}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${stageColor(interview.stage)}`}
                          >
                            {interview.stage}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <p className="flex items-center gap-2 text-sm text-slate-700">
                            <CalendarDays
                              size={15}
                              className="text-slate-400"
                            />
                            {formatDate(interview.date)}
                          </p>
                          <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                            <Clock size={14} />
                            {formatTime(interview.time)} ·{" "}
                            {interview.duration || "—"} min
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          {renderAssigned(interview)}
                        </td>

                        <td className="px-6 py-5">
                          {statusBadge(interview)}
                        </td>

                        <td className="px-6 py-5 text-right">
                          {!locked ? (
                            <button
                              type="button"
                              onClick={() => openAssignmentModal(interview)}
                              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                            >
                              {assignedCountForRow ? (
                                <Pencil size={15} />
                              ) : (
                                <UserPlus size={15} />
                              )}
                              {assignedCountForRow ? "Edit" : "Assign"}
                            </button>
                          ) : (
                            <span className="text-sm font-medium text-slate-400">
                              {getDisplayStatus(interview)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 p-4 md:hidden">
              {filteredInterviews.map((interview) => {
                const assignedCountForRow = interview.interviewers.length;
                const locked = isInterviewLocked(interview);

                return (
                  <article
                    key={interview.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {interview.candidate}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {interview.position}
                        </p>
                        {interview.applicationId && (
                          <p className="mt-1 text-xs text-slate-400">
                            Application ID: {interview.applicationId}
                          </p>
                        )}
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${stageColor(interview.stage)}`}
                      >
                        {interview.stage}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={15} />
                        {formatDate(interview.date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={15} />
                        {formatTime(interview.time)}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Assigned interviewers ({assignedCountForRow})
                      </p>
                      {statusBadge(interview)}
                    </div>

                    <div className="mt-3">
                      {renderAssigned(interview, true)}
                    </div>

                    {!locked ? (
                      <button
                        type="button"
                        onClick={() => openAssignmentModal(interview)}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
                      >
                        {assignedCountForRow ? (
                          <Pencil size={16} />
                        ) : (
                          <UserPlus size={16} />
                        )}
                        {assignedCountForRow
                          ? "Edit Assignment"
                          : "Assign Interviewers"}
                      </button>
                    ) : (
                      <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-500">
                        {getDisplayStatus(interview) === "Completed" ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <Ban size={16} />
                        )}
                        {getDisplayStatus(interview)} — assignments locked
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {!loading && filteredInterviews.length === 0 && (
              <div className="px-6 py-16 text-center">
                <Search className="mx-auto mb-3 text-slate-300" size={32} />
                <p className="font-medium text-slate-700">
                  {loadError
                    ? "Interview data could not be loaded"
                    : interviews.length === 0
                      ? "No interviews returned by the backend"
                      : "No interviews found"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {loadError
                    ? "Resolve the backend error and retry."
                    : interviews.length === 0
                      ? "Create interviews in Interview Scheduling. They will appear here when the backend returns them."
                      : "Try another search term or filter."}
                </p>
              </div>
            )}

            <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
              Showing {filteredInterviews.length} of {interviews.length} backend
              interviews
            </div>
          </section>
        </div>
      </div>

      {selectedInterview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) closeModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="assignment-title"
            className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
              <div>
                <h2
                  id="assignment-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Assign Interviewers
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select the employees who will conduct this interview.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close assignment modal"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">
                  {selectedInterview.candidate}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedInterview.position}
                </p>

                {selectedInterview.applicationId && (
                  <p className="mt-1 text-xs text-slate-400">
                    Application ID: {selectedInterview.applicationId}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${stageColor(selectedInterview.stage)}`}
                  >
                    {selectedInterview.stage}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                    {formatDate(selectedInterview.date)} ·{" "}
                    {formatTime(selectedInterview.time)}
                  </span>
                  {statusBadge(selectedInterview)}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-slate-900">
                    Available interviewers
                  </h3>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                    {selectedInterviewers.length} selected
                  </span>
                </div>

                <p className="mb-3 text-sm text-slate-500">
                  Select one or more interviewers. Existing assignments are
                  preselected.
                </p>

                {employeesLoading ? (
                  <div className="rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
                    Loading interviewers...
                  </div>
                ) : employeeLoadError ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    {employeeLoadError}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {interviewers.map((person) => {
                      const checked = selectedInterviewers.includes(person.id);
                      const conflicts = getConflicts(person.id);

                      return (
                        <label
                          key={person.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                            checked
                              ? "border-indigo-300 bg-indigo-50/60"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleInterviewer(person.id)}
                            className="mt-1 h-4 w-4 accent-indigo-600"
                          />

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                            {getInitials(person.name)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-900">
                              {person.name}
                            </p>
                            <p className="mt-0.5 text-sm text-slate-500">
                              {person.role} · {person.department}
                            </p>
                            <p className="mt-0.5 break-all text-xs text-slate-400">
                              {person.email}
                            </p>

                            {conflicts.length > 0 && (
                              <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
                                <AlertTriangle
                                  size={14}
                                  className="mt-0.5 shrink-0"
                                />
                                <span>
                                  Overlaps with:{" "}
                                  {conflicts
                                    .map(
                                      (item) =>
                                        `${item.candidate} (${formatTime(item.time)})`,
                                    )
                                    .join(", ")}
                                </span>
                              </p>
                            )}
                          </div>

                          {checked && (
                            <CheckCircle2
                              size={18}
                              className="shrink-0 text-indigo-600"
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {modalError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  {modalError}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 p-5 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveAssignments}
                disabled={
                  saving ||
                  employeesLoading ||
                  interviewers.length === 0 ||
                  isInterviewLocked(selectedInterview)
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={17} />
                )}
                {saving ? "Saving..." : "Save Assignments"}
              </button>
            </div>
          </section>
        </div>
      )}
    </PageLayout>
  );
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className={`rounded-xl p-3 ${colors[color]}`}>{icon}</div>
        <span className="text-3xl font-bold tabular-nums text-slate-900">
          {value}
        </span>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}
