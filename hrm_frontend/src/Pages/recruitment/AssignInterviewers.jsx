import RecruitmentModal, { ModalButton } from "./components/RecruitmentModal";

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
  RefreshCw,
  LoaderCircle,
  Ban,
  Eye,
  Info,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import StatCard, { StatCardGrid } from "../../components/StatCard";
import VacancyGroupCard from "./VacancyGroupCard";
import { recruitmentApi } from "../../services/api";
import { avatarColorClass } from "../../utils/avatarColor";

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
  const [collapsedGroups, setCollapsedGroups] = useState({});
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

  const vacancyGroups = useMemo(() => {
    const groups = new Map();

    filteredInterviews.forEach((interview) => {
      const title = interview.position || "Vacancy not specified";
      const vacancyId =
        interview.vacancyId ??
        interview.vacancy_id ??
        interview.vacancy?.id ??
        title;
      const key = String(vacancyId);

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          title,
          department:
            interview.department ??
            interview.vacancy?.department ??
            "Department not specified",
          rows: [],
        });
      }

      groups.get(key).rows.push(interview);
    });

    return Array.from(groups.values());
  }, [filteredInterviews]);

  const expandAllGroups = () => setCollapsedGroups({});

  const collapseAllGroups = () => {
    setCollapsedGroups(
      Object.fromEntries(vacancyGroups.map((group) => [group.key, true])),
    );
  };

  const findInterviewer = useCallback(
    (id) =>
      interviewers.find((person) => String(person.id) === String(id)),
    [interviewers],
  );

  const openAssignmentModal = (interview) => {
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
    if (stage === "Technical Interview") return "bg-primary-50 text-primary-700";
    if (stage === "HR Interview") return "bg-slate-100 text-slate-700";
    if (stage === "Hiring Manager Interview") return "bg-primary-50 text-primary-700";

    return "bg-slate-100 text-slate-700";
  };

  const statusBadge = (interview) => {
    const status = getDisplayStatus(interview);
    const locked = isInterviewLocked(interview);

    const className =
      status === "Completed"
        ? "bg-green-50 text-green-700"
        : status === "Cancelled"
          ? "bg-red-50 text-red-700"
          : locked
            ? "bg-slate-100 text-slate-600"
            : "bg-primary-50 text-primary-700";

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
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
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${avatarColorClass(person?.name ?? id)} text-xs font-semibold text-white`}>
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
    <PageLayout
      role="recruiter"
      activePage="Assign Interviewers"
      title="Assign Interviewers"
      subtitle="Assign the right interview panel to every interview stage"
      actions={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 shadow-sm">
            <Users size={16} className="text-primary-600" />
            <span>
              <strong className="text-slate-900">{interviewers.length}</strong>{" "}
              available interviewers
            </span>
          </span>
          <button
            type="button"
            onClick={() => refreshAll(true)}
            disabled={refreshing || loading || employeesLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={refreshing || loading || employeesLoading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">

          {(loading || employeesLoading) && (
            <div className="flex items-center gap-2 rounded-xl border border-primary-100 bg-primary-50 p-4 text-sm text-primary-700">
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
                No interviewers are available yet. Ask an admin to give
                employees the Interviewer role.
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

          <div className="mb-6">
            <StatCardGrid>
            <StatCard
              label="Total Interviews"
              value={loading ? "—" : interviews.length}
              caption="All interviews"
              icon={CalendarDays}
              tone="primary"
            />
            <StatCard
              label="Assigned Interviews"
              value={loading ? "—" : assignedCount}
              caption="Panel assigned"
              icon={CheckCircle2}
              tone="green"
            />
            <StatCard
              label="Awaiting Assignment"
              value={loading ? "—" : unassignedCount}
              caption="Need interviewers"
              icon={AlertTriangle}
              tone="amber"
            />
            <StatCard
              label="Total Assignments"
              value={loading ? "—" : totalAssignments}
              caption="Interviewer assignments"
              icon={Users}
              tone="slate"
            />
            </StatCardGrid>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search candidates or positions..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <span
                  title="Filter interviews by candidate, position, stage, or assignment status."
                  className="inline-flex shrink-0 text-slate-400"
                >
                  <Info size={14} />
                </span>
                <span className="text-sm font-semibold text-slate-600">
                  Stage:
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {["All Stages", ...STAGES].map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      aria-pressed={stageFilter === stage}
                      onClick={() => setStageFilter(stage)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                        stageFilter === stage
                          ? "border-primary-600 bg-primary-600 text-white shadow-sm"
                          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
                <span className="text-sm font-semibold text-slate-600">
                  Status:
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {["All Interviews", "Assigned", "Unassigned"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={assignmentFilter === status}
                      onClick={() => setAssignmentFilter(status)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                        assignmentFilter === status
                          ? "border-primary-600 bg-primary-600 text-white shadow-sm"
                          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <span className="ml-auto text-xs text-slate-500">
                  {filteredInterviews.length} interview
                  {filteredInterviews.length !== 1 ? "s" : ""} found
                </span>
                {vacancyGroups.length > 0 && (
                  <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                    <button
                      type="button"
                      onClick={expandAllGroups}
                      className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-primary-600"
                    >
                      Expand All
                    </button>
                    <span className="h-4 w-px bg-slate-200" />
                    <button
                      type="button"
                      onClick={collapseAllGroups}
                      className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-primary-600"
                    >
                      Collapse All
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {vacancyGroups.map((group) => {
                const expanded = !collapsedGroups[group.key];
                const awaitingCount = group.rows.filter(
                  (interview) => interview.interviewers.length === 0,
                ).length;
                const assignedCount = group.rows.length - awaitingCount;

                return (
                  <VacancyGroupCard
                    key={group.key}
                    title={group.title}
                    department={group.department}
                    meta={`${group.rows.length} ${
                      group.rows.length === 1 ? "candidate" : "candidates"
                    }`}
                    badges={[
                      {
                        label: `${awaitingCount} awaiting assignment`,
                        tone: "amber",
                      },
                      { label: `${assignedCount} assigned`, tone: "green" },
                    ]}
                    expanded={expanded}
                    onToggle={() =>
                      setCollapsedGroups((current) => ({
                        ...current,
                        [group.key]: expanded ? true : undefined,
                      }))
                    }
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] text-left text-sm text-slate-600">
                        <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <tr>
                            {[
                              "Candidate",
                              "Interview Stage",
                              "Schedule",
                              "Interviewers",
                              "Status",
                              "Actions",
                            ].map((heading) => (
                              <th
                                key={heading}
                                className="whitespace-nowrap px-4 py-3"
                              >
                                {heading}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.rows.map((interview) => {
                            const assignedCountForRow =
                              interview.interviewers.length;
                            const locked = isInterviewLocked(interview);

                            return (
                              <tr
                                key={interview.id}
                                className="transition-colors duration-150 hover:bg-slate-50/80"
                              >
                                <td className="whitespace-nowrap px-4 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${avatarColorClass(interview.candidate || interview.id)} text-xs font-bold text-white shadow-sm`}
                                    >
                                      {getInitials(interview.candidate)}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-slate-900">
                                        {interview.candidate}
                                      </p>
                                      {interview.applicationId && (
                                        <p className="mt-1 text-xs text-slate-400">
                                          Application ID:{" "}
                                          {interview.applicationId}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3.5">
                                  <span
                                    className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${stageColor(interview.stage)}`}
                                  >
                                    {interview.stage}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3.5">
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
                                <td className="px-4 py-3.5">
                                  {renderAssigned(interview)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3.5">
                                  {statusBadge(interview)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3.5 text-right">
                                  {locked ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openAssignmentModal(interview)
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                    >
                                      <Eye size={14} />
                                      View
                                    </button>
                                  ) : !locked ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openAssignmentModal(interview)
                                      }
                                      className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
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
                  </VacancyGroupCard>
                );
              })}
            </div>

            {!loading && filteredInterviews.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-16 text-center">
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

            <div className="px-1 text-sm text-slate-500">
              Showing {filteredInterviews.length} of {interviews.length} backend
              interviews
            </div>
          </div>
        </div>

      {selectedInterview && (
        <RecruitmentModal
          open={true}
          onClose={closeModal}
          size="lg"
          title={
            isInterviewLocked(selectedInterview)
              ? "Interview Assignment"
              : "Assign Interviewers"
          }
          subtitle={
            isInterviewLocked(selectedInterview)
              ? "Read-only interview assignment details."
              : "Select the employees who will conduct this interview."
          }
          footer={
            <>
              {isInterviewLocked(selectedInterview) ? (
                <ModalButton
                  onClick={closeModal}
                  className="w-full sm:w-auto"
                >
                  Close
                </ModalButton>
              ) : (
                <>
                  <ModalButton
                    onClick={closeModal}
                    disabled={saving}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </ModalButton>
                  <ModalButton
                    variant="primary"
                    onClick={saveAssignments}
                    disabled={
                      saving ||
                      employeesLoading ||
                      interviewers.length === 0
                    }
                    className="w-full sm:w-auto"
                  >
                    {saving ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={17} />
                    )}
                    {saving ? "Saving..." : "Save Assignments"}
                  </ModalButton>
                </>
              )}
            </>
          }
        >
            <div className="space-y-5">
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
                    {isInterviewLocked(selectedInterview)
                      ? "Assigned interviewers"
                      : "Available interviewers"}
                  </h3>
                  <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                    {selectedInterviewers.length} selected
                  </span>
                </div>

                <p className="mb-3 text-sm text-slate-500">
                  {isInterviewLocked(selectedInterview)
                    ? "This interview is locked and its assignments cannot be changed."
                    : "Select one or more interviewers. Existing assignments are preselected."}
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
                    {(isInterviewLocked(selectedInterview)
                      ? interviewers.filter((person) =>
                          selectedInterviewers.includes(person.id),
                        )
                      : interviewers
                    ).map((person) => {
                      const checked = selectedInterviewers.includes(person.id);
                      const conflicts = getConflicts(person.id);

                      return (
                        <label
                          key={person.id}
                          className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                            checked
                              ? "border-primary-300 bg-primary-50/60"
                              : "border-slate-200 hover:border-slate-300"
                          } ${isInterviewLocked(selectedInterview) ? "cursor-default" : "cursor-pointer"}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleInterviewer(person.id)}
                            disabled={isInterviewLocked(selectedInterview)}
                            className="mt-1 h-4 w-4 accent-primary-600"
                          />

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
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
                              className="shrink-0 text-primary-600"
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
        </RecruitmentModal>
      )}
    </PageLayout>
  );
}
