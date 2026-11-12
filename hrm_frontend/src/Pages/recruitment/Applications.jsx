import React, { useEffect, useState, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";
import RecruitmentApplicationReview from "./ApplicationReview";
import RecruitmentCandidateShortlist from "./CandidateShortlist";
import { DeadlineMeter } from "../careers/careersShared";
import { formatSalary, formatDate } from "../../utils/careersFormat";
import {
  isRemovedFromApplications,
  setRemovedFromApplications,
} from "../../utils/vacancyRemovalStorage";
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Briefcase,
  Calendar,
  AlertCircle,
  FileDown,
  X,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Sparkles,
  RefreshCw,
  Building2,
  User,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Layers,
  List,
  FolderKanban,
  Award,
  CheckSquare,
  Users,
  ClipboardCheck,
  ArrowUpRight,
  SlidersHorizontal,
  Banknote,
  Archive,
  RotateCcw,
  History,
} from "lucide-react";

const STATUS_CONFIG = {
  NEW: {
    label: "New",
    bg: "bg-primary-50",
    text: "text-primary-700",
    border: "border-primary-200",
    dot: "bg-primary-500",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  SHORTLISTED: {
    label: "Shortlisted",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  INTERVIEWING: {
    label: "Interviewing",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
  OFFERED: {
    label: "Offered",
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    dot: "bg-teal-500",
  },
  HIRED: {
    label: "Hired",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    dot: "bg-green-500",
  },
  REJECTED: {
    label: "Rejected",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
};

const AVATAR_GRADIENTS = [
  "from-primary-500 to-purple-600",
  "from-sky-400 to-blue-600",
  "from-emerald-400 to-teal-600",
  "from-amber-400 to-orange-500",
  "from-pink-500 to-rose-600",
  "from-primary-500 to-primary-600",
];

export default function RecruitmentApplications() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const viewParam = (searchParams.get("view") || "").toLowerCase();

  const [applications, setApplications] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [jobOffers, setJobOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  // Archive / Restore Modals
  const [confirmArchiveModal, setConfirmArchiveModal] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Filters & Controls
  const [search, setSearch] = useState("");
  const [selectedVacancyId, setSelectedVacancyId] = useState("ALL");
  const [viewMode, setViewMode] = useState("grouped"); // 'grouped' (separated by position) or 'list' (master table)
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [groupStatusFilters, setGroupStatusFilters] = useState({});
  const [masterStatusFilter, setMasterStatusFilter] = useState("ALL");

  // Selected Candidate Modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [showResumeText, setShowResumeText] = useState(false);

  // Selected Vacancy Modal (Job Vacancy Details like Public Career Page)
  const [selectedVacancyModal, setSelectedVacancyModal] = useState(null);

  // Helper for per-group status filter
  const getGroupStatus = (groupKey) => groupStatusFilters[groupKey] || "ALL";
  const setGroupStatus = (groupKey, status) => {
    setGroupStatusFilters((prev) => ({
      ...prev,
      [groupKey]: status,
    }));
  };

  // Load real applications, vacancies & job offers from backend
  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [appsRes, vacsRes, offersRes] = await Promise.allSettled([
        recruitmentApi.getApplications(),
        recruitmentApi.getVacancies(),
        recruitmentApi.getJobOffers ? recruitmentApi.getJobOffers() : Promise.resolve({ data: [] }),
      ]);

      if (appsRes.status === "fulfilled" && appsRes.value?.success !== false) {
        const raw = appsRes.value?.data;
        if (Array.isArray(raw)) {
          setApplications(raw);
        } else {
          setApplications([]);
        }
      } else {
        const errMsg =
          appsRes.status === "rejected" ? appsRes.reason?.message : appsRes.value?.message;
        setApplications([]);
        if (errMsg && !errMsg.includes("404")) {
          setError(errMsg);
        }
      }

      if (vacsRes.status === "fulfilled" && Array.isArray(vacsRes.value?.data)) {
        setVacancies(vacsRes.value.data);
      } else {
        setVacancies([]);
      }

      if (offersRes.status === "fulfilled" && Array.isArray(offersRes.value?.data)) {
        setJobOffers(offersRes.value.data);
      } else {
        setJobOffers([]);
      }
    } catch (err) {
      console.error("Error loading candidate applications:", err);
      setApplications([]);
      setError(err?.message || "Failed to load candidate applications from server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute job offer status for a vacancy group
  const getVacancyOfferInfo = useMemo(() => {
    return (group) => {
      const appIds = new Set((group.allApplications || []).map((a) => a.id));
      const groupTitle = (group.title || "").trim().toLowerCase();
      const matched = jobOffers.filter((o) => {
        const hasAppMatch = o.applicationId && appIds.has(o.applicationId);
        const hasTitleMatch = groupTitle && o.jobTitle && o.jobTitle.trim().toLowerCase() === groupTitle;
        return hasAppMatch || hasTitleMatch;
      });
      return {
        hasOffer: matched.length > 0,
        offerCount: matched.length,
        offers: matched,
      };
    };
  }, [jobOffers]);

  // Handler to archive / remove vacancy
  const handleArchiveVacancy = async () => {
    if (!confirmArchiveModal) return;
    const { vacancy } = confirmArchiveModal;
    const vacId = vacancy?.id || vacancy?.key;
    const vacTitle = vacancy?.title;
    setActionInProgress(true);
    // Persist removal in client state immediately
    setRemovedFromApplications(vacId, true, { title: vacTitle });
    if (confirmArchiveModal.groupKey) {
      setRemovedFromApplications(confirmArchiveModal.groupKey, true, { title: vacTitle });
    }
    try {
      if (vacancy?.id && typeof recruitmentApi?.removeVacancyFromApplications === "function") {
        await recruitmentApi.removeVacancyFromApplications(vacancy.id);
      }
    } catch (err) {
      console.warn("Backend removeVacancyFromApplications endpoint notice:", err?.message);
    } finally {
      setActionNotice(`Vacancy "${vacTitle || 'Selected opening'}" removed and moved to Applications History.`);
      setConfirmArchiveModal(null);
      setActionInProgress(false);
      setTimeout(() => setActionNotice(null), 4000);
      await loadData(true);
    }
  };

  const handleRefresh = () => {
    loadData(true);
  };

  const handleCopyCode = (code, e) => {
    if (e) e.stopPropagation();
    if (!code) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Toggle group collapse
  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleAllGroups = (expand) => {
    if (expand) {
      setCollapsedGroups({});
    } else {
      const nextCollapsed = {};
      vacancyGroups.forEach((g) => {
        nextCollapsed[g.key] = true;
      });
      setCollapsedGroups(nextCollapsed);
    }
  };

  // Metric counts across real database applications
  const metrics = useMemo(() => {
    const total = applications.length;
    const newCount = applications.filter((a) => a.status === "NEW").length;
    const reviewCount = applications.filter((a) => a.status === "UNDER_REVIEW").length;
    const shortlistedCount = applications.filter((a) => a.status === "SHORTLISTED").length;
    const rejectedCount = applications.filter((a) => a.status === "REJECTED").length;

    // Distinct positions that have at least 1 candidate application
    const positionsWithApps = new Set(
      applications.map((a) => a.vacancyId || a.jobTitle || a.vacancyTitle).filter(Boolean)
    ).size;

    return { total, newCount, reviewCount, shortlistedCount, rejectedCount, positionsWithApps };
  }, [applications]);

  // Unique list of vacancies for dropdown and quick chips
  const vacancySelectorList = useMemo(() => {
    const map = new Map();

    // From vacancies
    vacancies.forEach((v) => {
      const key = String(v.id || v.title);
      map.set(key, {
        id: v.id,
        key,
        title: v.title,
        department: v.department,
        applicantCount: 0,
      });
    });

    // Count applicants from real submissions
    applications.forEach((a) => {
      const matchedKey = a.vacancyId ? String(a.vacancyId) : null;
      if (matchedKey && map.has(matchedKey)) {
        map.get(matchedKey).applicantCount += 1;
      } else {
        const title = a.jobTitle || a.vacancyTitle || "General Role";
        const key = title;
        if (!map.has(key)) {
          map.set(key, {
            id: a.vacancyId || null,
            key,
            title,
            department: a.department || "General",
            applicantCount: 1,
          });
        } else {
          map.get(key).applicantCount += 1;
        }
      }
    });

    return Array.from(map.values());
  }, [applications, vacancies]);

  // ── Group applications according to what candidate applied for ──
  const vacancyGroups = useMemo(() => {
    const groupMap = new Map();

    // 1. Seed with published or active vacancies so we have metadata (department, jobType, etc.)
    vacancies.forEach((v) => {
      const key = String(v.id || v.title);
      groupMap.set(key, {
        id: v.id,
        key,
        title: v.title || "Untitled Vacancy",
        department: v.department || "General",
        jobType: v.jobType || "Full-time",
        experienceLevel: v.experienceLevel || "All Levels",
        vacancyCount: v.vacancyCount || 1,
        status: v.status || "PUBLISHED",
        deadline: v.deadline,
        rawVacancy: v,
        allApplications: [],
        searchMatchedApplications: [],
      });
    });

    // 2. Distribute real applications into their applied vacancies
    applications.forEach((app) => {
      let key = null;
      if (app.vacancyId && groupMap.has(String(app.vacancyId))) {
        key = String(app.vacancyId);
      } else {
        const targetTitle = app.jobTitle || app.vacancyTitle;
        if (targetTitle) {
          for (const [k, group] of groupMap.entries()) {
            if (group.title.toLowerCase() === targetTitle.toLowerCase()) {
              key = k;
              break;
            }
          }
        }
      }

      if (!key) {
        key = app.vacancyId ? String(app.vacancyId) : (app.jobTitle || app.vacancyTitle || "general");
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            id: app.vacancyId || null,
            key,
            title: app.jobTitle || app.vacancyTitle || "General Position",
            department: app.department || "General",
            jobType: "Full-time",
            experienceLevel: "All Levels",
            vacancyCount: 1,
            status: "PUBLISHED",
            deadline: null,
            rawVacancy: null,
            allApplications: [],
            searchMatchedApplications: [],
          });
        }
      }

      const group = groupMap.get(key);
      if (!group.rawVacancy) {
        const matchedVac = vacancies.find(
          (v) =>
            (group.id && String(v.id) === String(group.id)) ||
            (group.title && v.title?.toLowerCase() === group.title.toLowerCase())
        );
        if (matchedVac) {
          group.rawVacancy = matchedVac;
          group.id = group.id || matchedVac.id;
          group.department = matchedVac.department || group.department;
          group.jobType = matchedVac.jobType || group.jobType;
          group.experienceLevel = matchedVac.experienceLevel || group.experienceLevel;
          group.vacancyCount = matchedVac.vacancyCount || group.vacancyCount;
          group.deadline = matchedVac.deadline || group.deadline;
        }
      }
      group.allApplications.push(app);

      // Evaluate active search
      const query = search.trim().toLowerCase();
      const candidateName = (app.candidateName || "").toLowerCase();
      const email = (app.email || "").toLowerCase();
      const phone = (app.phone || "").toLowerCase();
      const trackingCode = (app.trackingCode || "").toLowerCase();
      const skillsStr = Array.isArray(app.skills) ? app.skills.join(" ").toLowerCase() : "";

      const matchesSearch =
        !query ||
        candidateName.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        trackingCode.includes(query) ||
        skillsStr.includes(query);

      if (matchesSearch) {
        group.searchMatchedApplications.push(app);
      }
    });

    let groups = Array.from(groupMap.values());

    // Filter by selected vacancy dropdown/tab if not ALL
    if (selectedVacancyId !== "ALL") {
      groups = groups.filter(
        (g) =>
          String(g.id) === String(selectedVacancyId) ||
          g.key === selectedVacancyId ||
          g.title === selectedVacancyId
      );
    } else {
      // Prioritize positions that have received applications
      const groupsWithApps = groups.filter((g) => g.allApplications.length > 0);
      if (groupsWithApps.length > 0) {
        groups = groupsWithApps;
      }
    }

    return groups;
  }, [applications, vacancies, search, selectedVacancyId]);

  // Separate into active vacancies and history/archived vacancies
  const activeVacancyGroups = useMemo(() => {
    return vacancyGroups.filter((g) => !isRemovedFromApplications(g.rawVacancy || g));
  }, [vacancyGroups]);

  const historyVacancyGroups = useMemo(() => {
    return vacancyGroups.filter((g) => isRemovedFromApplications(g.rawVacancy || g));
  }, [vacancyGroups]);

  // Active vacancies displayed on page
  const displayedVacancyGroups = activeVacancyGroups;

  // Master list filtered applications (for master list mode)
  const masterFilteredApplications = useMemo(() => {
    const all = displayedVacancyGroups.flatMap((g) => g.searchMatchedApplications);
    if (masterStatusFilter === "ALL") return all;
    return all.filter((a) => a.status === masterStatusFilter);
  }, [displayedVacancyGroups, masterStatusFilter]);

  // Total count matching active search across current display groups
  const totalSearchMatched = useMemo(() => {
    return displayedVacancyGroups.reduce((acc, g) => acc + g.searchMatchedApplications.length, 0);
  }, [displayedVacancyGroups]);

  // Resume Download Handler
  const handleDownloadResume = async (app, e) => {
    if (e) e.stopPropagation();
    if (!app) return;

    setDownloadingId(app.id);
    try {
      if (app.id && typeof recruitmentApi?.downloadResume === "function") {
        const blob = await recruitmentApi.downloadResume(app.id);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download =
          app.resumeFileName || `${(app.candidateName || "Candidate").replace(/\s+/g, "_")}_CV.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }
    } catch (err) {
      console.warn("Backend resume streaming note, using fallback summary:", err);
    } finally {
      setDownloadingId(null);
    }

    try {
      const content = `Candidate Application Resume\n=================================\nName: ${app.candidateName}\nTracking Code: ${app.trackingCode || "N/A"}\nEmail: ${app.email}\nPhone: ${app.phone || "N/A"}\nPosition: ${app.jobTitle || app.vacancyTitle || "General Role"}\nDepartment: ${app.department || "N/A"}\n\nEducation: ${app.education || "N/A"}\nExperience: ${app.experienceYears ?? 0} years\n\nSummary:\n${app.summary || "No summary provided."}\n\nSkills:\n${(app.skills || []).join(", ") || "None listed"}\n\nATS Extracted Content:\n${app.resumeText || "No plaintext available."}`;
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(app.candidateName || "Candidate").replace(/\s+/g, "_")}_Application_Summary.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Resume download error:", err);
    }
  };

  const getInitials = (name = "") => {
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // If query parameter requested a specific view, render that dedicated component.
  if (viewParam === "review" || viewParam === "screen") {
    return <RecruitmentApplicationReview />;
  }
  if (viewParam === "shortlist") {
    return <RecruitmentCandidateShortlist />;
  }

  return (
    <PageLayout
      role="recruiter"
      activePage="View Applications"
      title="Candidate Applications"
      subtitle="View, search, and manage candidate submissions separated by target job opening"
      actions={
        <div className="flex items-center gap-2">
          <Link
            to="/recruitment/applications/history"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-semibold shadow-sm transition-all"
            title="View closed and archived vacancy applications history"
          >
            <History size={15} className="text-primary-600" />
            <span className="hidden sm:inline">Applications History</span>
            <span className="px-1.5 py-0.2 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
              {historyVacancyGroups.length}
            </span>
          </Link>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={refreshing || loading ? "animate-spin text-primary-600" : "text-slate-500"}
            />
            <span>Refresh</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Error notification banner if any */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-800 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <ShieldAlert size={16} className="text-rose-600 shrink-0" />
              <div>
                <span className="font-semibold">Unable to load candidate applications: </span>
                <span>{error}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="text-xs font-semibold text-rose-700 underline hover:text-rose-900"
              >
                Retry
              </button>
              <button
                onClick={() => setError(null)}
                className="text-rose-500 hover:text-rose-700 p-1"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── Action Notice ── */}
        {actionNotice && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 font-medium shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-emerald-600 hover:text-emerald-800 p-1">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Metric Summary (one joined card) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 bg-white rounded-xl border border-slate-200 shadow-sm divide-slate-200 divide-y lg:divide-y-0 lg:divide-x">
          {[
            { label: "Total Applications", value: metrics.total, hint: "Across all vacancies", tone: "text-slate-900" },
            { label: "Positions Applied", value: metrics.positionsWithApps, hint: "Active job openings", tone: "text-primary-600" },
            { label: "New Applicants", value: metrics.newCount, hint: "Awaiting initial review", tone: "text-primary-600" },
            { label: "Shortlisted", value: metrics.shortlistedCount, hint: "Qualified candidates", tone: "text-emerald-600" },
          ].map((m) => (
            <div key={m.label} className="px-5 py-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{m.label}</p>
              <h3 className={`text-2xl font-bold mt-1 ${m.tone}`}>{m.value}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{m.hint}</p>
            </div>
          ))}
        </div>

        {/* ── Search & Filter Controls Toolbar ── */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={17} />
              <input
                type="text"
                placeholder="Search candidates by name, email, skills, tracking code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* View Mode & Vacancy Selector Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Target vacancy dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap hidden sm:inline">
                  Position:
                </span>
                <select
                  value={selectedVacancyId}
                  onChange={(e) => setSelectedVacancyId(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all max-w-[200px]"
                >
                  <option value="ALL">All Applied Positions ({vacancySelectorList.length})</option>
                  {vacancySelectorList.map((v) => (
                    <option key={v.key} value={v.key}>
                      {v.title} ({v.applicantCount})
                    </option>
                  ))}
                </select>
                {selectedVacancyId !== "ALL" && (
                  <button
                    onClick={() => setSelectedVacancyId("ALL")}
                    className="text-xs font-semibold text-primary-600 hover:text-primary-800 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Reset position filter to All"
                  >
                    <RefreshCw size={12} />
                  </button>
                )}
              </div>

              {/* View Mode Toggle: Separated vs Unified Table */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <button
                  onClick={() => setViewMode("grouped")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "grouped"
                      ? "bg-white text-primary-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Separate applicant tables according to applied vacancy"
                >
                  <FolderKanban size={14} />
                  <span>Separated by Role</span>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "list"
                      ? "bg-white text-primary-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="View all candidates in one combined master table"
                >
                  <List size={14} />
                  <span>Master List</span>
                </button>
              </div>

              {/* Expand / Collapse All (in grouped mode) */}
              {viewMode === "grouped" && displayedVacancyGroups.length > 0 && (
                <div className="hidden sm:flex items-center gap-1 border-l border-slate-200 pl-2">
                  <button
                    onClick={() => toggleAllGroups(true)}
                    className="p-1.5 text-xs text-slate-500 hover:text-primary-600 rounded-lg hover:bg-slate-100"
                    title="Expand all role sections"
                  >
                    Expand All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => toggleAllGroups(false)}
                    className="p-1.5 text-xs text-slate-500 hover:text-primary-600 rounded-lg hover:bg-slate-100"
                    title="Collapse all role sections"
                  >
                    Collapse All
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Main Candidate Content Area ── */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Loading candidate applications...</p>
            <p className="text-xs text-slate-400">Connecting to recruitment database</p>
          </div>
        ) : displayedVacancyGroups.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-16 text-center max-w-md mx-auto space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto">
              <FolderKanban size={26} />
            </div>
            <h4 className="text-base font-bold text-slate-800">No Active Applications</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              There are no active job openings receiving applications. Removed and closed vacancies can be viewed in the Applications History page.
            </p>
            {historyVacancyGroups.length > 0 && (
              <Link
                to="/recruitment/applications/history"
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-xs"
              >
                <History size={14} />
                <span>View Applications History ({historyVacancyGroups.length})</span>
              </Link>
            )}
          </div>
        ) : totalSearchMatched === 0 ? (
          /* Empty State: No Matches for Current Search Query */
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search size={22} />
            </div>
            <h4 className="text-base font-semibold text-slate-800">No matching applications</h4>
            <p className="text-xs text-slate-400">
              No candidate applications match your current search query.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setSelectedVacancyId("ALL");
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
            >
              Reset Search Filter
            </button>
          </div>
        ) : viewMode === "grouped" ? (
          /* ══════════════════════════════════════════════════════════════
             MODE 1: SEPARATED TABLES WITH STATUS TABS UNDER EACH POSITION
             ══════════════════════════════════════════════════════════════ */
          <div className="space-y-6">
            {displayedVacancyGroups.map((group, groupIdx) => {
              const isCollapsed = Boolean(collapsedGroups[group.key]);
              const groupApps = group.searchMatchedApplications;
              const totalForGroup = groupApps.length;

              // Compute counts for this specific vacancy position
              const newCount = groupApps.filter((a) => a.status === "NEW").length;
              const reviewCount = groupApps.filter((a) => a.status === "UNDER_REVIEW").length;
              const shortlistedCount = groupApps.filter((a) => a.status === "SHORTLISTED").length;
              const rejectedCount = groupApps.filter((a) => a.status === "REJECTED").length;

              // Active status filter for this specific position
              const currentStatus = getGroupStatus(group.key);
              const displayedApps =
                currentStatus === "ALL"
                  ? groupApps
                  : groupApps.filter((a) => a.status === currentStatus);

              return (
                <div
                  key={group.key}
                  className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-primary-600 shadow-sm overflow-hidden transition-shadow hover:shadow-md"
                >
                  {/* ── Vacancy Group Header ── */}
                  <div
                    onClick={() => toggleGroup(group.key)}
                    className={`px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors ${
                      isCollapsed ? "" : "border-b border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                        <Briefcase size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 truncate">{group.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {[
                            group.department,
                            group.jobType,
                            group.deadline ? `Closes ${formatDate(group.deadline)}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>

                    {totalForGroup > 0 && (
                      <div className="hidden xl:block w-48 shrink-0">
                        <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100">
                          {[
                            { n: newCount, c: "bg-primary-500" },
                            { n: reviewCount, c: "bg-amber-500" },
                            { n: shortlistedCount, c: "bg-emerald-500" },
                            { n: rejectedCount, c: "bg-red-500" },
                          ].map((seg) => (
                            <div
                              key={seg.c}
                              className={seg.c}
                              style={{ width: `${(seg.n / totalForGroup) * 100}%` }}
                            />
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5">
                          {[
                            newCount > 0 ? `${newCount} new` : null,
                            reviewCount > 0 ? `${reviewCount} under review` : null,
                            shortlistedCount > 0 ? `${shortlistedCount} shortlisted` : null,
                            rejectedCount > 0 ? `${rejectedCount} rejected` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto" onClick={(e) => e.stopPropagation()}>
                      {/* Job Offer Status Badge */}
                      {(() => {
                        const offerInfo = getVacancyOfferInfo(group);
                        return offerInfo.hasOffer ? (
                          <span
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5"
                            title="Job offer created for this opening"
                          >
                            <CheckCircle2 size={14} />
                            <span>Offer Created {offerInfo.offerCount > 1 ? `(${offerInfo.offerCount})` : ""}</span>
                          </span>
                        ) : (
                          <span
                            className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold flex items-center gap-1.5"
                            title="No job offer has been created yet"
                          >
                            <Clock size={14} />
                            <span>No Offer Yet</span>
                          </span>
                        );
                      })()}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVacancyModal(
                            group.rawVacancy || {
                              id: group.id,
                              title: group.title,
                              department: group.department,
                              jobType: group.jobType,
                              vacancyCount: group.vacancyCount,
                              experienceLevel: group.experienceLevel,
                              deadline: group.deadline,
                              status: group.status,
                            }
                          );
                        }}
                        className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        title="Display job vacancy details like public career page"
                      >
                        <FileText size={16} className="text-slate-500" />
                        <span>Vacancy Details</span>
                      </button>

                      <span className="px-3 py-1.5 rounded-xl bg-primary-50 text-primary-700 text-xs font-semibold flex items-center gap-1.5">
                        <Users size={14} />
                        <span>{totalForGroup} {totalForGroup === 1 ? "Applicant" : "Applicants"}</span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmArchiveModal({
                            vacancy: group.rawVacancy || { id: group.id, title: group.title },
                            groupKey: group.key,
                          });
                        }}
                        className="px-4 py-2 rounded-xl border border-red-200 bg-white text-red-700 text-sm font-semibold hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                        title="Remove vacancy and move to Applications History"
                      >
                        <Archive size={16} />
                        <span>Remove</span>
                      </button>

                      <button
                        onClick={() => toggleGroup(group.key)}
                        className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                        title={isCollapsed ? "Expand table" : "Collapse table"}
                      >
                        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* ── Position Content: Status Tabs Under Each Position & Table ── */}
                  {!isCollapsed && (
                    <div>
                      {/* ── Status Filter Tabs for this specific role ── */}
                      <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {[
                            { id: "ALL", label: "All Applicants", count: totalForGroup },
                            { id: "NEW", label: "New", count: newCount },
                            { id: "SHORTLISTED", label: "Shortlisted", count: shortlistedCount },
                            { id: "UNDER_REVIEW", label: "Under Review", count: reviewCount },
                            { id: "REJECTED", label: "Rejected", count: rejectedCount },
                          ].map((tab) => {
                            const active = currentStatus === tab.id;
                            return (
                              <button
                                key={tab.id}
                                onClick={() => setGroupStatus(group.key, tab.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                  active
                                    ? "bg-primary-600 text-white shadow-sm"
                                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                                }`}
                              >
                                <span>{tab.label}</span>
                                <span
                                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                    active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {tab.count}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {currentStatus !== "ALL" && (
                          <button
                            onClick={() => setGroupStatus(group.key, "ALL")}
                            className="text-xs font-semibold text-primary-600 hover:text-primary-800 flex items-center gap-1"
                          >
                            <RefreshCw size={11} />
                            <span>Show All ({totalForGroup})</span>
                          </button>
                        )}
                      </div>

                      {/* ── Candidate Table for this specific role ── */}
                      <div className="overflow-x-auto">
                        {displayedApps.length === 0 ? (
                          <div className="p-10 text-center bg-slate-50/30">
                            <p className="text-xs font-medium text-slate-500">
                              No candidates with status{" "}
                              <strong className="text-slate-700">
                                {currentStatus === "ALL" ? "any" : currentStatus.replace("_", " ")}
                              </strong>{" "}
                              for {group.title}.
                            </p>
                            {currentStatus !== "ALL" && (
                              <button
                                onClick={() => setGroupStatus(group.key, "ALL")}
                                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100"
                              >
                                View all {totalForGroup} applicants for this position
                              </button>
                            )}
                          </div>
                        ) : (
                          <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] uppercase font-semibold text-slate-500 tracking-wider">
                              <tr>
                                <th className="px-6 py-3.5">Candidate Details</th>
                                <th className="px-6 py-3.5">Experience & Education</th>
                                <th className="px-6 py-3.5">Applied Date</th>
                                <th className="px-6 py-3.5">Status</th>
                                <th className="px-6 py-3.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {displayedApps.map((app, appIdx) => {
                                const st = STATUS_CONFIG[app.status] || STATUS_CONFIG.NEW;
                                const gradient =
                                  AVATAR_GRADIENTS[(groupIdx + appIdx) % AVATAR_GRADIENTS.length];

                                return (
                                  <tr
                                    key={app.id || appIdx}
                                    onClick={() => {
                                      setSelectedApp(app);
                                      setShowResumeText(false);
                                    }}
                                    className="hover:bg-primary-50/30 cursor-pointer transition-colors"
                                  >
                                    {/* Candidate Name, Avatar & Contact */}
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        <div
                                          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm`}
                                        >
                                          {getInitials(app.candidateName)}
                                        </div>
                                        <div>
                                          <div className="font-semibold text-slate-900 hover:text-primary-600 transition-colors flex items-center gap-2">
                                            <span>{app.candidateName}</span>
                                            {app.trackingCode && (
                                              <span
                                                onClick={(e) => handleCopyCode(app.trackingCode, e)}
                                                title="Click to copy tracking code"
                                                className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-primary-50 hover:text-primary-600 transition-colors inline-flex items-center gap-1"
                                              >
                                                {copiedCode === app.trackingCode ? (
                                                  <>
                                                    <Check size={10} className="text-emerald-600" />
                                                    <span className="text-emerald-600 font-sans">
                                                      Copied
                                                    </span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <span>{app.trackingCode}</span>
                                                    <Copy size={9} className="opacity-50" />
                                                  </>
                                                )}
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                                            <div className="truncate max-w-[200px] flex items-center gap-1.5 text-slate-600">
                                              <Mail size={12} className="text-slate-400 shrink-0" />
                                              <span>{app.email}</span>
                                            </div>
                                            {app.phone && (
                                              <div className="truncate flex items-center gap-1.5 text-slate-500">
                                                <Phone size={12} className="text-slate-400 shrink-0" />
                                                <span>{app.phone}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Experience & Education */}
                                    <td className="px-6 py-4">
                                      <div className="flex flex-col gap-1">
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                                          <Briefcase size={12} className="text-slate-400" />
                                          <span>{app.experienceYears ?? 0} Years Exp</span>
                                        </span>
                                        {app.education && (
                                          <span className="text-xs text-slate-400 truncate max-w-[200px] flex items-center gap-1">
                                            <GraduationCap
                                              size={12}
                                              className="text-slate-400 shrink-0"
                                            />
                                            <span className="truncate">{app.education}</span>
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* Applied Date */}
                                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                                      <div className="flex items-center gap-1.5">
                                        <Calendar size={13} className="text-slate-400" />
                                        <span>
                                          {app.appliedDate ||
                                            (app.createdAt
                                              ? String(app.createdAt).slice(0, 10)
                                              : "Recently")}
                                        </span>
                                      </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex flex-col gap-1">
                                        <span
                                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${st.bg} ${st.text} ${st.border}`}
                                        >
                                          <span
                                            className={`w-1.5 h-1.5 rounded-full ${st.dot}`}
                                          ></span>
                                          {st.label}
                                        </span>
                                        {app.eligibilityStatus &&
                                          app.eligibilityStatus !== "PENDING" && (
                                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                              {app.eligibilityStatus}
                                            </span>
                                          )}
                                      </div>
                                    </td>

                                    {/* Actions */}
                                    <td
                                      className="px-6 py-4 text-right whitespace-nowrap"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex items-center justify-end gap-1.5">
                                        {/* Resume PDF Download */}
                                        <button
                                          onClick={(e) => handleDownloadResume(app, e)}
                                          disabled={downloadingId === app.id}
                                          title="Download Resume Document"
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-primary-600 transition-all disabled:opacity-50"
                                        >
                                          {downloadingId === app.id ? (
                                            <Loader2
                                              size={13}
                                              className="animate-spin text-primary-600"
                                            />
                                          ) : (
                                            <FileDown size={14} />
                                          )}
                                          <span className="hidden sm:inline">Resume</span>
                                        </button>

                                        {/* Inspect Profile modal */}
                                        <button
                                          onClick={() => {
                                            setSelectedApp(app);
                                            setShowResumeText(false);
                                          }}
                                          title="View Full Profile"
                                          className="p-1.5 rounded-xl text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                        >
                                          <Eye size={17} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Vacancy footer summary */}
                  <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Showing <strong>{displayedApps.length}</strong> of <strong>{totalForGroup}</strong>{" "}
                      candidate(s) for <strong>{group.title}</strong>
                    </span>
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-800"
                    >
                      {isCollapsed ? "Show Table" : "Hide Table"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════
             MODE 2: UNIFIED MASTER TABLE (WITH OPTIONAL MASTER STATUS TABS)
             ══════════════════════════════════════════════════════════════ */
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-0">
            {/* Master list status tabs */}
            <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {["ALL", "NEW", "SHORTLISTED", "UNDER_REVIEW", "REJECTED"].map((st) => {
                  const active = masterStatusFilter === st;
                  const count =
                    st === "ALL"
                      ? applications.length
                      : applications.filter((a) => a.status === st).length;
                  return (
                    <button
                      key={st}
                      onClick={() => setMasterStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        active
                          ? "bg-primary-600 text-white shadow-sm"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                      }`}
                    >
                      <span>{st === "ALL" ? "All Applicants" : st.replace("_", " ")}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {masterStatusFilter !== "ALL" && (
                <button
                  onClick={() => setMasterStatusFilter("ALL")}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-800"
                >
                  Show All ({applications.length})
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Candidate & Tracking Code</th>
                    <th className="px-6 py-4">Target Job Vacancy</th>
                    <th className="px-6 py-4">Experience</th>
                    <th className="px-6 py-4">Applied Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {masterFilteredApplications.map((app, index) => {
                    const st = STATUS_CONFIG[app.status] || STATUS_CONFIG.NEW;
                    const gradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
                    const jobName = app.jobTitle || app.vacancyTitle || "General Role";

                    return (
                      <tr
                        key={app.id || index}
                        onClick={() => {
                          setSelectedApp(app);
                          setShowResumeText(false);
                        }}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        {/* Candidate info & Tracking Code */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm`}
                            >
                              {getInitials(app.candidateName)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 hover:text-primary-600 transition-colors flex items-center gap-2">
                                <span>{app.candidateName}</span>
                                {app.trackingCode && (
                                  <span
                                    onClick={(e) => handleCopyCode(app.trackingCode, e)}
                                    title="Click to copy tracking code"
                                    className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-primary-50 hover:text-primary-600 transition-colors inline-flex items-center gap-1"
                                  >
                                    {copiedCode === app.trackingCode ? (
                                      <>
                                        <Check size={10} className="text-emerald-600" />
                                        <span className="text-emerald-600 font-sans">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <span>{app.trackingCode}</span>
                                        <Copy size={9} className="opacity-50" />
                                      </>
                                    )}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                                <div className="truncate max-w-[200px] flex items-center gap-1.5 text-slate-600">
                                  <Mail size={12} className="text-slate-400 shrink-0" />
                                  <span>{app.email}</span>
                                </div>
                                {app.phone && (
                                  <div className="truncate flex items-center gap-1.5 text-slate-500">
                                    <Phone size={12} className="text-slate-400 shrink-0" />
                                    <span>{app.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Vacancy */}
                        <td className="px-6 py-4">
                          <div className="inline-flex flex-col items-start gap-1">
                            <span className="px-2.5 py-1 rounded-xl bg-primary-50 border border-primary-200/90 text-primary-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                              <Briefcase size={12} className="text-primary-600 shrink-0" />
                              <span>{jobName}</span>
                            </span>
                            {app.department && (
                              <span className="text-[11px] text-slate-500 pl-1 flex items-center gap-1">
                                <Building2 size={11} className="text-slate-400" />
                                <span>{app.department}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Experience */}
                        <td className="px-6 py-4 text-slate-700 font-medium text-xs">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                            {app.experienceYears ?? 0} Years Exp
                          </span>
                        </td>

                        {/* Applied date */}
                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {app.appliedDate ||
                            (app.createdAt ? String(app.createdAt).slice(0, 10) : "Recently")}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${st.bg} ${st.text} ${st.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                            {st.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td
                          className="px-6 py-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => handleDownloadResume(app, e)}
                              disabled={downloadingId === app.id}
                              title="Download Resume Document"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-primary-600 transition-all disabled:opacity-50"
                            >
                              {downloadingId === app.id ? (
                                <Loader2 size={13} className="animate-spin text-primary-600" />
                              ) : (
                                <FileDown size={14} />
                              )}
                              <span>Resume</span>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                setShowResumeText(false);
                              }}
                              title="View Application Details"
                              className="p-1.5 rounded-xl text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            >
                              <Eye size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer count */}
            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
              <span>
                Showing <span className="font-semibold text-slate-700">{masterFilteredApplications.length}</span>{" "}
                of <span className="font-semibold text-slate-700">{applications.length}</span> candidates
              </span>
              <span>Click any candidate row to view full profile and resume content</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Candidate Profile & Resume Inspection Modal ── */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 text-white font-bold text-lg flex items-center justify-center shadow-md">
                  {getInitials(selectedApp.candidateName)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">{selectedApp.candidateName}</h3>
                    {selectedApp.trackingCode && (
                      <button
                        onClick={(e) => handleCopyCode(selectedApp.trackingCode, e)}
                        className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-100 hover:bg-primary-100 inline-flex items-center gap-1"
                        title="Click to copy tracking code"
                      >
                        <span>{selectedApp.trackingCode}</span>
                        {copiedCode === selectedApp.trackingCode ? (
                          <Check size={11} className="text-emerald-600" />
                        ) : (
                          <Copy size={11} className="opacity-60" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-semibold text-primary-600">
                      {selectedApp.jobTitle || selectedApp.vacancyTitle || "General Role"}
                    </span>
                    {selectedApp.department && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">{selectedApp.department}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Contact details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl text-xs text-slate-600 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Mail size={15} className="text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-800 truncate">{selectedApp.email}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone size={15} className="text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-800">{selectedApp.phone || "Not provided"}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin size={15} className="text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-800">
                    {selectedApp.location || "Remote / Not specified"}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Calendar size={15} className="text-slate-400 shrink-0" />
                  <span>
                    Applied on{" "}
                    {selectedApp.appliedDate ||
                      (selectedApp.createdAt ? String(selectedApp.createdAt).slice(0, 10) : "Recently")}
                  </span>
                </div>
              </div>

              {/* Status & Experience */}
              <div className="flex items-center justify-between p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase">Current Status</span>
                  <div className="mt-1 flex items-center gap-2">
                    {(() => {
                      const st = STATUS_CONFIG[selectedApp.status] || STATUS_CONFIG.NEW;
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${st.bg} ${st.text} ${st.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                          {st.label}
                        </span>
                      );
                    })()}

                    {selectedApp.eligibilityStatus && (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                        Eligibility: {selectedApp.eligibilityStatus}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Experience</span>
                  <div className="mt-1 text-sm font-bold text-slate-800">
                    {selectedApp.experienceYears ?? 0} Years
                  </div>
                </div>
              </div>

              {/* Professional Summary */}
              {selectedApp.summary && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Candidate Overview
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                    {selectedApp.summary}
                  </p>
                </div>
              )}

              {/* Education */}
              {selectedApp.education && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Education
                  </h4>
                  <div className="flex items-center gap-2.5 p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 text-sm text-slate-800">
                    <GraduationCap size={18} className="text-primary-600 shrink-0" />
                    <span>{selectedApp.education}</span>
                  </div>
                </div>
              )}

              {/* Skills Tags */}
              {selectedApp.skills && selectedApp.skills.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Key Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedApp.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 rounded-xl text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-100"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resume Document Card & Extracted Plaintext Inspection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Resume Document
                  </h4>
                  {selectedApp.resumeText && (
                    <button
                      onClick={() => setShowResumeText(!showResumeText)}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-800 inline-flex items-center gap-1"
                    >
                      <span>{showResumeText ? "Hide Resume Text" : "View Extracted Text"}</span>
                      <ChevronRight
                        size={14}
                        className={`transition-transform ${showResumeText ? "rotate-90" : ""}`}
                      />
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">
                        {selectedApp.resumeFileName || "Candidate_Resume.pdf"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {selectedApp.resumeFileSize || "PDF Document"}
                        {selectedApp.downloadCount > 0 && ` • Downloaded ${selectedApp.downloadCount} times`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadResume(selectedApp)}
                    disabled={downloadingId === selectedApp.id}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-sm transition-all shrink-0 disabled:opacity-50"
                  >
                    {downloadingId === selectedApp.id ? (
                      <Loader2 size={14} className="animate-spin text-white" />
                    ) : (
                      <Download size={14} />
                    )}
                    <span>Download PDF</span>
                  </button>
                </div>

                {/* Extracted plain text parsed via Apache PDFBox */}
                {showResumeText && selectedApp.resumeText && (
                  <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-xs font-mono leading-relaxed max-h-56 overflow-y-auto border border-slate-800 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                      <span className="flex items-center gap-1.5 font-sans font-semibold text-primary-400">
                        <Sparkles size={13} />
                        Apache PDFBox ATS Text Extraction
                      </span>
                      <span>{selectedApp.resumeText.length} characters</span>
                    </div>
                    <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-300">
                      {selectedApp.resumeText}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <Link
                to={`/recruitment/applications/review${selectedApp.id ? `?id=${selectedApp.id}` : ""}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
              >
                <ClipboardCheck size={14} />
                <span>Screen & Review Candidate</span>
              </Link>
              <button
                onClick={() => setSelectedApp(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Job Vacancy Details Modal (Styled like Public Career Page Added Vacancy Details) ── */}
      {selectedVacancyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 animate-scaleUp">
            {/* Header: Dark Navy banner styled like Public Careers layout */}
            <div className="p-6 bg-gradient-to-r from-primary-900 via-primary-800 to-primary-900 text-white flex items-start justify-between border-b border-primary-900/40 relative">
              <div className="space-y-3 max-w-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-500/30 border border-primary-400/40 text-primary-200 text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1 shadow-xs">
                    <Sparkles size={11} className="text-amber-400" />
                    Career Vacancy Details
                  </span>
                  {selectedVacancyModal.status && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      {selectedVacancyModal.status}
                    </span>
                  )}
                </div>

                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  {selectedVacancyModal.title}
                </h3>

                {/* Hero Chips: Department & Job Type */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-primary-100 border border-white/15">
                    <Building2 size={13} className="text-primary-300" />
                    {selectedVacancyModal.department || "General"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-primary-100 border border-white/15">
                    <Clock size={13} className="text-primary-300" />
                    {selectedVacancyModal.jobType || "Full-time"}
                  </span>
                  {selectedVacancyModal.vacancyCount && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-primary-100 border border-white/15">
                      <Users size={13} className="text-primary-300" />
                      {selectedVacancyModal.vacancyCount} {selectedVacancyModal.vacancyCount === 1 ? "Opening" : "Openings"}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedVacancyModal(null)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: 2-Column Responsive Layout like CareerJob.jsx */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left/Main Column (2 cols): Description, Qualifications, Skills */}
                <div className="lg:col-span-2 space-y-6">
                  {/* About the Role / Description */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 tracking-tight uppercase flex items-center gap-2 mb-2">
                      <Briefcase size={16} className="text-primary-600" />
                      About the Role / Job Description
                    </h4>
                    <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/80 whitespace-pre-line">
                      {selectedVacancyModal.description ||
                        "No detailed role description provided for this vacancy position."}
                    </div>
                  </div>

                  {/* Requirements & Qualifications */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 tracking-tight uppercase flex items-center gap-2 mb-2">
                      <GraduationCap size={16} className="text-primary-600" />
                      Requirements & Qualifications
                    </h4>
                    <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/80 whitespace-pre-line">
                      {selectedVacancyModal.qualifications ||
                        "No specific qualifications listed. Candidates are evaluated based on role competencies."}
                    </div>
                  </div>

                  {/* Required Skills */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 tracking-tight uppercase flex items-center gap-2 mb-2">
                      <Sparkles size={16} className="text-amber-500" />
                      Required Skills & Competencies
                    </h4>
                    {Array.isArray(selectedVacancyModal.requiredSkills) &&
                    selectedVacancyModal.requiredSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedVacancyModal.requiredSkills.map((sk) => (
                          <span
                            key={sk}
                            className="px-3 py-1 rounded-xl text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200/80 shadow-2xs"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    ) : typeof selectedVacancyModal.skills === "string" && selectedVacancyModal.skills ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedVacancyModal.skills.split(",").map((sk) => (
                          <span
                            key={sk.trim()}
                            className="px-3 py-1 rounded-xl text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200/80 shadow-2xs"
                          >
                            {sk.trim()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No specific skills tagged</span>
                    )}
                  </div>
                </div>

                {/* Right Facts Column (1 col): Styled like CareerJob.jsx aside */}
                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                  {/* Deadline & Countdown */}
                  {selectedVacancyModal.deadline && (
                    <div className="pb-4 border-b border-slate-200/80">
                      <DeadlineMeter
                        deadline={selectedVacancyModal.deadline}
                        publishedAt={selectedVacancyModal.publishedAt}
                      />
                    </div>
                  )}

                  {/* Facts list */}
                  <div className="space-y-3.5">
                    <div className="flex items-start gap-3">
                      <Users size={16} className="mt-0.5 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">Available Openings</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {selectedVacancyModal.vacancyCount || 1}{" "}
                          {(selectedVacancyModal.vacancyCount || 1) === 1 ? "Position" : "Positions"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Award size={16} className="mt-0.5 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">Experience Level</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {selectedVacancyModal.experienceLevel || "All Levels"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Banknote size={16} className="mt-0.5 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">Salary Range</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {formatSalary(selectedVacancyModal.salaryMin, selectedVacancyModal.salaryMax) ||
                            "Competitive / Undisclosed"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar size={16} className="mt-0.5 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">Application Deadline</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {selectedVacancyModal.deadline
                            ? formatDate(selectedVacancyModal.deadline)
                            : "Open until filled"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Public Career link button if ID exists */}
                  {selectedVacancyModal.id && (
                    <div className="pt-3 border-t border-slate-200/80">
                      <Link
                        to={`/careers/jobs/${selectedVacancyModal.id}`}
                        target="_blank"
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-sm transition-all"
                      >
                        <ExternalLink size={13} />
                        <span>View on Public Careers</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <Link
                to="/recruitment/vacancies"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200/80 transition-colors"
              >
                <Briefcase size={14} />
                <span>Manage Vacancy Postings</span>
              </Link>
              <button
                onClick={() => setSelectedVacancyModal(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Remove Vacancy to Applications History */}
      {confirmArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Archive size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Remove Vacancy</h3>
                <p className="text-xs text-slate-500">Move opening to Applications History</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-slate-900">{confirmArchiveModal.vacancy?.title}</span> from active applications?
              This vacancy and all its submitted applications will be moved to the <span className="font-semibold text-primary-700">Applications History</span> view.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={actionInProgress}
                onClick={() => setConfirmArchiveModal(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionInProgress}
                onClick={handleArchiveVacancy}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                {actionInProgress ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                <span>Confirm & Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </PageLayout>
  );
}