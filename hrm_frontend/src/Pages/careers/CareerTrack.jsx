import React, { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  XCircle,
  Briefcase,
  Building2,
  Calendar,
  ArrowLeft,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { careersApi } from "../../services/api";
import { CareersLayout, Notice } from "./careersShared";
import { formatDate } from "../../utils/careersFormat";

const focusRing =
  "focus:outline-none focus:ring-4 focus:ring-slate-900/10 focus:border-slate-800";

export default function CareerTrack() {
  const [params, setParams] = useSearchParams();
  const urlCompany = params.get("company") || "";
  const urlCode = params.get("code") || "";
  const urlEmail = params.get("email") || "";

  const [trackingCode, setTrackingCode] = useState(urlCode);
  const [email, setEmail] = useState(urlEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [appData, setAppData] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSearch = useCallback(
    async (codeToSearch = trackingCode, emailToSearch = email) => {
      const cleanCode = (codeToSearch || "").trim().toUpperCase();
      const cleanEmail = (emailToSearch || "").trim().toLowerCase();

      if (!cleanCode) {
        setError("Please enter your application tracking code.");
        return;
      }
      if (!cleanEmail) {
        setError("Please enter the email address used during submission.");
        return;
      }

      setLoading(true);
      setError("");
      setAppData(null);

      try {
        const res = await careersApi.trackApplication(cleanCode, cleanEmail);
        if (res && res.data) {
          setAppData(res.data);
          // Sync URL query params
          setParams({
            ...(urlCompany ? { company: urlCompany } : {}),
            code: cleanCode,
            email: cleanEmail,
          });
        } else {
          setError("Application not found. Please verify your tracking code and email address.");
        }
      } catch (err) {
        const msg = err?.message || "";
        if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
          setError("No application found matching that tracking code and email address.");
        } else {
          setError(msg.replace(/^\d{3}:\s*/, "") || "Unable to retrieve application status. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [trackingCode, email, setParams, urlCompany]
  );

  // Auto-search if code & email are both provided in the URL
  useEffect(() => {
    if (urlCode && urlEmail) {
      handleSearch(urlCode, urlEmail);
    }
}, [urlCode, urlEmail, handleSearch]);

const handleFormSubmit = (e) => {
  e.preventDefault();
  handleSearch();
};

const handleCopyCode = () => {
  if (!appData?.trackingCode) return;
  navigator.clipboard.writeText(appData.trackingCode);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

const handleResetSearch = () => {
  setAppData(null);
  setError("");
  setTrackingCode("");
  setEmail("");
  setParams(urlCompany ? { company: urlCompany } : {});
};

// Timeline Step Calculations
const getStageInfo = (status) => {
  const s = (status || "NEW").toUpperCase();
  if (s === "REJECTED") {
    return { step: 2, isRejected: true };
  }
  if (s === "SHORTLISTED") {
    return { step: 3, isRejected: false };
  }
  if (s === "UNDER_REVIEW") {
    return { step: 2, isRejected: false };
  }
  return { step: 1, isRejected: false };
};

const stage = appData ? getStageInfo(appData.status) : { step: 1, isRejected: false };

const backLink = urlCompany
  ? `/careers?company=${encodeURIComponent(urlCompany)}`
  : "/careers";

const heroContent = (
  <div className="pt-4 pb-12 sm:pb-16 text-center max-w-2xl mx-auto">
    <Link
      to={backLink}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white mb-4 transition-colors"
    >
      <ArrowLeft size={14} /> Back to Open Positions
    </Link>
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-semibold uppercase tracking-wider mb-3 border border-white/10">
      <Sparkles size={13} className="text-indigo-400" />
      <span>Candidate Status Tracker</span>
    </div>
    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
      Track Your Application
    </h1>
    <p className="mt-3 text-sm text-slate-300 leading-relaxed">
      Verify your candidate progress, review status, and evaluation milestone in real time.
    </p>
  </div>
);

return (
  <CareersLayout hero={heroContent}>
    {/* Search Input Box */}
    {!appData && (
      <div className="max-w-xl mx-auto -mt-8">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-950/5 border border-slate-200 p-6 sm:p-8">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
            <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Search size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Application Lookup</h2>
              <p className="text-xs text-slate-500">
                Enter your assigned tracking code and email
              </p>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Tracking Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. APP-XXXXXXXX"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm uppercase tracking-wider font-mono placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 text-slate-900 focus:bg-white ${focusRing}`}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Applicant Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                placeholder="The email submitted with your application"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm placeholder:text-slate-400 text-slate-900 focus:bg-white ${focusRing}`}
                required
              />
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 text-xs uppercase tracking-wider shadow-md shadow-slate-900/10 transition-all active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  Checking Records...
                </>
              ) : (
                <>
                  <Search size={15} />
                  Track Application Status
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Your tracking code was displayed immediately upon submission and sent to your email.
            </p>
          </div>
        </div>
      </div>
    )}

    {/* Results View */}
    {appData && (
      <div className="max-w-3xl mx-auto -mt-8 space-y-6">
        {/* Top Status Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-950/5 border border-slate-200 overflow-hidden">
          <div className="p-6 sm:p-8 bg-[#090e1a] text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-block px-3 py-1 bg-white/10 text-slate-300 text-xs font-semibold rounded-full mb-3 border border-white/15">
                  Position Applied
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  {appData.jobTitle || "Job Position"}
                </h2>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                  <Briefcase size={13} /> {appData.department || "General"}
                  {appData.companyRef && (
                    <>
                      <span>•</span>
                      <Building2 size={13} /> {appData.companyRef}
                    </>
                  )}
                </p>
              </div>

              {/* Tracking Code Chip with Copy */}
              <div className="bg-white/10 rounded-2xl p-3.5 border border-white/15 text-right">
                <div className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">
                  Tracking Reference
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-sm font-bold text-white">
                    {appData.trackingCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-slate-300 hover:text-white"
                    title="Copy code"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Candidate & Metadata Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Applicant: <span className="font-semibold text-slate-900">{appData.candidateName}</span> ({appData.email})
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-400" />
              Applied: <span className="font-semibold text-slate-900">{formatDate(appData.appliedDate)}</span>
            </div>
          </div>

          {/* Progress Pipeline */}
          <div className="p-6 sm:p-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-5">
              Evaluation Milestones
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Step 1: Received */}
              <div
                className={`p-4 rounded-2xl border ${stage.step >= 1
                  ? "bg-emerald-50/70 border-emerald-200"
                  : "bg-slate-50 border-slate-200"
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${stage.step >= 1
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-600"
                      }`}
                  >
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">1. Received</div>
                    <div className="text-[11px] text-slate-500">CV & Profile submitted</div>
                  </div>
                </div>
              </div>

              {/* Step 2: Under Review */}
              <div
                className={`p-4 rounded-2xl border ${stage.isRejected
                  ? "bg-rose-50/70 border-rose-200"
                  : stage.step >= 2
                    ? "bg-slate-100 border-slate-300"
                    : "bg-slate-50 border-slate-200"
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${stage.isRejected
                      ? "bg-rose-600 text-white"
                      : stage.step >= 2
                        ? "bg-slate-900 text-white"
                        : "bg-slate-200 text-slate-600"
                      }`}
                  >
                    {stage.isRejected ? <XCircle size={16} /> : <Clock size={16} />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">2. Review & Screen</div>
                    <div className="text-[11px] text-slate-500">
                      {stage.isRejected ? "Review completed" : "Talent team review"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Shortlisted / Decision */}
              <div
                className={`p-4 rounded-2xl border ${stage.step >= 3
                  ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20"
                  : "bg-slate-50 border-slate-200 opacity-60"
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${stage.step >= 3
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-600"
                      }`}
                  >
                    <UserCheck size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">3. Shortlisted</div>
                    <div className="text-[11px] text-slate-500">Interview round</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Explanation Box */}
            <div
              className={`mt-6 p-5 rounded-2xl border ${stage.isRejected
                ? "bg-slate-50 border-slate-200 text-slate-800"
                : appData.status === "SHORTLISTED"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-slate-100 border-slate-200 text-slate-900"
                }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm mb-1">
                {stage.isRejected ? (
                  <XCircle size={18} className="text-slate-600" />
                ) : appData.status === "SHORTLISTED" ? (
                  <CheckCircle2 size={18} className="text-emerald-600" />
                ) : (
                  <Clock size={18} className="text-slate-700" />
                )}
                <span>Status: {appData.status.replace("_", " ")}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {appData.statusDescription || "Your application is active in our recruitment pipeline."}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={handleResetSearch}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
              >
                <Search size={14} /> Look up another application
              </button>

              <Link
                to={backLink}
                className="text-xs font-bold text-slate-900 hover:underline flex items-center gap-1"
              >
                Browse all vacancies &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    )}
  </CareersLayout>
);
}
