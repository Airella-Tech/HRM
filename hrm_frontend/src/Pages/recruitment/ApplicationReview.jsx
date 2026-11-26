import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout";
import StatCard, { StatCardGrid } from "../../components/StatCard";
import { recruitmentApi } from "../../services/api";
import { DeadlineMeter } from "../careers/careersShared";
import { formatSalary, formatDate } from "../../utils/careersFormat";
import RecruitmentModal, {
  modalLabelClass,
  modalInputClass,
  modalTextareaClass,
  ModalButton,
} from "./components/RecruitmentModal";
import {
  isRemovedFromReview,
  setRemovedFromReview,
} from "../../utils/vacancyRemovalStorage";
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
  Users,
  ExternalLink,
  ShieldAlert,
  Banknote,
  Archive,
  RotateCcw,
  History,
  FolderKanban,
  Hourglass,
  PauseCircle,
} from "lucide-react";

const AVATAR_GRADIENTS = [
  "from-primary-600 to-primary-700",
  "from-primary-500 to-primary-700",
  "from-green-600 to-green-700",
  "from-amber-400 to-orange-500",
  "from-red-600 to-red-700",
  "from-primary-600 to-primary-700",
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
  if (num >= 70) return { label: "Good Fit", badgeClass: "bg-primary-50 text-primary-700 border-primary-200", dotClass: "bg-primary-500" };
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
  const [jobOffers, setJobOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Archive / Restore Modals
  const [confirmArchiveModal, setConfirmArchiveModal] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

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
      const offersPromise = recruitmentApi.getJobOffers ? recruitmentApi.getJobOffers() : Promise.resolve({ data: [] });

      const [appRes, vacRes, offersRes] = await Promise.allSettled([appPromise, vacPromise, offersPromise]);

      if (offersRes.status === "fulfilled" && Array.isArray(offersRes.value?.data)) {
        setJobOffers(offersRes.value.data);
      } else {
        setJobOffers([]);
      }

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

  // Compute job offer status for a vacancy in review
  const getVacancyOfferInfo = useCallback((group) => {
    const appIds = new Set((group.candidates || []).map((c) => Number(c.id)).filter(Boolean));
    const groupTitle = (group.title || "").trim().toLowerCase();
    const matched = jobOffers.filter((o) => {
      const hasAppMatch = o.applicationId && appIds.has(Number(o.applicationId));
      const hasTitleMatch = groupTitle && o.jobTitle && o.jobTitle.trim().toLowerCase() === groupTitle;
      return hasAppMatch || hasTitleMatch;
    });
    return {
      hasOffer: matched.length > 0,
      offerCount: matched.length,
      offers: matched,
    };
  }, [jobOffers]);

  // Handle archiving vacancy from review page
  const handleArchiveVacancy = async () => {
    if (!confirmArchiveModal) return;
    const { vacancy } = confirmArchiveModal;
    const vacId = vacancy?.id || vacancy?.vacancyId;
    const vacTitle = vacancy?.title;
    setActionInProgress(true);
    setRemovedFromReview(vacId, true, { title: vacTitle });
    if (confirmArchiveModal.groupKey) {
      setRemovedFromReview(confirmArchiveModal.groupKey, true, { title: vacTitle });
    }
    try {
      if (vacId && typeof recruitmentApi?.removeVacancyFromReview === "function") {
        await recruitmentApi.removeVacancyFromReview(vacId);
      }
      setToastMessage({
        type: "success",
        text: `Vacancy "${vacTitle || 'Selected opening'}" removed and moved to Review History.`,
      });
      setConfirmArchiveModal(null);
      await fetchConfirmedCandidates(true);
    } catch (err) {
      console.warn("Backend removeVacancyFromReview notice:", err?.message);
      setToastMessage({
        type: "success",
        text: `Vacancy "${vacTitle || 'Selected opening'}" removed and moved to Review History.`,
      });
      setConfirmArchiveModal(null);
      await fetchConfirmedCandidates(true);
    } finally {
      setActionInProgress(false);
    }
  };

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
          status: matchedVac?.status || "PUBLISHED",
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

  // Separate into active vacancies and history/archived vacancies
  const activeVacancyGroups = useMemo(() => {
    return vacancyGroups.filter((g) => !isRemovedFromReview(g.rawVacancy || g));
  }, [vacancyGroups]);

  const historyVacancyGroups = useMemo(() => {
    return vacancyGroups.filter((g) => isRemovedFromReview(g.rawVacancy || g));
  }, [vacancyGroups]);

  // Active vacancy groups displayed
  const displayedVacancyGroups = activeVacancyGroups;

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
            to="/recruitment/applications/review/history"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="View closed and archived vacancy review history"
          >
            <History size={14} className="text-primary-600" />
            <span>Review History ({historyVacancyGroups.length})</span>
          </Link>
          <button
            onClick={() => fetchConfirmedCandidates(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-primary-600" : "text-slate-500"} />
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

        {/* ── KPI Summary (one joined card) ── */}
        <StatCardGrid>
          {[
            { label: "Confirmed Shortlist", value: totalConfirmed, caption: "Approved for review", tone: "green", icon: CheckCircle2 },
            { label: "Ready for Interview", value: readyInterviewCount, caption: "Qualified for scheduling", tone: "primary", icon: CalendarClock },
            { label: "Reviewed with Notes", value: reviewedCount, caption: "Assessment documented", tone: "primary", icon: FileText },
            { label: "Average Match Score", value: `${avgMatchScore}%`, caption: "Across confirmed candidates", tone: "amber", icon: Star },
          ].map((m) => (
            <StatCard key={m.label} label={m.label} value={m.value} caption={m.caption} tone={m.tone} icon={m.icon} />
          ))}
        </StatCardGrid>

        {/* ── Search, Vacancy Filter & Status Tabs ── */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          {/* Top Row: Search input & Position Dropdown */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={17} />
              <input
                type="text"
                placeholder="Search candidate, email, skill..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
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

            {/* Position Dropdown */}
            <div className="w-full sm:w-72">
              <select
                value={selectedVacancyFilter}
                onChange={(e) => setSelectedVacancyFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white cursor-pointer"
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

          {/* Bottom Row: Status Tabs (Placed under Search & Position bar) */}
          <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 flex-wrap">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "ALL", label: "All Confirmed", count: totalConfirmed },
                { id: "READY_INTERVIEW", label: "Ready", count: readyInterviewCount, Icon: CheckCircle2 },
                { id: "UNDER_REVIEW", label: "Needs Eval", count: needsEvalCount, Icon: Hourglass },
                { id: "SECOND_OPINION", label: "2nd Reviewer", count: secondOpinionCount, Icon: Users },
                { id: "HOLD", label: "On Hold", count: holdCount, Icon: PauseCircle },
                { id: "REVIEWED", label: "Reviewed", count: reviewedCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    statusTab === tab.id
                      ? "bg-primary-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.Icon && <tab.Icon size={13} />}
                  <span>{tab.label} ({tab.count})</span>
                </button>
              ))}
            </div>

            {(search || selectedVacancyFilter !== "ALL" || statusTab !== "ALL") && (
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedVacancyFilter("ALL");
                  setStatusTab("ALL");
                }}
                className="text-xs font-semibold text-primary-600 hover:text-primary-800 flex items-center gap-1 shrink-0 py-1"
              >
                <RefreshCw size={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Confirmed Candidates Table ── */}
        {loading ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-xs">
            <Loader2 size={36} className="animate-spin text-primary-600 mx-auto mb-3" />
            <h4 className="font-bold text-slate-800 text-sm">Loading Confirmed Candidates...</h4>
            <p className="text-xs text-slate-400 mt-1">Retrieving candidates confirmed from shortlist</p>
          </div>
        ) : displayedVacancyGroups.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-xs max-w-md mx-auto space-y-3">
            <div className="w-14 h-14 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <UserCheck size={28} />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">No Active Reviews Available</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              There are no confirmed candidate applications currently open for review. Removed and archived vacancies can be inspected in Review History.
            </p>
            {historyVacancyGroups.length > 0 && (
              <Link
                to="/recruitment/applications/review/history"
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-xs"
              >
                <History size={14} />
                <span>View Review History ({historyVacancyGroups.length})</span>
              </Link>
            )}
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
                <Layers size={16} className="text-primary-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Confirmed Candidates by Vacancy
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-50 text-primary-700 border border-primary-200">
                  {displayedVacancyGroups.length} {displayedVacancyGroups.length === 1 ? "Vacancy" : "Vacancies"} • {filteredCandidates.length} {filteredCandidates.length === 1 ? "Candidate" : "Candidates"}
                </span>
              </div>

              {displayedVacancyGroups.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="text-slate-600 hover:text-primary-600 font-semibold transition-colors cursor-pointer"
                  >
                    Expand All
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => collapseAll(displayedVacancyGroups)}
                    className="text-slate-600 hover:text-primary-600 font-semibold transition-colors cursor-pointer"
                  >
                    Collapse All
                  </button>
                </div>
              )}
            </div>

            {/* Vacancy Separated Candidate Tables */}
            {displayedVacancyGroups.map((group) => {
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
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md"
                >
                  {/* ── Vacancy Header ── */}
                  <div
                    className="px-6 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-[#d5dbf5] to-[#e6e9f9] border-b border-[#cfd5ee] text-slate-900"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-12 w-12 rounded-2xl bg-primary-600 text-white shadow-md shadow-primary-600/25 flex items-center justify-center shrink-0">
                        <Briefcase size={22} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xl font-bold tracking-tight text-[#1b2142] truncate">{group.title}</h3>
                        <p className="text-sm text-slate-600 mt-0.5 flex flex-wrap items-center gap-x-2">
                          <span className="inline-flex items-center gap-1">
                            <Building2 size={12} />
                            <span>{group.department}</span>
                          </span>
                          <span>·</span>
                          <span className="font-semibold text-emerald-600">
                            {group.candidates.length} Confirmed{" "}
                            {group.candidates.length === 1 ? "Candidate" : "Candidates"}
                          </span>
                          <span>·</span>
                          <span>
                            Avg Match Score <strong className="text-slate-700">{avgScore}%</strong>
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
                      {/* Job Offer Status Badge */}
                      {(() => {
                        const offerInfo = getVacancyOfferInfo(group);
                        return offerInfo.hasOffer ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold"
                            title="Job offer created for this position"
                          >
                            <CheckCircle2 size={14} className="shrink-0" />
                            <span>Offer Created {offerInfo.offerCount > 1 ? `(${offerInfo.offerCount})` : ""}</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold"
                            title="No job offer created yet for this position"
                          >
                            <Clock size={14} className="shrink-0" />
                            <span>No Offer Yet</span>
                          </span>
                        );
                      })()}

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
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
                        title="Display job vacancy details like public career page"
                      >
                        <FileText size={16} className="text-slate-500 shrink-0" />
                        <span>Vacancy Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmArchiveModal({
                            vacancy: group.rawVacancy || { id: group.vacancyId, title: group.title },
                            groupKey: group.vacancyKey,
                          });
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-white text-red-700 text-sm font-semibold hover:bg-red-50"
                        title="Remove vacancy and move to Review History"
                      >
                        <Archive size={16} className="shrink-0" />
                        <span>Remove</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleCollapse(group.vacancyKey)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
                      >
                        {isCollapsed ? (
                          <>
                            <ChevronDown size={16} />
                            <span>Expand</span>
                          </>
                        ) : (
                          <>
                            <ChevronUp size={16} />
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
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary-50 text-primary-600 border border-primary-100 shrink-0">
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
                                          <CheckCircle2 size={11} /> Ready for Interview
                                        </span>
                                      ) : cand.readinessStatus === "SECOND_OPINION" ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-primary-50 text-primary-700 border border-primary-200">
                                          <Users size={11} /> 2nd Reviewer Needed
                                        </span>
                                      ) : cand.readinessStatus === "HOLD" ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                          <PauseCircle size={11} /> Put on Hold
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                          <Hourglass size={11} /> Needs Further Evaluation
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
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl text-xs font-semibold border border-primary-200 transition-all cursor-pointer shadow-2xs"
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
        <RecruitmentModal
          open
          title={activeReviewCandidate.candidateName}
          subtitle={`Confirmed Candidate Assessment • ${activeReviewCandidate.jobTitle} • ${activeReviewCandidate.department}`}
          onClose={() => setActiveReviewCandidate(null)}
          size="xl"
          footer={
            <>
              <ModalButton onClick={() => setActiveReviewCandidate(null)}>Cancel</ModalButton>
              <ModalButton variant="secondary" onClick={() => openRejectModal(activeReviewCandidate)}>
                <UserX size={14} /> Reject Candidate
              </ModalButton>
              <ModalButton variant="primary" type="submit" form="candidate-review-form" disabled={saving}>
                <Save size={14} />{saving ? "Saving..." : "Save Assessment Notes"}
              </ModalButton>
              <ModalButton
                onClick={() => {
                  const cand = activeReviewCandidate;
                  saveReview();
                  navigate(`/recruitment/interviews?view=schedule&candidateId=${cand.id}&vacancyId=${cand.vacancyId}`);
                }}
              >
                <CalendarClock size={14} /> Schedule Interview →
              </ModalButton>
            </>
          }
        >
            <form id="candidate-review-form" onSubmit={saveReview} className="space-y-5">
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
                  <label className={modalLabelClass}>
                    Candidate Skills ({activeReviewCandidate.skills.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {activeReviewCandidate.skills.map((s) => (
                      <span
                        key={s}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200/80"
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
                  <FileText size={16} className="text-primary-600" />
                  <span className="font-semibold text-slate-800">
                    {activeReviewCandidate.resumeFileName || "Candidate_Resume.pdf"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {activeReviewCandidate.resumeText && (
                    <button
                      type="button"
                      onClick={() => setShowResumeText(!showResumeText)}
                      className="px-2.5 py-1 text-xs font-semibold bg-white text-primary-600 border border-primary-200 hover:bg-primary-50 rounded-lg cursor-pointer"
                    >
                      {showResumeText ? "Hide Resume Text" : "View Resume Text"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownloadResume(activeReviewCandidate)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white rounded-lg cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download CV</span>
                  </button>
                </div>
              </div>

              {/* ATS Resume Plaintext Extracted Preview */}
              {showResumeText && activeReviewCandidate.resumeText && (
                <div className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono max-h-40 overflow-y-auto space-y-1">
                  <span className="text-primary-300 font-sans font-bold block pb-1 border-b border-slate-800">
                    ATS Resume Extracted Plaintext
                  </span>
                  <pre className="whitespace-pre-wrap">{activeReviewCandidate.resumeText}</pre>
                </div>
              )}

              {/* Screening & Interview Readiness Recommendation */}
              <div className="space-y-1.5">
                <label className={modalLabelClass}>
                  Interview Readiness Recommendation
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "READY_FOR_INTERVIEW", label: "Ready for Interview", Icon: CheckCircle2, activeClass: "bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-500/30" },
                    { id: "UNDER_REVIEW", label: "Needs Further Evaluation", Icon: Hourglass, activeClass: "bg-amber-50 border-amber-600 text-amber-900 ring-2 ring-amber-500/30" },
                    { id: "SECOND_OPINION", label: "2nd Reviewer Needed", Icon: Users, activeClass: "bg-primary-50 border-primary-600 text-primary-900 ring-2 ring-primary-500/30" },
                    { id: "HOLD", label: "Put on Hold", Icon: PauseCircle, activeClass: "bg-slate-100 border-slate-600 text-slate-900 ring-2 ring-slate-400/30" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setReadinessStatus(opt.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold text-left border transition-all cursor-pointer ${
                        readinessStatus === opt.id
                          ? opt.activeClass
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <opt.Icon size={15} className="shrink-0" />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* System Screening Assessment (Auto-Calculated, Read-Only) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={modalLabelClass}>
                    <Sparkles size={13} className="text-primary-600" />
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
                <label className={modalLabelClass}>
                  Screening Review Notes & Interview Focus Areas
                </label>
                <textarea
                  className={modalTextareaClass}
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record strengths, interview discussion topics, technical focus areas, or recruiter observations..."
                />
              </div>
            </form>
        </RecruitmentModal>
      )}

      {/* ── Candidate Rejection Modal ── */}
      {rejectingCandidate && (
        <RecruitmentModal
          open
          title="Reject Candidate Application"
          subtitle={`${rejectingCandidate.candidateName} • ${rejectingCandidate.jobTitle}`}
          tone="danger"
          onClose={() => setRejectingCandidate(null)}
          size="sm"
          footer={
            <>
              <ModalButton disabled={rejecting} onClick={() => setRejectingCandidate(null)}>Cancel</ModalButton>
              <ModalButton variant="danger" disabled={rejecting} onClick={handleConfirmReject}>
                <UserX size={14} />{rejecting ? "Rejecting..." : "Confirm Rejection"}
              </ModalButton>
            </>
          }
        >
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to reject <strong>{rejectingCandidate.candidateName}</strong>? This will update their application status to <span className="font-semibold text-rose-700">REJECTED</span> and remove them from the review list.
              </p>

              <div className="space-y-1.5">
                <label className={modalLabelClass}>
                  Reason for Rejection
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className={modalInputClass}
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
                  <label className={modalLabelClass}>
                    Custom Rejection Note
                  </label>
                  <textarea
                    rows={3}
                    value={customRejectionReason}
                    onChange={(e) => setCustomRejectionReason(e.target.value)}
                    placeholder="Provide specific reason for rejection..."
                    className={modalTextareaClass}
                  />
                </div>
              )}
            </div>
        </RecruitmentModal>
      )}
      {/* ── Job Vacancy Details Modal (Styled like Public Career Page Added Vacancy Details) ── */}
      {selectedVacancyModal && (
        <RecruitmentModal
          open
          title={selectedVacancyModal.title}
          subtitle="Career Vacancy Details"
          badge={selectedVacancyModal.status}
          onClose={() => setSelectedVacancyModal(null)}
          size="xl"
          footer={
            <>
              <Link
                to="/recruitment/vacancies"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200/80 transition-colors"
              >
                <Briefcase size={14} /> Manage Vacancy Postings
              </Link>
              <ModalButton onClick={() => setSelectedVacancyModal(null)}>Close</ModalButton>
            </>
          }
        >
            <div className="space-y-6">
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
                  {selectedVacancyModal.id && (() => {
                    const comp =
                      selectedVacancyModal.companyRef ||
                      selectedVacancyModal.company ||
                      (() => {
                        try {
                          const u = JSON.parse(localStorage.getItem("user") || "{}");
                          return (
                            u.companyRegistrationNumber ||
                            u.companyRef ||
                            u.companyName ||
                            (u.companyId ? String(u.companyId) : "") ||
                            ""
                          );
                        } catch {
                          return "";
                        }
                      })();
                    const careerUrl = `/careers/jobs/${selectedVacancyModal.id}${
                      comp ? `?company=${encodeURIComponent(comp)}` : ""
                    }`;
                    return (
                      <div className="pt-3 border-t border-slate-200/80">
                        <Link
                          to={careerUrl}
                          target="_blank"
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-sm transition-all"
                        >
                          <ExternalLink size={13} />
                          <span>View on Public Careers</span>
                        </Link>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
        </RecruitmentModal>
      )}

      {/* Confirmation Modal: Remove Vacancy to Review History */}
      {confirmArchiveModal && (
        <RecruitmentModal
          open
          title="Remove Vacancy"
          subtitle="Move vacancy to Review History"
          tone="danger"
          onClose={() => setConfirmArchiveModal(null)}
          size="sm"
          footer={
            <>
              <ModalButton disabled={actionInProgress} onClick={() => setConfirmArchiveModal(null)}>Cancel</ModalButton>
              <ModalButton variant="danger" disabled={actionInProgress} onClick={handleArchiveVacancy}>
                {actionInProgress ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                Confirm & Remove
              </ModalButton>
            </>
          }
        >
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-slate-900">{confirmArchiveModal.vacancy?.title}</span> from active reviews?
              This vacancy and its shortlisted candidates will be moved to the <span className="font-semibold text-primary-700">Review History</span> view.
            </p>
        </RecruitmentModal>
      )}

    </PageLayout>
  );
}