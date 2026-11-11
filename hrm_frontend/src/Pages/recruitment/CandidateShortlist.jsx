import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";
import { DeadlineMeter } from "../careers/careersShared";
import { formatSalary, formatDate } from "../../utils/careersFormat";
import {
  isRemovedFromShortlist,
  setRemovedFromShortlist,
  getShortlistRemovedDate,
} from "../../utils/vacancyRemovalStorage";
import {
  Search,
  CheckCircle2,
  Sparkles,
  Zap,
  Sliders,
  Check,
  X,
  AlertTriangle,
  Building2,
  Briefcase,
  Award,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  Mail,
  Phone,
  Loader2,
  CheckSquare,
  Square,
  Eye,
  SlidersHorizontal,
  Settings,
  Info,
  AlertCircle,
  ShieldAlert,
  GraduationCap,
  Clock,
  HelpCircle,
  Layers,
  Bot,
  User,
  Plus,
  Trash2,
  Filter,
  ClipboardCheck,
  ArrowRight,
  Banknote,
  Archive,
  RotateCcw,
  History,
  FolderKanban,
} from "lucide-react";

/**
 * Rejection reason presets for structured candidate feedback.
 */
const REJECTION_REASONS = [
  "Experience below required threshold for vacancy",
  "Key technical skills mismatch",
  "Salary expectations exceed approved budget",
  "Failed initial screening assessment",
  "Position filled by higher-ranked candidate",
  "Other / Non-competitive background",
];

const AVATAR_GRADIENTS = [
  "from-primary-500 to-purple-600",
  "from-sky-400 to-blue-600",
  "from-emerald-400 to-teal-600",
  "from-amber-400 to-orange-500",
  "from-pink-500 to-rose-600",
  "from-primary-500 to-primary-600",
];

/**
 * Returns color classes and label for a given score.
 */
function getScoreBadge(score) {
  const num = Number(score || 0);
  if (num >= 80) return { label: "Strong Match", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200", dotClass: "bg-emerald-500" };
  if (num >= 70) return { label: "Good Fit", badgeClass: "bg-blue-50 text-blue-700 border-blue-200", dotClass: "bg-blue-500" };
  if (num >= 50) return { label: "Moderate", badgeClass: "bg-amber-50 text-amber-700 border-amber-200", dotClass: "bg-amber-500" };
  return { label: "Low Fit", badgeClass: "bg-slate-100 text-slate-600 border-slate-200", dotClass: "bg-slate-400" };
}

/**
 * Evaluates candidate suitability against minimum cutoff score and mandatory position requirements.
 */
function getCandidateSuitability(cand, minScore = 75) {
  const score = Number(cand.overallScore ?? cand.matchScore ?? cand.screeningScore ?? 0);
  const isShortlisted = cand.status === "SHORTLISTED";
  const isRejected = cand.status === "REJECTED";

  if (isShortlisted) {
    return {
      isSuitable: true,
      status: "SUITABLE",
      label: "Suitable",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      reason: "Shortlisted candidate meeting position criteria",
    };
  }

  if (isRejected) {
    return {
      isSuitable: false,
      status: "NOT_SUITABLE",
      label: "Not Suitable",
      badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
      reason: cand.rejectionReason || "Candidate does not meet position requirements",
    };
  }

  if (cand.allMandatoryMet === false) {
    return {
      isSuitable: false,
      status: "NOT_SUITABLE",
      label: "Not Suitable",
      badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
      reason: "Does not meet mandatory position requirements",
    };
  }

  if (cand.hasUnknownMandatory || cand.recommendation === "REQUIRES_MANUAL_REVIEW") {
    return {
      isSuitable: false,
      status: "NEEDS_REVIEW",
      label: "Needs Review",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
      reason: "Incomplete CV evidence requires recruiter review",
    };
  }

  if (score >= minScore) {
    return {
      isSuitable: true,
      status: "SUITABLE",
      label: "Suitable",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      reason: `Match score (${score.toFixed(1)}%) meets required cutoff (≥${minScore}%) and satisfies mandatory criteria`,
    };
  } else {
    return {
      isSuitable: false,
      status: "NOT_SUITABLE",
      label: "Not Suitable",
      badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
      reason: `Match score (${score.toFixed(1)}%) is below required cutoff (≥${minScore}%)`,
    };
  }
}

/**
 * Normalizes backend application data to safe UI candidate shape.
 */
function normalizeCandidate(c) {
  const skillsList = Array.isArray(c.skillsMatched) && c.skillsMatched.length > 0
    ? c.skillsMatched
    : (Array.isArray(c.skills) ? c.skills : []);

  // Parse breakdown JSON if present as string
  let parsedBreakdown = null;
  if (c.criteriaJson && typeof c.criteriaJson === "string") {
    try {
      parsedBreakdown = JSON.parse(c.criteriaJson);
    } catch {
      parsedBreakdown = null;
    }
  } else if (c.breakdown && typeof c.breakdown === "object") {
    parsedBreakdown = c.breakdown;
  }

  const score = Number(c.screeningScore ?? c.matchScore ?? 0);

  return {
    ...c,
    id: c.id,
    candidateName: c.candidateName || "Applicant",
    jobTitle: c.jobTitle || c.vacancyTitle || "Job Vacancy",
    vacancyId: c.vacancyId != null ? String(c.vacancyId) : "unassigned",
    department: c.department || "General",
    status: c.status || "NEW",
    matchScore: score,
    screeningScore: score,
    overallScore: c.overallScore != null ? Number(c.overallScore) : score,
    skillsScore: c.skillsScore != null ? Number(c.skillsScore) : (score > 0 ? score : null),
    experienceScore: c.experienceScore != null ? Number(c.experienceScore) : (score > 0 ? score : null),
    qualificationsScore: c.qualificationsScore != null ? Number(c.qualificationsScore) : (score > 0 ? score : null),
    evidenceScore: c.evidenceScore != null ? Number(c.evidenceScore) : (score > 0 ? score : null),
    mandatorySkillsMet: c.mandatorySkillsMet || "MET",
    mandatoryExperienceMet: c.mandatoryExperienceMet || "MET",
    mandatoryQualificationsMet: c.mandatoryQualificationsMet || "MET",
    allMandatoryMet: c.allMandatoryMet ?? true,
    hasUnknownMandatory: c.hasUnknownMandatory ?? false,
    recommendation: c.recommendation || (c.status === "SHORTLISTED" ? "RECOMMENDED_FOR_SHORTLIST" : "PENDING_REVIEW"),
    decisionSource: c.decisionSource || (c.status === "SHORTLISTED" ? "RECRUITER_MANUAL" : "PENDING_REVIEW"),
    decisionReason: c.decisionReason || c.screeningNotes || "",
    breakdown: parsedBreakdown,
    skillsMatched: skillsList,
    skills: skillsList,
    experienceYears: c.experienceYears ?? 0,
    email: c.email || "No email provided",
    phone: c.phone || "No phone provided",
    location: c.location || "Not specified",
    education: c.education || "Not specified",
    summary: c.summary || "",
    resumeFileName: c.resumeFileName || null,
  };
}

export default function RecruitmentCandidateShortlist() {
  const location = useLocation();

  const [candidates, setCandidates] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [jobOffers, setJobOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Archive / Restore Modals
  const [confirmArchiveModal, setConfirmArchiveModal] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Global search & vacancy filter
  const [search, setSearch] = useState("");
  const [selectedVacancyFilter, setSelectedVacancyFilter] = useState("ALL");

  // Per-vacancy UI state
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [groupStatusFilters, setGroupStatusFilters] = useState({});
  const [stagedShortlists, setStagedShortlists] = useState({});
  const [runningAutoForVacancy, setRunningAutoForVacancy] = useState({});
  const [confirmingVacancy, setConfirmingVacancy] = useState({});
  const [vacancyAlerts, setVacancyAlerts] = useState({});

  // Vacancy screening configs cached: { [vacId]: configObject }
  const [screeningConfigs, setScreeningConfigs] = useState({});
  const [loadingConfigFor, setLoadingConfigFor] = useState(null);

  // Modals & Panels
  // 1. Vacancy Screening Config Drawer / Modal
  const [configModalVacancy, setConfigModalVacancy] = useState(null);
  const [activeConfigForm, setActiveConfigForm] = useState(null);
  const [configModalTab, setConfigModalTab] = useState("weights");
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaveError, setConfigSaveError] = useState(null);

  // Pre-Run Screening & Confirm Shortlist confirmation dialogs
  const [pendingScreeningVacancy, setPendingScreeningVacancy] = useState(null);
  const [pendingConfirmVacancy, setPendingConfirmVacancy] = useState(null);

  // 2. Candidate Screening Breakdown Modal
  const [breakdownCandidate, setBreakdownCandidate] = useState(null);

  // 3. Structured Rejection Modal
  const [rejectingCandidate, setRejectingCandidate] = useState(null);
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState("");

  // Selected Vacancy Modal (Job Vacancy Details like Public Career Page)
  const [selectedVacancyModal, setSelectedVacancyModal] = useState(null);

  // Load applications and vacancies
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [appsRes, vacsRes, offersRes] = await Promise.allSettled([
        recruitmentApi.getApplications ? recruitmentApi.getApplications() : Promise.resolve({ data: [] }),
        recruitmentApi.getVacancies ? recruitmentApi.getVacancies() : Promise.resolve({ data: [] }),
        recruitmentApi.getJobOffers ? recruitmentApi.getJobOffers() : Promise.resolve({ data: [] }),
      ]);

      if (offersRes.status === "fulfilled" && Array.isArray(offersRes.value?.data)) {
        setJobOffers(offersRes.value.data);
      } else {
        setJobOffers([]);
      }

      if (appsRes.status === "fulfilled" && appsRes.value?.data && Array.isArray(appsRes.value.data)) {
        setCandidates(appsRes.value.data.map(normalizeCandidate));
      } else {
        setCandidates([]);
      }

      if (vacsRes.status === "fulfilled" && vacsRes.value?.data && Array.isArray(vacsRes.value.data)) {
        const loadedVacs = vacsRes.value.data;
        setVacancies(loadedVacs);

        // Load configs & saved screening results so auto-shortlist details persist after refresh
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

          const configMap = {};
          configsSettled.forEach((res, i) => {
            if (res.status === "fulfilled" && res.value?.data) {
              const cfg = res.value.data;
              const vId = loadedVacs[i].id;
              configMap[vId] = cfg;
              configMap[String(vId)] = cfg;
            }
          });
          setScreeningConfigs((prev) => ({ ...prev, ...configMap }));

          const allSavedResults = [];
          resultsSettled.forEach((res) => {
            if (res.status === "fulfilled" && Array.isArray(res.value?.data)) {
              allSavedResults.push(...res.value.data);
            }
          });

          if (allSavedResults.length > 0) {
            const resultMap = new Map();
            // Results are ordered newest first; only keep the latest evaluation per candidate
            allSavedResults.forEach((r) => {
              const appId = Number(r.applicationId);
              if (appId && !resultMap.has(appId)) {
                resultMap.set(appId, r);
              }
            });

            setCandidates((prev) =>
              prev.map((c) => {
                const evaluated = resultMap.get(Number(c.id));
                if (!evaluated) return c;
                return {
                  ...c,
                  matchScore: Math.round(evaluated.overallScore),
                  screeningScore: Math.round(evaluated.overallScore),
                  overallScore: evaluated.overallScore,
                  skillsScore: evaluated.skillsScore,
                  experienceScore: evaluated.experienceScore,
                  qualificationsScore: evaluated.qualificationsScore,
                  evidenceScore: evaluated.evidenceScore,
                  mandatorySkillsMet: evaluated.mandatorySkillsMet,
                  mandatoryExperienceMet: evaluated.mandatoryExperienceMet,
                  mandatoryQualificationsMet: evaluated.mandatoryQualificationsMet,
                  allMandatoryMet: evaluated.allMandatoryMet,
                  hasUnknownMandatory: evaluated.hasUnknownMandatory,
                  recommendation: evaluated.recommendation,
                  decisionSource: evaluated.decisionSource,
                  decisionReason: evaluated.decisionReason,
                  breakdown: evaluated.breakdown,
                };
              })
            );
          }
        } catch (err2) {
          console.warn("Could not preload screening configs/results:", err2);
        }
      } else {
        setVacancies([]);
      }
    } catch (err) {
      console.warn("Could not fetch shortlist candidates:", err);
      setCandidates([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute job offer status for a vacancy in shortlist
  const getVacancyOfferInfo = useCallback((vacKey, candList = [], vacTitle = "") => {
    const appIds = new Set(candList.map((c) => Number(c.id)).filter(Boolean));
    const normalizedTitle = (vacTitle || "").trim().toLowerCase();
    const matched = jobOffers.filter((o) => {
      const hasAppMatch = o.applicationId && appIds.has(Number(o.applicationId));
      const hasTitleMatch = normalizedTitle && o.jobTitle && o.jobTitle.trim().toLowerCase() === normalizedTitle;
      return hasAppMatch || hasTitleMatch;
    });
    return {
      hasOffer: matched.length > 0,
      offerCount: matched.length,
      offers: matched,
    };
  }, [jobOffers]);

  // Handle archiving vacancy from shortlist page
  // 1. Archives vacancy and moves to Shortlist History (persisted to client storage and backend)
  // 2. Automatically updates any unconfirmed candidate in this vacancy to REJECTED with structured reason
  // 3. Immediately updates their status in the tracking page
  const handleArchiveVacancy = async () => {
    if (!confirmArchiveModal) return;
    const { vacancy } = confirmArchiveModal;
    const vacId = vacancy?.id || vacancy?.vacancyId;
    const vacTitle = vacancy?.title;
    setActionInProgress(true);

    // 1. Persist removal to localStorage immediately
    setRemovedFromShortlist(vacId, true, { title: vacTitle });
    if (vacancy?.key) setRemovedFromShortlist(vacancy.key, true, { title: vacTitle });

    // 2. Reject unconfirmed candidates belonging to this vacancy
    // User requirement: "and also like that shorlist page remove that vacancy and add to history page that all candidate have under shortlist without confirm shortlist that status get as rejected and like that update their status in tracking page"
    try {
      const vacCandidates = (confirmArchiveModal.candidates || vacancy.candidates || []).length > 0
        ? (confirmArchiveModal.candidates || vacancy.candidates)
        : candidates.filter((c) => {
            if (vacId != null && String(c.vacancyId) === String(vacId)) return true;
            if (vacTitle && (c.jobTitle?.trim().toLowerCase() === vacTitle.trim().toLowerCase() || c.vacancyTitle?.trim().toLowerCase() === vacTitle.trim().toLowerCase())) return true;
            return false;
          });

      const unconfirmedCandidates = vacCandidates.filter((c) => {
        const isConfirmed = c.status === "SHORTLISTED" || c.status === "OFFER_MADE" || c.status === "HIRED";
        return !isConfirmed && c.status !== "REJECTED";
      });

      if (unconfirmedCandidates.length > 0) {
        await Promise.allSettled(
          unconfirmedCandidates.map((c) =>
            recruitmentApi.rejectCandidate(c.id, "Position closed / archived without shortlist confirmation")
          )
        );
      }
    } catch (rejectErr) {
      console.warn("Auto-reject candidates notice:", rejectErr);
    }

    // 3. Call backend endpoint to remove from shortlist (if backend is running with endpoint)
    try {
      if (vacId && typeof recruitmentApi?.removeVacancyFromShortlist === "function") {
        await recruitmentApi.removeVacancyFromShortlist(vacId);
      }
    } catch (err) {
      console.warn("Backend removeVacancyFromShortlist notice:", err?.message);
    } finally {
      setActionNotice(
        `Vacancy "${vacTitle || 'Selected opening'}" removed and moved to Shortlist History. All unconfirmed candidates have been marked as REJECTED and updated on their tracking page.`
      );
      setConfirmArchiveModal(null);
      setActionInProgress(false);
      setTimeout(() => setActionNotice(null), 5000);
      await fetchData(true);
    }
  };

  // Handler to restore vacancy back to Active Shortlisting
  const handleRestoreVacancy = async (vac) => {
    const vacId = vac.rawVacancy?.id || vac.vacancyId || vac.id;
    setActionInProgress(true);
    setRemovedFromShortlist(vacId, false, { title: vac.title });
    try {
      if (vacId && typeof recruitmentApi?.restoreVacancyToShortlist === "function") {
        await recruitmentApi.restoreVacancyToShortlist(vacId);
      }
      setActionNotice(`Vacancy "${vac.title}" restored to Active Shortlisting.`);
      await fetchData(true);
    } catch (err) {
      console.warn("Backend restore notice:", err);
      setActionNotice(`Vacancy "${vac.title}" restored to Active Shortlisting.`);
      await fetchData(true);
    } finally {
      setActionInProgress(false);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  // Fetch screening configuration for a vacancy
  const loadVacancyConfig = useCallback(async (vacancyId) => {
    if (!vacancyId || vacancyId === "unassigned") return null;
    try {
      setLoadingConfigFor(vacancyId);
      const res = await recruitmentApi.getScreeningConfig(vacancyId);
      if (res?.data) {
        setScreeningConfigs((prev) => ({ ...prev, [vacancyId]: res.data }));
        return res.data;
      }
    } catch (err) {
      console.warn(`Could not load screening config for vacancy ${vacancyId}:`, err);
    } finally {
      setLoadingConfigFor(null);
    }
    return null;
  }, []);

  // Open configuration modal for a vacancy
  const handleOpenConfigModal = async (vacancy) => {
    setConfigModalVacancy(vacancy);
    setConfigSaveError(null);
    setConfigModalTab("weights");

    let config = screeningConfigs[vacancy.id];
    if (!config) {
      config = await loadVacancyConfig(vacancy.id);
    }

    if (config) {
      setActiveConfigForm({ ...config });
    } else {
      // Default initial template
      setActiveConfigForm({
        vacancyId: vacancy.id,
        vacancyTitle: vacancy.title,
        skillsWeight: 40,
        experienceWeight: 25,
        qualificationsWeight: 20,
        evidenceWeight: 15,
        minimumScore: 75,
        autoShortlistEnabled: false,
        requiredSkills: (vacancy.requiredSkills || []).map((s) => ({
          name: typeof s === "string" ? s : s.name,
          mandatory: true,
          aliases: [],
        })),
        preferredSkills: ["Team Collaboration", "Problem Solving"],
        minExperienceYears: 2,
        experienceMandatory: false,
        experienceKeywords: ["development", "design", "agile", "api"],
        requiredDegreeLevel: "BACHELORS",
        educationMandatory: false,
        preferredQualifications: ["BSc in Computer Science, IT, or related degree"],
        jobEvidenceKeywords: ["project", "responsibility", "architecture", "delivery"],
        evidenceMandatory: false,
      });
    }
  };

  // Helper to auto-balance category weights to exactly 100%
  const handleAutoBalanceWeights = () => {
    if (!activeConfigForm) return;
    setActiveConfigForm((prev) => ({
      ...prev,
      skillsWeight: 40,
      experienceWeight: 25,
      qualificationsWeight: 20,
      evidenceWeight: 15,
    }));
    setConfigSaveError(null);
  };

  // Save screening configuration
  const handleSaveConfig = async () => {
    if (!activeConfigForm || !configModalVacancy) return;

    // Weight validation
    const totalWeight =
      Number(activeConfigForm.skillsWeight || 0) +
      Number(activeConfigForm.experienceWeight || 0) +
      Number(activeConfigForm.qualificationsWeight || 0) +
      Number(activeConfigForm.evidenceWeight || 0);

    if (totalWeight !== 100) {
      setConfigSaveError(`Total category weights must equal exactly 100%. Current total: ${totalWeight}%.`);
      return;
    }

    if (
      activeConfigForm.skillsWeight < 0 ||
      activeConfigForm.experienceWeight < 0 ||
      activeConfigForm.qualificationsWeight < 0 ||
      activeConfigForm.evidenceWeight < 0
    ) {
      setConfigSaveError("Category weights cannot be negative numbers.");
      return;
    }

    setSavingConfig(true);
    setConfigSaveError(null);

    try {
      const res = await recruitmentApi.saveScreeningConfig(configModalVacancy.id, activeConfigForm);
      if (res?.data) {
        setScreeningConfigs((prev) => ({ ...prev, [configModalVacancy.id]: res.data }));
        setVacancyAlerts((prev) => ({
          ...prev,
          [configModalVacancy.id]: {
            type: "success",
            message: `Screening rules saved successfully! (Weights: ${res.data.skillsWeight}/${res.data.experienceWeight}/${res.data.qualificationsWeight}/${res.data.evidenceWeight}%, Min: ${res.data.minimumScore}%, Auto-Shortlist: ${res.data.autoShortlistEnabled ? "Enabled" : "Disabled"})`,
          },
        }));
        setConfigModalVacancy(null);
      }
    } catch (err) {
      console.error("Save config error:", err);
      setConfigSaveError(err.response?.data?.message || err.message || "Failed to save configuration.");
    } finally {
      setSavingConfig(false);
    }
  };

  // Per-vacancy state helpers
  const getStatusFilterForVacancy = (vacKey) => groupStatusFilters[vacKey] || "ALL";
  const setStatusFilterForVacancy = (vacKey, status) => {
    setGroupStatusFilters((prev) => ({ ...prev, [vacKey]: status }));
  };

  const toggleCollapse = (vacKey) => {
    setCollapsedGroups((prev) => ({ ...prev, [vacKey]: !prev[vacKey] }));
  };

  const getStagedSet = (vacKey) => stagedShortlists[vacKey] || new Set();

  /**
   * Run Vacancy Screening Evaluation & Automatic Shortlisting
   */
  const handleRunScreeningForVacancy = async (vacKey, vacancyTitle) => {
    setRunningAutoForVacancy((prev) => ({ ...prev, [vacKey]: true }));
    setVacancyAlerts((prev) => ({ ...prev, [vacKey]: null }));

    try {
      // Call backend screening evaluation
      const res = await recruitmentApi.evaluateVacancy(vacKey);

      if (res?.data && Array.isArray(res.data.results)) {
        const resultMap = new Map(res.data.results.map((r) => [Number(r.applicationId), r]));

        // Update candidate list with new scores and statuses
        setCandidates((prev) =>
          prev.map((c) => {
            const evaluated = resultMap.get(Number(c.id));
            if (!evaluated) return c;

            const isShortlisted = Boolean(evaluated.autoShortlisted) || c.status === "SHORTLISTED";
            return {
              ...c,
              matchScore: Math.round(evaluated.overallScore),
              screeningScore: Math.round(evaluated.overallScore),
              overallScore: evaluated.overallScore,
              skillsScore: evaluated.skillsScore,
              experienceScore: evaluated.experienceScore,
              qualificationsScore: evaluated.qualificationsScore,
              evidenceScore: evaluated.evidenceScore,
              mandatorySkillsMet: evaluated.mandatorySkillsMet,
              mandatoryExperienceMet: evaluated.mandatoryExperienceMet,
              mandatoryQualificationsMet: evaluated.mandatoryQualificationsMet,
              allMandatoryMet: evaluated.allMandatoryMet,
              hasUnknownMandatory: evaluated.hasUnknownMandatory,
              recommendation: evaluated.recommendation,
              decisionSource: evaluated.decisionSource,
              decisionReason: evaluated.decisionReason,
              breakdown: evaluated.breakdown,
              status: isShortlisted ? "SHORTLISTED" : (c.status === "NEW" ? "UNDER_REVIEW" : c.status),
            };
          })
        );

        // Immediately update screeningConfigs so "Last screened:" timestamp & summary show up right away
        const screenedTime = res.data.screenedAt || new Date().toISOString();
        const autoShortlistedCount = res.data.autoShortlistedCount || 0;
        const recommendedCount = res.data.stagedOrRecommendedCount || 0;
        const evaluatedCount = res.data.evaluatedCount || res.data.results.length;
        const summaryText = res.data.lastScreenedSummary ||
          `${evaluatedCount} evaluated • ${autoShortlistedCount} auto-shortlisted • ${recommendedCount} recommended`;

        setScreeningConfigs((prev) => {
          const vId = res.data.vacancyId;
          const current = (vId != null ? prev[vId] : null) || prev[vacKey] || {};
          const updated = {
            ...current,
            lastScreenedAt: screenedTime,
            lastScreenedSummary: summaryText,
          };
          return {
            ...prev,
            [vacKey]: updated,
            ...(vId != null ? {
              [vId]: updated,
              [String(vId)]: updated,
            } : {}),
          };
        });



        if (autoShortlistedCount > 0) {
          setVacancyAlerts((prev) => ({
            ...prev,
            [vacKey]: {
              type: "success",
              message: `Automated screening complete: ${autoShortlistedCount} candidate(s) met all mandatory requirements and threshold, and were automatically moved to SHORTLISTED!`,
            },
          }));
        } else if (recommendedCount > 0) {
          // Stage recommended candidates
          const newlyStaged = new Set(getStagedSet(vacKey));
          res.data.results.forEach((r) => {
            if (r.recommendation === "RECOMMENDED_FOR_SHORTLIST") {
              newlyStaged.add(r.applicationId);
            }
          });
          setStagedShortlists((prev) => ({ ...prev, [vacKey]: newlyStaged }));

          setVacancyAlerts((prev) => ({
            ...prev,
            [vacKey]: {
              type: "info",
              message: `Screening complete: ${recommendedCount} candidate(s) qualified for shortlisting. Auto-shortlist is disabled, so they have been staged for your review. Click "Confirm Shortlist" to finalize.`,
            },
          }));
        } else {
          setVacancyAlerts((prev) => ({
            ...prev,
            [vacKey]: {
              type: "info",
              message: `Screening complete for ${vacancyTitle}. No new candidates reached the shortlisting qualification threshold. Review candidate breakdowns below.`,
            },
          }));
        }
      }
    } catch (err) {
      console.error("Screening error:", err);
      setVacancyAlerts((prev) => ({
        ...prev,
        [vacKey]: {
          type: "error",
          message: err.response?.data?.message || "Screening operation failed. Please check configuration.",
        },
      }));
    } finally {
      setRunningAutoForVacancy((prev) => ({ ...prev, [vacKey]: false }));
    }
  };

  /**
   * Toggle individual staging checkbox for a candidate under a vacancy
   */
  const toggleStageCandidate = (vacKey, candidateId) => {
    setStagedShortlists((prev) => {
      const currentSet = new Set(prev[vacKey] || []);
      if (currentSet.has(candidateId)) {
        currentSet.delete(candidateId);
      } else {
        currentSet.add(candidateId);
      }
      return { ...prev, [vacKey]: currentSet };
    });
  };

  /**
   * Confirm Shortlist for staged candidates under a specific vacancy
   */
  const handleConfirmShortlistForVacancy = async (vacKey, vacancyTitle) => {
    const stagedSet = getStagedSet(vacKey);
    const candidateIdsToShortlist = Array.from(stagedSet);

    if (candidateIdsToShortlist.length === 0) return;

    setConfirmingVacancy((prev) => ({ ...prev, [vacKey]: true }));

    try {
      await Promise.allSettled(
        candidateIdsToShortlist.map((id) => recruitmentApi.shortlistCandidate(id, "Confirmed by recruiter"))
      );
    } catch (err) {
      console.warn("Backend shortlist note:", err);
    }

    setCandidates((prev) =>
      prev.map((c) =>
        stagedSet.has(c.id)
          ? { ...c, status: "SHORTLISTED", decisionSource: "RECRUITER_MANUAL", rejectionReason: null }
          : c
      )
    );

    setStagedShortlists((prev) => ({ ...prev, [vacKey]: new Set() }));
    setConfirmingVacancy((prev) => ({ ...prev, [vacKey]: false }));

    setVacancyAlerts((prev) => ({
      ...prev,
      [vacKey]: {
        type: "success",
        message: `Successfully confirmed and shortlisted ${candidateIdsToShortlist.length} candidate(s) for ${vacancyTitle}! They are now available in the Review Candidate page.`,
        actionUrl: "/recruitment/applications/review",
        actionLabel: "View in Review Candidates",
      },
    }));
  };

  /**
   * Clear staging for a vacancy
   */
  const handleClearStagingForVacancy = (vacKey) => {
    setStagedShortlists((prev) => ({ ...prev, [vacKey]: new Set() }));
    setVacancyAlerts((prev) => ({ ...prev, [vacKey]: null }));
  };

  /**
   * Manual Single Candidate Shortlist
   */
  const handleShortlistSingle = async (candidate) => {
    try {
      await recruitmentApi.shortlistCandidate(candidate.id, "Manually shortlisted by recruiter");
    } catch (err) {
      console.warn("Shortlist candidate API note:", err);
    }

    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidate.id
          ? { ...c, status: "SHORTLISTED", decisionSource: "RECRUITER_MANUAL", rejectionReason: null }
          : c
      )
    );

    const vacKey = candidate.vacancyId || candidate.jobTitle;
    setStagedShortlists((prev) => {
      const current = new Set(prev[vacKey] || []);
      current.delete(candidate.id);
      return { ...prev, [vacKey]: current };
    });
  };

  /**
   * Confirm Structured Rejection
   */
  const handleConfirmRejection = async () => {
    if (!rejectingCandidate) return;

    const reasonToSave =
      selectedReason === "Other / Non-competitive background" && customReason.trim()
        ? customReason.trim()
        : selectedReason;

    try {
      await recruitmentApi.rejectCandidate(rejectingCandidate.id, reasonToSave);
    } catch (err) {
      console.warn("Reject candidate API note:", err);
    }

    setCandidates((prev) =>
      prev.map((c) =>
        c.id === rejectingCandidate.id
          ? {
              ...c,
              status: "REJECTED",
              rejectionReason: reasonToSave,
              decisionSource: "RECRUITER_MANUAL",
            }
          : c
      )
    );

    const vacKey = rejectingCandidate.vacancyId || rejectingCandidate.jobTitle;
    setStagedShortlists((prev) => {
      const current = new Set(prev[vacKey] || []);
      current.delete(rejectingCandidate.id);
      return { ...prev, [vacKey]: current };
    });

    setRejectingCandidate(null);
    setCustomReason("");
  };

  /**
   * Group candidates separated by target vacancy
   */
  const vacancyGroups = useMemo(() => {
    const groupsMap = new Map();

    vacancies.forEach((vac) => {
      const key = String(vac.id);
      groupsMap.set(key, {
        vacancyId: vac.id,
        vacancyKey: key,
        title: vac.title || "Job Opening",
        department: vac.department || "General",
        jobType: vac.jobType || "Full-time",
        vacancyCount: vac.vacancyCount ?? 1,
        status: vac.status || "OPEN",
        rawVacancy: vac,
        candidates: [],
      });
    });

    candidates.forEach((cand) => {
      const key =
        cand.vacancyId && cand.vacancyId !== "unassigned"
          ? String(cand.vacancyId)
          : cand.jobTitle || "Other Applications";

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          vacancyId: cand.vacancyId,
          vacancyKey: key,
          title: cand.jobTitle || "Job Opening",
          department: cand.department || "General",
          jobType: "Position Opening",
          vacancyCount: null,
          status: "ACTIVE",
          rawVacancy: { id: cand.vacancyId, title: cand.jobTitle },
          candidates: [],
        });
      }

      groupsMap.get(key).candidates.push(cand);
    });

    let result = Array.from(groupsMap.values());
    if (selectedVacancyFilter !== "ALL") {
      result = result.filter((g) => g.vacancyKey === selectedVacancyFilter);
    }

    return result.filter((g) => g.candidates.length > 0 || selectedVacancyFilter !== "ALL");
  }, [candidates, vacancies, selectedVacancyFilter]);

  // Separate into active vacancies and history/archived vacancies
  const activeVacancyGroups = useMemo(() => {
    return vacancyGroups.filter((g) => !isRemovedFromShortlist(g.rawVacancy || g));
  }, [vacancyGroups]);

  const historyVacancyGroups = useMemo(() => {
    return vacancyGroups.filter((g) => isRemovedFromShortlist(g.rawVacancy || g));
  }, [vacancyGroups]);

  // Active vacancies displayed
  const displayedVacancyGroups = activeVacancyGroups;

  // Overall counts
  const totalApplicants = candidates.length;
  const totalShortlisted = candidates.filter((c) => c.status === "SHORTLISTED").length;
  const totalStaged = Object.values(stagedShortlists).reduce((sum, s) => sum + s.size, 0);
  const totalRecommended = candidates.filter((c) => c.recommendation === "RECOMMENDED_FOR_SHORTLIST").length;

  const expandAll = () => setCollapsedGroups({});
  const collapseAll = () => {
    const all = {};
    displayedVacancyGroups.forEach((g) => {
      all[g.vacancyKey] = true;
    });
    setCollapsedGroups(all);
  };

  return (
    <PageLayout
      role="recruiter"
      activePage="Shortlist Candidates"
      title="Candidate Shortlisting"
      subtitle="Configurable vacancy-specific candidate screening, explainable scoring criteria, and automated qualification shortlisting"
      actions={
        <div className="flex items-center gap-2">
          <Link
            to="/recruitment/applications/shortlist/history"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/80 shadow-xs transition-all cursor-pointer"
            title="View closed and archived candidate shortlist history"
          >
            <History size={14} className="text-primary-600" />
            <span>Shortlist History ({historyVacancyGroups.length})</span>
          </Link>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/80 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-primary-600" : "text-slate-500"} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      }
    >
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
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

        {/* ── Top Summary & Metrics ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shrink-0">
              <Briefcase size={22} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Active Vacancies
              </span>
              <span className="text-xl font-bold text-slate-900">{displayedVacancyGroups.length}</span>
              <span className="text-[11px] text-slate-500 block">Separated Configurations</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <FileText size={22} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Applicants
              </span>
              <span className="text-xl font-bold text-slate-900">{totalApplicants}</span>
              <span className="text-[11px] text-slate-500 block">Across All Vacancies</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Sparkles size={22} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Recommended / Staged
              </span>
              <span className="text-xl font-bold text-amber-700">{totalStaged > 0 ? totalStaged : totalRecommended}</span>
              <span className="text-[11px] text-amber-600 font-medium block">Qualifies for Shortlist</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Confirmed Shortlist
              </span>
              <span className="text-xl font-bold text-emerald-700">{totalShortlisted}</span>
              <span className="text-[11px] text-emerald-600 font-medium block">Advanced Candidates</span>
            </div>
          </div>
        </div>

        {/* ── Global Search & Position Filter Bar ── */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={17} />
              <input
                type="text"
                placeholder="Search candidate name, email, or skill..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
              />
            </div>

            <div className="w-full sm:w-64">
              <select
                value={selectedVacancyFilter}
                onChange={(e) => setSelectedVacancyFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white cursor-pointer"
              >
                <option value="ALL">All Vacancies ({displayedVacancyGroups.length})</option>
                {displayedVacancyGroups.map((g) => (
                  <option key={g.vacancyKey} value={g.vacancyKey}>
                    {g.title} ({g.candidates.length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-primary-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-primary-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* ── Vacancy Separated Shortlist Sections ── */}
        {loading ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-sm">
            <Loader2 size={36} className="animate-spin text-primary-600 mx-auto mb-3" />
            <h4 className="font-bold text-slate-800 text-sm">Loading Candidate Applications & Rules...</h4>
            <p className="text-xs text-slate-400 mt-1">Retrieving candidate submissions and vacancy configurations</p>
          </div>
        ) : displayedVacancyGroups.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-sm max-w-md mx-auto space-y-3">
            <div className="w-14 h-14 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Briefcase size={28} />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">No Active Vacancies Available</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              There are no active candidate applications currently open for shortlisting. Removed and archived vacancies can be accessed in Shortlist History.
            </p>
            {historyVacancyGroups.length > 0 && (
              <Link
                to="/recruitment/applications/shortlist/history"
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-xs"
              >
                <History size={14} />
                <span>View Shortlist History ({historyVacancyGroups.length})</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {displayedVacancyGroups.map((group) => {
              const vacKey = group.vacancyKey;
              const isCollapsed = !!collapsedGroups[vacKey];
              const stagedSet = getStagedSet(vacKey);
              const stagedCount = stagedSet.size;
              const statusFilter = getStatusFilterForVacancy(vacKey);
              const isRunningAuto = !!runningAutoForVacancy[vacKey];
              const isConfirming = !!confirmingVacancy[vacKey];
              const alert = vacancyAlerts[vacKey];

              // Check if we have cached screening config for this vacancy
              const vacConfig = screeningConfigs[group.vacancyId] || screeningConfigs[String(group.vacancyId)] || screeningConfigs[vacKey];
              const minScore = vacConfig?.minimumScore ?? 75;
              const autoShortlistActive = Boolean(vacConfig?.autoShortlistEnabled);

              // Filter candidates for this specific vacancy & sort in sequence by match score descending
              const filteredVacancyCandidates = group.candidates
                .filter((c) => {
                  const q = search.trim().toLowerCase();
                  const matchesSearch =
                    !q ||
                    (c.candidateName || "").toLowerCase().includes(q) ||
                    (c.email || "").toLowerCase().includes(q) ||
                    (Array.isArray(c.skills) && c.skills.some((s) => s.toLowerCase().includes(q)));

                  if (!matchesSearch) return false;

                  if (statusFilter === "ALL") return true;
                  if (statusFilter === "SUITABLE") return getCandidateSuitability(c, minScore).isSuitable;
                  if (statusFilter === "NOT_SUITABLE") return !getCandidateSuitability(c, minScore).isSuitable;
                  if (statusFilter === "UNDER_REVIEW") return c.status === "NEW" || c.status === "UNDER_REVIEW";
                  if (statusFilter === "STAGED") return stagedSet.has(c.id);
                  if (statusFilter === "SHORTLISTED") return c.status === "SHORTLISTED";
                  if (statusFilter === "REJECTED") return c.status === "REJECTED";
                  if (statusFilter === "RECOMMENDED") return c.recommendation === "RECOMMENDED_FOR_SHORTLIST";
                  if (statusFilter === "MANUAL_REVIEW") return c.recommendation === "REQUIRES_MANUAL_REVIEW";
                  return true;
                })
                .sort((a, b) => {
                  // Sequence strictly according to match score descending
                  const scoreA = Number(a.overallScore ?? a.matchScore ?? a.screeningScore ?? 0);
                  const scoreB = Number(b.overallScore ?? b.matchScore ?? b.screeningScore ?? 0);
                  if (scoreB !== scoreA) {
                    return scoreB - scoreA;
                  }
                  const suitA = getCandidateSuitability(a, minScore).isSuitable ? 1 : 0;
                  const suitB = getCandidateSuitability(b, minScore).isSuitable ? 1 : 0;
                  return suitB - suitA;
                });

              // Status and Suitability count breakdowns
              const vacTotal = group.candidates.length;
              const vacSuitable = group.candidates.filter((c) => getCandidateSuitability(c, minScore).isSuitable).length;
              const vacNotSuitable = group.candidates.filter((c) => !getCandidateSuitability(c, minScore).isSuitable).length;
              const vacShortlisted = group.candidates.filter((c) => c.status === "SHORTLISTED").length;
              const vacRejected = group.candidates.filter((c) => c.status === "REJECTED").length;

              return (
                <div
                  key={vacKey}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
                >
                  {/* ── Vacancy Header & Full-Width Controls Bar ── */}
                  <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-primary-950 text-white relative">
                    {/* Top Row: Title, Applicants Count, Last Screened Status & Collapse Button */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                            {group.title}
                          </h3>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-700/80 text-slate-300 font-medium border border-slate-600/40">
                            {vacTotal} Applicants
                          </span>
                          {/* Job Offer Status Badge */}
                          {(() => {
                            const offerInfo = getVacancyOfferInfo(vacKey, group.candidates, group.title);
                            return offerInfo.hasOffer ? (
                              <span
                                className="text-xs px-3 py-1 rounded-full bg-emerald-500/25 text-emerald-300 font-semibold border border-emerald-400/40 flex items-center gap-1.5 shadow-xs"
                                title="Job offer created for this position"
                              >
                                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                <span>Job Offer Created {offerInfo.offerCount > 1 ? `(${offerInfo.offerCount})` : ""}</span>
                              </span>
                            ) : (
                              <span
                                className="text-xs px-3 py-1 rounded-full bg-amber-500/25 text-amber-300 font-semibold border border-amber-400/40 flex items-center gap-1.5 shadow-xs"
                                title="No job offer created yet for this position"
                              >
                                <Clock size={13} className="text-amber-400 shrink-0" />
                                <span>Job Offer Not Created Yet</span>
                              </span>
                            );
                          })()}
                        </div>
                        {/* Persisted Last Run Details from database */}
                        {vacConfig?.lastScreenedAt ? (
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-primary-200">
                            <Clock size={13} className="text-primary-400 shrink-0" />
                            <span className="font-semibold text-slate-200">Last screened:</span>
                            <span className="text-slate-300">
                              {new Date(vacConfig.lastScreenedAt).toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                            {vacConfig.lastScreenedSummary && (
                              <span className="text-primary-300">• {vacConfig.lastScreenedSummary}</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Clock size={13} className="shrink-0 text-slate-400" />
                            <span>Auto-shortlist has not been run yet for this vacancy</span>
                          </div>
                        )}
                      </div>

                      {/* Collapse/Expand Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleCollapse(vacKey)}
                        className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        title={isCollapsed ? "Expand section" : "Collapse section"}
                      >
                        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </button>
                    </div>

                    {/* Bottom: Dedicated Full-Width Action Controls Bar Under Vacancy Information */}
                    <div className="mt-4 p-2.5 bg-slate-950/50 rounded-2xl border border-white/10 backdrop-blur-xs flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* 0. Job Vacancy Details Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedVacancyModal(group.rawVacancy || { id: group.vacancyId, title: group.title, department: group.department })}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 shadow-xs transition-all cursor-pointer"
                          title="Display job vacancy details like public career page"
                        >
                          <FileText size={14} className="text-primary-300 shrink-0" />
                          <span>Job Vacancy Details</span>
                        </button>

                        {/* 1. Define Screening Rules Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenConfigModal(group.rawVacancy || { id: group.vacancyId, title: group.title })}
                          disabled={loadingConfigFor === group.vacancyId}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/70 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                          title="Define screening criteria, weights, mandatory rules, and thresholds for this vacancy"
                        >
                          <SlidersHorizontal size={14} className="text-primary-400 shrink-0" />
                          <span>{loadingConfigFor === group.vacancyId ? "Loading..." : "Define Screening Rules"}</span>
                        </button>

                        {/* Remove Vacancy Button */}
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmArchiveModal({
                              vacancy: group.rawVacancy || { id: group.vacancyId, title: group.title },
                              candidates: group.candidates,
                              unconfirmedCount: group.candidates.filter(
                                (c) => c.status !== "SHORTLISTED" && c.status !== "REJECTED" && c.status !== "HIRED" && c.status !== "OFFER_MADE"
                              ).length,
                            })
                          }
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 border border-rose-400/30 transition-all cursor-pointer"
                          title="Remove vacancy, move to Shortlist History, and reject unconfirmed candidates"
                        >
                          <Archive size={14} className="text-rose-300 shrink-0" />
                          <span>Remove Vacancy</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* 2. Automated Screening Execution Button */}
                        <button
                          type="button"
                          onClick={() =>
                            setPendingScreeningVacancy({
                              vacKey,
                              vacancyTitle: group.title,
                              candidates: group.candidates,
                              minScore,
                              autoShortlistActive,
                            })
                          }
                          disabled={isRunningAuto || vacTotal === 0}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold text-xs shadow-md shadow-primary-950/40 border border-primary-400/30 transition-all disabled:opacity-50 cursor-pointer"
                          title={`Evaluate applicants against vacancy rules ${autoShortlistActive ? "and auto-shortlist qualifying candidates" : ""}`}
                        >
                          {isRunningAuto ? (
                            <>
                              <Loader2 size={14} className="animate-spin text-white" />
                              <span>Screening...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} className="text-amber-300" />
                              <span>{autoShortlistActive ? "Screen & Auto-Shortlist" : "Run Screening"}</span>
                              <span className="px-1.5 py-0.5 rounded-md bg-primary-900/70 border border-primary-400/30 text-[10px] font-bold text-primary-100">
                                ≥{minScore}%
                              </span>
                            </>
                          )}
                        </button>

                        {/* 3. Confirm Shortlist Button (for staged candidates) */}
                        <button
                          type="button"
                          onClick={() =>
                            setPendingConfirmVacancy({
                              vacKey,
                              vacancyTitle: group.title,
                              stagedCount,
                              candidates: group.candidates.filter((c) => stagedSet.has(c.id)),
                            })
                          }
                          disabled={isConfirming || stagedCount === 0}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            stagedCount > 0
                              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md shadow-emerald-950/40 border border-emerald-400/30 cursor-pointer"
                              : "bg-slate-800/40 text-slate-500 border border-slate-800/80 cursor-not-allowed"
                          }`}
                          title={
                            stagedCount > 0
                              ? `Confirm shortlisting for ${stagedCount} staged candidates in ${group.title}`
                              : "Select candidates to stage before confirming shortlist"
                          }
                        >
                          {isConfirming ? (
                            <>
                              <Loader2 size={14} className="animate-spin text-white" />
                              <span>Confirming...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={14} className={stagedCount > 0 ? "text-emerald-100" : "text-slate-600"} />
                              <span>Confirm Shortlist</span>
                              {stagedCount > 0 ? (
                                <span className="px-1.5 py-0.5 bg-emerald-700/80 rounded-full text-[10px] font-extrabold text-white border border-emerald-400/30">
                                  {stagedCount}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-medium">
                                  (0)
                                </span>
                              )}
                            </>
                          )}
                        </button>

                        {/* Reset staging if candidates are staged */}
                        {stagedCount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleClearStagingForVacancy(vacKey)}
                            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 text-xs transition-colors cursor-pointer"
                            title="Clear staged candidates"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Vacancy Alert Banner */}
                    {alert && (
                      <div
                        className={`mt-4 p-3 rounded-xl text-xs flex items-center justify-between gap-3 border ${
                          alert.type === "success"
                            ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                            : alert.type === "error"
                            ? "bg-rose-500/20 border-rose-400/40 text-rose-200"
                            : "bg-blue-500/20 border-blue-400/40 text-blue-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          {alert.type === "success" ? (
                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                          ) : alert.type === "error" ? (
                            <AlertCircle size={16} className="text-rose-400 shrink-0" />
                          ) : (
                            <Sparkles size={16} className="text-blue-400 shrink-0" />
                          )}
                          <span>{alert.message}</span>
                          {alert.actionUrl && (
                            <Link
                              to={alert.actionUrl}
                              className="ml-1 inline-flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer"
                            >
                              <span>{alert.actionLabel || "View"}</span>
                              <ArrowRight size={13} />
                            </Link>
                          )}
                        </div>
                        <button
                          onClick={() => setVacancyAlerts((prev) => ({ ...prev, [vacKey]: null }))}
                          className="text-white/60 hover:text-white cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── Vacancy Content (When not collapsed) ── */}
                  {!isCollapsed && (
                    <div className="p-5 sm:p-6 space-y-5">
                      {/* Per-Vacancy Status Filter Tabs */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {[
                            { id: "ALL", label: `All Ranked (${vacTotal})` },
                            { id: "SUITABLE", label: `✓ Suitable (${vacSuitable})`, highlight: vacSuitable > 0 },
                            { id: "NOT_SUITABLE", label: `✗ Not Suitable (${vacNotSuitable})` },
                            { id: "SHORTLISTED", label: `Shortlisted (${vacShortlisted})` },
                            {
                              id: "STAGED",
                              label: `✨ Staged (${stagedCount})`,
                              highlight: stagedCount > 0,
                            },
                            { id: "REJECTED", label: `Rejected (${vacRejected})` },
                          ].map((t) => (
                            <button
                              key={t.id}
                              onClick={() => setStatusFilterForVacancy(vacKey, t.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                statusFilter === t.id
                                  ? t.highlight
                                    ? "bg-amber-500 text-slate-950 shadow-sm"
                                    : "bg-primary-600 text-white shadow-sm"
                                  : t.highlight
                                  ? "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>

                        {stagedCount > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl flex items-center gap-1.5">
                              <Sparkles size={13} className="text-amber-500" />
                              {stagedCount} ready to confirm
                            </span>
                            <button
                              onClick={() =>
                                setPendingConfirmVacancy({
                                  vacKey,
                                  vacancyTitle: group.title,
                                  stagedCount,
                                  candidates: group.candidates.filter((c) => stagedSet.has(c.id)),
                                })
                              }
                              disabled={isConfirming}
                              className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Check size={13} />
                              Confirm Now
                            </button>
                          </div>
                        )}
                      </div>

                      {/* ── Candidate Cards Grid for this Vacancy ── */}
                      {filteredVacancyCandidates.length === 0 ? (
                        <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <p className="text-xs text-slate-400 font-medium">
                            {vacTotal === 0
                              ? "No candidate applications submitted for this vacancy yet."
                              : "No candidates match the selected filter under this position."}
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                              <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                  <th scope="col" className="py-3 px-3 w-16 text-center">
                                    # Rank
                                  </th>
                                  <th scope="col" className="py-3 px-4">Candidate</th>
                                  <th scope="col" className="py-3 px-4">Match Score</th>
                                  <th scope="col" className="py-3 px-4">Screening Result</th>
                                  <th scope="col" className="py-3 px-4 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {filteredVacancyCandidates.map((cand, idx) => {
                                  const score = Number(cand.overallScore ?? cand.matchScore ?? cand.screeningScore ?? 0);
                                  const scoreBadge = getScoreBadge(score);
                                  const suitability = getCandidateSuitability(cand, minScore);
                                  const isShortlisted = cand.status === "SHORTLISTED";
                                  const isRejected = cand.status === "REJECTED";
                                  const isStaged = stagedSet.has(cand.id);
                                  const isAutomated = cand.decisionSource === "SYSTEM_AUTOMATED";
                                  const gradient = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];

                                  return (
                                    <tr
                                      key={cand.id}
                                      className={`transition-colors duration-150 hover:bg-slate-50/80 ${
                                        isShortlisted
                                          ? "bg-emerald-50/20"
                                          : isStaged
                                          ? "bg-amber-50/25"
                                          : isRejected
                                          ? "bg-slate-50/40 opacity-70"
                                          : ""
                                      }`}
                                    >
                                      {/* 1. Sequence Rank & Stage Checkbox */}
                                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <span className="text-[11px] font-extrabold text-slate-400 w-5 text-right">
                                            #{idx + 1}
                                          </span>
                                          {!isShortlisted && !isRejected ? (
                                            <button
                                              type="button"
                                              onClick={() => toggleStageCandidate(vacKey, cand.id)}
                                              className="text-slate-400 hover:text-primary-600 transition-colors cursor-pointer inline-flex items-center justify-center p-0.5"
                                              title={isStaged ? "Remove from staged shortlist" : "Stage for shortlist"}
                                            >
                                              {isStaged ? (
                                                <CheckSquare size={17} className="text-amber-500" />
                                              ) : (
                                                <Square size={17} />
                                              )}
                                            </button>
                                          ) : (
                                            <span className="text-slate-300 text-xs w-4 text-center">—</span>
                                          )}
                                        </div>
                                      </td>

                                      {/* 2. Candidate */}
                                      <td className="py-3.5 px-4">
                                        <div className="flex items-center gap-3">
                                          <div
                                            className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${gradient} text-white font-bold flex items-center justify-center text-xs shadow-sm shrink-0`}
                                          >
                                            {(cand.candidateName || "A")
                                              .split(" ")
                                              .map((n) => n[0])
                                              .slice(0, 2)
                                              .join("")
                                              .toUpperCase()}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-slate-900 text-sm truncate">
                                                {cand.candidateName}
                                              </span>
                                              {isStaged && (
                                                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300 shrink-0">
                                                  Staged
                                                </span>
                                              )}
                                              {isShortlisted && (
                                                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 shrink-0">
                                                  Shortlisted
                                                </span>
                                              )}
                                              {isRejected && (
                                                <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300 shrink-0">
                                                  Rejected
                                                </span>
                                              )}
                                            </div>
                                            <span className="text-xs text-slate-400 block truncate">
                                              {cand.email}
                                            </span>
                                          </div>
                                        </div>
                                      </td>

                                      {/* 3. Match Score */}
                                      <td className="py-3.5 px-4 whitespace-nowrap">
                                        <div className="flex flex-col items-start gap-0.5">
                                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-xs ${scoreBadge.badgeClass}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${scoreBadge.dotClass}`} />
                                            <span>{score.toFixed(1)}%</span>
                                            <span className="font-medium text-[11px] opacity-80">({scoreBadge.label})</span>
                                          </div>
                                          <span className="text-[10px] text-slate-400 font-medium pl-1">
                                            Cutoff: ≥{minScore}% {isAutomated && "• AI"}
                                          </span>
                                        </div>
                                      </td>

                                      {/* 4. Screening Result (System Decision) */}
                                      <td className="py-3.5 px-4">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          {/* Explicit Suitability Decision */}
                                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${suitability.badgeClass}`}>
                                            {suitability.isSuitable ? (
                                              <CheckCircle2 size={12} className="text-emerald-700" />
                                            ) : suitability.status === "NEEDS_REVIEW" ? (
                                              <AlertTriangle size={12} className="text-amber-700" />
                                            ) : (
                                              <X size={12} className="text-rose-700" />
                                            )}
                                            {suitability.label}
                                          </span>

                                          {/* Mandatory Criteria Status */}
                                          {cand.allMandatoryMet ? (
                                            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
                                              Criteria Met
                                            </span>
                                          ) : (
                                            <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md font-semibold">
                                              Missing Criteria
                                            </span>
                                          )}
                                        </div>
                                      </td>

                                      {/* 5. Action - View Details */}
                                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                        <button
                                          type="button"
                                          onClick={() => setBreakdownCandidate(cand)}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-primary-700 hover:text-primary-900 bg-primary-50 hover:bg-primary-100 border border-primary-200 transition-all cursor-pointer shadow-xs"
                                          title="View matching details: what matched and what did not match"
                                        >
                                          <Eye size={13} />
                                          <span>View</span>
                                        </button>
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
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Vacancy Screening Configuration Modal ── */}
      {configModalVacancy && activeConfigForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl p-6 sm:p-7 space-y-5 border border-slate-100 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider block">
                  Define Screening Rules
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">{configModalVacancy.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define evaluation weights, minimum cutoff score threshold, and mandatory position criteria.
                </p>
              </div>
              <button
                onClick={() => setConfigModalVacancy(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-100 gap-2">
              {[
                { id: "weights", label: "Category Weights & Cutoff" },
                { id: "skills", label: `Required Skills (${activeConfigForm.requiredSkills?.length || 0})` },
                { id: "experience", label: "Experience & Education" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setConfigModalTab(tab.id)}
                  type="button"
                  className={`py-2 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    configModalTab === tab.id
                      ? "border-primary-600 text-primary-600 bg-primary-50/40 rounded-t-lg"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {configSaveError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{configSaveError}</span>
                </div>
                <button
                  type="button"
                  onClick={handleAutoBalanceWeights}
                  className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-lg text-xs cursor-pointer"
                >
                  Auto-Balance to 100%
                </button>
              </div>
            )}

            {/* Tab 1: Category Weights & Cutoff */}
            {configModalTab === "weights" && (
              <div className="space-y-4">
                {/* 1-Click Weight Presets */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Quick 1-Click Weight Presets</span>
                    <button
                      type="button"
                      onClick={handleAutoBalanceWeights}
                      className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sliders size={12} /> Auto-Balance (100%)
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConfigForm({ ...activeConfigForm, skillsWeight: 40, experienceWeight: 25, qualificationsWeight: 20, evidenceWeight: 15 });
                        setConfigSaveError(null);
                      }}
                      className="p-2.5 bg-white hover:bg-primary-50 border border-slate-200 rounded-xl text-left transition-colors cursor-pointer"
                    >
                      <span className="font-bold block text-slate-900 text-xs">Balanced</span>
                      <span className="text-[10px] text-slate-400">40 / 25 / 20 / 15</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConfigForm({ ...activeConfigForm, skillsWeight: 50, experienceWeight: 30, qualificationsWeight: 10, evidenceWeight: 10 });
                        setConfigSaveError(null);
                      }}
                      className="p-2.5 bg-white hover:bg-primary-50 border border-slate-200 rounded-xl text-left transition-colors cursor-pointer"
                    >
                      <span className="font-bold block text-slate-900 text-xs">Technical</span>
                      <span className="text-[10px] text-slate-400">50 / 30 / 10 / 10</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConfigForm({ ...activeConfigForm, skillsWeight: 30, experienceWeight: 35, qualificationsWeight: 20, evidenceWeight: 15 });
                        setConfigSaveError(null);
                      }}
                      className="p-2.5 bg-white hover:bg-primary-50 border border-slate-200 rounded-xl text-left transition-colors cursor-pointer"
                    >
                      <span className="font-bold block text-slate-900 text-xs">Management</span>
                      <span className="text-[10px] text-slate-400">30 / 35 / 20 / 15</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConfigForm({ ...activeConfigForm, skillsWeight: 35, experienceWeight: 15, qualificationsWeight: 30, evidenceWeight: 20 });
                        setConfigSaveError(null);
                      }}
                      className="p-2.5 bg-white hover:bg-primary-50 border border-slate-200 rounded-xl text-left transition-colors cursor-pointer"
                    >
                      <span className="font-bold block text-slate-900 text-xs">Graduate</span>
                      <span className="text-[10px] text-slate-400">35 / 15 / 30 / 20</span>
                    </button>
                  </div>
                </div>

                {/* 4 Weight Sliders */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Category Percentage Weights</span>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const currentSum =
                          Number(activeConfigForm.skillsWeight || 0) +
                          Number(activeConfigForm.experienceWeight || 0) +
                          Number(activeConfigForm.qualificationsWeight || 0) +
                          Number(activeConfigForm.evidenceWeight || 0);
                        const is100 = currentSum === 100;
                        return (
                          <>
                            <span
                              className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                                is100
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                  : "bg-rose-50 text-rose-700 border-rose-300"
                              }`}
                            >
                              Total: {currentSum}% {is100 ? "✓ 100%" : "✗ Must equal 100%"}
                            </span>
                            {!is100 && (
                              <button
                                type="button"
                                onClick={handleAutoBalanceWeights}
                                className="px-2.5 py-1 bg-primary-50 hover:bg-primary-100 text-primary-700 font-bold rounded-xl text-xs border border-primary-200 transition-colors cursor-pointer"
                              >
                                Auto-Balance
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* 1. Skills Weight */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">1. Skills</span>
                        <span className="font-extrabold text-primary-600 bg-white px-2 py-0.5 rounded-lg border border-primary-100">
                          {activeConfigForm.skillsWeight}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={activeConfigForm.skillsWeight}
                        onChange={(e) => setActiveConfigForm({ ...activeConfigForm, skillsWeight: Number(e.target.value) })}
                        className="w-full accent-primary-600 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400 block leading-tight">Required and preferred skills match</span>
                    </div>

                    {/* 2. Experience Weight */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">2. Experience</span>
                        <span className="font-extrabold text-primary-600 bg-white px-2 py-0.5 rounded-lg border border-primary-100">
                          {activeConfigForm.experienceWeight}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={activeConfigForm.experienceWeight}
                        onChange={(e) => setActiveConfigForm({ ...activeConfigForm, experienceWeight: Number(e.target.value) })}
                        className="w-full accent-primary-600 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400 block leading-tight">Minimum years & responsibilities</span>
                    </div>

                    {/* 3. Qualifications Weight */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">3. Education</span>
                        <span className="font-extrabold text-primary-600 bg-white px-2 py-0.5 rounded-lg border border-primary-100">
                          {activeConfigForm.qualificationsWeight}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={activeConfigForm.qualificationsWeight}
                        onChange={(e) => setActiveConfigForm({ ...activeConfigForm, qualificationsWeight: Number(e.target.value) })}
                        className="w-full accent-primary-600 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400 block leading-tight">Degrees & certifications</span>
                    </div>

                    {/* 4. Evidence Weight */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">4. CV Evidence</span>
                        <span className="font-extrabold text-primary-600 bg-white px-2 py-0.5 rounded-lg border border-primary-100">
                          {activeConfigForm.evidenceWeight}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={activeConfigForm.evidenceWeight}
                        onChange={(e) => setActiveConfigForm({ ...activeConfigForm, evidenceWeight: Number(e.target.value) })}
                        className="w-full accent-primary-600 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400 block leading-tight">Practical project evidence</span>
                    </div>
                  </div>
                </div>

                {/* Minimum Passing Score & Policy */}
                <div className="p-4 bg-primary-50/50 rounded-2xl border border-primary-100 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Award size={16} className="text-primary-600" />
                        Minimum Shortlist Score & Policy
                      </h4>
                      <p className="text-xs text-slate-500">
                        Applicants scoring at or above this cutoff with all mandatory criteria satisfied qualify for shortlisting.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary-700 bg-white px-3 py-1 rounded-xl border border-primary-200">
                        Cutoff: ≥{activeConfigForm.minimumScore}%
                      </span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={activeConfigForm.minimumScore}
                    onChange={(e) => setActiveConfigForm({ ...activeConfigForm, minimumScore: Number(e.target.value) })}
                    className="w-full accent-primary-600 cursor-pointer"
                  />

                  {/* Automatic Shortlisting Toggle */}
                  <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-primary-100">
                    <input
                      type="checkbox"
                      id="autoShortlistToggle"
                      checked={Boolean(activeConfigForm.autoShortlistEnabled)}
                      onChange={(e) => setActiveConfigForm({ ...activeConfigForm, autoShortlistEnabled: e.target.checked })}
                      className="mt-1 w-4 h-4 rounded text-primary-600 accent-primary-600 cursor-pointer"
                    />
                    <label htmlFor="autoShortlistToggle" className="text-xs text-slate-700 cursor-pointer">
                      <span className="font-bold block text-slate-900">Enable Automatic Shortlisting for this Vacancy</span>
                      When enabled, applicants meeting all mandatory requirements with an overall score ≥ {activeConfigForm.minimumScore}% will automatically be placed into <span className="font-semibold text-emerald-700">SHORTLISTED</span> status during screening.
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Required Skills */}
            {configModalTab === "skills" && (
              <div className="space-y-4">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Required Technical & Role Skills</span>
                      <span className="text-[11px] text-slate-500">
                        Candidates missing any skill marked "Mandatory" will be flagged for review.
                      </span>
                    </div>
                    <span className="text-xs font-bold text-primary-600 bg-white px-2.5 py-1 rounded-xl border border-primary-100">
                      {activeConfigForm.requiredSkills?.length || 0} skills configured
                    </span>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {(activeConfigForm.requiredSkills || []).map((skill, sIdx) => (
                      <div key={sIdx} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-800">{skill.name}</span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(skill.mandatory)}
                              onChange={(e) => {
                                const updated = [...activeConfigForm.requiredSkills];
                                updated[sIdx] = { ...skill, mandatory: e.target.checked };
                                setActiveConfigForm({ ...activeConfigForm, requiredSkills: updated });
                              }}
                              className="rounded text-primary-600 accent-primary-600 cursor-pointer"
                            />
                            <span>Mandatory</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = activeConfigForm.requiredSkills.filter((_, i) => i !== sIdx);
                              setActiveConfigForm({ ...activeConfigForm, requiredSkills: updated });
                            }}
                            className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                            title="Remove skill"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add skill input */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add required skill (e.g. Java, React, SQL, Project Management)..."
                      id="newSkillInput"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.target.value.trim()) {
                          e.preventDefault();
                          const val = e.target.value.trim();
                          const exists = (activeConfigForm.requiredSkills || []).some(
                            (s) => s.name.toLowerCase() === val.toLowerCase()
                          );
                          if (!exists) {
                            setActiveConfigForm({
                              ...activeConfigForm,
                              requiredSkills: [...(activeConfigForm.requiredSkills || []), { name: val, mandatory: true, aliases: [] }],
                            });
                          }
                          e.target.value = "";
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById("newSkillInput");
                        if (input && input.value.trim()) {
                          const val = input.value.trim();
                          setActiveConfigForm({
                            ...activeConfigForm,
                            requiredSkills: [...(activeConfigForm.requiredSkills || []), { name: val, mandatory: true, aliases: [] }],
                          });
                          input.value = "";
                        }
                      }}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Add Skill
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Experience & Education */}
            {configModalTab === "experience" && (
              <div className="space-y-4">
                {/* Work Experience */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <span className="text-xs font-bold text-slate-800 block">Work Experience Requirement</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Minimum Experience (Years)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={activeConfigForm.minExperienceYears || 0}
                        onChange={(e) => setActiveConfigForm({ ...activeConfigForm, minExperienceYears: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(activeConfigForm.experienceMandatory)}
                          onChange={(e) => setActiveConfigForm({ ...activeConfigForm, experienceMandatory: e.target.checked })}
                          className="w-4 h-4 rounded text-primary-600 accent-primary-600"
                        />
                        <span className="font-semibold">Experience threshold is strictly mandatory</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Educational Qualifications */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <span className="text-xs font-bold text-slate-800 block">Educational Qualifications</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Required Degree / Qualification Level
                      </label>
                      <select
                        value={activeConfigForm.requiredDegreeLevel || "ANY"}
                        onChange={(e) => setActiveConfigForm({ ...activeConfigForm, requiredDegreeLevel: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
                      >
                        <option value="ANY">Any / Not Specified</option>
                        <option value="DIPLOMA">Diploma / Higher National Diploma</option>
                        <option value="BACHELORS">Bachelor's Degree (BSc, BEng, etc.)</option>
                        <option value="MASTERS">Master's Degree (MSc, MBA, etc.)</option>
                        <option value="DOCTORATE">Doctorate / PhD</option>
                      </select>
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(activeConfigForm.educationMandatory)}
                          onChange={(e) => setActiveConfigForm({ ...activeConfigForm, educationMandatory: e.target.checked })}
                          className="w-4 h-4 rounded text-primary-600 accent-primary-600"
                        />
                        <span className="font-semibold">Qualification level is mandatory</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfigModalVacancy(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="inline-flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-60 cursor-pointer"
              >
                {savingConfig ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-white" />
                    <span>Saving Rules...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Save Screening Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Candidate Screening Breakdown Modal ── */}
      {breakdownCandidate && (() => {
        const targetVacConfig = screeningConfigs[breakdownCandidate.vacancyId] || null;
        const targetMinScore = targetVacConfig?.minimumScore ?? breakdownCandidate.breakdown?.minimumScore ?? 75;
        const suitability = getCandidateSuitability(breakdownCandidate, targetMinScore);

        // Skills matching analysis
        const candSkills = Array.isArray(breakdownCandidate.skills) ? breakdownCandidate.skills : [];
        const rawReqSkills = Array.isArray(targetVacConfig?.requiredSkills) && targetVacConfig.requiredSkills.length > 0
          ? targetVacConfig.requiredSkills
          : (breakdownCandidate.breakdown?.requiredSkills || []);
        const reqSkillNames = rawReqSkills.map((r) => (typeof r === "string" ? r : r.name));

        const matchedSkills = breakdownCandidate.breakdown?.matchedSkills && Array.isArray(breakdownCandidate.breakdown.matchedSkills) && breakdownCandidate.breakdown.matchedSkills.length > 0
          ? breakdownCandidate.breakdown.matchedSkills
          : candSkills.filter((s) => reqSkillNames.some((r) => r.toLowerCase() === s.toLowerCase()));

        const missingSkills = breakdownCandidate.breakdown?.missingRequiredSkills && Array.isArray(breakdownCandidate.breakdown.missingRequiredSkills)
          ? breakdownCandidate.breakdown.missingRequiredSkills
          : reqSkillNames.filter((r) => !candSkills.some((s) => s.toLowerCase() === r.toLowerCase()));

        const extraSkills = candSkills.filter(
          (s) => !matchedSkills.some((m) => m.toLowerCase() === s.toLowerCase())
        );

        // Experience matching analysis
        const reqExpYears = Number(targetVacConfig?.minExperienceYears ?? breakdownCandidate.breakdown?.requiredExperienceYears ?? 2);
        const candExpYears = Number(breakdownCandidate.experienceYears || 0);
        const expMatched = candExpYears >= reqExpYears;

        // Education matching analysis
        const reqEduLevel = targetVacConfig?.requiredDegreeLevel || "Bachelor's Degree";
        const candEduLevel = breakdownCandidate.education || "Not specified";
        const eduMatched = breakdownCandidate.mandatoryQualificationsMet !== "UNMET";

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 sm:p-7 space-y-5 border border-slate-100 max-h-[92vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider block">
                    Candidate Profile & Matching Details
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5">{breakdownCandidate.candidateName}</h3>
                  <p className="text-xs text-slate-500">
                    Position: <strong className="text-slate-800">{breakdownCandidate.jobTitle}</strong> • {breakdownCandidate.department}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBreakdownCandidate(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* ── System Suitability Verdict Banner ── */}
              <div
                className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
                  suitability.isSuitable
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                    : suitability.status === "NEEDS_REVIEW"
                    ? "bg-amber-50/80 border-amber-200 text-amber-950"
                    : "bg-rose-50/80 border-rose-200 text-rose-950"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      suitability.isSuitable
                        ? "bg-emerald-600 text-white"
                        : suitability.status === "NEEDS_REVIEW"
                        ? "bg-amber-500 text-white"
                        : "bg-rose-600 text-white"
                    }`}
                  >
                    {suitability.isSuitable ? (
                      <CheckCircle2 size={18} />
                    ) : suitability.status === "NEEDS_REVIEW" ? (
                      <AlertTriangle size={18} />
                    ) : (
                      <X size={18} />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm uppercase tracking-wide">
                        System Decision: {suitability.label}
                      </span>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white font-bold border border-slate-200">
                        Match Score: {(breakdownCandidate.overallScore || breakdownCandidate.matchScore || 0).toFixed(1)}% (Cutoff: ≥{targetMinScore}%)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {suitability.reason}
                    </p>
                  </div>
                </div>
              </div>

              {/* Candidate Contact & Profile Overview */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Mail size={13} className="text-slate-400" />
                      <strong>{breakdownCandidate.email}</strong>
                    </span>
                    {breakdownCandidate.phone && breakdownCandidate.phone !== "No phone provided" && (
                      <span className="flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-400" />
                        <span>{breakdownCandidate.phone}</span>
                      </span>
                    )}
                    {breakdownCandidate.location && breakdownCandidate.location !== "Not specified" && (
                      <span className="flex items-center gap-1.5">
                        <Building2 size={13} className="text-slate-400" />
                        <span>{breakdownCandidate.location}</span>
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div>
                    {breakdownCandidate.status === "SHORTLISTED" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <Check size={12} /> Shortlisted
                      </span>
                    ) : breakdownCandidate.status === "REJECTED" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        <X size={12} /> Rejected
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs text-slate-600 font-medium bg-white px-2.5 py-1 rounded-full border border-slate-200">
                        Under Review
                      </span>
                    )}
                  </div>
                </div>

                {/* Summary note if present */}
                {breakdownCandidate.summary && (
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/70 text-xs text-slate-600 italic">
                    "{breakdownCandidate.summary}"
                  </div>
                )}

                {/* Rejection Reason notice if rejected */}
                {breakdownCandidate.rejectionReason && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-xl flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0 text-rose-500" />
                    <span>Rejection Reason: <strong>{breakdownCandidate.rejectionReason}</strong></span>
                  </div>
                )}
              </div>

              {/* ── Requirements Matching Analysis (What Matched vs What Did Not Match) ── */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-primary-600" />
                    Requirements Matching Breakdown (Matched vs Not Matched)
                  </h4>
                </div>

                {/* 1. Skills Matching Details */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Award size={14} className="text-primary-600" />
                      1. Skills Matching Evaluation (Score: {breakdownCandidate.skillsScore ?? "—"}%)
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      missingSkills.length === 0
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-rose-50 text-rose-800 border-rose-200"
                    }`}>
                      {matchedSkills.length} of {matchedSkills.length + missingSkills.length} Required Skills Matched
                    </span>
                  </div>

                  {/* Matched Skills */}
                  <div>
                    <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1 mb-1.5">
                      <Check size={12} className="text-emerald-600" />
                      What Matched ({matchedSkills.length}):
                    </span>
                    {matchedSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {matchedSkills.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold shadow-2xs"
                          >
                            <Check size={11} className="text-emerald-600" />
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No required skills found in candidate profile.</p>
                    )}
                  </div>

                  {/* Missing / Not Matched Skills */}
                  {missingSkills.length > 0 && (
                    <div className="pt-2.5 border-t border-slate-200/60">
                      <span className="text-[11px] font-bold text-rose-800 flex items-center gap-1 mb-1.5">
                        <X size={12} className="text-rose-600" />
                        What Did NOT Match / Missing ({missingSkills.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {missingSkills.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold shadow-2xs"
                          >
                            <X size={11} className="text-rose-600" />
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional Skills */}
                  {extraSkills.length > 0 && (
                    <div className="pt-2.5 border-t border-slate-200/60">
                      <span className="text-[10px] font-medium text-slate-500 block mb-1">
                        Other Candidate Skills Listed:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {extraSkills.slice(0, 8).map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-white text-slate-600 border border-slate-200"
                          >
                            {s}
                          </span>
                        ))}
                        {extraSkills.length > 8 && (
                          <span className="text-[10px] text-slate-400 self-center">
                            +{extraSkills.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Work Experience Matching Details */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Briefcase size={14} className="text-primary-600" />
                      2. Work Experience Matching (Score: {breakdownCandidate.experienceScore ?? "—"}%)
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        expMatched
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}
                    >
                      {expMatched ? "✓ Experience Matched" : "✗ Below Required Experience"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200/60">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Job Requirement</span>
                      <strong className="text-slate-800 font-semibold">{reqExpYears} years minimum</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Candidate Record</span>
                      <strong className={`${expMatched ? "text-emerald-700" : "text-rose-700"} font-semibold`}>
                        {candExpYears} years recorded ({candExpYears >= reqExpYears ? `+${candExpYears - reqExpYears} yrs above` : `${reqExpYears - candExpYears} yrs deficit`})
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 3. Education Matching Details */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <GraduationCap size={14} className="text-primary-600" />
                      3. Education & Qualification Matching (Score: {breakdownCandidate.qualificationsScore ?? "—"}%)
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        eduMatched
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}
                    >
                      {eduMatched ? "✓ Qualification Matched" : "✗ Qualification Unmet"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200/60">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Required Degree Level</span>
                      <strong className="text-slate-800 font-semibold">{reqEduLevel}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Candidate Qualification</span>
                      <strong className="text-slate-800 font-semibold">{candEduLevel}</strong>
                    </div>
                  </div>
                </div>

                {/* 4. CV & Responsibility Evidence */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <FileText size={14} className="text-primary-600" />
                    4. CV & Responsibility Evidence (Score: {breakdownCandidate.evidenceScore ?? "—"}%)
                  </span>
                  {breakdownCandidate.breakdown?.extractedSnippets?.length > 0 ? (
                    <div className="space-y-1.5">
                      {breakdownCandidate.breakdown.extractedSnippets.map((snip, i) => (
                        <p key={i} className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/70 italic">
                          "{snip}"
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic bg-white p-2.5 rounded-xl border border-slate-200/70">
                      No specific responsibility excerpts flagged from resume text.
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <div>
                  <button
                    type="button"
                    onClick={() => setBreakdownCandidate(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Close
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {breakdownCandidate.status !== "REJECTED" && (
                    <button
                      type="button"
                      onClick={() => {
                        const cand = breakdownCandidate;
                        setBreakdownCandidate(null);
                        setRejectingCandidate(cand);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <X size={14} />
                      <span>Reject Candidate</span>
                    </button>
                  )}

                  {breakdownCandidate.status !== "SHORTLISTED" && (
                    <button
                      type="button"
                      onClick={() => {
                        handleShortlistSingle(breakdownCandidate);
                        setBreakdownCandidate(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <Check size={14} />
                      <span>Shortlist Candidate</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Structured Rejection Modal ── */}
      {rejectingCandidate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 border border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Reject Candidate Application?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a structured rejection reason for <span className="font-semibold text-slate-700">{rejectingCandidate.candidateName}</span>.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Rejection Reason
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {REJECTION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {selectedReason === "Other / Non-competitive background" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">
                    Custom Notes:
                  </label>
                  <textarea
                    rows={3}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter specific feedback or justification..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setRejectingCandidate(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejection}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Run Screening Confirmation Modal ── */}
      {pendingScreeningVacancy && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Run Screening Evaluation?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Position: <strong className="text-slate-800">{pendingScreeningVacancy.vacancyTitle}</strong>
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Applicants to screen:</span>
                <strong className="text-slate-900">{pendingScreeningVacancy.candidates.length} candidate(s)</strong>
              </div>
              <div className="flex justify-between">
                <span>Qualification passing score:</span>
                <strong className="text-primary-600">≥ {pendingScreeningVacancy.minScore}%</strong>
              </div>
              <div className="pt-2 border-t border-slate-200/60">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(pendingScreeningVacancy.autoShortlistActive)}
                    onChange={(e) =>
                      setPendingScreeningVacancy((prev) => ({
                        ...prev,
                        autoShortlistActive: e.target.checked,
                      }))
                    }
                    className="mt-0.5 rounded text-primary-600 accent-primary-600"
                  />
                  <span>
                    <strong className="text-slate-900">Auto-shortlist qualifying candidates</strong>
                    <span className="block text-slate-400 text-[11px] mt-0.5">
                      Automatically advance candidates scoring ≥ {pendingScreeningVacancy.minScore}% to Shortlisted status.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingScreeningVacancy(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = pendingScreeningVacancy;
                  setPendingScreeningVacancy(null);
                  handleRunScreeningForVacancy(target.vacKey, target.vacancyTitle, target.candidates);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Sparkles size={14} />
                <span>Confirm & Run Screening</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Shortlist Dialog ── */}
      {pendingConfirmVacancy && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Shortlist Candidates</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Position: <strong className="text-slate-800">{pendingConfirmVacancy.vacancyTitle}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              You are about to finalize and shortlist <strong>{pendingConfirmVacancy.stagedCount} candidate(s)</strong>:
            </p>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {(pendingConfirmVacancy.candidates || []).map((cand) => (
                <div
                  key={cand.id}
                  className="p-2 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-slate-800">{cand.candidateName}</span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {cand.overallScore ? `${Math.round(cand.overallScore)}%` : "Qualified"}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingConfirmVacancy(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = pendingConfirmVacancy;
                  setPendingConfirmVacancy(null);
                  handleConfirmShortlistForVacancy(target.vacKey, target.vacancyTitle);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Check size={14} />
                <span>Confirm Shortlist ({pendingConfirmVacancy.stagedCount})</span>
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
            <div className="p-6 bg-gradient-to-r from-[#0F1B3D] via-[#162752] to-[#0F1B3D] text-white flex items-start justify-between border-b border-primary-900/40 relative">
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

      {/* Confirmation Modal: Archive Vacancy from Shortlist */}
      {confirmArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Archive size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Archive Vacancy to Shortlist History</h3>
                <p className="text-xs text-slate-500">Close vacancy and reject unconfirmed candidates</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-2">
              <p className="font-semibold flex items-center gap-1.5 text-amber-800">
                <AlertCircle size={15} className="shrink-0" />
                <span>Notice on Candidate Tracking & Status:</span>
              </p>
              <p>
                Removing this vacancy will move it to the <span className="font-bold">Shortlist History</span> view.
                All candidates under this vacancy who have <span className="font-bold underline">not been confirmed</span> for shortlist
                ({confirmArchiveModal.unconfirmedCount} candidate{confirmArchiveModal.unconfirmedCount === 1 ? "" : "s"})
                will be automatically marked as <span className="font-bold text-rose-700">REJECTED</span>.
              </p>
              <p>
                Their updated status will immediately reflect as <span className="font-bold">REJECTED</span> on the public candidate tracking page (<code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">/careers/track</code>).
              </p>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to proceed with archiving <span className="font-bold text-slate-900">{confirmArchiveModal.vacancy?.title}</span>?
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
                <span>Confirm & Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </PageLayout>
  );
}
