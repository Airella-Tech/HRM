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
  Send,
  AlertCircle,
  Info,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { careersApi } from "../../services/api";
import { CareersLayout, DeadlineMeter, Notice } from "./careersShared";
import { errorText, formatSalary } from "../../utils/careersFormat";

const Chip = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
    <Icon size={13} />
    {children}
  </span>
);

const Fact = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-3">
    <div className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
      <Icon size={15} />
    </div>
    <div>
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-slate-900 mt-0.5">{children}</p>
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <section className="mt-8 first:mt-0">
    <h2 className="text-base font-bold text-slate-900 tracking-tight mb-2.5">{title}</h2>
    <div className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">{children}</div>
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
  const [copied, setCopied] = useState(false);

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
      setApplyError("Please select a valid PDF file (.pdf format only).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setApplyError("Resume file size exceeds the 5 MB limit.");
      return;
    }

    setApplyError("");
    setSelectedFile(file);
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setApplyError("");

    if (!selectedFile) {
      setApplyError("CV / Resume (PDF) is required. Please upload your CV before submitting.");
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
        : selectedFile?.name || suggestedFileName;

      const formData = new FormData();
      formData.append("candidateName", applyForm.candidateName.trim());
      formData.append("email", applyForm.email.trim());
      formData.append("phone", applyForm.phone.trim());
      formData.append("location", applyForm.location.trim());
      formData.append("education", applyForm.education.trim());
      formData.append("experienceYears", Number(applyForm.experienceYears) || 0);
      formData.append("summary", applyForm.summary.trim());

      const skillsToSave = skills.length > 0 ? skills : job?.requiredSkills || [];
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
        <Notice
          title="Careers Link Incomplete"
          text="Please open the full careers portal link provided by the hiring organization."
        />
      </CareersLayout>
    );
  }

  const hero = (
    <div className="pt-2 pb-8 sm:pb-10">
      <Link
        to={backTo}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors mb-3"
      >
        <ArrowLeft size={14} /> Back to all open roles
      </Link>
      {job && (
        <>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white max-w-3xl">
            {job.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
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
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 animate-pulse space-y-4">
          <div className="h-6 w-1/3 rounded-lg bg-slate-200" />
          <div className="h-4 w-full rounded-lg bg-slate-100" />
          <div className="h-4 w-5/6 rounded-lg bg-slate-100" />
        </div>
      </CareersLayout>
    );
  }

  if (error || !job) {
    return (
      <CareersLayout hero={hero}>
        <Notice
          title="Position No Longer Available"
          text="This position may have been filled, unpublished, or closed. Explore our other open vacancies."
        >
          <Link
            to={backTo}
            className="inline-block px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Explore Open Vacancies
          </Link>
        </Notice>
      </CareersLayout>
    );
  }

  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const trackLink = `/careers/track?company=${encodeURIComponent(company)}&code=${encodeURIComponent(
    applySuccess?.trackingCode || ""
  )}&email=${encodeURIComponent(applyForm.email || "")}`;

  return (
    <CareersLayout hero={hero}>
      {/* ── Success Application Banner ── */}
      {applySuccess && (
        <div className="mb-8 p-6 sm:p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-emerald-950">
                Application Successfully Submitted!
              </h3>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                Thank you for applying for <b>{job.title}</b>. Your candidate record has been registered into our recruitment system.
              </p>

              {applySuccess.trackingCode && (
                <div className="mt-4 p-4 rounded-xl bg-white border border-emerald-200/80 inline-block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Your Application Tracking Code
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="font-mono text-base font-extrabold text-emerald-800">
                      {applySuccess.trackingCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(applySuccess.trackingCode);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <Link
                  to={trackLink}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 underline"
                >
                  Track your application status now →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 lg:gap-8 items-start">
        {/* Right Aside: Key Job Facts & Apply Action */}
        <aside className="order-first lg:order-last lg:sticky lg:top-6 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
          {job.deadline && (
            <div>
              <DeadlineMeter deadline={job.deadline} publishedAt={job.publishedAt} />
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 space-y-4">
            <Fact icon={Users} label="Total Openings">
              {job.vacancyCount} {job.vacancyCount === 1 ? "opening" : "openings"}
            </Fact>
            {job.experienceLevel && <Fact icon={Award} label="Experience Level">{job.experienceLevel}</Fact>}
            {salary && <Fact icon={Banknote} label="Salary Range">{salary}</Fact>}
            <Fact icon={Building2} label="Department">{job.department}</Fact>
          </div>

          <button
            type="button"
            onClick={() => setIsApplying(true)}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <Send size={14} />
            <span>Apply for This Role</span>
          </button>
        </aside>

        {/* Left Column: Job Description, Qualifications & Skills */}
        <article className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-8">
          <Section title="Job Overview & Description">
            {job.description || "No description provided for this role."}
          </Section>

          {job.qualifications && (
            <Section title="Required Qualifications & Background">
              {job.qualifications}
            </Section>
          )}

          {job.requiredSkills && job.requiredSkills.length > 0 && (
            <section className="mt-8">
              <h2 className="text-base font-bold text-slate-900 tracking-tight mb-3">
                Key Skills & Competencies
              </h2>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((s) => (
                  <span
                    key={s}
                    className="px-3 py-1 rounded-lg bg-sky-50 border border-sky-100 text-sky-800 text-xs font-semibold"
                  >
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsApplying(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200/90 p-6 sm:p-8 space-y-5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Apply for {job.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {job.department} · {job.jobType}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsApplying(false)}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X size={17} />
              </button>
            </div>

            {applyError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs font-medium">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{applyError}</span>
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={applyForm.candidateName}
                    onChange={(e) => setApplyForm({ ...applyForm, candidateName: e.target.value })}
                    placeholder="e.g. Jane Doe"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={applyForm.email}
                    onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })}
                    placeholder="jane@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={applyForm.phone}
                    onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })}
                    placeholder="+94 77 123 4567"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Current Location
                  </label>
                  <input
                    type="text"
                    value={applyForm.location}
                    onChange={(e) => setApplyForm({ ...applyForm, location: e.target.value })}
                    placeholder="Colombo, Sri Lanka"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Highest Education
                  </label>
                  <input
                    type="text"
                    value={applyForm.education}
                    onChange={(e) => setApplyForm({ ...applyForm, education: e.target.value })}
                    placeholder="B.Sc. in Computer Science"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="45"
                    value={applyForm.experienceYears}
                    onChange={(e) => setApplyForm({ ...applyForm, experienceYears: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Your Core Skills (comma separated)
                </label>
                <input
                  type="text"
                  value={applyForm.skillsInput}
                  onChange={(e) => setApplyForm({ ...applyForm, skillsInput: e.target.value })}
                  placeholder={job.requiredSkills?.join(", ") || "React, Node.js, SQL"}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Professional Summary
                </label>
                <textarea
                  rows="3"
                  value={applyForm.summary}
                  onChange={(e) => setApplyForm({ ...applyForm, summary: e.target.value })}
                  placeholder="Highlight your relevant accomplishments and reasons for applying..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all resize-none"
                />
              </div>

              {/* CV / Resume Upload */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Upload CV / Resume (PDF) <span className="text-rose-500">*</span>
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
                    className="border-2 border-dashed border-slate-200 hover:border-sky-400 rounded-2xl p-5 text-center cursor-pointer bg-slate-50/60 hover:bg-sky-50/20 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-2">
                      <Upload size={18} />
                    </div>
                    <p className="text-xs font-semibold text-slate-800">
                      Click to browse or drop your CV document
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      PDF format only (.pdf) · Max size: 5 MB
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                        PDF
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Ready for upload
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-semibold text-sky-600 hover:underline px-2 py-1"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Standard Rename Info */}
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Info size={13} className="text-sky-600 shrink-0" />
                      ATS Standard File Format:
                    </span>
                    <span className="font-mono text-[11px] font-bold text-sky-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {suggestedFileName}
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-xs select-none">
                    <input
                      type="checkbox"
                      checked={autoRename}
                      onChange={(e) => setAutoRename(e.target.checked)}
                      className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Automatically adopt standard candidate naming convention</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {applySubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Submit Application
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CareersLayout>
  );
}
