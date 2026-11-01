import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";
import { DeadlineMeter } from "../careers/careersShared";
import { formatSalary, formatDate } from "../../utils/careersFormat";
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
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  UserCheck,
  UserX,
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
  Banknote,
} from "lucide-react";

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-purple-600",
  "from-sky-400 to-blue-600",
  "from-emerald-400 to-teal-600",
  "from-amber-400 to-orange-500",
  "from-pink-500 to-rose-600",
  "from-violet-500 to-indigo-600",
];

const REJECTION_REASONS = [
  "Qualifications / experience do not align with requirements",
  "Technical skills assessment did not meet required benchmark",
  "Communication or role fit misalignment",
  "Salary expectations or availability constraints",
  "Other",
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

  // Collapsed vacancy groups state
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleCollapse = (key) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const expandAll = () => setCollapsedGroups({});
  const collapseAll = (groups) => {
    const all = {};
    (groups || []).forEach((g) => {
      all[g.vacancyKey] = true;
    });
    setCollapsedGroups(all);
  };

  // Interactive Review Drawer / Modal
  const [activeReviewCandidate, setActiveReviewCandidate] = useState(null);

  // Selected Vacancy Modal (Job Vacancy Details like Public Career Page)
  const [selectedVacancyModal, setSelectedVacancyModal] = useState(null);
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

  // Rejection handling state
  const [rejectingCandidate, setRejectingCandidate] = useState(null);
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0]);
  const [customRejectionReason, setCustomRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const openRejectModal = (cand) => {
    setRejectingCandidate(cand);
    setRejectionReason(REJECTION_REASONS[0]);
    setCustomRejectionReason("");
  };

  const handleConfirmReject = async () => {
    if (!rejectingCandidate) return;
    setRejecting(true);

    const finalReason =
      rejectionReason === "Other" && customRejectionReason.trim()
        ? customRejectionReason.trim()
        : rejectionReason;

    try {
      if (typeof recruitmentApi?.rejectCandidate === "function") {
        await recruitmentApi.rejectCandidate(rejectingCandidate.id, finalReason);
      }
    } catch (err) {
      console.warn("Reject candidate API note:", err);
    } finally {
      setRejecting(false);
    }

    // Remove candidate from confirmed review list
    setCandidates((prev) => prev.filter((c) => c.id !== rejectingCandidate.id));

    setToastMessage({
      type: "info",
      text: `${rejectingCandidate.candidateName} has been rejected and removed from review.`,
    });
    setTimeout(() => setToastMessage(null), 4000);

    // If active review modal was open for this candidate, close it too
    if (activeReviewCandidate?.id === rejectingCandidate.id) {
      setActiveReviewCandidate(null);
    }
    setRejectingCandidate(null);
  };


  // Load Confirmed Shortlisted Candidates ONLY (with real evaluation & config data)
  const fetchConfirmedCandidates = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch applications with SHORTLISTED status filter from backend
      const appPromise = recruitmentApi.getApplications({ status: "SHORTLISTED" });
      const vacPromise = recruitmentApi.getVacancies ? recruitmentApi.getVacancies() : Promise.resolve({ data: [] });

      const [appRes, vacRes] = await Promise.allSettled([appPromise, vacPromise]);

      const configMap = {};
      const resultMap = new Map();

      if (vacRes.status === "fulfilled" && Array.isArray(vacRes.value?.data)) {
        const loadedVacs = vacRes.value.data;
        setVacancies(loadedVacs);

        // Preload configs and saved screening evaluation results for real data
        try {
          const configPromises = loadedVacs.map((v) =>
            recruitmentApi.getScreeningConfig ? recruitmentApi.getScreeningConfig(v.id).catch(() => null) : Promise.resolve(null)
          );
          const resultsPromises = loadedVacs.map((v) =>
            recruitmentApi.getVacancyScreeningResults ? recruitmentApi.getVacancyScreeningResults(v.id).catch(() => null) : Promise.resolve(null)
          );

          const [configsSettled, resultsSettled] = await Promise.all([
            Promise.allSettled(configPromises),
            Promise.allSettled(resultsPromises),
          ]);

          configsSettled.forEach((res, i) => {
            if (res.status === "fulfilled" && res.value?.data) {
              const cfg = res.value.data;
              const vId = loadedVacs[i].id;
              configMap[vId] = cfg;
              configMap[String(vId)] = cfg;
            }
          });

          const allSavedResults = [];
          resultsSettled.forEach((res) => {
            if (res.status === "fulfilled" && Array.isArray(res.value?.data)) {
              allSavedResults.push(...res.value.data);
            }
          });

          // Order is newest first; keep only newest evaluation per candidate
          allSavedResults.forEach((r) => {
            const appId = Number(r.applicationId);
            if (appId && !resultMap.has(appId)) {
              resultMap.set(appId, r);
            }
          });
        } catch (err2) {
          console.warn("Could not preload screening details in review:", err2);
        }
      }

      if (appRes.status === "fulfilled" && Array.isArray(appRes.value?.data)) {
        // Strict client-side filter: ONLY candidates with status === "SHORTLISTED"
        const confirmedOnly = appRes.value.data
          .filter((c) => c.status === "SHORTLISTED")
          .map((c) => {
            const evaluated = resultMap.get(Number(c.id));
            const rawScore = Number(evaluated?.overallScore ?? c.overallScore ?? c.screeningScore ?? c.matchScore ?? 85);
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

            // Parse saved criteria JSON if present
            let parsedCriteria = null;
            if (c.criteriaJson) {
              try {
                const parsed = typeof c.criteriaJson === "string" ? JSON.parse(c.criteriaJson) : c.criteriaJson;
                if (parsed && typeof parsed === "object" && ("experienceMatch" in parsed || "coreSkillsMatch" in parsed)) {
                  parsedCriteria = parsed;
                }
              } catch {
                parsedCriteria = null;
              }
            }

            const vacConfig = configMap[c.vacancyId] || configMap[String(c.vacancyId)];
            const reqExpYears = vacConfig?.minExperienceYears ?? (Number(c.experienceYears || 0) >= 3 ? 3 : 2);

            // Strict criteria evaluation: Auto-mark ONLY criteria that actually MET in auto screening
            const isExpMet = evaluated
              ? (evaluated.mandatoryExperienceMet === "MET" || (evaluated.breakdown?.mandatoryExperienceStatus === "MET"))
              : ((Number(c.experienceYears || 0)) >= reqExpYears);

            const isEduMet = evaluated
              ? (evaluated.mandatoryQualificationsMet === "MET" || (evaluated.breakdown?.mandatoryEducationStatus === "MET"))
              : false;

            const isSkillsMet = evaluated
              ? (evaluated.mandatorySkillsMet === "MET" && (!evaluated.breakdown?.missingRequiredSkills || evaluated.breakdown.missingRequiredSkills.length === 0))
              : false;

            const isCommMet = evaluated
              ? (Number(evaluated.evidenceScore || 0) >= 70)
              : false;

            // Two-Tier criteria: Recruiter human verification checkpoints
            const effectiveCriteria = {
              degreeVerified: Boolean(parsedCriteria?.degreeVerified ?? parsedCriteria?.degreeRequirement),
              communicationVerified: Boolean(parsedCriteria?.communicationVerified ?? parsedCriteria?.communicationCheck),
              backgroundVerified: Boolean(parsedCriteria?.backgroundVerified),
            };

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
              skillsScore: evaluated?.skillsScore ?? c.skillsScore ?? rawScore,
              experienceScore: evaluated?.experienceScore ?? c.experienceScore ?? rawScore,
              qualificationsScore: evaluated?.qualificationsScore ?? c.qualificationsScore ?? rawScore,
              evidenceScore: evaluated?.evidenceScore ?? c.evidenceScore ?? rawScore,
              experienceYears: c.experienceYears ?? 0,
              requiredExperienceYears: reqExpYears,
              minimumScore: vacConfig?.minimumScore ?? 75,
              education: c.education || "Not specified",
              email: c.email || "No email provided",
              phone: c.phone || "No phone provided",
              location: c.location || "Not specified",
              summary: c.summary || "",
              screeningNotes: c.screeningNotes || evaluated?.decisionReason || "",
              decisionSource: evaluated?.decisionSource || c.decisionSource || "RECRUITER_MANUAL",
              decisionReason: evaluated?.decisionReason || c.decisionReason || "Confirmed shortlist candidate meeting position criteria",
              skills: parsedSkills,
              resumeFileName: c.resumeFileName || null,
              resumeText: c.resumeText || null,
              isExpMet,
              isEduMet,
              isSkillsMet,
              isCommMet,
              criteria: effectiveCriteria,
              criteriaJson: c.criteriaJson,
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
        degreeVerified: Boolean(cand.criteria?.degreeVerified),
        communicationVerified: Boolean(cand.criteria?.communicationVerified),
        backgroundVerified: Boolean(cand.criteria?.backgroundVerified),
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
      if (statusTab === "UNDER_REVIEW") {
        return c.readinessStatus === "UNDER_REVIEW";
      }
      if (statusTab === "SECOND_OPINION") {
        return c.readinessStatus === "SECOND_OPINION";
      }
      if (statusTab === "HOLD") {
        return c.readinessStatus === "HOLD";
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

  // Group confirmed candidates by vacancy
  const vacancyGroups = useMemo(() => {
    const map = new Map();
    filteredCandidates.forEach((c) => {
      const key = c.vacancyId || c.jobTitle || "unassigned";
      if (!map.has(key)) {
        const matchedVac = vacancies.find(
          (v) =>
            (c.vacancyId && String(v.id) === String(c.vacancyId)) ||
            (c.jobTitle && v.title?.toLowerCase() === c.jobTitle.toLowerCase())
        );
        map.set(key, {
          vacancyKey: key,
          vacancyId: c.vacancyId,
          title: c.jobTitle || "Job Vacancy",
          department: c.department || "General",
          rawVacancy: matchedVac || null,
          candidates: [],
        });
      }
      map.get(key).candidates.push(c);
    });

    // Sort candidates inside each vacancy group strictly by match score descending
    return Array.from(map.values()).map((g) => ({
      ...g,
      candidates: g.candidates.sort((a, b) => {
        const scoreA = Number(a.matchScore ?? a.screeningScore ?? 0);
        const scoreB = Number(b.matchScore ?? b.screeningScore ?? 0);
        return scoreB - scoreA;
      }),
    }));
  }, [filteredCandidates, vacancies]);

  // KPI Metrics & Counts for all readiness recommendation categories
  const totalConfirmed = candidates.length;
  const readyInterviewCount = candidates.filter((c) => c.readinessStatus === "READY_FOR_INTERVIEW").length;
  const needsEvalCount = candidates.filter((c) => c.readinessStatus === "UNDER_REVIEW").length;
  const secondOpinionCount = candidates.filter((c) => c.readinessStatus === "SECOND_OPINION").length;
  const holdCount = candidates.filter((c) => c.readinessStatus === "HOLD").length;
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
              { id: "READY_INTERVIEW", label: `✓ Ready (${readyInterviewCount})` },
              { id: "UNDER_REVIEW", label: `⏳ Needs Eval (${needsEvalCount})` },
              { id: "SECOND_OPINION", label: `👥 2nd Reviewer (${secondOpinionCount})` },
              { id: "HOLD", label: `⏸️ On Hold (${holdCount})` },
              { id: "REVIEWED", label: `Reviewed (${reviewedCount})` },
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
          <div className="space-y-6">
            {/* Vacancy groups summary & Expand/Collapse All buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Confirmed Candidates by Vacancy
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {vacancyGroups.length} {vacancyGroups.length === 1 ? "Vacancy" : "Vacancies"} • {filteredCandidates.length} {filteredCandidates.length === 1 ? "Candidate" : "Candidates"}
                </span>
              </div>

              {vacancyGroups.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="text-slate-600 hover:text-indigo-600 font-semibold transition-colors cursor-pointer"
                  >
                    Expand All
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => collapseAll(vacancyGroups)}
                    className="text-slate-600 hover:text-indigo-600 font-semibold transition-colors cursor-pointer"
                  >
                    Collapse All
                  </button>
                </div>
              )}
            </div>

            {/* Vacancy Separated Candidate Tables */}
            {vacancyGroups.map((group) => {
              const isCollapsed = Boolean(collapsedGroups[group.vacancyKey]);
              const avgScore =
                group.candidates.length > 0
                  ? Math.round(
                      group.candidates.reduce((acc, c) => acc + (c.matchScore || 0), 0) /
                        group.candidates.length
                    )
                  : 0;

              return (
                <div
                  key={group.vacancyKey}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden transition-all duration-200 hover:shadow-sm"
                >
                  {/* ── Vacancy Header ── */}
                  <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0 shadow-inner">
                        <Briefcase size={20} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-white tracking-tight">
                            {group.title}
                          </h3>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                            <Building2 size={11} />
                            <span>{group.department}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                            <UserCheck size={13} />
                            <span>
                              {group.candidates.length} Confirmed{" "}
                              {group.candidates.length === 1 ? "Candidate" : "Candidates"}
                            </span>
                          </span>
                          <span className="text-slate-500">•</span>
                          <span>
                            Avg Match Score:{" "}
                            <strong className="text-amber-300 font-bold">{avgScore}%</strong>
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Job Vacancy Details Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVacancyModal(group.rawVacancy || {
                            id: group.vacancyId,
                            title: group.title,
                            department: group.department,
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition-all cursor-pointer backdrop-blur-xs"
                        title="Display job vacancy details like public career page"
                      >
                        <FileText size={13} className="text-indigo-300 shrink-0" />
                        <span>Job Vacancy Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleCollapse(group.vacancyKey)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition-all cursor-pointer backdrop-blur-xs"
                      >
                        {isCollapsed ? (
                          <>
                            <ChevronDown size={14} />
                            <span>Expand</span>
                          </>
                        ) : (
                          <>
                            <ChevronUp size={14} />
                            <span>Collapse</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* ── Vacancy Candidates Table (Target Position column removed) ── */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                          <tr>
                            <th scope="col" className="px-5 py-3.5 w-60">Candidate</th>
                            <th scope="col" className="px-5 py-3.5 w-48">Match Score</th>
                            <th scope="col" className="px-5 py-3.5">Review & Notes</th>
                            <th scope="col" className="px-5 py-3.5 text-right w-64">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.candidates.map((cand, idx) => {
                            const gradient = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
                            const score = Number(cand.matchScore || 85);
                            const scoreBadge = getScoreBadge(score);

                            return (
                              <tr key={cand.id} className="hover:bg-slate-50/70 transition-colors">
                                {/* 1. Candidate Info */}
                                <td className="px-5 py-4 w-60 max-w-[240px]">
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
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900 text-sm block truncate" title={cand.candidateName}>
                                          {cand.candidateName}
                                        </span>
                                        {cand.decisionSource === "SYSTEM_AUTOMATED" && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                                            <Sparkles size={10} />
                                            <span>AI</span>
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs mt-0.5 space-y-0.5">
                                        <span className="block text-slate-500 truncate" title={cand.email}>
                                          {cand.email}
                                        </span>
                                        {cand.phone && cand.phone !== "No phone provided" && (
                                          <span className="block text-[11px] text-slate-400 truncate" title={cand.phone}>
                                            {cand.phone}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* 2. Match Score */}
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

                                {/* 3. Review Assessment & Notes */}
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
                                      {cand.readinessStatus === "READY_FOR_INTERVIEW" ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          ✓ Ready for Interview
                                        </span>
                                      ) : cand.readinessStatus === "SECOND_OPINION" ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                          👥 2nd Reviewer Needed
                                        </span>
                                      ) : cand.readinessStatus === "HOLD" ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                          ⏸️ Put on Hold
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                          ⏳ Needs Further Evaluation
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* 4. Action Controls */}
                                <td className="px-5 py-4 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openReviewModal(cand)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                                      title="Review candidate profile and document evaluation notes"
                                    >
                                      <ClipboardCheck size={13} />
                                      <span>Review</span>
                                    </button>

                                    <Link
                                      to={`/recruitment/interviews?view=schedule&candidateId=${cand.id}&vacancyId=${cand.vacancyId}`}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                                      title="Go to Schedule Interview page"
                                    >
                                      <CalendarClock size={13} />
                                      <span>Schedule</span>
                                    </Link>

                                    <button
                                      type="button"
                                      onClick={() => openRejectModal(cand)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 transition-all cursor-pointer shadow-2xs"
                                      title="Reject candidate"
                                    >
                                      <UserX size={13} />
                                      <span>Reject</span>
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
              );
            })}
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
                    { id: "READY_FOR_INTERVIEW", label: "✓ Ready for Interview", activeClass: "bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-500/30" },
                    { id: "UNDER_REVIEW", label: "⏳ Needs Further Evaluation", activeClass: "bg-amber-50 border-amber-600 text-amber-900 ring-2 ring-amber-500/30" },
                    { id: "SECOND_OPINION", label: "👥 2nd Reviewer Needed", activeClass: "bg-purple-50 border-purple-600 text-purple-900 ring-2 ring-purple-500/30" },
                    { id: "HOLD", label: "⏸️ Put on Hold", activeClass: "bg-slate-100 border-slate-600 text-slate-900 ring-2 ring-slate-400/30" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setReadinessStatus(opt.id)}
                      className={`p-3 rounded-xl text-xs font-bold text-left border transition-all cursor-pointer ${
                        readinessStatus === opt.id
                          ? opt.activeClass
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* System Screening Assessment (Auto-Calculated, Read-Only) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-indigo-600" />
                    <span>System Screening Assessment</span>
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Auto-Evaluated
                  </span>
                </div>

                <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs text-slate-700">
                  {/* 1. Experience Benchmark */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                          activeReviewCandidate.isExpMet
                            ? "bg-emerald-600 text-white"
                            : "bg-rose-100 text-rose-700 border border-rose-300"
                        }`}
                      >
                        {activeReviewCandidate.isExpMet ? (
                          <Check className="w-3 h-3 stroke-[3]" />
                        ) : (
                          <X className="w-3 h-3 stroke-[2.5]" />
                        )}
                      </div>
                      <span className="font-medium text-slate-800 truncate">
                        Experience Requirement: {activeReviewCandidate.experienceYears || 0} yrs (Requires ≥ {activeReviewCandidate.requiredExperienceYears || 1} yrs)
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                        activeReviewCandidate.isExpMet
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-rose-100 text-rose-800 border border-rose-200"
                      }`}
                    >
                      {activeReviewCandidate.isExpMet ? "Met ✓" : "Below Required"}
                    </span>
                  </div>

                  {/* 2. Core Technical Skills */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                          activeReviewCandidate.isSkillsMet
                            ? "bg-emerald-600 text-white"
                            : "bg-rose-100 text-rose-700 border border-rose-300"
                        }`}
                      >
                        {activeReviewCandidate.isSkillsMet ? (
                          <Check className="w-3 h-3 stroke-[3]" />
                        ) : (
                          <X className="w-3 h-3 stroke-[2.5]" />
                        )}
                      </div>
                      <span className="font-medium text-slate-800 truncate">
                        Core Technical Competencies ({activeReviewCandidate.skills?.length || 0} skills identified)
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                        activeReviewCandidate.isSkillsMet
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-rose-100 text-rose-800 border border-rose-200"
                      }`}
                    >
                      {activeReviewCandidate.isSkillsMet ? "Skills Matched ✓" : "Needs Review"}
                    </span>
                  </div>

                  {/* 3. Shortlist Qualification Cutoff */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                          (activeReviewCandidate.screeningScore ?? activeReviewCandidate.matchScore ?? 0) >= (activeReviewCandidate.minimumScore || 75)
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-100 text-amber-700 border border-amber-300"
                        }`}
                      >
                        {(activeReviewCandidate.screeningScore ?? activeReviewCandidate.matchScore ?? 0) >= (activeReviewCandidate.minimumScore || 75) ? (
                          <Check className="w-3 h-3 stroke-[3]" />
                        ) : (
                          <span className="text-[10px] font-black">!</span>
                        )}
                      </div>
                      <span className="font-medium text-slate-800 truncate">
                        Shortlist Score Benchmark: {activeReviewCandidate.screeningScore ?? activeReviewCandidate.matchScore ?? 0}% (Cutoff ≥ {activeReviewCandidate.minimumScore || 75}%)
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                        (activeReviewCandidate.screeningScore ?? activeReviewCandidate.matchScore ?? 0) >= (activeReviewCandidate.minimumScore || 75)
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {(activeReviewCandidate.screeningScore ?? activeReviewCandidate.matchScore ?? 0) >= (activeReviewCandidate.minimumScore || 75)
                        ? "Meets Benchmark ✓"
                        : "Borderline"}
                    </span>
                  </div>
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                  <button
                    type="button"
                    onClick={() => setActiveReviewCandidate(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => openRejectModal(activeReviewCandidate)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 transition-all cursor-pointer"
                    title="Reject this candidate application"
                  >
                    <UserX size={14} />
                    <span>Reject Candidate</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
                    title="Go to Schedule Interview page"
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

      {/* ── Candidate Rejection Modal ── */}
      {rejectingCandidate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 bg-rose-50/60 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <UserX size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Reject Candidate Application
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {rejectingCandidate.candidateName} • {rejectingCandidate.jobTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectingCandidate(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to reject <strong>{rejectingCandidate.candidateName}</strong>? This will update their application status to <span className="font-semibold text-rose-700">REJECTED</span> and remove them from the review list.
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                  Reason for Rejection
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                  {REJECTION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {rejectionReason === "Other" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                    Custom Rejection Note
                  </label>
                  <textarea
                    rows={3}
                    value={customRejectionReason}
                    onChange={(e) => setCustomRejectionReason(e.target.value)}
                    placeholder="Provide specific reason for rejection..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setRejectingCandidate(null)}
                disabled={rejecting}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejecting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <UserX size={14} />
                <span>{rejecting ? "Rejecting..." : "Confirm Rejection"}</span>
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
            <div className="p-6 bg-gradient-to-r from-[#0F1B3D] via-[#162752] to-[#0F1B3D] text-white flex items-start justify-between border-b border-indigo-900/40 relative">
              <div className="space-y-3 max-w-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1 shadow-xs">
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
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100 border border-white/15">
                    <Building2 size={13} className="text-indigo-300" />
                    {selectedVacancyModal.department || "General"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100 border border-white/15">
                    <Clock size={13} className="text-indigo-300" />
                    {selectedVacancyModal.jobType || "Full-time"}
                  </span>
                  {selectedVacancyModal.vacancyCount && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100 border border-white/15">
                      <Users size={13} className="text-indigo-300" />
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
                      <Briefcase size={16} className="text-indigo-600" />
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
                      <GraduationCap size={16} className="text-indigo-600" />
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
                            className="px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
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
                            className="px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
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
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 transition-colors"
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

    </PageLayout>
  );
}
