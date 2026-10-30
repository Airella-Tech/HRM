import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";
import {
  ClipboardCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Star,
  Sparkles,
  User,
  Building2,
  Save,
  X,
  FileText,
  AlertCircle,
  GraduationCap,
  Briefcase,
  ChevronRight,
  ArrowRight,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Download,
  CalendarClock,
  RefreshCw,
  Loader2,
  Award,
  Check,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-purple-600",
  "from-sky-400 to-blue-600",
  "from-emerald-400 to-teal-600",
  "from-amber-400 to-orange-500",
  "from-pink-500 to-rose-600",
  "from-violet-500 to-indigo-600",
];

function getScoreBadge(score) {
  const num = Number(score || 0);
  if (num >= 80) return { label: "Strong Match", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200", dotClass: "bg-emerald-500" };
  if (num >= 70) return { label: "Good Fit", badgeClass: "bg-blue-50 text-blue-700 border-blue-200", dotClass: "bg-blue-500" };
  if (num >= 50) return { label: "Moderate", badgeClass: "bg-amber-50 text-amber-700 border-amber-200", dotClass: "bg-amber-500" };
  return { label: "Low Fit", badgeClass: "bg-slate-100 text-slate-600 border-slate-200", dotClass: "bg-slate-400" };
}

/**
 * Confirmed Candidate Review & Assessment Page
 * ONLY displays candidates whose shortlist has been confirmed by recruiters.
 */
export default function RecruitmentApplicationReview() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedVacancyFilter, setSelectedVacancyFilter] = useState("ALL");
  const [statusTab, setStatusTab] = useState("ALL"); // ALL | READY_INTERVIEW | PENDING_NOTES | REVIEWED

  // Interactive Review Drawer / Modal
  const [activeReviewCandidate, setActiveReviewCandidate] = useState(null);
  const [score, setScore] = useState(85);
  const [notes, setNotes] = useState("");
  const [readinessStatus, setReadinessStatus] = useState("READY_FOR_INTERVIEW");
  const [criteria, setCriteria] = useState({
    experienceMatch: true,
    degreeRequirement: true,
    coreSkillsMatch: true,
    communicationCheck: true,
  });
  const [saving, setSaving] = useState(false);
  const [showResumeText, setShowResumeText] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Load Confirmed Shortlisted Candidates ONLY
  const fetchConfirmedCandidates = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch applications with SHORTLISTED status filter from backend
      const appPromise = recruitmentApi.getApplications({ status: "SHORTLISTED" });
      const vacPromise = recruitmentApi.getVacancies ? recruitmentApi.getVacancies() : Promise.resolve({ data: [] });

      const [appRes, vacRes] = await Promise.allSettled([appPromise, vacPromise]);

      if (vacRes.status === "fulfilled" && Array.isArray(vacRes.value?.data)) {
        setVacancies(vacRes.value.data);
      }

      if (appRes.status === "fulfilled" && Array.isArray(appRes.value?.data)) {
        // Strict client-side filter: ONLY candidates with status === "SHORTLISTED"
        const confirmedOnly = appRes.value.data
          .filter((c) => c.status === "SHORTLISTED")
          .map((c) => {
            const rawScore = Number(c.overallScore ?? c.screeningScore ?? c.matchScore ?? 85);
            let parsedSkills = [];
            if (Array.isArray(c.skills)) {
              parsedSkills = c.skills;
            } else if (typeof c.skills === "string") {
              try {
                parsedSkills = JSON.parse(c.skills);
              } catch {
                parsedSkills = c.skills.split(",").map((s) => s.trim()).filter(Boolean);
              }
            }

            return {
              ...c,
              id: c.id,
              candidateName: c.candidateName || "Confirmed Candidate",
              jobTitle: c.jobTitle || c.vacancyTitle || "Job Vacancy",
              vacancyId: c.vacancyId != null ? String(c.vacancyId) : "unassigned",
              department: c.department || "General",
              status: "SHORTLISTED",
              matchScore: rawScore,
              screeningScore: rawScore,
              overallScore: rawScore,
              experienceYears: c.experienceYears ?? 0,
              education: c.education || "Not specified",
              email: c.email || "No email provided",
              phone: c.phone || "No phone provided",
              location: c.location || "Not specified",
              summary: c.summary || "",
              screeningNotes: c.screeningNotes || "",
              decisionSource: c.decisionSource || "RECRUITER_MANUAL",
              decisionReason: c.decisionReason || "Confirmed shortlist candidate meeting position criteria",
              skills: parsedSkills,
              resumeFileName: c.resumeFileName || null,
              resumeText: c.resumeText || null,
              reviewStatus: c.reviewStatus || (c.screeningNotes ? "REVIEWED" : "PENDING_NOTES"),
              readinessStatus: c.readinessStatus || "READY_FOR_INTERVIEW",
            };
          });

        setCandidates(confirmedOnly);
      } else {
        setCandidates([]);
      }
    } catch (err) {
      console.warn("Could not load confirmed shortlist candidates:", err);
      setCandidates([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConfirmedCandidates();
  }, [fetchConfirmedCandidates]);

  // Handle Opening the Detailed Review Modal
  const openReviewModal = (cand) => {
    setActiveReviewCandidate(cand);
    setScore(cand.screeningScore ?? cand.matchScore ?? 85);
    setNotes(cand.screeningNotes || "");
    setReadinessStatus(cand.readinessStatus || "READY_FOR_INTERVIEW");
    setCriteria(
      cand.criteria || {
        experienceMatch: (cand.experienceYears || 0) >= 2,
        degreeRequirement: Boolean(cand.education && cand.education !== "Not specified"),
        coreSkillsMatch: true,
        communicationCheck: true,
      }
    );
    setShowResumeText(false);
  };

  // Save Candidate Review Evaluation
  const saveReview = async (e) => {
    if (e) e.preventDefault();
    if (!activeReviewCandidate) return;

    setSaving(true);
    try {
      if (typeof recruitmentApi?.screenApplication === "function") {
        await recruitmentApi.screenApplication(activeReviewCandidate.id, {
          screeningScore: Number(score),
          screeningNotes: notes,
          eligibilityStatus: "ELIGIBLE",
          criteria,
          readinessStatus,
        });
      }
    } catch (err) {
      console.warn("Screening API note:", err);
    } finally {
      setSaving(false);
    }

    // Update candidate in local state while preserving SHORTLISTED status
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === activeReviewCandidate.id
          ? {
              ...c,
              screeningScore: Number(score),
              matchScore: Number(score),
              screeningNotes: notes,
              criteria,
              reviewStatus: "REVIEWED",
              readinessStatus,
              status: "SHORTLISTED", // Stays confirmed
            }
          : c
      )
    );

    setToastMessage({
      type: "success",
      text: `Review assessment saved for ${activeReviewCandidate.candidateName}!`,
    });
    setTimeout(() => setToastMessage(null), 4000);

    setActiveReviewCandidate(null);
  };

  // Download Resume Handler
  const handleDownloadResume = (cand) => {
    if (typeof recruitmentApi?.downloadResume === "function") {
      recruitmentApi
        .downloadResume(cand.id)
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = cand.resumeFileName || `${cand.candidateName.replace(/\s+/g, "_")}_CV.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        })
        .catch(() => {
          window.open(recruitmentApi.getResumeDownloadUrl(cand.id), "_blank");
        });
    } else {
      window.open(recruitmentApi.getResumeDownloadUrl(cand.id), "_blank");
    }
  };

  // Unique vacancies present in confirmed shortlist
  const vacancyOptions = useMemo(() => {
    const map = new Map();
    candidates.forEach((c) => {
      const key = c.vacancyId || c.jobTitle;
      if (!map.has(key)) {
        map.set(key, { key, title: c.jobTitle, count: 0 });
      }
      map.get(key).count += 1;
    });
    return Array.from(map.values());
  }, [candidates]);

  // Filtered confirmed candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      // 1. Search Query
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.candidateName.toLowerCase().includes(q) ||
        c.jobTitle.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (Array.isArray(c.skills) && c.skills.some((s) => s.toLowerCase().includes(q)));

      if (!matchesSearch) return false;

      // 2. Position Filter
      if (selectedVacancyFilter !== "ALL") {
        const candVacKey = c.vacancyId || c.jobTitle;
        if (candVacKey !== selectedVacancyFilter) return false;
      }

      // 3. Status Tab Filter
      if (statusTab === "READY_INTERVIEW") {
        return c.readinessStatus === "READY_FOR_INTERVIEW";
      }
      if (statusTab === "PENDING_NOTES") {
        return !c.screeningNotes || c.screeningNotes.trim() === "";
      }
      if (statusTab === "REVIEWED") {
        return Boolean(c.screeningNotes && c.screeningNotes.trim() !== "");
      }

      return true;
    });
  }, [candidates, search, selectedVacancyFilter, statusTab]);

  // KPI Metrics
  const totalConfirmed = candidates.length;
  const readyInterviewCount = candidates.filter((c) => c.readinessStatus === "READY_FOR_INTERVIEW").length;
  const pendingNotesCount = candidates.filter((c) => !c.screeningNotes || c.screeningNotes.trim() === "").length;
  const reviewedCount = candidates.filter((c) => Boolean(c.screeningNotes && c.screeningNotes.trim() !== "")).length;
  const avgMatchScore = totalConfirmed > 0
    ? Math.round(candidates.reduce((acc, c) => acc + (c.matchScore || 0), 0) / totalConfirmed)
    : 0;

  return (
    <PageLayout
      role="recruiter"
      activePage="Review Applications"
      title="Confirmed Candidates Review"
      subtitle="Comprehensive profile review, evaluation notes, and interview preparation for confirmed shortlisted candidates"
      actions={
        <div className="flex items-center gap-2">
          <Link
            to="/recruitment/applications/shortlist"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="Go to Shortlist page"
          >
            <UserCheck size={14} className="text-amber-500" />
            <span>Shortlist Candidates</span>
          </Link>
          <button
            onClick={() => fetchConfirmedCandidates(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-indigo-600" : "text-slate-500"} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      }
    >
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Toast Alert Banner */}
        {toastMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span className="font-semibold">{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── KPI Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Confirmed Shortlist
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{totalConfirmed}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Approved for review</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <UserCheck size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Ready for Interview
              </p>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">{readyInterviewCount}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Qualified for scheduling</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <CalendarClock size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Reviewed with Notes
              </p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">{reviewedCount}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Assessment documented</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <ClipboardCheck size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Average Match Score
              </p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{avgMatchScore}%</h3>
              <p className="text-xs text-slate-500 mt-0.5">Across confirmed candidates</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Sparkles size={22} />
            </div>
          </div>
        </div>

        {/* ── Search, Vacancy Filter & Status Tabs ── */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={17} />
              <input
                type="text"
                placeholder="Search candidate, email, skill..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Position Dropdown */}
            <div className="w-full sm:w-64">
              <select
                value={selectedVacancyFilter}
                onChange={(e) => setSelectedVacancyFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
              >
                <option value="ALL">All Positions ({totalConfirmed})</option>
                {vacancyOptions.map((v) => (
                  <option key={v.key} value={v.key}>
                    {v.title} ({v.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 self-start md:self-center">
            {[
              { id: "ALL", label: `All Confirmed (${totalConfirmed})` },
              { id: "READY_INTERVIEW", label: `Ready for Interview (${readyInterviewCount})` },
              { id: "REVIEWED", label: `Reviewed (${reviewedCount})` },
              { id: "PENDING_NOTES", label: `Needs Notes (${pendingNotesCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  statusTab === tab.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Confirmed Candidates Table ── */}
        {loading ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-xs">
            <Loader2 size={36} className="animate-spin text-indigo-600 mx-auto mb-3" />
            <h4 className="font-bold text-slate-800 text-sm">Loading Confirmed Candidates...</h4>
            <p className="text-xs text-slate-400 mt-1">Retrieving candidates confirmed from shortlist</p>
          </div>
        ) : totalConfirmed === 0 ? (
          /* Empty state when NO candidates have been confirmed from shortlist */
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 bg-amber-50 border border-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
              <UserCheck size={32} />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">No Confirmed Shortlisted Candidates Yet</h4>
              <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto">
                Only candidates who have been evaluated and confirmed from the <strong>Candidate Shortlist</strong> page will appear here for review.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/recruitment/applications/shortlist"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <Sparkles size={14} />
                <span>Go to Candidate Shortlist & Confirm Applicants</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : filteredCandidates.length === 0 ? (
          /* Empty state for search / tab filters */
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
            <p className="text-xs text-slate-400 font-medium">
              No confirmed candidates match the selected filters or search criteria.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">Candidate</th>
                    <th scope="col" className="px-5 py-3.5">Target Position</th>
                    <th scope="col" className="px-5 py-3.5">Shortlist Status</th>
                    <th scope="col" className="px-5 py-3.5">Match Score</th>
                    <th scope="col" className="px-5 py-3.5">Review & Notes</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCandidates.map((cand, idx) => {
                    const gradient = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
                    const score = Number(cand.matchScore || 85);
                    const scoreBadge = getScoreBadge(score);
                    const isReadyInterview = cand.readinessStatus === "READY_FOR_INTERVIEW";

                    return (
                      <tr key={cand.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* 1. Candidate Info */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${gradient} text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0`}
                            >
                              {(cand.candidateName || "A")
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 text-sm block truncate">
                                {cand.candidateName}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                <span className="truncate">{cand.email}</span>
                                {cand.phone && cand.phone !== "No phone provided" && (
                                  <>
                                    <span>•</span>
                                    <span>{cand.phone}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Target Position */}
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-800 text-xs">{cand.jobTitle}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <Building2 size={12} className="text-slate-400" />
                            <span>{cand.department}</span>
                          </div>
                        </td>

                        {/* 3. Shortlist Status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              <span>Confirmed Shortlisted</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium pl-1">
                              {cand.decisionSource === "SYSTEM_AUTOMATED" ? "AI Auto-Shortlisted" : "Confirmed by Recruiter"}
                            </span>
                          </div>
                        </td>

                        {/* 4. Match Score */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs ${scoreBadge.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${scoreBadge.dotClass}`} />
                              <span>{score.toFixed(1)}%</span>
                              <span className="font-medium text-[10px] opacity-80">({scoreBadge.label})</span>
                            </div>
                            <div className="text-[10px] text-slate-400 pl-1">
                              {cand.experienceYears} yrs exp • {cand.skills.length} skills listed
                            </div>
                          </div>
                        </td>

                        {/* 5. Review Assessment & Notes */}
                        <td className="px-5 py-4">
                          <div className="max-w-xs space-y-1">
                            {cand.screeningNotes ? (
                              <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-200/70 truncate italic">
                                "{cand.screeningNotes}"
                              </p>
                            ) : (
                              <span className="text-xs text-slate-400 italic">No review notes recorded yet</span>
                            )}
                            <div>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isReadyInterview
                                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {isReadyInterview ? "✓ Ready for Interview" : "Under Evaluation"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 6. Action Controls */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openReviewModal(cand)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                              title="Review candidate profile and document evaluation notes"
                            >
                              <ClipboardCheck size={13} />
                              <span>Review Details</span>
                            </button>

                            <Link
                              to={`/recruitment/interviews?view=schedule&candidateId=${cand.id}&vacancyId=${cand.vacancyId}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                              title="Schedule an interview for this confirmed candidate"
                            >
                              <CalendarClock size={13} />
                              <span>Schedule</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Interactive Candidate Review & Assessment Modal ── */}
      {activeReviewCandidate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
                  Confirmed Candidate Assessment
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {activeReviewCandidate.candidateName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Position: <strong className="text-slate-800">{activeReviewCandidate.jobTitle}</strong> • {activeReviewCandidate.department}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveReviewCandidate(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={saveReview} className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Confirmed Status & Match Score Card */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-emerald-950 block">
                      Shortlist Confirmed Candidate
                    </span>
                    <span className="text-xs text-emerald-800">
                      Approved through screening evaluation meeting vacancy criteria.
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-emerald-700 uppercase font-bold block">Match Score</span>
                  <span className="text-xl font-black text-emerald-900">
                    {(activeReviewCandidate.matchScore || 85).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Profile Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Contact Information</span>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Mail size={12} className="text-slate-400" />
                    <span>{activeReviewCandidate.email}</span>
                  </p>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Phone size={12} className="text-slate-400" />
                    <span>{activeReviewCandidate.phone || "No phone provided"}</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Experience & Qualifications</span>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Briefcase size={12} className="text-slate-400" />
                    <span>{activeReviewCandidate.experienceYears} Years Recorded Experience</span>
                  </p>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <GraduationCap size={12} className="text-slate-400" />
                    <span>{activeReviewCandidate.education}</span>
                  </p>
                </div>
              </div>

              {/* Candidate Skills List */}
              {activeReviewCandidate.skills.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                    Candidate Skills ({activeReviewCandidate.skills.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {activeReviewCandidate.skills.map((s) => (
                      <span
                        key={s}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resume / CV Document Access */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <FileText size={16} className="text-indigo-600" />
                  <span className="font-semibold text-slate-800">
                    {activeReviewCandidate.resumeFileName || "Candidate_Resume.pdf"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {activeReviewCandidate.resumeText && (
                    <button
                      type="button"
                      onClick={() => setShowResumeText(!showResumeText)}
                      className="px-2.5 py-1 text-xs font-semibold bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-lg cursor-pointer"
                    >
                      {showResumeText ? "Hide Resume Text" : "View Resume Text"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownloadResume(activeReviewCandidate)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download CV</span>
                  </button>
                </div>
              </div>

              {/* ATS Resume Plaintext Extracted Preview */}
              {showResumeText && activeReviewCandidate.resumeText && (
                <div className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono max-h-40 overflow-y-auto space-y-1">
                  <span className="text-indigo-300 font-sans font-bold block pb-1 border-b border-slate-800">
                    ATS Resume Extracted Plaintext
                  </span>
                  <pre className="whitespace-pre-wrap">{activeReviewCandidate.resumeText}</pre>
                </div>
              )}

              {/* Screening & Interview Readiness Recommendation */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                  Interview Readiness Recommendation
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "READY_FOR_INTERVIEW", label: "✓ Ready for Interview" },
                    { id: "UNDER_REVIEW", label: "⏳ Needs Further Evaluation" },
                    { id: "SECOND_OPINION", label: "👥 2nd Reviewer Needed" },
                    { id: "HOLD", label: "⏸️ Put on Hold" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setReadinessStatus(opt.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold text-left border transition-all cursor-pointer ${
                        readinessStatus === opt.id
                          ? "bg-indigo-50 border-indigo-600 text-indigo-900 ring-2 ring-indigo-500/30"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reviewer Evaluation Checkpoints */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                  Eligibility & Verification Checkpoints
                </label>
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={criteria.experienceMatch}
                      onChange={(e) =>
                        setCriteria((c) => ({ ...c, experienceMatch: e.target.checked }))
                      }
                      className="rounded accent-indigo-600 w-4 h-4"
                    />
                    <span>Verified minimum required years of experience ({activeReviewCandidate.experienceYears} yrs)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={criteria.degreeRequirement}
                      onChange={(e) =>
                        setCriteria((c) => ({ ...c, degreeRequirement: e.target.checked }))
                      }
                      className="rounded accent-indigo-600 w-4 h-4"
                    />
                    <span>Verified educational degree / professional credentials</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={criteria.coreSkillsMatch}
                      onChange={(e) =>
                        setCriteria((c) => ({ ...c, coreSkillsMatch: e.target.checked }))
                      }
                      className="rounded accent-indigo-600 w-4 h-4"
                    />
                    <span>Verified core technical competencies & primary domain skills</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={criteria.communicationCheck}
                      onChange={(e) =>
                        setCriteria((c) => ({ ...c, communicationCheck: e.target.checked }))
                      }
                      className="rounded accent-indigo-600 w-4 h-4"
                    />
                    <span>Verified language proficiency & communication presentation</span>
                  </label>
                </div>
              </div>

              {/* Review Notes & Interview Prep */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Screening Review Notes & Interview Focus Areas
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record strengths, interview discussion topics, technical focus areas, or recruiter observations..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveReviewCandidate(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>{saving ? "Saving..." : "Save Assessment Notes"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const cand = activeReviewCandidate;
                      saveReview();
                      navigate(`/recruitment/interviews?view=schedule&candidateId=${cand.id}&vacancyId=${cand.vacancyId}`);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <CalendarClock size={14} />
                    <span>Schedule Interview →</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
