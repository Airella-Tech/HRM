import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { careersApi } from "../../services/api";
import { CareersLayout, Notice } from "./careersShared";
import { formatDate } from "../../utils/careersFormat";

const focusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";

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

  // Auto-search if code & email are both provided in the URL
  useEffect(() => {
    if (urlCode && urlEmail) {
      handleSearch(urlCode, urlEmail);
    }
  }, [urlCode, urlEmail]);

  const handleSearch = async (codeToSearch = trackingCode, emailToSearch = email) => {
    const cleanCode = (codeToSearch || "").trim().toUpperCase();
    const cleanEmail = (emailToSearch || "").trim().toLowerCase();

    if (!cleanCode) {
      setError("Please enter your tracking code.");
      return;
    }
    if (!cleanEmail) {
      setError("Please enter the email address used when applying.");
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
  };

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
    <div className="pt-2 pb-10 sm:pb-12 text-center max-w-2xl mx-auto">
      <Link
        to={backLink}
        className={`inline-flex items-center gap-1.5 text-xs text-indigo-200 hover:text-white mb-4 transition-colors ${focusRing}`}
      >
        <ArrowLeft size={14} /> Back to Open Positions
      </Link>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
        Track Your Application
      </h1>
      <p className="mt-3 text-sm sm:text-base text-indigo-100/90 leading-relaxed">
        Check real-time updates and screening progress using your unique tracking code.
      </p>
    </div>
  );

  return (
    <CareersLayout hero={heroContent}>
      {/* Search Input Box */}
      {!appData && (
        <div className="max-w-xl mx-auto -mt-6">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-200 p-6 sm:p-8">
            <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Search size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Application Lookup</h2>
                <p className="text-xs text-slate-500">
                  Enter the tracking code from your confirmation email
                </p>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Tracking Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. APP-XXXXXXXX"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  className={`w-full rounded-xl border border-slate-300 px-4 py-3 text-sm uppercase tracking-wider font-mono placeholder:font-sans placeholder:normal-case focus:border-indigo-500 ${focusRing}`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Applicant Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="The email address you applied with"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full rounded-xl border border-slate-300 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-indigo-500 ${focusRing}`}
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
                className={`w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 text-sm shadow-md shadow-indigo-600/20 transition-all ${
                  loading ? "opacity-75 cursor-not-allowed" : ""
                } ${focusRing}`}
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Searching Application...
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    Track Application Status
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Can't find your code? Please check the email sent to you immediately after submitting your application.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results View */}
      {appData && (
        <div className="max-w-3xl mx-auto -mt-6 space-y-6">
          {/* Top Status Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-200 overflow-hidden">
            <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="inline-block px-3 py-1 bg-white/10 text-indigo-200 text-xs font-medium rounded-full mb-2">
                    Application Details
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight text-white">
                    {appData.jobTitle || "Job Position"}
                  </h2>
                  <p className="text-sm text-indigo-200 mt-1 flex items-center gap-2">
                    <Briefcase size={14} /> {appData.department || "General"}
                    {appData.companyRef && (
                      <>
                        <span>•</span>
                        <Building2 size={14} /> {appData.companyRef}
                      </>
                    )}
                  </p>
                </div>

                {/* Tracking Code Chip with Copy */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 text-right">
                  <div className="text-[11px] uppercase tracking-wider text-indigo-200 font-semibold">
                    Tracking Code
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-base font-bold text-white">
                      {appData.trackingCode}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-indigo-200 hover:text-white"
                      title="Copy code"
                    >
                      {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Candidate & Metadata Bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
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
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-6">
                Recruitment Progress Pipeline
              </h3>

              <div className="relative">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Step 1: Received */}
                  <div
                    className={`p-4 rounded-xl border ${
                      stage.step >= 1
                        ? "bg-emerald-50/70 border-emerald-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          stage.step >= 1
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">1. Application Received</div>
                        <div className="text-[11px] text-slate-500">CV & profile submitted</div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Under Review */}
                  <div
                    className={`p-4 rounded-xl border ${
                      stage.isRejected
                        ? "bg-rose-50/70 border-rose-200"
                        : stage.step >= 2
                        ? "bg-indigo-50/70 border-indigo-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          stage.isRejected
                            ? "bg-rose-600 text-white"
                            : stage.step >= 2
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {stage.isRejected ? <XCircle size={16} /> : <Clock size={16} />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">2. Review & Screening</div>
                        <div className="text-[11px] text-slate-500">
                          {stage.isRejected ? "Review completed" : "Assessment by HR team"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Shortlisted / Decision */}
                  <div
                    className={`p-4 rounded-xl border ${
                      stage.step >= 3
                        ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20"
                        : "bg-slate-50 border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          stage.step >= 3
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        <UserCheck size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">3. Shortlisted</div>
                        <div className="text-[11px] text-slate-500">Interview stage</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Explanation Box */}
              <div
                className={`mt-6 p-5 rounded-xl border ${
                  stage.isRejected
                    ? "bg-slate-50 border-slate-200 text-slate-800"
                    : appData.status === "SHORTLISTED"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-indigo-50 border-indigo-200 text-indigo-900"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm mb-1">
                  {stage.isRejected ? (
                    <XCircle size={18} className="text-slate-600" />
                  ) : appData.status === "SHORTLISTED" ? (
                    <CheckCircle2 size={18} className="text-emerald-600" />
                  ) : (
                    <Clock size={18} className="text-indigo-600" />
                  )}
                  <span>Status: {appData.status.replace("_", " ")}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {appData.statusDescription || "Your application is currently active in our recruitment pipeline."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={handleResetSearch}
                  className={`text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 ${focusRing}`}
                >
                  <Search size={14} /> Look up another application
                </button>

                <Link
                  to={backLink}
                  className={`text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 ${focusRing}`}
                >
                  View other open positions &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </CareersLayout>
  );
}
