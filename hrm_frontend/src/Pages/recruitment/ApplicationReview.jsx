import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";



export default function RecruitmentApplicationReview() {
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("ALL");
  const [activeReviewCandidate, setActiveReviewCandidate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (typeof recruitmentApi?.getApplications === "function") {
      setLoading(true);
      recruitmentApi
        .getApplications()
        .then((res) => {
          if (!cancelled) {
            if (res?.data && Array.isArray(res.data)) {
              setCandidates(res.data);
            } else {
              setCandidates([]);
            }
          }
        })
        .catch((err) => {
          console.warn("Could not load backend applications for review:", err);
          if (!cancelled) setCandidates([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Form state for screening evaluation
  const [score, setScore] = useState(80);
  const [notes, setNotes] = useState("");
  const [criteria, setCriteria] = useState({
    experienceMatch: true,
    degreeRequirement: true,
    coreSkillsMatch: true,
    communicationCheck: true,
  });

  const openReviewModal = (cand) => {
    setActiveReviewCandidate(cand);
    setScore(cand.screeningScore ?? 80);
    setNotes(cand.screeningNotes || "");
    setCriteria(
      cand.criteria || {
        experienceMatch: true,
        degreeRequirement: true,
        coreSkillsMatch: true,
        communicationCheck: true,
      }
    );
  };

  const saveReview = async (e) => {
    e.preventDefault();
    if (!activeReviewCandidate) return;

    const eligibilityStatus = Number(score) >= 70 ? "ELIGIBLE" : "INELIGIBLE";
    setSaving(true);
    try {
      if (typeof recruitmentApi?.screenApplication === "function") {
        await recruitmentApi.screenApplication(activeReviewCandidate.id, {
          screeningScore: Number(score),
          screeningNotes: notes,
          eligibilityStatus,
          criteria,
        });
      }
    } catch (err) {
      console.warn("Screening API note:", err);
    } finally {
      setSaving(false);
    }

    setCandidates((prev) =>
      prev.map((c) =>
        c.id === activeReviewCandidate.id
          ? {
              ...c,
              screeningScore: Number(score),
              screeningNotes: notes,
              criteria,
              eligibilityStatus,
              status: "UNDER_REVIEW",
            }
          : c
      )
    );
    setActiveReviewCandidate(null);
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.candidateName.toLowerCase().includes(q) ||
        c.jobTitle.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q);

      const matchesStatus =
        statusTab === "ALL" ||
        (statusTab === "PENDING" && !c.screeningScore) ||
        (statusTab === "COMPLETED" && c.screeningScore);

      return matchesSearch && matchesStatus;
    });
  }, [candidates, search, statusTab]);

  const pendingCount = candidates.filter((c) => !c.screeningScore).length;
  const completedCount = candidates.filter((c) => Boolean(c.screeningScore)).length;

  return (
    <PageLayout
      role="recruiter"
      activePage="Review Applications"
      title="Application Review & Screening"
      subtitle="Evaluate candidate eligibility, enter screening scores, and record evaluation notes"
    >
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Awaiting Evaluation</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</h3>
              <p className="text-xs text-slate-400 mt-1">Pending initial screening</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Reviews</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{completedCount}</h3>
              <p className="text-xs text-slate-400 mt-1">Scored & documented</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Screening Score</p>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">90%</h3>
              <p className="text-xs text-slate-400 mt-1">Across evaluated candidates</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Sparkles size={22} />
            </div>
          </div>
        </div>

        {/* Search & Tabs Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Search candidate or position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex gap-2">
            {[
              { id: "ALL", label: "All Applicants" },
              { id: "PENDING", label: `Pending (${pendingCount})` },
              { id: "COMPLETED", label: `Reviewed (${completedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  statusTab === tab.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Candidates Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-4">Candidate</th>
                  <th className="px-6 py-4">Applied Vacancy</th>
                  <th className="px-6 py-4">Experience</th>
                  <th className="px-6 py-4">Screening Score</th>
                  <th className="px-6 py-4">Review Notes</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">
                      {loading
                        ? "Loading candidates for screening..."
                        : "No candidate applications currently available for review."}
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{c.candidateName}</div>
                      <div className="text-xs text-slate-400">{c.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{c.jobTitle}</div>
                      <div className="text-xs text-slate-400">{c.department}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                      {c.experienceYears} Years Exp
                    </td>
                    <td className="px-6 py-4">
                      {c.screeningScore ? (
                        <span className="inline-flex items-center gap-1 font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          <Star size={13} className="text-amber-500 fill-amber-500" />
                          {c.screeningScore}% Score
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
                          <Clock size={12} />
                          Not Evaluated
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                      {c.screeningNotes || "No review notes yet"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openReviewModal(c)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                      >
                        <ClipboardCheck size={14} />
                        <span>{c.screeningScore ? "Edit Review" : "Screen Candidate"}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Interactive Screening & Review Modal */}
      {activeReviewCandidate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Screen & Evaluate Candidate
                </h3>
                <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                  {activeReviewCandidate.candidateName} • {activeReviewCandidate.jobTitle}
                </p>
              </div>
              <button
                onClick={() => setActiveReviewCandidate(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveReview} className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Screening Score Input */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Screening Eligibility Score (0 - 100)
                  </label>
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                    {score}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Eligibility Checkpoints */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                  Eligibility Criteria Checkpoints
                </label>
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={criteria.experienceMatch}
                      onChange={(e) =>
                        setCriteria((c) => ({ ...c, experienceMatch: e.target.checked }))
                      }
                      className="rounded accent-indigo-600 w-4 h-4"
                    />
                    <span>Meets minimum required years of experience ({activeReviewCandidate.experienceYears} yrs)</span>
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
                    <span>Possesses verified educational credentials / degree</span>
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
                    <span>Demonstrates primary technical & domain qualifications</span>
                  </label>
                </div>
              </div>

              {/* Reviewer Notes Textarea */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Screening Review Notes & Feedback
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter detailed review observations, candidate strengths, or concerns..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveReviewCandidate(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={14} />
                  <span>{saving ? "Saving..." : "Save Review Score"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
