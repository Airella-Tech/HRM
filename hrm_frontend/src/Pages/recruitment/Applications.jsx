import React, { useEffect, useState, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";
import RecruitmentApplicationReview from "./ApplicationReview";
import RecruitmentCandidateShortlist from "./CandidateShortlist";
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
} from "lucide-react";

const STATUS_CONFIG = {
  NEW: {
    label: "New",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
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
  "from-indigo-500 to-purple-600",
  "from-sky-400 to-blue-600",
  "from-emerald-400 to-teal-600",
  "from-amber-400 to-orange-500",
  "from-pink-500 to-rose-600",
  "from-violet-500 to-indigo-600",
];

export default function RecruitmentApplications() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const viewParam = (searchParams.get("view") || "").toLowerCase();

  const [applications, setApplications] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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

  // Helper for per-group status filter
  const getGroupStatus = (groupKey) => groupStatusFilters[groupKey] || "ALL";
  const setGroupStatus = (groupKey, status) => {
    setGroupStatusFilters((prev) => ({
      ...prev,
      [groupKey]: status,
    }));
  };

  // Load real applications & vacancies from backend
  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [appsRes, vacsRes] = await Promise.allSettled([
        recruitmentApi.getApplications(),
        recruitmentApi.getVacancies(),
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
            allApplications: [],
            searchMatchedApplications: [],
          });
        }
      }

      const group = groupMap.get(key);
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

  // Master list filtered applications (for master list mode)
  const masterFilteredApplications = useMemo(() => {
    const all = vacancyGroups.flatMap((g) => g.searchMatchedApplications);
    if (masterStatusFilter === "ALL") return all;
    return all.filter((a) => a.status === masterStatusFilter);
  }, [vacancyGroups, masterStatusFilter]);

  // Total count matching active search across all groups
  const totalSearchMatched = useMemo(() => {
    return vacancyGroups.reduce((acc, g) => acc + g.searchMatchedApplications.length, 0);
  }, [vacancyGroups]);

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
            to="/recruitment/vacancies"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-semibold shadow-sm transition-all"
          >
            <Briefcase size={15} className="text-slate-500" />
            <span className="hidden sm:inline">Vacancies</span>
          </Link>
          <Link
            to="/recruitment/applications/review"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-semibold shadow-sm transition-all"
          >
            <ClipboardCheck size={15} className="text-indigo-600" />
            <span className="hidden sm:inline">Screening</span>
          </Link>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={refreshing || loading ? "animate-spin text-indigo-600" : "text-slate-500"}
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

        {/* ── Metric Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Applications
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</h3>
              <p className="text-xs text-slate-400 mt-1">Across all vacancies</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FileText size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Positions Applied
              </p>
              <h3 className="text-2xl font-bold text-violet-600 mt-1">{metrics.positionsWithApps}</h3>
              <p className="text-xs text-slate-400 mt-1">Active job openings</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              <Briefcase size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                New Applicants
              </p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">{metrics.newCount}</h3>
              <p className="text-xs text-slate-400 mt-1">Awaiting initial review</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Clock size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Shortlisted
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{metrics.shortlistedCount}</h3>
              <p className="text-xs text-slate-400 mt-1">Qualified candidates</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>

        {/* ── Search & Filter Controls Toolbar ── */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={17} />
              <input
                type="text"
                placeholder="Search candidates by name, email, skills, tracking code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
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
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all max-w-[200px]"
                >
                  <option value="ALL">All Applied Positions ({vacancySelectorList.length})</option>
                  {vacancySelectorList.map((v) => (
                    <option key={v.key} value={v.key}>
                      {v.title} ({v.applicantCount})
                    </option>
                  ))}
                </select>
              </div>

              {/* View Mode Toggle: Separated vs Unified Table */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <button
                  onClick={() => setViewMode("grouped")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "grouped"
                      ? "bg-white text-indigo-700 shadow-sm"
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
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="View all candidates in one combined master table"
                >
                  <List size={14} />
                  <span>Master List</span>
                </button>
              </div>

              {/* Expand / Collapse All (in grouped mode) */}
              {viewMode === "grouped" && vacancyGroups.length > 0 && (
                <div className="hidden sm:flex items-center gap-1 border-l border-slate-200 pl-2">
                  <button
                    onClick={() => toggleAllGroups(true)}
                    className="p-1.5 text-xs text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                    title="Expand all role sections"
                  >
                    Expand All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => toggleAllGroups(false)}
                    className="p-1.5 text-xs text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                    title="Collapse all role sections"
                  >
                    Collapse All
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Position Filter Pills & Reset Action */}
          {vacancySelectorList.length > 1 && (
            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar flex-1">
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 border border-indigo-200/80 shadow-2xs">
                  <Briefcase size={12} className="text-indigo-600" />
                  Positions:
                </span>
                <button
                  onClick={() => setSelectedVacancyId("ALL")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    selectedVacancyId === "ALL"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All Positions ({applications.length})
                </button>
                {vacancySelectorList.map((vac) => {
                  const active = selectedVacancyId === vac.key;
                  return (
                    <button
                      key={vac.key}
                      onClick={() => setSelectedVacancyId(vac.key)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        active
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <span>{vac.title}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          active ? "bg-white/20 text-white" : "bg-white text-slate-600"
                        }`}
                      >
                        {vac.applicantCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {(search || selectedVacancyId !== "ALL") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setSelectedVacancyId("ALL");
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0 py-1"
                >
                  <RefreshCw size={12} />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Main Candidate Content Area ── */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Loading candidate applications...</p>
            <p className="text-xs text-slate-400">Connecting to recruitment database</p>
          </div>
        ) : applications.length === 0 ? (
          /* Empty State: Zero Applications in Database */
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-16 text-center max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
              <FolderKanban size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">No Candidate Applications Yet</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                Candidate submissions from your published job vacancies will automatically appear
                here, separated and organized by position. Once candidates submit their profiles via
                the Careers Portal, you will be able to review, score, and screen them directly.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/recruitment/vacancies"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Briefcase size={14} />
                <span>View Job Vacancies</span>
              </Link>
              <Link
                to="/careers"
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
              >
                <ExternalLink size={14} />
                <span>Open Careers Portal</span>
              </Link>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all"
              >
                <RefreshCw size={14} />
                <span>Refresh</span>
              </button>
            </div>
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
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              Reset Search Filter
            </button>
          </div>
        ) : viewMode === "grouped" ? (
          /* ══════════════════════════════════════════════════════════════
             MODE 1: SEPARATED TABLES WITH STATUS TABS UNDER EACH POSITION
             ══════════════════════════════════════════════════════════════ */
          <div className="space-y-6">
            {vacancyGroups.map((group, groupIdx) => {
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
                  className="bg-white rounded-3xl border-2 border-indigo-100 shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg"
                >
                  {/* ── Vacancy Group Header (Prominently Highlighted Position Topic) ── */}
                  <div
                    onClick={() => toggleGroup(group.key)}
                    className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:from-slate-800 hover:to-indigo-900 transition-all border-b border-indigo-900/60"
                  >
                    {/* Left: Highlighted Position Topic Field */}
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30 border border-indigo-400/40">
                        <Briefcase size={24} />
                      </div>
                      <div className="space-y-1.5">
                        {/* Topic Category & Meta Pills */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1 shadow-xs">
                            <Layers size={11} className="text-amber-400" />
                            Applied Position
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-indigo-200 border border-white/10">
                            <Building2 size={12} className="text-indigo-300" />
                            <span>{group.department}</span>
                          </span>
                          {group.jobType && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                              {group.jobType}
                            </span>
                          )}
                          {group.vacancyCount > 1 && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300">
                              {group.vacancyCount} Openings
                            </span>
                          )}
                        </div>

                        {/* Bold Prominent Position Title */}
                        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                          <span>{group.title}</span>
                        </h3>
                      </div>
                    </div>

                    {/* Right: Summary pill & Collapse toggle */}
                    <div className="flex items-center gap-2.5 self-end md:self-auto" onClick={(e) => e.stopPropagation()}>
                      <span className="px-3.5 py-1.5 rounded-xl bg-white/15 text-white text-xs font-bold border border-white/20 backdrop-blur-sm shadow-xs flex items-center gap-1.5">
                        <Users size={14} className="text-indigo-300" />
                        <span>{totalForGroup} {totalForGroup === 1 ? "Applicant" : "Applicants"}</span>
                      </span>

                      {/* Collapse/Expand button */}
                      <button
                        onClick={() => toggleGroup(group.key)}
                        className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
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
                                    ? "bg-indigo-600 text-white shadow-sm"
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
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
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
                                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                              >
                                View all {totalForGroup} applicants for this position
                              </button>
                            )}
                          </div>
                        ) : (
                          <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
                              <tr>
                                <th className="px-6 py-3.5">Candidate Details</th>
                                <th className="px-6 py-3.5">Experience & Education</th>
                                <th className="px-6 py-3.5">Key Skills</th>
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
                                    className="hover:bg-indigo-50/30 cursor-pointer transition-colors"
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
                                          <div className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-2">
                                            <span>{app.candidateName}</span>
                                            {app.trackingCode && (
                                              <span
                                                onClick={(e) => handleCopyCode(app.trackingCode, e)}
                                                title="Click to copy tracking code"
                                                className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
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
                                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                            <span className="truncate max-w-[180px]">
                                              {app.email}
                                            </span>
                                            {app.phone && (
                                              <>
                                                <span>•</span>
                                                <span>{app.phone}</span>
                                              </>
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

                                    {/* Skills */}
                                    <td className="px-6 py-4">
                                      {Array.isArray(app.skills) && app.skills.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                                          {app.skills.slice(0, 3).map((sk) => (
                                            <span
                                              key={sk}
                                              className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200"
                                            >
                                              {sk}
                                            </span>
                                          ))}
                                          {app.skills.length > 3 && (
                                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-slate-400">
                                              +{app.skills.length - 3}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-slate-400 italic">
                                          No skills listed
                                        </span>
                                      )}
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
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 transition-all disabled:opacity-50"
                                        >
                                          {downloadingId === app.id ? (
                                            <Loader2
                                              size={13}
                                              className="animate-spin text-indigo-600"
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
                                          className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
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
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
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
                          ? "bg-indigo-600 text-white shadow-sm"
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
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
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
                              <div className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-2">
                                <span>{app.candidateName}</span>
                                {app.trackingCode && (
                                  <span
                                    onClick={(e) => handleCopyCode(app.trackingCode, e)}
                                    title="Click to copy tracking code"
                                    className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
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
                              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{app.email}</span>
                                {app.phone && (
                                  <>
                                    <span>•</span>
                                    <span>{app.phone}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Vacancy */}
                        <td className="px-6 py-4">
                          <div className="inline-flex flex-col items-start gap-1">
                            <span className="px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200/90 text-indigo-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                              <Briefcase size={12} className="text-indigo-600 shrink-0" />
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
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 transition-all disabled:opacity-50"
                            >
                              {downloadingId === app.id ? (
                                <Loader2 size={13} className="animate-spin text-indigo-600" />
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
                              className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
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
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-lg flex items-center justify-center shadow-md">
                  {getInitials(selectedApp.candidateName)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">{selectedApp.candidateName}</h3>
                    {selectedApp.trackingCode && (
                      <button
                        onClick={(e) => handleCopyCode(selectedApp.trackingCode, e)}
                        className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 inline-flex items-center gap-1"
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
                    <span className="text-sm font-semibold text-indigo-600">
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
                    <GraduationCap size={18} className="text-indigo-600 shrink-0" />
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
                        className="px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
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
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
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
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
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
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all shrink-0 disabled:opacity-50"
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
                      <span className="flex items-center gap-1.5 font-sans font-semibold text-indigo-400">
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
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
    </PageLayout>
  );
}