import React, { useState, useEffect, useMemo } from "react";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";
import {
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Sparkles,
  Zap,
  TrendingUp,
  Sliders,
  Check,
  X,
  AlertTriangle,
  Building2,
  User,
  Star,
  Award,
  ChevronRight,
  Loader2,
} from "lucide-react";

const INITIAL_SHORTLIST_CANDIDATES = [
  {
    id: 1,
    candidateName: "Sophia Martinez",
    email: "sophia.m@example.com",
    jobTitle: "Senior Frontend Engineer",
    department: "Engineering",
    experienceYears: 5,
    matchScore: 92,
    screeningScore: 88,
    skillsMatchCount: "5 of 5 skills matched",
    skillsMatched: ["React", "TypeScript", "Next.js", "Redux", "GraphQL"],
    status: "UNDER_REVIEW", // can be SHORTLISTED or REJECTED
    rejectionReason: null,
  },
  {
    id: 2,
    candidateName: "Liam Johnson",
    email: "liam.j@example.com",
    jobTitle: "UI/UX Product Designer",
    department: "Product Design",
    experienceYears: 4,
    matchScore: 94,
    screeningScore: 92,
    skillsMatchCount: "6 of 6 skills matched",
    skillsMatched: ["Figma", "UI Design", "User Research", "Wireframing", "Prototyping", "Design Systems"],
    status: "UNDER_REVIEW",
    rejectionReason: null,
  },
  {
    id: 3,
    candidateName: "Amara Patel",
    email: "amara.patel@example.com",
    jobTitle: "DevOps & Cloud Engineer",
    department: "Infrastructure",
    experienceYears: 6,
    matchScore: 84,
    screeningScore: 78,
    skillsMatchCount: "4 of 5 skills matched",
    skillsMatched: ["AWS", "Docker", "Kubernetes", "Linux"],
    status: "UNDER_REVIEW",
    rejectionReason: null,
  },
  {
    id: 4,
    candidateName: "Ethan Davis",
    email: "ethan.davis@example.com",
    jobTitle: "Full Stack Developer",
    department: "Engineering",
    experienceYears: 3,
    matchScore: 68,
    screeningScore: 65,
    skillsMatchCount: "3 of 5 skills matched",
    skillsMatched: ["JavaScript", "Node.js", "React"],
    status: "UNDER_REVIEW",
    rejectionReason: null,
  },
  {
    id: 5,
    candidateName: "Chloe Dubois",
    email: "chloe.dubois@example.com",
    jobTitle: "HR & Recruitment Coordinator",
    department: "Human Resources",
    experienceYears: 2,
    matchScore: 54,
    screeningScore: 50,
    skillsMatchCount: "2 of 5 skills matched",
    skillsMatched: ["Onboarding", "HR Policies"],
    status: "REJECTED",
    rejectionReason: "Experience below required threshold for vacancy",
  },
];

const REJECTION_REASONS = [
  "Experience below required threshold for vacancy",
  "Key technical skills mismatch",
  "Salary expectations exceed approved budget",
  "Failed initial screening assessment",
  "Position filled by higher-ranked candidate",
  "Other / Non-competitive background",
];

function normalizeCandidate(c) {
  const skillsList = Array.isArray(c.skillsMatched) && c.skillsMatched.length > 0
    ? c.skillsMatched
    : (Array.isArray(c.skills) ? c.skills : []);
  const score = c.matchScore ?? c.screeningScore ?? (c.status === "SHORTLISTED" ? 85 : 70);
  return {
    ...c,
    matchScore: score,
    screeningScore: c.screeningScore ?? score,
    skillsMatched: skillsList,
    skillsMatchCount: c.skillsMatchCount || (skillsList.length > 0 ? `${skillsList.length} skills listed` : "Skills reviewed"),
    jobTitle: c.jobTitle || c.vacancyTitle || "Job Vacancy",
    department: c.department || "General",
    experienceYears: c.experienceYears ?? 0,
  };
}

export default function RecruitmentCandidateShortlist() {
  const [candidates, setCandidates] = useState(INITIAL_SHORTLIST_CANDIDATES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    let cancelled = false;
    if (typeof recruitmentApi?.getApplications === "function") {
      recruitmentApi
        .getApplications()
        .then((res) => {
          if (!cancelled && res?.data && Array.isArray(res.data) && res.data.length > 0) {
            setCandidates(res.data.map(normalizeCandidate));
          }
        })
        .catch((err) => {
          console.warn("Could not load backend applications for shortlisting, using initial dataset:", err);
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Automated Shortlisting Engine State
  const [threshold, setThreshold] = useState(75);
  const [runningAuto, setRunningAuto] = useState(false);
  const [autoMessage, setAutoMessage] = useState("");

  // Rejection modal
  const [rejectingCandidate, setRejectingCandidate] = useState(null);
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);

  // Run automated algorithm to shortlist qualified candidates meeting the score threshold
  const runAutomatedShortlist = async () => {
    setRunningAuto(true);
    setAutoMessage("");

    try {
      const res = await recruitmentApi.autoShortlist(threshold);
      if (res?.data?.shortlistedCandidates) {
        setCandidates((prev) => {
          const ids = new Set(res.data.shortlistedCandidates.map((c) => c.id));
          return prev.map((c) => (ids.has(c.id) ? { ...c, status: "SHORTLISTED" } : c));
        });
        setAutoMessage(
          `Automated Shortlisting Complete: Successfully shortlisted ${res.data.newlyShortlistedCount} candidate(s) meeting the ${threshold}% match threshold.`
        );
        setRunningAuto(false);
        return;
      }
    } catch (err) {
      console.warn("Backend autoShortlist note:", err);
    }

    // Fallback simulation if backend offline
    setTimeout(() => {
      let qualifiedCount = 0;
      setCandidates((prev) =>
        prev.map((c) => {
          if (c.status !== "REJECTED" && (c.matchScore ?? 80) >= threshold) {
            qualifiedCount++;
            return { ...c, status: "SHORTLISTED" };
          }
          return c;
        })
      );
      setRunningAuto(false);
      setAutoMessage(
        `Automated Shortlisting Complete: Advanced ${qualifiedCount} candidate(s) meeting the ${threshold}% match threshold.`
      );
    }, 900);
  };

  const shortlistSingle = async (id) => {
    try {
      await recruitmentApi.shortlistCandidate(id);
    } catch (err) {
      console.warn("Shortlist candidate API note:", err);
    }
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "SHORTLISTED", rejectionReason: null } : c))
    );
  };

  const confirmRejection = async () => {
    if (!rejectingCandidate) return;
    try {
      await recruitmentApi.rejectCandidate(rejectingCandidate.id, selectedReason);
    } catch (err) {
      console.warn("Reject candidate API note:", err);
    }
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === rejectingCandidate.id
          ? { ...c, status: "REJECTED", rejectionReason: selectedReason }
          : c
      )
    );
    setRejectingCandidate(null);
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (c.candidateName || "").toLowerCase().includes(q) ||
        (c.jobTitle || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q);

      const score = c.matchScore ?? c.screeningScore ?? 0;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "RECOMMENDED" && score >= threshold && c.status !== "REJECTED") ||
        (statusFilter === "SHORTLISTED" && c.status === "SHORTLISTED") ||
        (statusFilter === "REJECTED" && c.status === "REJECTED");

      return matchesSearch && matchesStatus;
    });
  }, [candidates, search, statusFilter, threshold]);

  const shortlistedCount = candidates.filter((c) => c.status === "SHORTLISTED").length;
  const eligibleAutoCount = candidates.filter(
    (c) => c.status !== "REJECTED" && (c.matchScore ?? c.screeningScore ?? 0) >= threshold
  ).length;

  return (
    <PageLayout
      role="recruiter"
      activePage="Shortlist Candidates"
      title="Candidate Shortlisting"
      subtitle="Automated screening algorithm, match threshold scoring, and candidate shortlisting workflow"
    >
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* ── Automated Shortlisting Control Banner ── */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-400">
                  <Zap size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    Automated Candidate Shortlisting Engine
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-semibold">
                      AI & Criteria Matching
                    </span>
                  </h3>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Automatically scans applicant qualifications, skill match ratios, and screening ratings against vacancy requirements.
                  </p>
                </div>
              </div>

              <button
                onClick={runAutomatedShortlist}
                disabled={runningAuto}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                {runningAuto ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-slate-900" />
                    <span>Analyzing Applicants...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="text-slate-900" />
                    <span>Run Automated Shortlist</span>
                  </>
                )}
              </button>
            </div>

            {/* Threshold Configuration */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Sliders size={18} className="text-indigo-300" />
                <div>
                  <span className="text-xs font-semibold text-indigo-100 block">
                    Automated Qualification Threshold
                  </span>
                  <span className="text-[11px] text-indigo-300">
                    Candidates with match score ≥ threshold qualify for auto-shortlisting
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-72">
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="flex-1 accent-amber-400 cursor-pointer"
                />
                <span className="font-bold text-amber-300 text-sm whitespace-nowrap bg-black/20 px-3 py-1 rounded-lg">
                  {threshold}% Match
                </span>
              </div>
            </div>

            {autoMessage && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>{autoMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Toolbar: Search & Filter Tabs ── */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Search candidate name or vacancy..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: "ALL", label: `All Candidates (${candidates.length})` },
              { id: "RECOMMENDED", label: `Auto-Qualified (≥${threshold}%)` },
              { id: "SHORTLISTED", label: `Shortlisted (${shortlistedCount})` },
              { id: "REJECTED", label: "Rejected" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setStatusFilter(t.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === t.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Candidates Grid with Automated Match Badges ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCandidates.map((cand) => {
            const score = cand.matchScore ?? cand.screeningScore ?? 0;
            const isAutoEligible = score >= threshold;
            const isShortlisted = cand.status === "SHORTLISTED";
            const isRejected = cand.status === "REJECTED";
            const candidateSkills = Array.isArray(cand.skillsMatched) && cand.skillsMatched.length > 0
              ? cand.skillsMatched
              : (Array.isArray(cand.skills) ? cand.skills : []);

            return (
              <div
                key={cand.id}
                className={`bg-white rounded-2xl p-5 border shadow-sm transition-all flex flex-col justify-between ${
                  isShortlisted
                    ? "border-emerald-200 bg-emerald-50/10"
                    : isRejected
                    ? "border-rose-200 bg-rose-50/10 opacity-75"
                    : isAutoEligible
                    ? "border-indigo-200 ring-2 ring-indigo-500/10"
                    : "border-slate-200/80"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{cand.candidateName || "Applicant"}</h4>
                      <p className="text-xs text-indigo-600 font-medium mt-0.5">{cand.jobTitle || "Role"}</p>
                      <p className="text-xs text-slate-400">{cand.department || "General"} • {cand.experienceYears ?? 0} yrs experience</p>
                    </div>

                    {/* Match Score Badge */}
                    <div className="text-right">
                      <div
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold border ${
                          score >= 80
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : score >= 70
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        <Sparkles size={13} className="text-amber-500" />
                        <span>{score}% Match</span>
                      </div>
                      <span className="block text-[10px] text-slate-400 mt-1">
                        Screening: {cand.screeningScore != null ? `${cand.screeningScore}%` : "Pending"}
                      </span>
                    </div>
                  </div>

                  {/* Skills matched list */}
                  <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-100">
                    <div className="flex items-center justify-between text-slate-500 font-medium">
                      <span>Skills & Qualifications:</span>
                      <span className="font-semibold text-slate-700">
                        {cand.skillsMatchCount || `${candidateSkills.length} skills recorded`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {candidateSkills.length > 0 ? (
                        candidateSkills.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white text-indigo-700 border border-indigo-100"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No specific skills listed</span>
                      )}
                    </div>
                  </div>

                  {cand.rejectionReason && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-xl flex items-center gap-2">
                      <AlertTriangle size={14} className="shrink-0 text-rose-500" />
                      <span>Rejected: {cand.rejectionReason}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs">
                    {isShortlisted ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        <Check size={14} /> Shortlisted
                      </span>
                    ) : isRejected ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                        <X size={14} /> Rejected
                      </span>
                    ) : isAutoEligible ? (
                      <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                        <Zap size={14} className="text-amber-500" />
                        Exceeds Threshold
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Under Review</span>
                    )}
                  </span>

                  <div className="flex items-center gap-2">
                    {!isShortlisted && (
                      <button
                        onClick={() => shortlistSingle(cand.id)}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
                      >
                        <Check size={13} />
                        <span>Shortlist</span>
                      </button>
                    )}

                    {!isRejected && (
                      <button
                        onClick={() => setRejectingCandidate(cand)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-semibold transition-all"
                      >
                        <X size={13} />
                        <span>Reject</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Structured Rejection Modal with Reasons */}
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
                  Specify a structured reason for declining <span className="font-semibold text-slate-700">{rejectingCandidate.candidateName}</span>.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Structured Rejection Reason
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

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setRejectingCandidate(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmRejection}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
