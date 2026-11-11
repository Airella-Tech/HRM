import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";
import { formatSalary, formatDate } from "../../utils/careersFormat";
import {
  isRemovedFromApplications,
  setRemovedFromApplications,
  getApplicationsRemovedDate,
} from "../../utils/vacancyRemovalStorage";
import {
  History,
  ArrowLeft,
  Search,
  Briefcase,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Download,
  Mail,
  Phone,
  Building2,
  Award,
  Sparkles,
  ExternalLink,
  Loader2,
  RefreshCw,
  Check,
  XCircle,
  Layers,
} from "lucide-react";

const AVATAR_GRADIENTS = [
  "from-primary-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-blue-600",
];

const STATUS_CONFIG = {
  NEW: { label: "New Application", color: "bg-blue-50 text-blue-700 border-blue-200" },
  SCREENING: { label: "Screening", color: "bg-amber-50 text-amber-700 border-amber-200" },
  SHORTLISTED: { label: "Shortlisted", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  INTERVIEW_SCHEDULED: { label: "Interview Scheduled", color: "bg-purple-50 text-purple-700 border-purple-200" },
  INTERVIEW_COMPLETED: { label: "Interview Completed", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  OFFER_MADE: { label: "Offer Made", color: "bg-teal-50 text-teal-700 border-teal-200" },
  HIRED: { label: "Hired", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  REJECTED: { label: "Rejected", color: "bg-rose-50 text-rose-700 border-rose-200" },
  ON_HOLD: { label: "On Hold", color: "bg-slate-100 text-slate-700 border-slate-300" },
};

function getInitials(name) {
  if (!name) return "CA";
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function ApplicationsHistory() {
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [jobOffers, setJobOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [offerFilter, setOfferFilter] = useState("ALL");
  const [expandedVacancyId, setExpandedVacancyId] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [confirmRestoreModal, setConfirmRestoreModal] = useState(null);
  const [selectedAppModal, setSelectedAppModal] = useState(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Load all closed vacancies, applications, and job offers
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [vacRes, appRes, offersRes] = await Promise.allSettled([
        recruitmentApi.getVacancies(),
        recruitmentApi.getApplications(),
        typeof recruitmentApi.getJobOffers === "function" ? recruitmentApi.getJobOffers() : Promise.resolve([]),
      ]);

      const allVac =
        vacRes.status === "fulfilled" && Array.isArray(vacRes.value?.data)
          ? vacRes.value.data
          : (Array.isArray(vacRes.value) ? vacRes.value : []);
      // Only keep vacancies removed from Applications (checks backend flag + persistent client state)
      const removedVac = allVac.filter((v) => isRemovedFromApplications(v));
      setVacancies(removedVac);

      const allApps =
        appRes.status === "fulfilled" && Array.isArray(appRes.value?.data)
          ? appRes.value.data
          : (Array.isArray(appRes.value) ? appRes.value : []);
      setApplications(allApps);

      const offersList =
        offersRes.status === "fulfilled" && Array.isArray(offersRes.value?.data)
          ? offersRes.value.data
          : (Array.isArray(offersRes.value) ? offersRes.value : []);
      setJobOffers(offersList);
    } catch (err) {
      console.error("Failed to load applications history:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute job offer status for a vacancy
  const getVacancyOfferInfo = useCallback((vac, vacApps) => {
    const appIds = new Set((vacApps || []).map((a) => Number(a.id)).filter(Boolean));
    const vacTitle = (vac.title || "").trim().toLowerCase();
    const matched = jobOffers.filter((o) => {
      const hasAppMatch = o.applicationId && appIds.has(Number(o.applicationId));
      const hasTitleMatch = vacTitle && o.jobTitle && o.jobTitle.trim().toLowerCase() === vacTitle;
      return hasAppMatch || hasTitleMatch;
    });
    return {
      hasOffer: matched.length > 0,
      offerCount: matched.length,
      offers: matched,
    };
  }, [jobOffers]);

  // Build grouped vacancy items with their applications
  const groupedVacancies = useMemo(() => {
    return vacancies.map((vac) => {
      const vacIdStr = String(vac.id);
      const vacTitle = (vac.title || "").trim().toLowerCase();
      const vacApps = applications.filter((app) => {
        if (app.vacancyId != null && String(app.vacancyId) === vacIdStr) return true;
        if (app.jobTitle && app.jobTitle.trim().toLowerCase() === vacTitle) return true;
        if (app.vacancyTitle && app.vacancyTitle.trim().toLowerCase() === vacTitle) return true;
        return false;
      });
      const offerInfo = getVacancyOfferInfo(vac, vacApps);
      return {
        vacancy: vac,
        applications: vacApps,
        offerInfo,
      };
    });
  }, [vacancies, applications, getVacancyOfferInfo]);

  // Filter grouped vacancies by search query & offer status filter
  const filteredGroupedVacancies = useMemo(() => {
    return groupedVacancies.filter((item) => {
      const q = search.trim().toLowerCase();
      const titleMatch = !q || (item.vacancy.title || "").toLowerCase().includes(q) || (item.vacancy.department || "").toLowerCase().includes(q);
      if (!titleMatch) return false;

      if (offerFilter === "WITH_OFFER" && !item.offerInfo.hasOffer) return false;
      if (offerFilter === "NO_OFFER" && item.offerInfo.hasOffer) return false;

      return true;
    });
  }, [groupedVacancies, search, offerFilter]);

  // Toggle expand / collapse for a vacancy
  const toggleExpand = (vacId) => {
    setExpandedVacancyId((prev) => (prev === vacId ? null : vacId));
  };

  // Restore vacancy back to active applications
  const handleRestore = async (vac) => {
    setActionInProgress(true);
    setRemovedFromApplications(vac.id, false, { title: vac.title });
    try {
      if (typeof recruitmentApi.restoreVacancyToApplications === "function") {
        await recruitmentApi.restoreVacancyToApplications(vac.id);
      }
      setToastMessage({
        type: "success",
        text: `Vacancy "${vac.title}" has been restored to Active Applications.`,
      });
      setConfirmRestoreModal(null);
      await loadData(true);
    } catch (err) {
      console.warn("Backend restore notice:", err?.message);
      setToastMessage({
        type: "success",
        text: `Vacancy "${vac.title}" restored to Active Applications.`,
      });
      setConfirmRestoreModal(null);
      await loadData(true);
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <PageLayout
      role="recruiter"
      activePage="View Applications"
      title="Applications History"
      subtitle="Archived and closed job vacancies and submitted candidate application records"
      actions={
        <div className="flex items-center gap-2">
          <Link
            to="/recruitment/applications"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-primary-700 bg-white hover:bg-primary-50 border border-slate-200 hover:border-primary-200 transition-all shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Back to Active Applications</span>
          </Link>
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin text-primary-600" : "text-slate-500"} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-md border animate-in fade-in duration-200 ${toastMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : toastMessage.type === "error"
                  ? "bg-rose-50 text-rose-800 border-rose-200"
                  : "bg-blue-50 text-blue-800 border-blue-200"
              }`}
          >
            <div className="flex items-center gap-2.5">
              {toastMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        )}

        {/* Top Info Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-semibold backdrop-blur-xs">
                <History size={13} className="text-primary-300" />
                <span>Historical Archive</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">Closed & Removed Vacancies</h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Vacancies removed from active applications appear here. Click any vacancy below to inspect its historical applicant submissions, review notes, and job offer history.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
                <p className="text-xl font-bold text-white">{vacancies.length}</p>
                <p className="text-[11px] text-slate-300 font-medium">Archived Openings</p>
              </div>
              <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
                <p className="text-xl font-bold text-white">
                  {groupedVacancies.reduce((acc, g) => acc + g.applications.length, 0)}
                </p>
                <p className="text-[11px] text-slate-300 font-medium">Applications Stored</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Search vacancy title or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-slate-500 font-medium">Offer Status:</span>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setOfferFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${offerFilter === "ALL" ? "bg-white text-slate-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                All ({groupedVacancies.length})
              </button>
              <button
                type="button"
                onClick={() => setOfferFilter("WITH_OFFER")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${offerFilter === "WITH_OFFER" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                With Offer
              </button>
              <button
                type="button"
                onClick={() => setOfferFilter("NO_OFFER")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${offerFilter === "NO_OFFER" ? "bg-white text-amber-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                No Offer Yet
              </button>
            </div>
          </div>
        </div>

        {/* Vacancies History List */}
        {loading ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-xs">
            <Loader2 size={36} className="animate-spin text-primary-600 mx-auto mb-3" />
            <h4 className="font-bold text-slate-800 text-sm">Loading Applications History...</h4>
            <p className="text-xs text-slate-400 mt-1">Retrieving archived vacancies and historical records</p>
          </div>
        ) : filteredGroupedVacancies.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-xs max-w-md mx-auto space-y-3">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <History size={28} />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">No Vacancies in Applications History</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {search
                ? "No archived vacancies match your search query."
                : "Vacancies removed from Active Applications will appear here with full candidate details."}
            </p>
            <Link
              to="/recruitment/applications"
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Go to Active Applications</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGroupedVacancies.map(({ vacancy: vac, applications: vacApps, offerInfo }) => {
              const isExpanded = expandedVacancyId === vac.id;

              return (
                <div
                  key={vac.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
                >
                  {/* Vacancy Card Header: Click to expand / collapse */}
                  <div
                    onClick={() => toggleExpand(vac.id)}
                    className="p-5 cursor-pointer hover:bg-slate-50/50 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* Left: Vacancy Name and Dates */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200/80">
                        <Briefcase size={22} />
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 hover:text-primary-600 transition-colors">
                            {vac.title}
                          </h3>
                          {vac.department && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                              <Building2 size={11} />
                              <span>{vac.department}</span>
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Removed
                          </span>
                        </div>

                        {/* Deadline Date */}
                        {vac.deadline && (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                            <div className="inline-flex items-center gap-1.5 text-slate-500">
                              <Calendar size={13} />
                              <span>Deadline: {formatDate(vac.deadline)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Offer Badge, Applicant count, Restore button, Expand indicator */}
                    <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center shrink-0">
                      {/* Job Offer Status Badge */}
                      {offerInfo.hasOffer ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          <span>Job Offer Created ({offerInfo.offerCount})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
                          <Clock size={13} className="text-amber-600" />
                          <span>Job Offer Not Created Yet</span>
                        </span>
                      )}

                      {/* Applicant Count */}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700">
                        <Users size={13} />
                        <span>{vacApps.length} {vacApps.length === 1 ? "Application" : "Applications"}</span>
                      </span>

                      {/* Restore to Active Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmRestoreModal(vac);
                        }}
                        disabled={actionInProgress}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 transition-colors shadow-xs cursor-pointer"
                        title="Restore this vacancy back to active applications"
                      >
                        <RotateCcw size={13} />
                        <span>Restore to Active</span>
                      </button>

                      {/* Expand / Collapse Button */}
                      <button
                        type="button"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title={isExpanded ? "Collapse Details" : "View Details"}
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content: Vacancy Details and Applicant Submissions */}
                  {isExpanded && (
                    <div className="border-t border-slate-200/80 bg-slate-50/40 p-5 space-y-5 animate-in fade-in duration-150">
                      {/* Vacancy Facts Box */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200/70 text-xs">
                        <div>
                          <p className="text-slate-400 font-medium">Experience Level</p>
                          <p className="text-slate-800 font-semibold mt-0.5">{vac.experienceLevel || "All Levels"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium">Total Openings</p>
                          <p className="text-slate-800 font-semibold mt-0.5">{vac.vacancyCount || 1} Position(s)</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium">Salary Range</p>
                          <p className="text-slate-800 font-semibold mt-0.5">
                            {formatSalary(vac.salaryMin, vac.salaryMax) || "Competitive / Undisclosed"}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium">Employment Type</p>
                          <p className="text-slate-800 font-semibold mt-0.5">{vac.employmentType || "Full-time"}</p>
                        </div>
                      </div>

                      {/* Applicant Submissions Table */}
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Users size={14} className="text-primary-600" />
                            <span>Submitted Candidates ({vacApps.length})</span>
                          </h4>
                          {vacApps.length > 0 && (
                            <span className="text-[11px] text-slate-400 font-medium">
                              Archived applications preserved for historical audit
                            </span>
                          )}
                        </div>

                        {vacApps.length === 0 ? (
                          <div className="bg-white rounded-xl p-8 text-center border border-slate-200/60 text-slate-400 text-xs">
                            No candidate applications were submitted for this vacancy prior to closure.
                          </div>
                        ) : (
                          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs text-slate-600">
                                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] uppercase font-semibold text-slate-500">
                                  <tr>
                                    <th className="px-5 py-3">Candidate</th>
                                    <th className="px-5 py-3">Tracking Code</th>
                                    <th className="px-5 py-3">Applied Date</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Screening Score</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {vacApps.map((app, idx) => {
                                    const st = STATUS_CONFIG[app.status] || STATUS_CONFIG.NEW;
                                    const gradient = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];

                                    return (
                                      <tr key={app.id || idx} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-5 py-3.5">
                                          <div className="flex items-center gap-3">
                                            <div
                                              className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-xs`}
                                            >
                                              {getInitials(app.candidateName)}
                                            </div>
                                            <div>
                                              <p className="font-semibold text-slate-900">{app.candidateName}</p>
                                              <p className="text-[11px] text-slate-400">{app.email}</p>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-5 py-3.5 font-mono text-[11px] font-semibold text-slate-700">
                                          {app.trackingCode || "N/A"}
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-500">
                                          {app.createdAt ? formatDate(app.createdAt) : "N/A"}
                                        </td>
                                        <td className="px-5 py-3.5">
                                          <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${st.color}`}
                                          >
                                            {st.label}
                                          </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                          {app.matchScore != null ? (
                                            <span className="font-bold text-slate-800">{app.matchScore}%</span>
                                          ) : (
                                            <span className="text-slate-400">Not screened</span>
                                          )}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                          <button
                                            type="button"
                                            onClick={() => setSelectedAppModal(app)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors cursor-pointer"
                                          >
                                            <FileText size={12} />
                                            <span>Details</span>
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal: Restore Vacancy back to Active */}
      {confirmRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                <RotateCcw size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Restore Vacancy</h3>
                <p className="text-xs text-slate-500">Reopen vacancy to Active Applications</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to restore <span className="font-bold text-slate-900">{confirmRestoreModal.title}</span>?
              This vacancy and its candidate applications will be moved back to the <span className="font-semibold text-primary-700">Active Applications</span> page.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={actionInProgress}
                onClick={() => setConfirmRestoreModal(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionInProgress}
                onClick={() => handleRestore(confirmRestoreModal)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {actionInProgress ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                <span>Confirm & Restore</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Application Details Modal */}
      {selectedAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Application Record</h3>
              <button
                onClick={() => setSelectedAppModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <p className="text-sm font-bold text-slate-900">{selectedAppModal.candidateName}</p>
                <div className="flex flex-wrap items-center gap-4 text-slate-600">
                  <span className="flex items-center gap-1"><Mail size={12} /> {selectedAppModal.email}</span>
                  {selectedAppModal.phone && <span className="flex items-center gap-1"><Phone size={12} /> {selectedAppModal.phone}</span>}
                </div>
                <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                    Code: {selectedAppModal.trackingCode || "N/A"}
                  </span>
                  <span>Applied: {formatDate(selectedAppModal.createdAt)}</span>
                </div>
              </div>

              {selectedAppModal.coverLetter && (
                <div>
                  <p className="font-semibold text-slate-700 mb-1">Cover Letter / Notes:</p>
                  <p className="p-3 rounded-xl bg-slate-50 text-slate-600 leading-relaxed max-h-36 overflow-y-auto">
                    {selectedAppModal.coverLetter}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setSelectedAppModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
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

