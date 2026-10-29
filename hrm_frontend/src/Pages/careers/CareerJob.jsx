/**
 * Public vacancy detail page.
 * Link format: /careers/jobs/<id>?company=<registration number>
 */
import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Clock,
  Users,
  Banknote,
  Award,
  CheckCircle2,
  X,
  FileText,
  Upload,
  Sparkles,
  Send,
  AlertCircle,
  Info,
} from "lucide-react";
import { careersApi } from "../../services/api";
import { CareersLayout, DeadlineMeter, Notice } from "./careersShared";
import { errorText, formatSalary } from "../../utils/careersFormat";

const focusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";

const Chip = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm text-indigo-50">
    <Icon size={14} />
    {children}
  </span>
);

const Fact = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-3">
    <Icon size={16} className="mt-0.5 text-slate-400 shrink-0" />
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800">{children}</p>
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <section className="mt-8 first:mt-0">
    <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-2">{title}</h2>
    <p className="text-[15px] leading-7 text-slate-600 whitespace-pre-line max-w-prose">{children}</p>
  </section>
);

export default function CareerJob() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const company = params.get("company") || "";

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(Boolean(company));
  const [error, setError] = useState("");

  const [isApplying, setIsApplying] = useState(false);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applySuccess, setApplySuccess] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [autoRename, setAutoRename] = useState(true);
  const fileInputRef = useRef(null);

  const [applyForm, setApplyForm] = useState({
    candidateName: "",
    email: "",
    phone: "",
    location: "",
    education: "",
    experienceYears: 3,
    summary: "",
    skillsInput: "",
  });

  // Calculate standard ATS file name convention: [Candidate_Name]_CV.pdf
  const suggestedFileName = useMemo(() => {
    const raw = applyForm.candidateName.trim();
    if (!raw) return "Candidate_Name_CV.pdf";
    const clean = raw.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
    return `${clean}_CV.pdf`;
  }, [applyForm.candidateName]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setApplyError("Please select a valid PDF file (.pdf only).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setApplyError("Resume file size exceeds the 5MB limit.");
      return;
    }

    setApplyError("");
    setSelectedFile(file);
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setApplyError("");

    if (!selectedFile) {
      setApplyError("CV / Resume (PDF) is required. Please select and upload your CV before submitting.");
      return;
    }

    setApplySubmitting(true);
    try {
      const skills = applyForm.skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const finalFileName = autoRename
        ? suggestedFileName
        : (selectedFile?.name || suggestedFileName);

      const formData = new FormData();
      formData.append("candidateName", applyForm.candidateName.trim());
      formData.append("email", applyForm.email.trim());
      formData.append("phone", applyForm.phone.trim());
      formData.append("location", applyForm.location.trim());
      formData.append("education", applyForm.education.trim());
      formData.append("experienceYears", Number(applyForm.experienceYears) || 0);
      formData.append("summary", applyForm.summary.trim());

      const skillsToSave = skills.length > 0 ? skills : (job?.requiredSkills || []);
      skillsToSave.forEach((s) => formData.append("skills", s));

      const fileToUpload = new File([selectedFile], finalFileName, { type: "application/pdf" });
      formData.append("resume", fileToUpload);
      formData.append("resumeFileName", finalFileName);
      formData.append("resumeFileType", "application/pdf");
      formData.append("resumeFileSize", `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`);

      const res = await careersApi.applyJob(job.id, company, formData);
      setApplySuccess(res.data || { id: Date.now() });
      setIsApplying(false);
      setSelectedFile(null);
    } catch (err) {
      setApplyError(err.message || "Failed to submit application. Please check details and try again.");
    } finally {
      setApplySubmitting(false);
    }
  };

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    careersApi
      .getJob(id, company)
      .then((res) => !cancelled && setJob(res.data))
      .catch((e) => !cancelled && setError(errorText(e, "Could not load this role")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, company]);

  const backTo = `/careers?company=${encodeURIComponent(company)}`;

  if (!company) {
    return (
      <CareersLayout>
        <Notice title="This careers link is incomplete" text="Please open the full careers link shared by the company." />
      </CareersLayout>
    );
  }

  const hero = (
    <div className="pt-2 pb-8 sm:pb-10">
      <Link
        to={backTo}
        className={`inline-flex items-center gap-1.5 text-sm text-indigo-200 hover:text-white rounded ${focusRing} focus-visible:ring-offset-[#0F1B3D]`}
      >
        <ArrowLeft size={16} /> All open roles
      </Link>
      {job && (
        <>
          <h1 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight leading-tight max-w-3xl">{job.title}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip icon={Building2}>{job.department}</Chip>
            <Chip icon={Clock}>{job.jobType}</Chip>
          </div>
        </>
      )}
    </div>
  );

  if (loading) {
    return (
      <CareersLayout hero={hero}>
        <div className="bg-white rounded-2xl border border-slate-200 p-8 animate-pulse motion-reduce:animate-none">
          <div className="h-5 w-1/4 rounded bg-slate-200" />
          <div className="h-4 w-full rounded bg-slate-100 mt-4" />
          <div className="h-4 w-5/6 rounded bg-slate-100 mt-2" />
          <div className="h-4 w-2/3 rounded bg-slate-100 mt-2" />
        </div>
      </CareersLayout>
    );
  }

  if (error || !job) {
    return (
      <CareersLayout hero={hero}>
        <Notice
          title="This role is no longer open"
          text="It may have been filled or closed. Have a look at the other open roles."
        >
          <Link
            to={backTo}
            className={`inline-block px-4 py-2 rounded-xl bg-[#0F1B3D] text-white text-sm font-semibold hover:bg-[#1a2a55] ${focusRing}`}
          >
            See open roles
          </Link>
        </Notice>
      </CareersLayout>
    );
  }

  const salary = formatSalary(job.salaryMin, job.salaryMax);

  return (
    <CareersLayout hero={hero}>
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 lg:gap-8 items-start">
        {/* Summary and apply: shown first on small screens, sticky on large ones */}
        <aside className="order-first lg:order-last lg:sticky lg:top-6 bg-white rounded-2xl border border-slate-200 p-5">
          <DeadlineMeter deadline={job.deadline} publishedAt={job.publishedAt} />

          <div className="mt-5 pt-5 border-t border-slate-100 space-y-4">
            <Fact icon={Users} label="Openings">{job.vacancyCount}</Fact>
            {job.experienceLevel && <Fact icon={Award} label="Experience">{job.experienceLevel}</Fact>}
            {salary && <Fact icon={Banknote} label="Salary">{salary}</Fact>}
          </div>

          <button
            onClick={() => setIsApplying(true)}
            className={`mt-6 w-full px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-all ${focusRing}`}
          >
            Apply for this role
          </button>

          {applySuccess && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span>Application Submitted!</span>
              </div>
              {applySuccess.trackingCode ? (
                <div className="text-xs text-emerald-800 space-y-1">
                  <p className="text-slate-600">Your unique tracking code:</p>
                  <p className="font-mono font-bold text-sm text-emerald-950 bg-white px-2 py-1 rounded border border-emerald-200 inline-block">
                    {applySuccess.trackingCode}
                  </p>
                  <div className="pt-1.5">
                    <Link
                      to={`/careers/track?company=${encodeURIComponent(company)}&code=${encodeURIComponent(applySuccess.trackingCode)}&email=${encodeURIComponent(applyForm.email)}`}
                      className="font-semibold text-indigo-700 hover:text-indigo-900 underline block"
                    >
                      Track Application Status &rarr;
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-emerald-700 mt-1">
                  Reference ID: <strong className="font-mono">#{applySuccess.id}</strong>
                </p>
              )}
            </div>
          )}
        </aside>

        <article className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
          <Section title="About the role">{job.description}</Section>
          <Section title="Minimum qualifications">{job.qualifications}</Section>

          {(job.requiredSkills || []).length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-3">Skills we are looking for</h2>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((s) => (
                  <span key={s} className="px-3 py-1 rounded-md bg-slate-100 text-slate-700 text-sm font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </section>
          )}
        </article>
      </div>

      {/* ── Public Candidate Application Modal ── */}
      {isApplying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  Apply for {job.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {job.department} • {job.jobType}
                </p>
              </div>
              <button
                onClick={() => setIsApplying(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {applyError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs">
                <AlertCircle size={18} className="shrink-0" />
                <span>{applyError}</span>
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={applyForm.candidateName}
                    onChange={(e) => setApplyForm({ ...applyForm, candidateName: e.target.value })}
                    placeholder="e.g. Sophia Martinez"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={applyForm.email}
                    onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })}
                    placeholder="sophia.m@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={applyForm.phone}
                    onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })}
                    placeholder="+1 (555) 234-5678"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Current Location
                  </label>
                  <input
                    type="text"
                    value={applyForm.location}
                    onChange={(e) => setApplyForm({ ...applyForm, location: e.target.value })}
                    placeholder="San Francisco, CA"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Highest Education
                  </label>
                  <input
                    type="text"
                    value={applyForm.education}
                    onChange={(e) => setApplyForm({ ...applyForm, education: e.target.value })}
                    placeholder="B.S. in Computer Science"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Relevant Experience (Years)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="40"
                    value={applyForm.experienceYears}
                    onChange={(e) => setApplyForm({ ...applyForm, experienceYears: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Core Skills (comma separated)
                </label>
                <input
                  type="text"
                  value={applyForm.skillsInput}
                  onChange={(e) => setApplyForm({ ...applyForm, skillsInput: e.target.value })}
                  placeholder={job.requiredSkills?.join(", ") || "React, TypeScript, CSS, Git"}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Professional Summary
                </label>
                <textarea
                  rows="3"
                  value={applyForm.summary}
                  onChange={(e) => setApplyForm({ ...applyForm, summary: e.target.value })}
                  placeholder="Tell us briefly about your background and why you are a great fit..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Upload CV / Resume (PDF) *
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-5 text-center cursor-pointer bg-slate-50/60 hover:bg-indigo-50/30 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                      <Upload size={20} />
                    </div>
                    <p className="text-xs font-semibold text-slate-800">
                      Click to browse or drag & drop your CV (PDF)
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Accepted format: PDF (.pdf) • Maximum file size: 5MB
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-sm">
                        PDF
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for submission
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2.5 py-1 rounded-lg hover:bg-white transition-colors"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-white transition-colors"
                        title="Remove file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Standard rename format guidance displayed under upload area */}
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-1.5">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Info size={14} className="text-indigo-600 shrink-0" />
                      Standard Rename Format:
                    </span>
                    <span className="font-mono text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                      {suggestedFileName}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Convention: <code className="text-slate-700 font-mono font-medium">[FullName]_CV.pdf</code> (e.g. <span className="font-mono text-slate-600">Sewwandi_Iresha_CV.pdf</span>)
                  </p>
                  <label className="mt-2 flex items-center gap-2 cursor-pointer text-slate-700 text-xs select-none">
                    <input
                      type="checkbox"
                      checked={autoRename}
                      onChange={(e) => setAutoRename(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <span>Automatically apply standard rename format upon upload</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsApplying(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applySubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>{applySubmitting ? "Submitting..." : "Submit Application"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CareersLayout>
  );
}