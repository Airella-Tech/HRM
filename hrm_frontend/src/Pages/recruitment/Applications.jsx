import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";
import RecruitmentApplicationReview from "./ApplicationReview";
import RecruitmentCandidateShortlist from "./CandidateShortlist";
import RecruitmentResumeDownload from "./ResumeDownload";
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
} from "lucide-react";

// Pre-seeded candidates for immediate display & demo
const DEMO_APPLICATIONS = [
  {
    id: 1,
    candidateName: "Sophia Martinez",
    email: "sophia.martinez@example.com",
    phone: "+1 (555) 234-5678",
    location: "San Francisco, CA",
    jobTitle: "Senior Frontend Engineer",
    department: "Engineering",
    experienceYears: 5,
    education: "B.S. in Computer Science, Stanford University",
    appliedDate: "2026-10-18",
    status: "UNDER_REVIEW",
    resumeFileName: "Sophia_Martinez_CV.pdf",
    resumeFileSize: "1.4 MB",
    summary:
      "Passionate frontend developer with 5+ years of experience building scalable design systems and high-performance React/TypeScript web applications.",
    skills: ["React", "TypeScript", "TailwindCSS", "Next.js", "Redux", "GraphQL"],
  },
  {
    id: 2,
    candidateName: "Liam Johnson",
    email: "liam.johnson@example.com",
    phone: "+1 (555) 876-5432",
    location: "New York, NY",
    jobTitle: "UI/UX Product Designer",
    department: "Product Design",
    experienceYears: 4,
    education: "B.A. in Digital Interaction Design, Rhode Island School of Design",
    appliedDate: "2026-10-19",
    status: "SHORTLISTED",
    resumeFileName: "Liam_Johnson_Portfolio_Resume.pdf",
    resumeFileSize: "2.8 MB",
    summary:
      "User-centered product designer specializing in complex SaaS workflows, design systems, and rapid interactive prototyping in Figma.",
    skills: ["Figma", "UI Design", "User Research", "Wireframing", "Prototyping", "Design Systems"],
  },
  {
    id: 3,
    candidateName: "Amara Patel",
    email: "amara.patel@example.com",
    phone: "+1 (555) 345-6789",
    location: "Austin, TX",
    jobTitle: "DevOps & Cloud Engineer",
    department: "Infrastructure",
    experienceYears: 6,
    education: "M.S. in Software Systems, Georgia Tech",
    appliedDate: "2026-10-20",
    status: "NEW",
    resumeFileName: "Amara_Patel_Cloud_Resume.pdf",
    resumeFileSize: "980 KB",
    summary:
      "DevOps engineer with extensive background automating CI/CD pipelines, container orchestration with Kubernetes, and multi-region AWS cloud infrastructure.",
    skills: ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux"],
  },
  {
    id: 4,
    candidateName: "Ethan Davis",
    email: "ethan.davis@example.com",
    phone: "+1 (555) 456-7890",
    location: "Seattle, WA",
    jobTitle: "Full Stack Developer",
    department: "Engineering",
    experienceYears: 3,
    education: "B.S. in Information Systems, University of Washington",
    appliedDate: "2026-10-20",
    status: "NEW",
    resumeFileName: "Ethan_Davis_Resume.pdf",
    resumeFileSize: "1.1 MB",
    summary:
      "Full stack developer with hands-on experience in Node.js, Spring Boot, and React. Eager to solve real-world problems and optimize web performance.",
    skills: ["JavaScript", "Node.js", "Java", "Spring Boot", "PostgreSQL", "React"],
  },
  {
    id: 5,
    candidateName: "Chloe Dubois",
    email: "chloe.dubois@example.com",
    phone: "+1 (555) 901-2345",
    location: "Boston, MA",
    jobTitle: "HR & Recruitment Coordinator",
    department: "Human Resources",
    experienceYears: 2,
    education: "B.A. in Human Resources Management, Boston University",
    appliedDate: "2026-10-17",
    status: "REJECTED",
    resumeFileName: "Chloe_Dubois_HR_Resume.pdf",
    resumeFileSize: "850 KB",
    summary:
      "Detail-oriented HR coordinator with strong communication skills and experience facilitating onboarding, scheduling, and ATS administration.",
    skills: ["ATS Management", "Talent Sourcing", "Onboarding", "HR Policies"],
  },
];

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
];

export default function RecruitmentApplications() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const viewParam = (searchParams.get("view") || "").toLowerCase();

  const [applications, setApplications] = useState(DEMO_APPLICATIONS);
  const [vacancies, setVacancies] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [vacancyFilter, setVacancyFilter] = useState("ALL");

  // Selected Candidate Modal
  const [selectedApp, setSelectedApp] = useState(null);

  // Load backend applications & vacancies
  const loadData = async () => {
    try {
      const [appsRes, vacsRes] = await Promise.allSettled([
        recruitmentApi.getApplications(),
        recruitmentApi.getVacancies(),
      ]);

      if (
        appsRes.status === "fulfilled" &&
        appsRes.value?.data &&
        Array.isArray(appsRes.value.data) &&
        appsRes.value.data.length > 0
      ) {
        setApplications(appsRes.value.data);
      }

      if (vacsRes.status === "fulfilled" && Array.isArray(vacsRes.value?.data)) {
        setVacancies(vacsRes.value.data);
      }
    } catch (err) {
      console.warn("Could not fetch remote applications, using local dataset:", err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Metric counts
  const metrics = useMemo(() => {
    const total = applications.length;
    const newCount = applications.filter((a) => a.status === "NEW").length;
    const reviewCount = applications.filter((a) => a.status === "UNDER_REVIEW").length;
    const shortlistedCount = applications.filter((a) => a.status === "SHORTLISTED").length;
    return { total, newCount, reviewCount, shortlistedCount };
  }, [applications]);

  // Unique vacancy list for dropdown
  const vacancyOptions = useMemo(() => {
    const fromApps = applications.map((a) => a.jobTitle).filter(Boolean);
    const fromVacs = vacancies.map((v) => v.title).filter(Boolean);
    return Array.from(new Set([...fromApps, ...fromVacs]));
  }, [applications, vacancies]);

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        app.candidateName?.toLowerCase().includes(query) ||
        app.email?.toLowerCase().includes(query) ||
        app.jobTitle?.toLowerCase().includes(query) ||
        app.department?.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "ALL" || app.status === statusFilter;
      const matchesVacancy = vacancyFilter === "ALL" || app.jobTitle === vacancyFilter;

      return matchesSearch && matchesStatus && matchesVacancy;
    });
  }, [applications, search, statusFilter, vacancyFilter]);

  // Resume Download Handler
  const handleDownloadResume = (app, e) => {
    if (e) e.stopPropagation();
    try {
      const content = `Resume of ${app.candidateName}\n\nEmail: ${app.email}\nPhone: ${app.phone}\nRole: ${app.jobTitle}\n\nEducation: ${app.education}\nExperience: ${app.experienceYears} years\n\nSummary:\n${app.summary}\n\nSkills:\n${(app.skills || []).join(", ")}`;
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = app.resumeFileName || `${app.candidateName.replace(/\s+/g, "_")}_Resume.txt`;
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
  // This check runs after every hook above so hook call order stays consistent
  // across renders, even when ?view= changes while this component stays mounted.
  if (viewParam === "review" || viewParam === "screen") {
    return <RecruitmentApplicationReview />;
  }
  if (viewParam === "shortlist") {
    return <RecruitmentCandidateShortlist />;
  }
  if (viewParam === "resumes" || viewParam === "download" || viewParam === "resume") {
    return <RecruitmentResumeDownload />;
  }

  return (
    <PageLayout
      role="recruiter"
      activePage="View Applications"
      title="View Applications"
      subtitle="View candidate applications, candidate profiles, and application status"
      actions={
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin text-indigo-600" : "text-slate-500"} />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ── Metric Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Applications</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</h3>
              <p className="text-xs text-slate-400 mt-1">Across all vacancies</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FileText size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Applicants</p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">{metrics.newCount}</h3>
              <p className="text-xs text-slate-400 mt-1">Awaiting initial review</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Clock size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Review</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{metrics.reviewCount}</h3>
              <p className="text-xs text-slate-400 mt-1">Under evaluation</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Sparkles size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shortlisted</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{metrics.shortlistedCount}</h3>
              <p className="text-xs text-slate-400 mt-1">Passed qualification</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>

        {/* ── Search & Filter Controls Toolbar ── */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={17} />
              <input
                type="text"
                placeholder="Search by candidate name, role, email..."
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

            {/* Vacancy dropdown filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap hidden sm:inline">Vacancy:</span>
              <select
                value={vacancyFilter}
                onChange={(e) => setVacancyFilter(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                <option value="ALL">All Vacancies</option>
                {vacancyOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            {["ALL", "NEW", "UNDER_REVIEW", "SHORTLISTED", "REJECTED"].map((st) => {
              const active = statusFilter === st;
              const count =
                st === "ALL"
                  ? applications.length
                  : applications.filter((a) => a.status === st).length;

              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  <span>{st === "ALL" ? "All Applicants" : st.replace("_", " ")}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      active ? "bg-white/20 text-white" : "bg-white text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            {(search || statusFilter !== "ALL" || vacancyFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setVacancyFilter("ALL");
                }}
                className="ml-auto text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 py-1.5"
              >
                <RefreshCw size={12} />
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* ── Applications Table ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-4">Candidate</th>
                  <th className="px-6 py-4">Target Vacancy</th>
                  <th className="px-6 py-4">Experience</th>
                  <th className="px-6 py-4">Applied Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center">
                      <div className="max-w-sm mx-auto space-y-2">
                        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                          <User size={24} />
                        </div>
                        <h4 className="text-base font-semibold text-slate-800">No applications found</h4>
                        <p className="text-xs text-slate-400">
                          We couldn't find any candidate applications matching your search or filter selection.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app, index) => {
                    const st = STATUS_CONFIG[app.status] || STATUS_CONFIG.NEW;
                    const gradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];

                    return (
                      <tr
                        key={app.id}
                        onClick={() => setSelectedApp(app)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        {/* Candidate info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm`}
                            >
                              {getInitials(app.candidateName)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors">
                                {app.candidateName}
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{app.email}</span>
                                <span>•</span>
                                <span>{app.phone}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Vacancy */}
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-800">{app.jobTitle}</div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                            <Building2 size={12} />
                            <span>{app.department}</span>
                          </div>
                        </td>

                        {/* Experience */}
                        <td className="px-6 py-4 text-slate-700 font-medium text-xs">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                            {app.experienceYears} Years Exp
                          </span>
                        </td>

                        {/* Applied date */}
                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {app.appliedDate}
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
                        <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {/* Download Resume button */}
                            <button
                              onClick={(e) => handleDownloadResume(app, e)}
                              title="Download Resume Document"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 transition-all"
                            >
                              <FileDown size={14} />
                              <span>Resume</span>
                            </button>

                            {/* View Profile Modal trigger */}
                            <button
                              onClick={() => setSelectedApp(app)}
                              title="View Application Details"
                              className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <Eye size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer count */}
          <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <span className="font-semibold text-slate-700">{filteredApps.length}</span> of{" "}
              <span className="font-semibold text-slate-700">{applications.length}</span> candidates
            </span>
            <span>Click any candidate row to view their full profile</span>
          </div>
        </div>
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
                  <h3 className="text-xl font-bold text-slate-900">{selectedApp.candidateName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-semibold text-indigo-600">{selectedApp.jobTitle}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500">{selectedApp.department}</span>
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
                  <Mail size={15} className="text-slate-400" />
                  <span className="font-medium text-slate-800">{selectedApp.email}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone size={15} className="text-slate-400" />
                  <span className="font-medium text-slate-800">{selectedApp.phone}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin size={15} className="text-slate-400" />
                  <span className="font-medium text-slate-800">{selectedApp.location || "Remote / Hybrid"}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Calendar size={15} className="text-slate-400" />
                  <span>Applied on {selectedApp.appliedDate}</span>
                </div>
              </div>

              {/* Status & Experience */}
              <div className="flex items-center justify-between p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase">Current Status</span>
                  <div className="mt-1">
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
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Experience</span>
                  <div className="mt-1 text-sm font-bold text-slate-800">{selectedApp.experienceYears} Years</div>
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
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Education</h4>
                  <div className="flex items-center gap-2.5 p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 text-sm text-slate-800">
                    <GraduationCap size={18} className="text-indigo-600 shrink-0" />
                    <span>{selectedApp.education}</span>
                  </div>
                </div>
              )}

              {/* Skills Tags */}
              {selectedApp.skills && selectedApp.skills.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Key Skills</h4>
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

              {/* Resume Document Card */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Attached Resume Document
                </h4>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{selectedApp.resumeFileName}</div>
                      <div className="text-xs text-slate-400">{selectedApp.resumeFileSize || "PDF Document"}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadResume(selectedApp)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    <Download size={14} />
                    Download Resume
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
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