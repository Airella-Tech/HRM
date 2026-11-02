import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  Video,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  MapPin,
  CheckCircle2,
  CircleAlert,
  CalendarCheck,
  UserRound,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  History,
  Mail,
  Users,
  List,
  CalendarRange,
  ExternalLink,
  RefreshCw,
  Check,
  Save,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";

const ROUNDS = [
  "Technical Interview",
  "HR Interview",
  "Hiring Manager Interview",
  "Final Interview",
];

const STATUSES = ["Scheduled", "Pending", "Completed", "Cancelled"];

const blankForm = {
  applicationId: "",
  vacancyId: "",
  candidate: "",
  email: "",
  vacancy: "",
  round: ROUNDS[0],
  date: "",
  time: "",
  duration: "60",
  interviewers: [],
  interviewerIds: [],
  interviewType: "Online",
  meetingLink: "",
  location: "",
  notes: "",
};

const invitationStyle = {
  Sent: "bg-green-50 text-green-700",
  Failed: "bg-red-50 text-red-700",
  Pending: "bg-amber-50 text-amber-700",
  "Not sent": "bg-slate-100 text-slate-600",
};

const statusStyle = {
  Scheduled: "bg-blue-50 text-blue-700 ring-blue-200",
  Completed: "bg-green-50 text-green-700 ring-green-200",
  Pending: "bg-amber-50 text-amber-700 ring-amber-200",
  Cancelled: "bg-red-50 text-red-700 ring-red-200",
};

const dateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const parseDate = (value) => {
  if (!value) return new Date(NaN);
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDate = (value) =>
  value
    ? parseDate(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not scheduled";

const formatTime = (value) => {
  if (!value) return "";
  const [hours, mins] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, mins, 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const minutes = (value) => {
  if (!value) return 0;
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
};

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const getInterviewType = (item) =>
  item.interviewType || (item.meetingLink ? "Online" : "Physical");

const getStart = (item) => new Date(`${item.date}T${item.time}:00`);

const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const weekStart = (date) => {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(0, 0, 0, 0);
  return result;
};

const calendarDates = (date, view) => {
  if (view === "day") {
    return [new Date(date.getFullYear(), date.getMonth(), date.getDate())];
  }

  const start =
    view === "week"
      ? weekStart(date)
      : weekStart(new Date(date.getFullYear(), date.getMonth(), 1));

  return Array.from({ length: view === "week" ? 7 : 42 }, (_, index) =>
    addDays(start, index),
  );
};

const calendarHeading = (date, view) => {
  if (view === "day") {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  if (view === "week") {
    const start = weekStart(date);
    const end = addDays(start, 6);
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} – ${end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

// Convert a value to a valid positive integer ID, or null.
// Never send tracking codes such as "APP-TRACKING-CODE" as Long IDs.
const toNumericIdOrNull = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const number = Number(value);

  return Number.isSafeInteger(number) && number > 0 ? number : null;
};

const normalizePeople = (item = {}) => {
  if (Array.isArray(item.interviewers)) {
    return item.interviewers
      .map((person) =>
        typeof person === "string"
          ? person
          : person?.fullName || person?.name || person?.employeeName || "",
      )
      .filter(Boolean);
  }

  if (item.interviewerName) {
    return String(item.interviewerName)
      .split(",")
      .map((person) => person.trim())
      .filter(Boolean);
  }

  if (item.interviewer) return [item.interviewer];
  return [];
};

const normalizeInterviewerIds = (item = {}) => {
  const values = Array.isArray(item.interviewerIds)
    ? item.interviewerIds
    : Array.isArray(item.evaluatorIds)
      ? item.evaluatorIds
      : [];

  return values
    .map(toNumericIdOrNull)
    .filter((id) => id !== null)
    .map(String);
};

const normalizeEmployee = (employee) => {
  const id = employee?.id ?? employee?.userId ?? employee?.employeeId;

  const name =
    employee?.fullName ||
    employee?.name ||
    employee?.employeeName ||
    [employee?.firstName, employee?.lastName].filter(Boolean).join(" ");

  if (id === null || id === undefined || !name) return null;

  const recruitmentRoles = Array.isArray(employee?.recruitmentRoles)
    ? employee.recruitmentRoles
    : Array.isArray(employee?.assignedRecruitmentRoles)
      ? employee.assignedRecruitmentRoles
      : Array.isArray(employee?.recruitmentRoleAssignments)
        ? employee.recruitmentRoleAssignments
        : [];

  const hasInterviewerRole = recruitmentRoles.some((role) => {
    const roleName = String(
      role?.roleName || role?.name || role?.displayName || role?.title || "",
    )
      .trim()
      .toLowerCase();

    return (
      roleName === "interviewer" ||
      roleName === "interviewer / evaluator" ||
      roleName.includes("interviewer")
    );
  });

  return {
    id: String(id),
    name: String(name),
    email: employee?.email || employee?.workEmail || "",
    role:
      employee?.designation ||
      employee?.jobTitle ||
      employee?.position ||
      "Employee",
    status: employee?.status || employee?.employmentStatus || "Active",
    hasInterviewerRole,
  };
};

const fromApiInterview = (dto = {}) => {
  const round = dto.interviewRound || dto.round || ROUNDS[0];

  return {
    id: dto.id,
    applicationId:
      toNumericIdOrNull(dto.applicationId ?? dto.candidateId) ?? "",
    candidate: dto.candidateName || dto.candidate || "",
    email: dto.candidateEmail || dto.email || "",
    vacancy: dto.vacancyTitle || dto.vacancy || "",
    vacancyId: toNumericIdOrNull(dto.vacancyId) ?? "",
    round,
    stageOrder: Math.max(ROUNDS.indexOf(round) + 1, 1),
    date: String(dto.interviewDate || dto.date || "").slice(0, 10),
    time: String(dto.interviewTime || dto.time || "").slice(0, 5),
    duration: String(dto.durationMinutes || dto.duration || 60),
    interviewers: normalizePeople(dto),
    interviewerIds: normalizeInterviewerIds(dto),
    interviewType:
      dto.interviewType || (dto.meetingLink ? "Online" : "Physical"),
    meetingLink: dto.meetingLink || "",
    location: dto.location || "",
    notes: dto.notes || "",
    status: dto.status || "Scheduled",
    invitationStatus: dto.invitationStatus || "Not sent",
  };
};

const toApiInterview = (item) => ({
  applicationId: toNumericIdOrNull(item.applicationId ?? item.candidateId),
  candidateName: item.candidate,
  candidateEmail: item.email,
  vacancyId: toNumericIdOrNull(item.vacancyId),
  vacancyTitle: item.vacancy,
  interviewRound: item.round,
  interviewDate: item.date,
  interviewTime: item.time,
  durationMinutes: Number(item.duration),
  interviewerName: (item.interviewers || []).join(", "),
  interviewerIds: (item.interviewerIds || [])
    .map(toNumericIdOrNull)
    .filter((id) => id !== null),
  interviewType: item.interviewType,
  meetingLink: item.interviewType === "Online" ? item.meetingLink : "",
  location: item.interviewType === "Physical" ? item.location : "",
  notes: item.notes || "",
});

const extractList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.data?.content)) return response.data.content;
  if (Array.isArray(response?.interviews)) return response.interviews;
  if (Array.isArray(response?.employees)) return response.employees;
  if (Array.isArray(response?.users)) return response.users;
  if (Array.isArray(response?.data?.employees)) return response.data.employees;
  if (Array.isArray(response?.data?.users)) return response.data.users;
  return [];
};

const sameCandidate = (first, second) => {
  const firstApplicationId = first.applicationId ?? first.candidateId;
  const secondApplicationId = second.applicationId ?? second.candidateId;

  if (
    firstApplicationId != null &&
    secondApplicationId != null &&
    String(firstApplicationId) === String(secondApplicationId)
  ) {
    return true;
  }

  const firstEmail = (first.email || "").trim().toLowerCase();
  const secondEmail = (second.email || "").trim().toLowerCase();
  return firstEmail !== "" && firstEmail === secondEmail;
};

const overlaps = (first, second) => {
  if (
    String(first.id) === String(second.id) ||
    first.date !== second.date ||
    first.status === "Cancelled" ||
    second.status === "Cancelled" ||
    !first.date ||
    !first.time ||
    !second.time
  ) {
    return false;
  }

  const firstIds = normalizeInterviewerIds(first);
  const secondIds = normalizeInterviewerIds(second);

  const firstPeople = firstIds.length
    ? firstIds
    : normalizePeople(first).map((person) => person.trim().toLowerCase());

  const secondPeople = secondIds.length
    ? secondIds
    : normalizePeople(second).map((person) => person.trim().toLowerCase());

  if (!firstPeople.some((person) => secondPeople.includes(person))) {
    return false;
  }

  const firstStart = minutes(first.time);
  const secondStart = minutes(second.time);

  return (
    firstStart < secondStart + Number(second.duration || 60) &&
    secondStart < firstStart + Number(first.duration || 60)
  );
};

export default function RecruitmentInterviews() {
  const navigate = useNavigate();
  const location = useLocation();

  const [interviews, setInterviews] = useState([]);
  const [backendConnected, setBackendConnected] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeeLoadError, setEmployeeLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roundFilter, setRoundFilter] = useState("All");
  const [mode, setMode] = useState("list");
  const [calendarView, setCalendarView] = useState("month");
  const [calendarDate, setCalendarDate] = useState(new Date());

  const [modalOpen, setModalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidateLoadError, setCandidateLoadError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detailsEditMode, setDetailsEditMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [interviewerPickerOpen, setInterviewerPickerOpen] = useState(false);
  const [interviewerSearch, setInterviewerSearch] = useState("");
  const interviewerPickerRef = useRef(null);
  const interviewerSearchRef = useRef(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("All");
  const [history, setHistory] = useState([]);

  const [form, setForm] = useState(blankForm);
  const [formError, setFormError] = useState("");
  const [conflictError, setConflictError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [notice, setNotice] = useState("");

  const today = dateKey();

  const filteredInterviewers = useMemo(() => {
    const query = interviewerSearch.trim().toLowerCase();

    return employees.filter((employee) => {
      const status = String(employee.status || "Active").toLowerCase();
      const active = ![
        "inactive",
        "terminated",
        "disabled",
        "resigned",
        "deleted",
      ].includes(status);

      return (
        employee.hasInterviewerRole &&
        active &&
        [employee.name, employee.email, employee.role]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [employees, interviewerSearch]);

  useEffect(() => {
    let cancelled = false;

    const loadInterviewers = async () => {
      setEmployeesLoading(true);
      setEmployeeLoadError("");

      try {
        const response = await recruitmentApi.getCompanyUsersWithRoles();
        const list = extractList(response)
          .map(normalizeEmployee)
          .filter((employee) => employee?.hasInterviewerRole);

        if (!cancelled) {
          setEmployees(list);

          if (list.length === 0) {
            setEmployeeLoadError(
              'No employees have the "Interviewer" recruitment role assigned. Assign the role in Roles & Permissions and refresh this page.',
            );
          }
        }
      } catch (error) {
        console.error("Unable to load assigned interviewers:", error);

        if (!cancelled) {
          setEmployees([]);
          setEmployeeLoadError(
            error?.message ||
              "Could not load employees with the Interviewer recruitment role. Check the role-assignment API and your permissions.",
          );
        }
      } finally {
        if (!cancelled) setEmployeesLoading(false);
      }
    };

    loadInterviewers();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!interviewerPickerOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (
        interviewerPickerRef.current &&
        !interviewerPickerRef.current.contains(event.target)
      ) {
        setInterviewerPickerOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setInterviewerPickerOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [interviewerPickerOpen]);

  useEffect(() => {
    if (interviewerPickerOpen) interviewerSearchRef.current?.focus();
  }, [interviewerPickerOpen]);

  const loadInterviews = useCallback(async () => {
    setLoading(true);

    try {
      const response = await recruitmentApi.getInterviews();
      setInterviews(extractList(response).map(fromApiInterview));
      setBackendConnected(true);
      setNotice("");
    } catch (error) {
      console.error("Unable to load interviews from backend:", error);
      setInterviews([]);
      setBackendConnected(false);
      setNotice(
        error?.message ||
          "Could not load interview records from the backend. Check that the Recruitment backend is running on port 5008. No sample data is displayed.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  // Open the scheduling form when navigating from Shortlisted Candidates.
  // Supports both a blank schedule and a candidate-specific next-stage schedule.
  const shouldOpenScheduleForm = Boolean(
    location.state?.openScheduleForm || location.state?.openCreateForm,
  );

  const incomingCandidate =
    location.state?.candidate ?? location.state?.candidatePayload ?? null;

  useEffect(() => {
    if (!shouldOpenScheduleForm && !incomingCandidate) return;

    setEditingId(null);
    setForm({
      ...blankForm,
      ...(incomingCandidate
        ? {
            applicationId:
              toNumericIdOrNull(
                incomingCandidate.applicationId ??
                  incomingCandidate.candidateId ??
                  incomingCandidate.id,
              ) ?? "",
            vacancyId: toNumericIdOrNull(incomingCandidate.vacancyId) ?? "",
            candidate:
              incomingCandidate.name || incomingCandidate.candidateName || "",
            email:
              incomingCandidate.email || incomingCandidate.candidateEmail || "",
            vacancy:
              incomingCandidate.vacancy || incomingCandidate.vacancyTitle || "",
            round: ROUNDS.includes(incomingCandidate.round)
              ? incomingCandidate.round
              : ROUNDS[0],
          }
        : {}),
    });

    setFormError("");
    setConflictError("");
    setStatusError("");
    setSelected(null);
    setInterviewerSearch("");
    setInterviewerPickerOpen(false);
    setModalOpen(true);

    // Clear the router state after handling it so refreshing/back navigation
    // does not unexpectedly reopen the form.
    navigate(location.pathname, { replace: true, state: null });
  }, [shouldOpenScheduleForm, incomingCandidate, location.pathname, navigate]);

  const addHistory = (item, action, description) => {
    setHistory((old) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        interviewId: item.id,
        candidate: item.candidate,
        action,
        description,
        dateTime: new Date().toISOString(),
        actor: "Current recruiter",
      },
      ...old,
    ]);
  };

  const filtered = useMemo(
    () =>
      interviews
        .filter((item) => {
          const query = search.toLowerCase().trim();

          const searchable = [
            item.candidate,
            item.email,
            item.vacancy,
            normalizePeople(item).join(" "),
            item.round,
            item.location || "",
            getInterviewType(item),
            item.invitationStatus || "Not sent",
            item.status,
          ]
            .join(" ")
            .toLowerCase();

          return (
            searchable.includes(query) &&
            (statusFilter === "All" || item.status === statusFilter) &&
            (roundFilter === "All" || item.round === roundFilter)
          );
        })
        .sort((first, second) =>
          `${first.date}T${first.time}`.localeCompare(
            `${second.date}T${second.time}`,
          ),
        ),
    [interviews, search, statusFilter, roundFilter],
  );

  const filteredCandidates = useMemo(() => {
    const query = candidateSearch.toLowerCase().trim();
    return candidates.filter((candidate) =>
      [
        candidate.name,
        candidate.email,
        candidate.vacancy,
        candidate.applicationStatus,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [candidates, candidateSearch]);

  useEffect(() => {
    let cancelled = false;
    const loadShortlistedCandidates = async () => {
      setCandidatesLoading(true);
      setCandidateLoadError("");
      try {
        // Use the general applications endpoint and filter backend records locally.
        // The old /applications/shortlisted URL is not mapped by the current backend.
        if (typeof recruitmentApi.getApplications !== "function") {
          throw new Error(
            "recruitmentApi.getApplications() is not configured in services/api.js. Add it using the existing backend applications endpoint.",
          );
        }
        const response = await recruitmentApi.getApplications();
        const list = extractList(response)
          .map((item) => {
            const candidate = item.candidate || {};
            return {
              id: item.applicationId ?? item.application_id ?? item.id ?? null,
              applicationId:
                item.applicationId ?? item.application_id ?? item.id ?? null,
              vacancyId:
                item.vacancyId ?? item.vacancy_id ?? item.vacancy?.id ?? null,
              name:
                item.candidateName ??
                item.candidate_name ??
                item.name ??
                item.fullName ??
                candidate.name ??
                candidate.fullName ??
                "",
              email:
                item.candidateEmail ??
                item.candidate_email ??
                item.email ??
                candidate.email ??
                "",
              vacancy:
                item.vacancyTitle ??
                item.vacancy_title ??
                item.jobTitle ??
                item.job_title ??
                item.vacancy?.title ??
                "",
              applicationStatus:
                item.applicationStatus ??
                item.application_status ??
                item.status ??
                "",
            };
          })
          .filter(
            (candidate) =>
              String(candidate.applicationStatus)
                .trim()
                .toLowerCase()
                .replace(/[_-]+/g, " ") === "shortlisted",
          );
        if (!cancelled) setCandidates(list);
      } catch (error) {
        console.error("Unable to load shortlisted candidates:", error);
        if (!cancelled) {
          setCandidates([]);
          setCandidateLoadError(
            error?.message ||
              "Could not load shortlisted candidates from the backend.",
          );
        }
      } finally {
        if (!cancelled) setCandidatesLoading(false);
      }
    };
    loadShortlistedCandidates();
    return () => {
      cancelled = true;
    };
  }, []);

  const dates = useMemo(
    () => calendarDates(calendarDate, calendarView),
    [calendarDate, calendarView],
  );

  const stats = {
    total: interviews.length,
    scheduled: interviews.filter((item) => item.status === "Scheduled").length,
    completed: interviews.filter((item) => item.status === "Completed").length,
    pending: interviews.filter((item) => item.status === "Pending").length,
  };

  const openCreate = (date = "") => {
    setEditingId(null);
    setForm({ ...blankForm, date });
    setFormError("");
    setConflictError("");
    setSelected(null);
    setInterviewerSearch("");
    setInterviewerPickerOpen(false);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    if (item?.id == null) {
      setNotice("Cannot edit this interview because its ID is missing.");
      return;
    }

    const people = normalizePeople(item);
    const existingIds = normalizeInterviewerIds(item);

    setForm({
      ...blankForm,
      applicationId:
        toNumericIdOrNull(item.applicationId ?? item.candidateId) ?? "",
      vacancyId: toNumericIdOrNull(item.vacancyId) ?? "",
      candidate: item.candidate || "",
      email: item.email || "",
      vacancy: item.vacancy || "",
      round: item.round || ROUNDS[0],
      date: item.date || "",
      time: item.time || "",
      duration: String(item.duration || "60"),
      interviewers: people,
      interviewerIds: existingIds.length
        ? existingIds
        : people
            .map(
              (name) =>
                employees.find(
                  (employee) =>
                    employee.name.toLowerCase() === name.toLowerCase(),
                )?.id,
            )
            .filter(Boolean),
      interviewType: getInterviewType(item),
      meetingLink: item.meetingLink || "",
      location: item.location || "",
      notes: item.notes || "",
    });

    setSelected({ ...item });
    setEditingId(item.id);
    setDetailsEditMode(true);
    setFormError("");
    setConflictError("");
    setStatusError("");
    setNotice("");
    setInterviewerSearch("");
    setInterviewerPickerOpen(false);

    // Editing always happens in Interview Details, never in the schedule modal.
    setModalOpen(false);
  };

  const closeForm = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm({ ...blankForm });
    setFormError("");
    setConflictError("");
    setInterviewerSearch("");
    setInterviewerPickerOpen(false);
  };

  const changeForm = (event) => {
    const { name, value } = event.target;

    if (name === "interviewType") {
      setForm((old) => ({
        ...old,
        interviewType: value,
        meetingLink: "",
        location: "",
      }));
    } else {
      setForm((old) => ({ ...old, [name]: value }));
    }

    setConflictError("");
    setFormError("");
  };

  const toggleInterviewer = (employee) => {
    const id = String(employee.id);
    const name = employee.name;

    setForm((old) => {
      const alreadySelected = old.interviewerIds.some(
        (selectedId) => String(selectedId) === id,
      );

      return {
        ...old,
        interviewers: alreadySelected
          ? old.interviewers.filter((person) => person !== name)
          : [...old.interviewers.filter((person) => person !== name), name],
        interviewerIds: alreadySelected
          ? old.interviewerIds.filter((selectedId) => String(selectedId) !== id)
          : [
              ...old.interviewerIds.filter(
                (selectedId) => String(selectedId) !== id,
              ),
              id,
            ],
      };
    });

    setConflictError("");
    setFormError("");
  };

  const removeInterviewer = (person) => {
    const employee = employees.find((entry) => entry.name === person);

    setForm((old) => ({
      ...old,
      interviewers: old.interviewers.filter((name) => name !== person),
      interviewerIds: employee
        ? old.interviewerIds.filter((id) => String(id) !== String(employee.id))
        : old.interviewerIds,
    }));

    setConflictError("");
    setFormError("");
  };

  const clearInterviewers = () => {
    setForm((old) => ({ ...old, interviewers: [], interviewerIds: [] }));
    setConflictError("");
    setFormError("");
  };

  const validateWorkflow = (item) => {
    const currentIndex = ROUNDS.indexOf(item.round);
    if (currentIndex <= 0) return "";

    const previousRound = ROUNDS[currentIndex - 1];

    const previousInterview = interviews.find(
      (other) =>
        String(other.id) !== String(editingId) &&
        sameCandidate(item, other) &&
        ((other.vacancyId != null &&
          item.vacancyId != null &&
          String(other.vacancyId) === String(item.vacancyId)) ||
          (other.vacancy || "").trim().toLowerCase() ===
            (item.vacancy || "").trim().toLowerCase()) &&
        other.round === previousRound &&
        other.status !== "Cancelled",
    );

    if (!previousInterview) {
      return `Schedule and complete the ${previousRound} before scheduling the ${item.round}.`;
    }

    if (previousInterview.status !== "Completed") {
      return `The ${previousRound} must be marked Completed before scheduling the ${item.round}.`;
    }

    // If the backend exposes evaluation details, require a submitted passing recommendation.
    const evaluationStatus = String(
      previousInterview.evaluationStatus ??
        previousInterview.evaluation?.status ??
        "",
    ).toUpperCase();
    const recommendation = String(
      previousInterview.recommendation ??
        previousInterview.evaluation?.recommendation ??
        "",
    ).toUpperCase();
    if (
      evaluationStatus &&
      !["SUBMITTED", "SUBMIT", "COMPLETED"].includes(evaluationStatus)
    ) {
      return `Submit the ${previousRound} evaluation before scheduling the ${item.round}.`;
    }
    if (recommendation && !["HIRE", "STRONG_HIRE"].includes(recommendation)) {
      return `The ${previousRound} evaluation must recommend HIRE or STRONG_HIRE before scheduling the ${item.round}.`;
    }

    return "";
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError("");
    setConflictError("");
    setNotice("");

    if (
      !form.candidate.trim() ||
      !form.email.trim() ||
      !form.vacancy.trim() ||
      !form.date ||
      !form.time ||
      form.interviewers.length === 0
    ) {
      setFormError(
        "Complete all required fields and assign at least one interviewer.",
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError("Enter a valid candidate email address.");
      return;
    }

    const scheduledAt = new Date(`${form.date}T${form.time}:00`);

    if (Number.isNaN(scheduledAt.getTime())) {
      setFormError("Enter a valid date and time.");
      return;
    }

    if (scheduledAt.getTime() < Date.now()) {
      setFormError("Choose a future interview date and time.");
      return;
    }

    if (
      !Number.isFinite(Number(form.duration)) ||
      Number(form.duration) <= 0 ||
      Number(form.duration) > 480
    ) {
      setFormError("Interview duration must be between 1 and 480 minutes.");
      return;
    }

    if (!ROUNDS.includes(form.round)) {
      setFormError("Choose a valid interview stage.");
      return;
    }

    if (form.interviewType === "Online") {
      try {
        const url = new URL(form.meetingLink.trim());

        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("Invalid URL protocol");
        }
      } catch {
        setFormError(
          "Enter a valid meeting URL starting with http:// or https://.",
        );
        return;
      }
    }

    if (form.interviewType === "Physical" && !form.location.trim()) {
      setFormError("Enter the physical interview location.");
      return;
    }

    if (backendConnected && form.interviewerIds.length === 0) {
      setFormError(
        "Select at least one employee with a numeric ID. Backend interviewer assignments require employee IDs.",
      );
      return;
    }

    const oldItem = interviews.find(
      (item) => String(item.id) === String(editingId),
    );

    if (!toNumericIdOrNull(form.applicationId)) {
      setFormError(
        "The selected application has no valid ID. Please select the candidate again from the shortlisted applications.",
      );
      return;
    }

    const item = {
      ...(oldItem || {}),
      ...form,
      id: editingId ?? null,
      candidate: form.candidate.trim(),
      email: form.email.trim(),
      vacancy: form.vacancy.trim(),
      applicationId: toNumericIdOrNull(form.applicationId) ?? "",
      vacancyId: toNumericIdOrNull(form.vacancyId) ?? "",
      interviewers: [...form.interviewers],
      interviewerIds: [...form.interviewerIds],
      duration: String(form.duration),
      stageOrder: ROUNDS.indexOf(form.round) + 1,
      meetingLink:
        form.interviewType === "Online" ? form.meetingLink.trim() : "",
      location: form.interviewType === "Physical" ? form.location.trim() : "",
      status: oldItem?.status || "Scheduled",
      invitationStatus: oldItem?.invitationStatus || "Not sent",
    };

    const workflowError = validateWorkflow(item);

    if (workflowError) {
      setFormError(workflowError);
      return;
    }

    const conflict = interviews.find((other) => overlaps(item, other));

    if (conflict) {
      const shared = normalizePeople(item).filter((person) =>
        normalizePeople(conflict).some(
          (otherPerson) => otherPerson.toLowerCase() === person.toLowerCase(),
        ),
      );

      setConflictError(
        `Scheduling conflict: ${shared.join(", ")} ${
          shared.length === 1 ? "is" : "are"
        } already assigned to ${conflict.candidate} on ${formatDate(
          conflict.date,
        )} from ${formatTime(conflict.time)} for ${
          conflict.duration
        } minutes. Choose another time or interviewer.`,
      );
      return;
    }

    if (!backendConnected) {
      setFormError(
        "The backend is not connected. Interview changes cannot be saved. Please restore the backend connection and try again.",
      );
      return;
    }

    setSaving(true);

    try {
      let savedItem = item;

      {
        const payload = toApiInterview(item);

        let response;
        if (editingId !== null) {
          response = await recruitmentApi.updateInterview(editingId, payload);
        } else {
          response = await recruitmentApi.createInterview(payload);
        }

        // The API may return an ApiResponse wrapper rather than the interview
        // DTO directly. Unwrap it before mapping the saved interview.
        const dto = response?.data?.data ?? response?.data ?? response;
        const responseHasInterview =
          dto && typeof dto === "object" && dto.id != null;

        // Start with the submitted item so response wrappers or DTOs that omit
        // optional fields cannot clear existing interview details.
        savedItem = {
          ...item,
          ...(responseHasInterview ? fromApiInterview(dto) : {}),
          id: responseHasInterview ? dto.id : (editingId ?? item.id),
        };

        // Keep the selected UI assignments if the response DTO omits them.
        if (!normalizePeople(savedItem).length) {
          savedItem.interviewers = item.interviewers;
        }

        if (!normalizeInterviewerIds(savedItem).length) {
          savedItem.interviewerIds = item.interviewerIds;
        }

        savedItem.status = savedItem.status || item.status;
        savedItem.invitationStatus =
          savedItem.invitationStatus || item.invitationStatus;
      }

      if (editingId !== null) {
        setInterviews((old) =>
          old.map((existing) =>
            String(existing.id) === String(editingId) ? savedItem : existing,
          ),
        );

        const rescheduled =
          oldItem?.date !== savedItem.date ||
          oldItem?.time !== savedItem.time ||
          JSON.stringify(normalizePeople(oldItem || {})) !==
            JSON.stringify(normalizePeople(savedItem));

        addHistory(
          savedItem,
          rescheduled ? "Rescheduled" : "Updated",
          rescheduled
            ? `Interview rescheduled to ${formatDate(
                savedItem.date,
              )} at ${formatTime(savedItem.time)}. Interviewers: ${normalizePeople(
                savedItem,
              ).join(", ")}.`
            : "Interview details were updated.",
        );
      } else {
        setInterviews((old) => [...old, savedItem]);

        addHistory(
          savedItem,
          "Scheduled",
          `${savedItem.round} scheduled for ${formatDate(
            savedItem.date,
          )} at ${formatTime(savedItem.time)} with ${normalizePeople(
            savedItem,
          ).join(", ")}.`,
        );
      }

      if (editingId != null) {
        // Save the changes and close the edit/details panel. Do not return
        // to the read-only Interview Details view or open the schedule modal.
        setSelected(null);
        setDetailsEditMode(false);
        setNotice("Interview details updated successfully.");

        setEditingId(null);
        setModalOpen(false);
        setForm({ ...blankForm });
        setFormError("");
        setConflictError("");
        setStatusError("");
        setInterviewerSearch("");
        setInterviewerPickerOpen(false);
      } else {
        // Only creating a new interview closes the scheduling form.
        setNotice("Interview scheduled successfully.");
        closeForm();
      }
    } catch (error) {
      console.error("Unable to save interview:", error);
      setFormError(
        error?.response?.data?.message ||
          error?.message ||
          "Could not save the interview. Check the backend and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id, status) => {
    const item = interviews.find(
      (interview) => String(interview.id) === String(id),
    );

    if (!item) return;
    if (status === item.status) {
      setStatusError("");
      return;
    }

    if (status === "Completed" && getStart(item).getTime() > Date.now()) {
      setStatusError(
        "You cannot mark this interview as Completed before its scheduled date and time.",
      );
      return;
    }

    if (status === "Completed") {
      const previousIndex = ROUNDS.indexOf(item.round);
      if (previousIndex > 0) {
        const previousRound = ROUNDS[previousIndex - 1];
        const previousInterview = interviews.find(
          (other) =>
            String(other.id) !== String(item.id) &&
            sameCandidate(item, other) &&
            (other.vacancy || "").trim().toLowerCase() ===
              (item.vacancy || "").trim().toLowerCase() &&
            other.round === previousRound &&
            other.status !== "Cancelled",
        );
        if (!previousInterview || previousInterview.status !== "Completed") {
          setStatusError(
            `Complete the ${previousRound} before completing the ${item.round}.`,
          );
          return;
        }
      }
    }

    try {
      // Use the dedicated PATCH endpoint so changing status cannot overwrite
      // candidate, vacancy, date, interviewer, or other interview details.
      const response = await recruitmentApi.updateInterviewStatus(id, status);
      const dto = response?.data?.data ?? response?.data ?? response;
      const mapped = dto && typeof dto === "object" && dto.id != null
        ? fromApiInterview(dto)
        : {};

      // Merge the server result with the existing item to preserve fields that
      // may not be included in the status endpoint's response.
      const updated = {
        ...item,
        ...mapped,
        id: item.id,
        status: mapped.status || dto?.status || status,
      };

      setInterviews((current) =>
        current.map((interview) =>
          String(interview.id) === String(id)
            ? { ...interview, ...updated }
            : interview,
        ),
      );
      setSelected((current) =>
        current && String(current.id) === String(id)
          ? { ...current, ...updated }
          : current,
      );
      setStatusError("");
      setNotice("Interview status updated successfully.");
      addHistory(
        updated,
        status === "Cancelled" ? "Cancelled" : "Status changed",
        `Interview status changed from ${item.status} to ${updated.status}.`,
      );
    } catch (error) {
      console.error("Unable to update interview status:", error);
      setStatusError(
        error?.message ||
          "Could not update interview status on the backend. Please try again.",
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (!backendConnected || deleteTarget.id == null) {
        throw new Error(
          "The backend is not connected or this interview has no backend ID. Nothing was deleted.",
        );
      }
      await recruitmentApi.deleteInterview(deleteTarget.id);
      addHistory(
        deleteTarget,
        "Deleted",
        "Interview was deleted from the backend.",
      );
      setInterviews((old) =>
        old.filter((item) => String(item.id) !== String(deleteTarget.id)),
      );
      setSelected(null);
      setDeleteTarget(null);
      setNotice("Interview deleted from the backend.");
    } catch (error) {
      console.error("Unable to delete interview:", error);
      setNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Could not delete the interview from the backend.",
      );
    }
  };

  const moveCalendar = (direction) => {
    setCalendarDate((old) => {
      const next = new Date(old);

      if (calendarView === "day") {
        next.setDate(next.getDate() + direction);
      } else if (calendarView === "week") {
        next.setDate(next.getDate() + direction * 7);
      } else {
        next.setMonth(next.getMonth() + direction);
      }

      return next;
    });
  };

  const statCards = [
    [
      "Total Interviews",
      stats.total,
      CalendarDays,
      "bg-indigo-50 text-indigo-600",
    ],
    ["Scheduled", stats.scheduled, CalendarCheck, "bg-blue-50 text-blue-600"],
    ["Completed", stats.completed, CheckCircle2, "bg-green-50 text-green-600"],
    ["Pending", stats.pending, Clock3, "bg-amber-50 text-amber-600"],
  ];

  return (
    <PageLayout
      role="recruiter"
      activePage="Interviews"
      title="Interview Scheduling"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate("/recruiter/interview-emails")}
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            <Mail className="mr-2 inline" size={16} />
            Interview Emails
          </button>
          <button
            onClick={() => navigate("/recruitment/shortlisted-candidates")}
            className="rounded-xl bg-indigo-600 px-3 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <CalendarCheck className="mr-2 inline" size={16} />
            Schedule Interview
          </button>
        </div>
      }
    >
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        {notice && (
          <div
            role="status"
            className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
          >
            <span>{notice}</span>
            <button onClick={() => setNotice("")} aria-label="Dismiss notice">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            {loading
              ? "Loading interviews..."
              : backendConnected
                ? "Connected to Recruitment backend"
                : "Backend unavailable — no sample data shown"}
          </div>
          <button
            onClick={loadInterviews}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(([label, value, Icon, style]) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-800">
                    {value}
                  </p>
                </div>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${style}`}
                >
                  <Icon size={23} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Interview Management
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage the four-stage interview workflow, interviewers,
                schedules, and invitations.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("list")}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold ${mode === "list" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}
              >
                <List size={17} /> List
              </button>
              <button
                onClick={() => setMode("calendar")}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold ${mode === "calendar" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}
              >
                <CalendarRange size={17} /> Calendar
              </button>
            </div>
          </div>

          {mode === "calendar" && (
            <div className="p-4 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => moveCalendar(-1)}
                    aria-label="Previous period"
                    className="rounded-lg border p-2.5"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setCalendarDate(new Date())}
                    className="rounded-lg border px-4 py-2.5 text-sm font-semibold"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => moveCalendar(1)}
                    aria-label="Next period"
                    className="rounded-lg border p-2.5"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <h3 className="font-bold text-slate-800">
                    {calendarHeading(calendarDate, calendarView)}
                  </h3>
                </div>
                <div className="flex gap-2">
                  {["day", "week", "month"].map((view) => (
                    <button
                      key={view}
                      onClick={() => setCalendarView(view)}
                      className={`rounded-lg border px-4 py-2 text-sm font-semibold capitalize ${calendarView === view ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 text-slate-600"}`}
                    >
                      {view}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={`grid gap-px overflow-hidden rounded-xl border bg-slate-200 ${calendarView === "day" ? "grid-cols-1" : calendarView === "week" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-7" : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7"}`}
              >
                {dates.map((date) => {
                  const key = dateKey(date);
                  const dayItems = filtered.filter((item) => item.date === key);
                  const currentMonth =
                    date.getMonth() === calendarDate.getMonth();

                  return (
                    <div
                      key={key}
                      className={`min-h-36 bg-white p-2 ${calendarView === "month" && !currentMonth ? "bg-slate-50" : ""}`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] uppercase text-slate-400">
                            {date.toLocaleDateString("en-US", {
                              weekday: "short",
                            })}
                          </p>
                          <p
                            className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${key === today ? "bg-indigo-600 text-white" : "text-slate-800"}`}
                          >
                            {date.getDate()}
                          </p>
                        </div>
                        <button
                          onClick={() => openCreate(key)}
                          aria-label={`Schedule on ${formatDate(key)}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {dayItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setSelected(item)}
                            className="block w-full rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-2 text-left text-indigo-800"
                          >
                            <span className="block truncate text-xs font-bold">
                              {formatTime(item.time)} {item.candidate}
                            </span>
                            <span className="mt-1 block truncate text-[11px]">
                              {item.round}
                            </span>
                          </button>
                        ))}
                        {!dayItems.length && (
                          <p className="px-1 py-2 text-xs text-slate-300">
                            No interviews
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {mode === "list" && (
            <>
              <div className="border-b border-slate-200 p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div>
                    <h3 className="font-bold text-slate-800">Interview List</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Search, filter, edit, reschedule, and manage interviews.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex">
                    <div className="relative">
                      <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search interviews..."
                        className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm lg:w-56"
                      />
                    </div>
                    <div className="relative">
                      <Filter
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <select
                        value={statusFilter}
                        onChange={(event) =>
                          setStatusFilter(event.target.value)
                        }
                        className="w-full rounded-xl border bg-white py-2.5 pl-9 pr-4 text-sm"
                      >
                        <option>All</option>
                        {STATUSES.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    <select
                      value={roundFilter}
                      onChange={(event) => setRoundFilter(event.target.value)}
                      className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"
                    >
                      <option>All</option>
                      {ROUNDS.map((round) => (
                        <option key={round}>{round}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1150px] text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Candidate",
                        "Vacancy / Round",
                        "Date & Time",
                        "Interviewers",
                        "Mode",
                        "Invitation",
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
                    {filtered.map((item) => {
                      const online = getInterviewType(item) === "Online";
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                                {initials(item.candidate)}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {item.candidate}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {item.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-800">
                              {item.vacancy}
                            </p>
                            <span className="mt-1 inline-flex rounded-md bg-violet-50 px-2 py-1 text-xs text-violet-700">
                              {item.round}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="whitespace-nowrap text-sm font-medium">
                              {formatDate(item.date)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatTime(item.time)} · {item.duration} min
                            </p>
                          </td>
                          <td className="max-w-64 px-5 py-4">
                            <div className="flex items-start gap-2 text-sm text-slate-700">
                              <Users
                                size={16}
                                className="mt-0.5 shrink-0 text-slate-400"
                              />
                              <span>{normalizePeople(item).join(", ")}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${online ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"}`}
                            >
                              {online ? (
                                <Video size={14} />
                              ) : (
                                <MapPin size={14} />
                              )}
                              {getInterviewType(item)}
                            </span>
                            {online && item.meetingLink ? (
                              <a
                                href={item.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 flex items-center gap-1 text-xs text-indigo-600"
                              >
                                <LinkIcon size={13} /> Open meeting link
                              </a>
                            ) : (
                              <p className="mt-2 max-w-40 text-xs text-slate-500">
                                {item.location || "Not provided"}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${invitationStyle[item.invitationStatus || "Not sent"] || invitationStyle["Not sent"]}`}
                            >
                              {item.invitationStatus || "Not sent"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${statusStyle[item.status] || "bg-slate-100 text-slate-600 ring-slate-200"}`}
                            >
                              {item.status}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1">
                              {/* View interview details */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelected(item);
                                  setDetailsEditMode(false);
                                  setEditingId(null);
                                  setStatusError("");
                                  setFormError("");
                                  setConflictError("");
                                }}
                                title="View details"
                                aria-label={`View details for ${item.candidate}`}
                                className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                              >
                                <MoreHorizontal size={18} />
                              </button>

                              {/* Edit or reschedule the interview */}
                              <button
                                type="button"
                                onClick={() => openEdit(item)}
                                title="Edit / Reschedule"
                                aria-label={`Edit or reschedule interview for ${item.candidate}`}
                                className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                              >
                                <Pencil size={17} />
                              </button>

                              {/* Delete the interview */}
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(item)}
                                title="Delete"
                                aria-label={`Delete interview for ${item.candidate}`}
                                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!filtered.length && (
                      <tr>
                        <td colSpan={8} className="px-5 py-14 text-center">
                          <CalendarDays
                            size={34}
                            className="mx-auto mb-3 text-slate-300"
                          />
                          <p className="font-semibold text-slate-700">
                            No interviews found
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Try changing your search or filters.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-2 border-t px-5 py-4 text-sm text-slate-500 sm:flex-row sm:justify-between">
                <span>
                  Showing {filtered.length} of {interviews.length} interviews
                </span>
                <span>
                  {backendConnected
                    ? "Backend interview records"
                    : "Backend unavailable — no sample data shown"}
                </span>
              </div>
            </>
          )}
        </section>

        {/* Backend shortlisted-candidate picker */}
        {pickerOpen && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/50 p-4">
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b p-5">
                <div>
                  <h2 className="text-xl font-bold">Shortlisted Candidates</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Select a candidate to schedule an interview.
                  </p>
                </div>
                <button onClick={() => setPickerOpen(false)} aria-label="Close">
                  <X />
                </button>
              </div>
              <div className="border-b p-5">
                <input
                  value={candidateSearch}
                  onChange={(event) => setCandidateSearch(event.target.value)}
                  placeholder="Search name, email, or vacancy..."
                  className="w-full rounded-xl border px-4 py-2.5 sm:max-w-md"
                />
              </div>
              <div className="max-h-[55vh] overflow-auto">
                {candidatesLoading ? (
                  <p className="p-8 text-center text-sm text-slate-500">
                    Loading shortlisted candidates from backend...
                  </p>
                ) : candidateLoadError ? (
                  <p
                    role="alert"
                    className="p-8 text-center text-sm text-red-600"
                  >
                    {candidateLoadError}
                  </p>
                ) : filteredCandidates.length === 0 ? (
                  <p className="p-8 text-center text-sm text-slate-500">
                    No shortlisted candidates returned by the backend.
                  </p>
                ) : (
                  <table className="w-full min-w-[700px] text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        {[
                          "Candidate",
                          "Email",
                          "Vacancy",
                          "Status",
                          "Action",
                        ].map((heading) => (
                          <th
                            key={heading}
                            className="px-5 py-4 text-xs uppercase text-slate-500"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredCandidates.map((candidate) => (
                        <tr key={candidate.id}>
                          <td className="px-5 py-4 font-semibold">
                            {candidate.name}
                          </td>
                          <td className="px-5 py-4 text-sm">
                            {candidate.email}
                          </td>
                          <td className="px-5 py-4">{candidate.vacancy}</td>
                          <td className="px-5 py-4">
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">
                              {candidate.applicationStatus}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => {
                                setForm({
                                  ...blankForm,
                                  applicationId:
                                    toNumericIdOrNull(
                                      candidate.applicationId,
                                    ) ?? "",
                                  vacancyId:
                                    toNumericIdOrNull(candidate.vacancyId) ??
                                    "",
                                  candidate: candidate.name,
                                  email: candidate.email,
                                  vacancy: candidate.vacancy,
                                });
                                setEditingId(null);
                                setPickerOpen(false);
                                setInterviewerSearch("");
                                setInterviewerPickerOpen(false);
                                setModalOpen(true);
                              }}
                              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"
                            >
                              Schedule Interview
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="border-t bg-slate-50 p-4 text-right">
                <button
                  onClick={() => setPickerOpen(false)}
                  className="rounded-xl border bg-white px-4 py-2 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create / edit / reschedule form */}
        {modalOpen && editingId == null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeForm();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="interview-form-title"
              className="my-auto w-full max-w-3xl overflow-visible rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b p-5 sm:px-6">
                <div>
                  <h2 id="interview-form-title" className="text-xl font-bold">
                    {editingId !== null
                      ? "Edit / Reschedule Interview"
                      : "Schedule Interview"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Assign the interview stage and one or more interviewers.
                  </p>
                </div>
                <button onClick={closeForm} aria-label="Close form">
                  <X />
                </button>
              </div>

              <form onSubmit={submit}>
                <div className="grid max-h-[68vh] grid-cols-1 gap-5 overflow-y-auto p-5 sm:grid-cols-2 sm:p-6">
                  <label className="text-sm font-medium text-slate-700">
                    Candidate name *
                    <input
                      name="candidate"
                      value={form.candidate}
                      onChange={changeForm}
                      required
                      className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Candidate email *
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={changeForm}
                      required
                      className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Job vacancy *
                    <input
                      name="vacancy"
                      value={form.vacancy}
                      onChange={changeForm}
                      required
                      className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Interview stage *
                    <select
                      name="round"
                      value={form.round}
                      onChange={changeForm}
                      className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 font-normal"
                    >
                      {ROUNDS.map((round) => (
                        <option key={round}>{round}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Date *
                    <input
                      name="date"
                      type="date"
                      min={today}
                      value={form.date}
                      onChange={changeForm}
                      required
                      className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Start time *
                    <input
                      name="time"
                      type="time"
                      value={form.time}
                      onChange={changeForm}
                      required
                      className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Duration *
                    <select
                      name="duration"
                      value={form.duration}
                      onChange={changeForm}
                      className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 font-normal"
                    >
                      {["30", "45", "60", "90", "120"].map((value) => (
                        <option key={value} value={value}>
                          {value} minutes
                        </option>
                      ))}
                    </select>
                  </label>

                  <div
                    className="relative sm:col-span-2"
                    ref={interviewerPickerRef}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label
                        id="interviewer-picker-label"
                        className="text-sm font-medium text-slate-700"
                      >
                        Assigned interviewers *
                      </label>
                      <span className="text-xs text-slate-500">
                        Select one or more employees
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-labelledby="interviewer-picker-label"
                      aria-haspopup="listbox"
                      aria-expanded={interviewerPickerOpen}
                      onClick={() => {
                        setInterviewerPickerOpen((open) => !open);
                        setInterviewerSearch("");
                      }}
                      className={`flex min-h-[50px] w-full flex-wrap items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-left transition ${interviewerPickerOpen ? "border-indigo-500 ring-2 ring-indigo-100" : "border-slate-300 hover:border-slate-400"}`}
                    >
                      {form.interviewers.length ? (
                        <div className="flex flex-1 flex-wrap items-center gap-2">
                          {form.interviewers.map((person) => (
                            <span
                              key={person}
                              className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 py-1 pl-2.5 pr-1.5 text-sm font-medium text-indigo-700"
                            >
                              <UserRound size={14} className="shrink-0" />
                              <span className="truncate">{person}</span>
                              <span
                                role="button"
                                tabIndex={0}
                                aria-label={`Remove ${person}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removeInterviewer(person);
                                }}
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    removeInterviewer(person);
                                  }
                                }}
                                className="ml-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-indigo-500 hover:bg-indigo-200 hover:text-indigo-800"
                              >
                                <X size={13} />
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="flex-1 text-sm text-slate-400">
                          Search assigned interviewers...
                        </span>
                      )}
                      <ChevronRight
                        size={18}
                        className={`ml-auto shrink-0 text-slate-400 transition-transform ${interviewerPickerOpen ? "rotate-90" : ""}`}
                      />
                    </button>

                    {interviewerPickerOpen && (
                      <div className="absolute left-0 right-0 top-full z-[70] mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="border-b border-slate-100 p-3">
                          <div className="relative">
                            <Search
                              size={17}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                              ref={interviewerSearchRef}
                              value={interviewerSearch}
                              onChange={(event) =>
                                setInterviewerSearch(event.target.value)
                              }
                              onKeyDown={(event) =>
                                event.key === "Escape" &&
                                setInterviewerPickerOpen(false)
                              }
                              placeholder="Search employees..."
                              aria-label="Search employees"
                              className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            />
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="text-xs font-medium text-slate-500">
                              {form.interviewers.length} selected
                            </span>
                            {form.interviewers.length > 0 && (
                              <button
                                type="button"
                                onClick={clearInterviewers}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                              >
                                Clear selection
                              </button>
                            )}
                          </div>
                        </div>

                        <div
                          role="listbox"
                          aria-multiselectable="true"
                          aria-label="Available interviewers"
                          className="max-h-56 overflow-y-auto p-1.5"
                        >
                          {employeesLoading && (
                            <div className="px-4 py-8 text-center text-sm text-slate-500">
                              Loading employees...
                            </div>
                          )}
                          {!employeesLoading &&
                            employeeLoadError &&
                            employees.length === 0 && (
                              <div className="px-4 py-6 text-center">
                                <p className="text-sm font-medium text-amber-700">
                                  Unable to load employees
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {employeeLoadError}
                                </p>
                              </div>
                            )}
                          {filteredInterviewers.map((person) => {
                            const isSelected = form.interviewerIds.some(
                              (id) => String(id) === String(person.id),
                            );

                            return (
                              <button
                                key={person.id}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => toggleInterviewer(person)}
                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${isSelected ? "bg-indigo-50 text-indigo-800" : "text-slate-700 hover:bg-slate-50"}`}
                              >
                                <span
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isSelected ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}
                                >
                                  {initials(person.name)}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium">
                                    {person.name}
                                  </span>
                                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                                    {[person.email, person.role]
                                      .filter(Boolean)
                                      .join(" · ") || "Employee"}
                                  </span>
                                </span>
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${isSelected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-transparent"}`}
                                >
                                  <Check size={13} strokeWidth={3} />
                                </span>
                              </button>
                            );
                          })}
                          {!employeesLoading &&
                            !employeeLoadError &&
                            filteredInterviewers.length === 0 && (
                              <div className="px-4 py-8 text-center">
                                <Users
                                  size={25}
                                  className="mx-auto mb-2 text-slate-300"
                                />
                                <p className="text-sm font-medium text-slate-700">
                                  No employees found
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Try another name.
                                </p>
                              </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-3 py-2.5">
                          <span className="text-xs text-slate-500">
                            {form.interviewers.length
                              ? `${form.interviewers.length} interviewer${form.interviewers.length === 1 ? "" : "s"} assigned`
                              : "Select at least one interviewer"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setInterviewerPickerOpen(false)}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      The frontend checks overlapping bookings for each selected
                      interviewer. Backend validation is still needed to prevent
                      conflicts across different browsers.
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="mb-2 text-sm font-medium">Interview type *</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          changeForm({
                            target: { name: "interviewType", value: "Online" },
                          })
                        }
                        className={`rounded-xl border p-3 text-sm font-semibold ${form.interviewType === "Online" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200"}`}
                      >
                        <Video className="mr-2 inline" size={17} />
                        Online
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          changeForm({
                            target: {
                              name: "interviewType",
                              value: "Physical",
                            },
                          })
                        }
                        className={`rounded-xl border p-3 text-sm font-semibold ${form.interviewType === "Physical" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200"}`}
                      >
                        <MapPin className="mr-2 inline" size={17} />
                        Physical
                      </button>
                    </div>
                  </div>

                  {form.interviewType === "Online" ? (
                    <label className="sm:col-span-2 text-sm font-medium text-slate-700">
                      Meeting URL *
                      <input
                        name="meetingLink"
                        type="url"
                        value={form.meetingLink}
                        onChange={changeForm}
                        required
                        placeholder="https://meet.google.com/..."
                        className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal"
                      />
                      <span className="mt-1 block text-xs font-normal text-slate-500">
                        Saving a meeting URL does not automatically email the
                        candidate.
                      </span>
                    </label>
                  ) : (
                    <label className="sm:col-span-2 text-sm font-medium text-slate-700">
                      Physical location *
                      <input
                        name="location"
                        value={form.location}
                        onChange={changeForm}
                        required
                        placeholder="Office / meeting room"
                        className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal"
                      />
                    </label>
                  )}

                  <label className="sm:col-span-2 text-sm font-medium text-slate-700">
                    Notes
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={changeForm}
                      rows={3}
                      className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal"
                      placeholder="Optional interview notes"
                    />
                  </label>

                  {conflictError && (
                    <div
                      role="alert"
                      className="sm:col-span-2 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                    >
                      <CircleAlert size={18} className="shrink-0" />
                      {conflictError}
                    </div>
                  )}
                  {formError && (
                    <div
                      role="alert"
                      className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                      {formError}
                    </div>
                  )}
                </div>

                <div className="flex flex-col-reverse gap-3 border-t bg-slate-50 p-4 sm:flex-row sm:justify-end sm:px-6">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="rounded-xl border bg-white px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CalendarCheck className="mr-2 inline" size={17} />
                    {saving
                      ? "Saving..."
                      : editingId !== null
                        ? "Save Changes"
                        : "Schedule Interview"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Interview details */}
        {selected && (
          <div
            className="fixed inset-0 z-[52] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelected(null);
                setStatusError("");
                setDetailsEditMode(false);
                setEditingId(null);
                setFormError("");
                setConflictError("");
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b p-5">
                <div>
                  <h2 className="text-xl font-bold">Interview Details</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selected.round}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelected(null);
                    setStatusError("");
                    setDetailsEditMode(false);
                    setEditingId(null);
                    setFormError("");
                    setConflictError("");
                  }}
                  aria-label="Close details"
                >
                  <X />
                </button>
              </div>

              <div className="max-h-[72vh] space-y-5 overflow-y-auto p-5">
                {detailsEditMode ? (
                  <form onSubmit={submit} className="space-y-4">
                    <p className="text-sm text-slate-500">
                      Edit the interview details below. Changes will be saved
                      without opening a separate scheduling form.
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="text-sm font-medium text-slate-700">
                        Candidate name *
                        <input
                          name="candidate"
                          value={form.candidate}
                          onChange={changeForm}
                          required
                          className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal"
                        />
                      </label>
                      <label className="text-sm font-medium text-slate-700">
                        Candidate email *
                        <input
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={changeForm}
                          required
                          className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal"
                        />
                      </label>
                      <label className="text-sm font-medium text-slate-700">
                        Job vacancy *
                        <input
                          name="vacancy"
                          value={form.vacancy}
                          onChange={changeForm}
                          required
                          className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal"
                        />
                      </label>
                      <label className="text-sm font-medium text-slate-700">
                        Interview stage *
                        <select
                          name="round"
                          value={form.round}
                          onChange={changeForm}
                          required
                          className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 font-normal"
                        >
                          {ROUNDS.map((round) => (
                            <option key={round} value={round}>
                              {round}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium text-slate-700">
                        Date *
                        <input
                          name="date"
                          type="date"
                          value={form.date}
                          onChange={changeForm}
                          required
                          className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal"
                        />
                      </label>
                      <label className="text-sm font-medium text-slate-700">
                        Start time *
                        <input
                          name="time"
                          type="time"
                          value={form.time}
                          onChange={changeForm}
                          required
                          className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal"
                        />
                      </label>
                      <label className="text-sm font-medium text-slate-700">
                        Duration *
                        <select
                          name="duration"
                          value={form.duration}
                          onChange={changeForm}
                          required
                          className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 font-normal"
                        >
                          {["30", "45", "60", "90", "120"].map((value) => (
                            <option key={value} value={value}>
                              {value} minutes
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium text-slate-700">
                        Interview type *
                        <select
                          name="interviewType"
                          value={form.interviewType}
                          onChange={changeForm}
                          required
                          className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 font-normal"
                        >
                          <option value="Online">Online</option>
                          <option value="Physical">Physical</option>
                        </select>
                      </label>
                      <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                        Assigned interviewers *
                        <input
                          value={form.interviewers.join(", ")}
                          onChange={(event) => {
                            const people = event.target.value
                              .split(",")
                              .map((name) => name.trim())
                              .filter(Boolean);
                            setForm((old) => ({
                              ...old,
                              interviewers: people,
                              interviewerIds: people
                                .map(
                                  (name) =>
                                    employees.find(
                                      (employee) =>
                                        employee.name.toLowerCase() ===
                                        name.toLowerCase(),
                                    )?.id,
                                )
                                .filter(Boolean),
                            }));
                          }}
                          required
                          className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal"
                          placeholder="Enter names separated by commas"
                        />
                        <span className="mt-1 block text-xs font-normal text-slate-500">
                          Separate interviewer names with commas.
                        </span>
                      </label>
                      {form.interviewType === "Online" ? (
                        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                          Meeting link *
                          <input
                            name="meetingLink"
                            type="url"
                            value={form.meetingLink}
                            onChange={changeForm}
                            required
                            className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal"
                            placeholder="https://..."
                          />
                        </label>
                      ) : (
                        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                          Physical location *
                          <input
                            name="location"
                            value={form.location}
                            onChange={changeForm}
                            required
                            className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal"
                            placeholder="Office / meeting room"
                          />
                        </label>
                      )}
                      <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                        Notes
                        <textarea
                          name="notes"
                          value={form.notes}
                          onChange={changeForm}
                          rows={3}
                          className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal"
                          placeholder="Optional interview notes"
                        />
                      </label>
                    </div>
                    {conflictError && (
                      <div
                        role="alert"
                        className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                      >
                        {conflictError}
                      </div>
                    )}
                    {formError && (
                      <div
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                      >
                        {formError}
                      </div>
                    )}
                    <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailsEditMode(false);
                          setEditingId(null);
                          setFormError("");
                          setConflictError("");
                          setStatusError("");
                          setInterviewerSearch("");
                          setInterviewerPickerOpen(false);
                        }}
                        disabled={saving}
                        className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        <Save className="mr-1 inline" size={15} />
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-slate-500">Candidate</p>
                      <p className="mt-1 font-semibold">{selected.candidate}</p>
                      <p className="text-sm text-slate-500">{selected.email}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Vacancy</p>
                        <p className="mt-1 font-medium">{selected.vacancy}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Status</p>
                        <span
                          className={`mt-1 inline-block rounded-full px-3 py-1 text-xs ${statusStyle[selected.status] || ""}`}
                        >
                          {selected.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Date and time</p>
                        <p className="mt-1 font-medium">
                          {formatDate(selected.date)} ·{" "}
                          {formatTime(selected.time)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {selected.duration} minutes
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Interviewers</p>
                        <p className="mt-1 text-sm font-medium">
                          {normalizePeople(selected).join(", ")}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl border bg-slate-50 p-4">
                      <p className="font-semibold">Location / meeting</p>
                      {getInterviewType(selected) === "Online" ? (
                        selected.meetingLink ? (
                          <a
                            href={selected.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 flex items-center gap-2 break-all text-sm text-indigo-600"
                          >
                            <LinkIcon size={16} />
                            {selected.meetingLink}
                            <ExternalLink size={14} />
                          </a>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500">
                            No meeting link provided.
                          </p>
                        )
                      ) : (
                        <p className="mt-2 text-sm">
                          {selected.location || "No location provided."}
                        </p>
                      )}
                      {selected.notes && (
                        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                          {selected.notes}
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl border bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <Mail className="text-slate-500" />
                        <div>
                          <p className="font-semibold">Email invitation</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Email sending and invitation status are shown only
                            when supported by the backend. This page does not
                            create mock email records or simulate sending.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-semibold">
                        Update status
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {STATUSES.map((status) => (
                          <button
                            key={status}
                            onClick={() => updateStatus(selected.id, status)}
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold ${selected.status === status ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200"}`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                      {statusError && (
                        <p role="alert" className="mt-2 text-sm text-red-600">
                          {statusError}
                        </p>
                      )}
                    </div>
                    <div className="border-t pt-4">
                      <div className="mb-3 flex items-center gap-2 font-semibold">
                        <History size={17} />
                        Recent changes
                      </div>
                      {history
                        .filter(
                          (entry) =>
                            String(entry.interviewId) === String(selected.id),
                        )
                        .slice(0, 4)
                        .map((entry) => (
                          <div
                            key={entry.id}
                            className="mb-3 border-l-2 border-indigo-200 pl-3"
                          >
                            <p className="text-sm font-semibold">
                              {entry.action}
                            </p>
                            <p className="text-xs text-slate-500">
                              {entry.description}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {new Date(entry.dateTime).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      {!history.some(
                        (entry) =>
                          String(entry.interviewId) === String(selected.id),
                      ) && (
                        <p className="text-sm text-slate-500">
                          No changes recorded in this session.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(selected)}
                        className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
                      >
                        <Trash2 className="mr-1 inline" size={15} />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Interview history */}
        {historyOpen && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/50 p-4">
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b p-5">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-bold">
                    <History className="text-indigo-600" />
                    Interview History
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Changes recorded during this page session.
                  </p>
                </div>
                <button
                  onClick={() => setHistoryOpen(false)}
                  aria-label="Close history"
                >
                  <X />
                </button>
              </div>
              <div className="border-b p-4">
                <select
                  value={historyFilter}
                  onChange={(event) => setHistoryFilter(event.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 sm:max-w-xs"
                >
                  <option>All</option>
                  {[
                    "Scheduled",
                    "Rescheduled",
                    "Updated",
                    "Status changed",
                    "Cancelled",
                    "Invitation status updated",
                    "Deleted",
                  ].map((action) => (
                    <option key={action}>{action}</option>
                  ))}
                </select>
              </div>
              <div className="max-h-[60vh] space-y-4 overflow-y-auto p-5">
                {history
                  .filter(
                    (entry) =>
                      historyFilter === "All" || entry.action === historyFilter,
                  )
                  .map((entry) => (
                    <div key={entry.id} className="flex gap-3 border-b pb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <History size={18} />
                      </div>
                      <div>
                        <p className="font-semibold">
                          {entry.action}
                          <span className="ml-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-normal">
                            {entry.candidate}
                          </span>
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {entry.description}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          {new Date(entry.dateTime).toLocaleString()} ·{" "}
                          {entry.actor}
                        </p>
                      </div>
                    </div>
                  ))}
                {!history.length && (
                  <p className="py-10 text-center text-sm text-slate-500">
                    No changes recorded during this session.
                  </p>
                )}
              </div>
              <div className="border-t bg-slate-50 p-4 text-xs text-slate-500">
                This history is session-only; backend audit history is not
                configured in this page.
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
            <div
              role="alertdialog"
              aria-modal="true"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-red-600">
                <Trash2 size={24} />
                <h2 className="text-xl font-bold text-slate-800">
                  Delete interview?
                </h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Are you sure you want to delete the interview for{" "}
                <strong>{deleteTarget.candidate}</strong>? This cannot be
                undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Delete interview</button>
 </div></div>
          </div> )}</div>
    </PageLayout>
  );
}
