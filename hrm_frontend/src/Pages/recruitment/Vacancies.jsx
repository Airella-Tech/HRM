/**
 * Job Vacancies — recruitment page for creating and managing job vacancies.
 * One component, three pages (set with the `mode` prop from the router):
 *   mode="create"   -> drafts: create, edit, delete, submit for approval
 *   mode="approval" -> vacancies waiting for approval: approve / reject
 *   mode="publish"  -> approved / published / closed: publish and close
 * With no mode it behaves like the old combined page. Old sidebar links
 * (?view=create | approve | publish) are redirected to the matching page.
 * Buttons are shown only for what the logged-in user is allowed to do.
 */
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout";
import StatCard from "../../components/StatCard";
import FilterBar from "./components/FilterBar";
import { recruitmentApi, hrApi, userHrApi, userSelfApi } from "../../services/api";
import { formatSalary, formatDate } from "../../utils/careersFormat";
import { useRecruitmentAccess, fetchRecruitmentAccess } from "../../utils/useRecruitmentAccess";
import ViewButton from "./components/ViewButton";
import { Plus, ExternalLink, Pencil, Trash2, BriefcaseBusiness, Loader2, Save, AlertTriangle, Send, CheckCircle2, XCircle, Megaphone, Ban, Clock, FileText, Users, CalendarDays, Banknote, Award, RefreshCw, X, Linkedin, Copy, Check } from "lucide-react";
import RecruitmentModal, {
  modalLabelClass,
  modalInputClass,
  modalTextareaClass,
  ModalButton,
} from "./components/RecruitmentModal";


const FILTERS = ["ALL", "DRAFT", "PENDING_APPROVAL", "APPROVED", "PUBLISHED", "CLOSED"];
const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];
const PUBLISH_ORDER = { APPROVED: 0, PUBLISHED: 1, CLOSED: 2 };

// What each page shows. `statuses: null` means every status (the old combined page).
const MODES = {
  create: {
    activePage: "Create Vacancies",
    title: "Create Vacancies",
    subtitle: "Draft new vacancies and submit them for approval",
    statuses: ["DRAFT"],
    filters: ["ALL", "REJECTED"],
    allLabel: "All drafts",
    emptyCreate: 'Click "New vacancy" to create a draft.',
    emptyOther: "You have no drafts right now.",
  },
  approval: {
    activePage: "Vacancy Approval",
    title: "Vacancy Approval",
    subtitle: "Review vacancies waiting for approval",
    statuses: ["PENDING_APPROVAL"],
    filters: ["ALL"],
    allLabel: "Pending approval",
    emptyCreate: "No vacancies are waiting for approval.",
    emptyOther: "No vacancies are waiting for approval.",
  },
  publish: {
    activePage: "Publish Vacancies",
    title: "Publish Vacancies",
    subtitle: "Publish approved vacancies and close finished ones",
    statuses: ["APPROVED", "PUBLISHED", "CLOSED"],
    filters: ["ALL", "APPROVED", "PUBLISHED", "CLOSED"],
    allLabel: "All",
    emptyCreate: "Nothing to publish or close right now.",
    emptyOther: "Nothing to publish or close right now.",
  },
};

const DEFAULT_MODE = {
  activePage: "Job Vacancies",
  title: "Job Vacancies",
  subtitle: "Create and manage job vacancies",
  statuses: null,
  filters: FILTERS,
  allLabel: "All",
  emptyCreate: 'Click "New vacancy" to create a draft.',
  emptyOther: "Nothing to show for this filter right now.",
};

// Old sidebar links used ?view=... on the combined page; send them to the new pages
const VIEW_PATH = {
  create: "/recruitment/vacancies/create?new=1",
  approve: "/recruitment/vacancies/approval",
  publish: "/recruitment/vacancies/publish",
};

const STATUS_STYLE = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  APPROVED: "bg-sky-100 text-sky-700",
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-red-100 text-red-700",
};

const statusLabel = (s) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

// Label for a filter pill
const filterLabel = (f, cfg) => {
  if (f === "ALL") return cfg.allLabel;
  if (f === "REJECTED") return "Sent back";
  if (f === "APPROVED" && cfg.statuses) return "Ready to publish";
  return statusLabel(f);
};

// "Nov 19" + a hint like "tomorrow" / "overdue"
const deadlineInfo = (deadline, status) => {
  if (!deadline) return { date: "—", hint: "", tone: "text-slate-400" };
  const [y, m, d] = deadline.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target - today) / 86400000);
  const date = target.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (status === "CLOSED") return { date, hint: "ended", tone: "text-slate-400" };
  if (diff < 0) return { date, hint: "overdue", tone: "text-red-600" };
  if (diff === 0) return { date, hint: "today", tone: "text-amber-600" };
  if (diff === 1) return { date, hint: "tomorrow", tone: "text-amber-600" };
  if (diff <= 7) return { date, hint: `in ${diff} days`, tone: "text-amber-600" };
  return { date, hint: `in ${diff} days`, tone: "text-slate-400" };
};

// Server errors come back as "400: <reason>"; show just the reason
const errorText = (error, fallback) => (error?.message || fallback).replace(/^\d{3}:\s*/, "");

// Tomorrow as yyyy-mm-dd in local time (the deadline must be in the future)
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const emptyForm = {
  title: "",
  department: "",
  jobType: "Full-time",
  vacancyCount: 1,
  description: "",
  qualifications: "",
  skills: "",
  experienceLevel: "",
  salaryMin: "",
  salaryMax: "",
  deadline: "",
};

const formFromVacancy = (v) => ({
  title: v.title || "",
  department: v.department || "",
  jobType: v.jobType || "Full-time",
  vacancyCount: v.vacancyCount ?? 1,
  description: v.description || "",
  qualifications: v.qualifications || "",
  skills: (v.requiredSkills || []).join(", "),
  experienceLevel: v.experienceLevel || "",
  salaryMin: v.salaryMin ?? "",
  salaryMax: v.salaryMax ?? "",
  deadline: v.deadline || "",
});

const Field = ({ label, hint, required, children }) => (
  <label className="block">
    <span className={modalLabelClass}>
      {label} {required && <span className="text-red-600">*</span>}
    </span>
    {children}
    {hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
  </label>
);

// ─── Create / edit pop-up ─────────────────────────────────────
const VacancyModal = ({ vacancy, onClose, onSaved }) => {
  const editing = Boolean(vacancy);
  const [form, setForm] = useState(editing ? formFromVacancy(vacancy) : emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState([]);

  // Department dropdown — only HR Managers / Admins may load the list;
  // for everyone else the field stays a normal text box.
  useEffect(() => {
    let cancelled = false;
    hrApi
      .getDepartments()
      .then((res) => {
        const list = res?.data ?? res ?? [];
        const names = (Array.isArray(list) ? list : [])
          .filter((d) => d.active !== false)
          .map((d) => d.name)
          .filter(Boolean);
        if (!cancelled) setDepartments(names);
      })
      .catch(() => {
        /* not allowed or unavailable: keep the plain text box */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim() || !form.department.trim() || !form.description.trim() || !form.qualifications.trim() || !form.deadline) {
      setError("Please fill in all the required fields.");
      return;
    }
    if (form.salaryMin !== "" && form.salaryMax !== "" && Number(form.salaryMax) < Number(form.salaryMin)) {
      setError("Maximum salary cannot be lower than minimum salary.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      department: form.department.trim(),
      jobType: form.jobType,
      vacancyCount: Number(form.vacancyCount) || 1,
      description: form.description.trim(),
      qualifications: form.qualifications.trim(),
      requiredSkills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      experienceLevel: form.experienceLevel.trim() || null,
      salaryMin: form.salaryMin === "" ? null : Number(form.salaryMin),
      salaryMax: form.salaryMax === "" ? null : Number(form.salaryMax),
      deadline: form.deadline,
    };

    setSaving(true);
    try {
      if (editing) await recruitmentApi.updateVacancy(vacancy.id, payload);
      else await recruitmentApi.createVacancy(payload);
      onSaved();
    } catch (err) {
      setError(errorText(err, "Failed to save the vacancy"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <RecruitmentModal
      open
      title={editing ? "Edit vacancy" : "New vacancy"}
      subtitle="Saved as a draft until it is submitted for approval"
      icon={BriefcaseBusiness}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <ModalButton onClick={onClose}>Cancel</ModalButton>
          <ModalButton variant="primary" type="submit" form="vacancy-form" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {editing ? "Save changes" : "Save as draft"}
          </ModalButton>
        </>
      }
    >
        <form id="vacancy-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Job title" required>
              <input className={modalInputClass} value={form.title} onChange={set("title")} maxLength={120} placeholder="e.g. Senior Java Developer" />
            </Field>
            <Field label="Department" required>
              {departments.length > 0 ? (
                <select className={modalInputClass} value={form.department} onChange={set("department")}>
                  <option value="">Select a department</option>
                  {form.department && !departments.includes(form.department) && (
                    <option value={form.department}>{form.department}</option>
                  )}
                  {departments.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              ) : (
                <input className={modalInputClass} value={form.department} onChange={set("department")} maxLength={100} placeholder="e.g. Engineering" />
              )}
            </Field>
            <Field label="Job type" required>
              <select className={modalInputClass} value={form.jobType} onChange={set("jobType")}>
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Number of openings" required>
              <input type="number" min="1" className={modalInputClass} value={form.vacancyCount} onChange={set("vacancyCount")} />
            </Field>
            <Field label="Experience level">
              <input className={modalInputClass} value={form.experienceLevel} onChange={set("experienceLevel")} maxLength={50} placeholder="e.g. 3+ years" />
            </Field>
            <Field label="Application deadline" required>
              <input type="date" min={tomorrow()} className={modalInputClass} value={form.deadline} onChange={set("deadline")} />
            </Field>
            <Field label="Minimum salary">
              <input type="number" min="0" className={modalInputClass} value={form.salaryMin} onChange={set("salaryMin")} placeholder="Optional" />
            </Field>
            <Field label="Maximum salary">
              <input type="number" min="0" className={modalInputClass} value={form.salaryMax} onChange={set("salaryMax")} placeholder="Optional" />
            </Field>
          </div>

          <Field label="Description and responsibilities" required>
            <textarea rows={4} className={modalTextareaClass} value={form.description} onChange={set("description")} placeholder="What will this person do?" />
          </Field>
          <Field label="Minimum qualifications" required>
            <textarea rows={3} className={modalTextareaClass} value={form.qualifications} onChange={set("qualifications")} placeholder="Education, certificates, experience..." />
          </Field>
          <Field label="Required skills" hint="Separate skills with commas, e.g. Java, Spring Boot, PostgreSQL">
            <input className={modalInputClass} value={form.skills} onChange={set("skills")} />
          </Field>
        </form>
    </RecruitmentModal>
  );
};

// ─── Vacancy details pop-up (opens when a row is clicked) ─────
const VacancyDetailsModal = ({ vacancy: v, canEdit, onClose, onEdit }) => {
  const due = deadlineInfo(v.deadline, v.status);
  const salary = formatSalary(v.salaryMin, v.salaryMax);
  const skills = v.requiredSkills || [];
  const facts = [
    { icon: Users, label: "Openings", value: String(v.vacancyCount ?? 1) },
    { icon: BriefcaseBusiness, label: "Job type", value: v.jobType || "—" },
    { icon: Award, label: "Experience level", value: v.experienceLevel || "Not specified" },
    { icon: Banknote, label: "Salary range", value: salary || "Not specified" },
    {
      icon: CalendarDays,
      label: "Deadline",
      value: v.deadline ? `${formatDate(v.deadline)}${due.hint ? ` · ${due.hint}` : ""}` : "—",
    },
  ];

  return (
    <RecruitmentModal
      open
      title={v.title}
      subtitle={v.department}
      icon={BriefcaseBusiness}
      badge={
        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[v.status] || STATUS_STYLE.DRAFT}`}>
          {statusLabel(v.status)}
        </span>
      }
      onClose={onClose}
      size="lg"
      closeOnBackdrop
      footer={
        <>
          <ModalButton onClick={onClose}>Close</ModalButton>
          {canEdit && (
            <ModalButton variant="primary" onClick={() => onEdit(v)}>
              Edit vacancy
            </ModalButton>
          )}
        </>
      }
    >
          {v.status === "DRAFT" && v.rejectionReason && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>Sent back: {v.rejectionReason}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {facts.map((f) => (
              <div key={f.label} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <span className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                  <f.icon size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">{f.label}</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">{f.value}</p>
                </div>
              </div>
            ))}
          </div>

          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-1.5">Description</h3>
            <p className="text-sm text-slate-700 whitespace-pre-line">
              {v.description || <span className="text-slate-500">No description provided.</span>}
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-1.5">Qualifications</h3>
            <p className="text-sm text-slate-700 whitespace-pre-line">
              {v.qualifications || <span className="text-slate-500">No qualifications listed.</span>}
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Required skills</h3>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="rounded-lg bg-primary-50 text-primary-700 px-2.5 py-1 text-xs font-semibold">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No skills listed.</p>
            )}
          </section>
    </RecruitmentModal>
  );
};

// ─── Delete confirmation pop-up ───────────────────────────────
const DeleteConfirmModal = ({ vacancy, busy, onCancel, onConfirm }) => (
  <RecruitmentModal
    open
    title="Delete this draft?"
    subtitle="This draft will be removed permanently."
    icon={Trash2}
    onClose={onCancel}
    size="sm"
    tone="danger"
    footer={
      <>
        <ModalButton onClick={onCancel} disabled={busy}>Cancel</ModalButton>
        <ModalButton variant="danger" onClick={onConfirm} disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          Delete
        </ModalButton>
      </>
    }
  >
    <p className="text-sm text-slate-500">
      <span className="font-semibold text-slate-700">"{vacancy.title}"</span> will be removed permanently.
      This can't be undone.
    </p>
  </RecruitmentModal>
);

// ─── Reject pop-up (asks for a reason) ────────────────────────
const RejectModal = ({ vacancy, busy, onCancel, onConfirm }) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!reason.trim()) {
      setError("Please give a reason so the creator knows what to fix.");
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <RecruitmentModal
      open
      title="Reject this vacancy?"
      subtitle="Send this vacancy back to draft"
      icon={XCircle}
      onClose={onCancel}
      size="sm"
      tone="danger"
      footer={
        <>
          <ModalButton onClick={onCancel} disabled={busy}>Cancel</ModalButton>
          <ModalButton variant="danger" onClick={submit} disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
            Reject
          </ModalButton>
        </>
      }
    >
      <p className="text-sm text-slate-500">
        <span className="font-semibold text-slate-700">"{vacancy.title}"</span> goes back to draft
        with your reason attached.
      </p>
      <label>
        <span className={modalLabelClass}>Reason</span>
        <textarea
          rows={4}
          maxLength={500}
          value={reason}
          onChange={(e) => { setReason(e.target.value); setError(""); }}
          placeholder="e.g. Please add a salary range"
          className={modalTextareaClass}
        />
      </label>
      {error && <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</p>}
    </RecruitmentModal>
  );
};

// ─── Close confirmation pop-up ────────────────────────────────
const CloseConfirmModal = ({ vacancy, busy, onCancel, onConfirm }) => (
  <RecruitmentModal
    open
    title="Close this vacancy?"
    subtitle="Stop accepting applications"
    icon={Ban}
    onClose={onCancel}
    size="sm"
    tone="danger"
    footer={
      <>
        <ModalButton onClick={onCancel} disabled={busy}>Cancel</ModalButton>
        <ModalButton variant="danger" onClick={onConfirm} disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
          Close vacancy
        </ModalButton>
      </>
    }
  >
    <p className="text-sm text-slate-500">
      <span className="font-semibold text-slate-700">"{vacancy.title}"</span> will stop accepting
      applications. This can't be undone.
    </p>
  </RecruitmentModal>
);

// ─── Generates pre-formatted LinkedIn post text from vacancy details ─────
const generateLinkedInShareText = (v, publicUrl) => {
  if (!v) return "";

  const skillsText =
    Array.isArray(v.requiredSkills) && v.requiredSkills.length > 0
      ? v.requiredSkills.slice(0, 5).join(", ")
      : "";

  const rawDesc = (v.description || "").replace(/\s+/g, " ").trim();
  const descSnippet =
    rawDesc.length > 200 ? `${rawDesc.slice(0, 200)}...` : rawDesc;

  const lines = [
    `🚀 We are hiring! Exciting career opportunity:`,
    ``,
    `📌 Role: ${v.title}`,
    `🏢 Department: ${v.department || "General"}`,
    `💼 Employment Type: ${v.jobType || "Full-time"}`,
  ];

  if (v.experienceLevel) {
    lines.push(`🎯 Experience Level: ${v.experienceLevel}`);
  }
  if (v.vacancyCount && v.vacancyCount > 1) {
    lines.push(`👥 Open Positions: ${v.vacancyCount}`);
  }

  if (skillsText) {
    lines.push(``, `✨ Key Skills:`, `• ${skillsText}`);
  }

  if (descSnippet) {
    lines.push(``, `📋 About the Role:`, descSnippet);
  }

  lines.push(
    ``,
    `👉 Apply now through our public Careers Portal:`,
    publicUrl,
    ``,
    `#Hiring #JobOpportunity #Careers #Recruitment #${(v.department || "Careers").replace(/[^a-zA-Z0-9]/g, "")}`
  );

  return lines.join("\n");
};

// ─── LinkedIn share confirmation pop-up (opens after publishing) ─────
const LinkedInShareModal = ({ vacancy: v, publicUrl, onShare, onClose }) => {
  const [copied, setCopied] = useState(false);
  const postText = useMemo(() => generateLinkedInShareText(v, publicUrl), [v, publicUrl]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!v) return null;

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(postText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="linkedin-share-dialog-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0077b5]/10 text-[#0077b5] flex items-center justify-center mb-3">
            <Linkedin size={28} />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
            <CheckCircle2 size={13} /> Vacancy Published Successfully
          </span>

          <h3 id="linkedin-share-dialog-title" className="text-lg font-bold text-slate-900">
            Would you like to share this job vacancy on LinkedIn?
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            All details for this vacancy are pre-formatted below so you only need to review and click Post!
          </p>

          <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 my-3.5 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={13} className="text-primary-600" />
                <span>Pre-filled LinkedIn Post</span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs hover:bg-slate-50 transition-colors"
              >
                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>{copied ? "Copied!" : "Copy text"}</span>
              </button>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-lg p-3 text-xs text-slate-800 font-sans whitespace-pre-line max-h-48 overflow-y-auto leading-relaxed select-all">
              {postText}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Clicking <strong>Share on LinkedIn</strong> opens LinkedIn with these details pre-filled.</span>
            </p>
          </div>

          <div className="w-full flex flex-col gap-2.5 mt-1">
            <button
              type="button"
              onClick={() => {
                onShare(v);
                onClose();
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0077b5] hover:bg-[#006097] text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <Linkedin size={16} />
              Share on LinkedIn
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────
export default function RecruitmentVacancies({ mode }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view");
  const wantsNew = searchParams.get("new");
  const cfg = MODES[mode] || DEFAULT_MODE;

  const [vacancies, setVacancies] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  // null = closed, { vacancy: null } = create, { vacancy } = edit
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null); // vacancy waiting for delete confirmation
  const [rejecting, setRejecting] = useState(null); // vacancy waiting for a rejection reason
  const [closing, setClosing] = useState(null); // vacancy waiting for close confirmation
  const [viewing, setViewing] = useState(null); // vacancy whose details pop-up is open
  const [sharePromptVacancy, setSharePromptVacancy] = useState(null); // vacancy waiting for LinkedIn share prompt
  const [companyRef, setCompanyRef] = useState("");
  const [shareToast, setShareToast] = useState("");

  // What this user may do (HR managers / admins have full access)
  const access = useRecruitmentAccess();
  const can = (permission) =>
    Boolean(access?.fullAccess || access?.permissions?.includes(permission));
  const canCreate = can("VACANCY_CREATE");
  const canApprove = can("VACANCY_APPROVE");
  const canPublish = can("VACANCY_PUBLISH");

  // Always ask the server for fresh access when this page opens
  useEffect(() => {
    fetchRecruitmentAccess(true);
  }, []);

  // Switching between the three pages keeps this component mounted, so reset the list controls
  useEffect(() => {
    setFilter("ALL");
    setSearch("");
  }, [mode]);

  // Old sidebar links (?view=create | approve | publish) -> the matching page
  useEffect(() => {
    if (!mode && VIEW_PATH[view]) navigate(VIEW_PATH[view], { replace: true });
  }, [mode, view, navigate]);

  // /recruitment/vacancies/create?new=1 opens the "New vacancy" form straight away
  useEffect(() => {
    if (wantsNew && mode === "create" && canCreate) {
      setModal({ vacancy: null });
      setSearchParams({}, { replace: true });
    }
  }, [wantsNew, mode, canCreate, setSearchParams]);

  // Notification links: ?edit=<vacancy id> opens that vacancy in the edit form
  const editId = searchParams.get("edit");
  useEffect(() => {
    if (!editId || loading || vacancies.length === 0) return;
    const target = vacancies.find((v) => String(v.id) === String(editId));
    if (target && canCreate) setModal({ vacancy: target });
    setSearchParams({}, { replace: true });
  }, [editId, loading, vacancies, canCreate, setSearchParams]);

  // Load all vacancies once; the filter pills and search work on this list
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await recruitmentApi.getVacancies();
      setVacancies(res.data || []);
    } catch (e) {
      setError(errorText(e, "Failed to load vacancies"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem("user")) {
      navigate("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmDelete = async () => {
    const v = deleting;
    setBusyId(v.id);
    try {
      await recruitmentApi.deleteVacancy(v.id);
      setDeleting(null);
      await load();
    } catch (e) {
      setDeleting(null);
      setError(errorText(e, "Failed to delete vacancy"));
    } finally {
      setBusyId(null);
    }
  };

  // Resolve current company registration number / name for public vacancy links
  useEffect(() => {
    let cancelled = false;
    const resolveCompany = async () => {
      try {
        const stored = localStorage.getItem("user");
        if (stored) {
          const u = JSON.parse(stored);
          const ref =
            u.companyRegistrationNumber ||
            u.companyName ||
            u.companyRef ||
            (u.companyId ? String(u.companyId) : null) ||
            u.company;
          if (ref && !cancelled) setCompanyRef(ref);
        }
        try {
          const res = await (userSelfApi?.getMyProfile ? userSelfApi.getMyProfile() : userHrApi.getMyProfile());
          const p = res?.data ?? res ?? {};
          const officialRef =
            p.companyRegistrationNumber ||
            p.companyName ||
            (p.companyId ? String(p.companyId) : null);
          if (officialRef && !cancelled) {
            setCompanyRef(officialRef);
          }
        } catch {
          if (userHrApi?.getMyProfile) {
            const hrRes = await userHrApi.getMyProfile();
            const hrP = hrRes?.data ?? hrRes ?? {};
            const hrRef =
              hrP.companyRegistrationNumber ||
              hrP.companyName ||
              (hrP.companyId ? String(hrP.companyId) : null);
            if (hrRef && !cancelled) {
              setCompanyRef(hrRef);
            }
          }
        }
      } catch {
        /* fallback handled gracefully */
      }
    };
    resolveCompany();

    return () => {
      cancelled = true;
    };
  }, []);

  // Construct absolute public career URL for a vacancy using its actual published company
  const getPublicJobUrl = (target) => {
    const id = typeof target === "object" && target !== null ? target.id : target;
    const vacancy =
      typeof target === "object" && target !== null
        ? target
        : vacancies.find((item) => String(item.id) === String(id));

    // Priority 1: Actual published company reference directly on the vacancy
    const vacancyCompany =
      vacancy?.companyRef ||
      vacancy?.companyRegistrationNumber ||
      vacancy?.companyName ||
      vacancy?.company ||
      (vacancy?.companyId ? String(vacancy.companyId) : null);

    // Priority 2: Resolved company from user profile or stored user
    const resolvedCompany =
      vacancyCompany ||
      companyRef ||
      (() => {
        try {
          const u = JSON.parse(localStorage.getItem("user") || "{}");
          return (
            u.companyRegistrationNumber ||
            u.companyName ||
            u.companyRef ||
            (u.companyId ? String(u.companyId) : null) ||
            u.company ||
            ""
          );
        } catch {
          return "";
        }
      })();

    return `${window.location.origin}/careers/jobs/${id}?company=${encodeURIComponent(resolvedCompany || "1")}`;
  };

  // Launch LinkedIn public sharing in a new browser tab with pre-filled details
  const handleShareLinkedIn = async (v) => {
    if (!canPublish || !v || v.status !== "PUBLISHED") return;
    const url = getPublicJobUrl(v);
    const postText = generateLinkedInShareText(v, url);

    // Auto-copy post details to clipboard
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(postText);
      }
    } catch {
      /* ignore clipboard restrictions */
    }

    // Open LinkedIn post composer with the full vacancy text pre-populated
    const shareUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(postText)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");

    setShareToast("Opening LinkedIn with vacancy details ready to post! (Text copied to clipboard)");
    setTimeout(() => setShareToast(""), 4500);
  };

  // Submit for approval / approve / publish — one call, then reload
  const runAction = async (v, call, fallback) => {
    setBusyId(v.id);
    setError("");
    try {
      await call(v.id);
      await load();
      if (call === recruitmentApi.publishVacancy) {
        setSharePromptVacancy({ ...v, status: "PUBLISHED" });
      }
    } catch (e) {
      setError(errorText(e, fallback));
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = async (reason) => {
    const v = rejecting;
    setBusyId(v.id);
    try {
      await recruitmentApi.rejectVacancy(v.id, reason);
      setRejecting(null);
      await load();
    } catch (e) {
      setRejecting(null);
      setError(errorText(e, "Failed to reject vacancy"));
    } finally {
      setBusyId(null);
    }
  };

  const confirmClose = async () => {
    const v = closing;
    setBusyId(v.id);
    try {
      await recruitmentApi.closeVacancy(v.id);
      setClosing(null);
      await load();
    } catch (e) {
      setClosing(null);
      setError(errorText(e, "Failed to close vacancy"));
    } finally {
      setBusyId(null);
    }
  };

  const handleSaved = () => {
    setModal(null);
    load();
  };

  // Does this user have any button to show for this vacancy?
  const hasActions = (v) =>
    (v.status === "DRAFT" && canCreate) ||
    (v.status === "PENDING_APPROVAL" && canApprove) ||
    ((v.status === "APPROVED" || v.status === "PUBLISHED") && canPublish);

  // Count by status over every vacancy (the stat cards use this)
  const counts = vacancies.reduce((acc, v) => {
    acc[v.status] = (acc[v.status] || 0) + 1;
    return acc;
  }, {});
  const sentBack = vacancies.filter((v) => v.status === "DRAFT" && v.rejectionReason).length;

  // Only the vacancies that belong on this page
  const pageVacancies = cfg.statuses
    ? vacancies.filter((v) => cfg.statuses.includes(v.status))
    : vacancies;

  const filterCount = (f) => {
    if (f === "ALL") return pageVacancies.length;
    if (f === "REJECTED") return sentBack;
    return counts[f] || 0;
  };

  const visible = pageVacancies.filter((v) => {
    if (filter === "REJECTED") {
      if (!(v.status === "DRAFT" && v.rejectionReason)) return false;
    } else if (filter !== "ALL" && v.status !== filter) {
      return false;
    }
    const q = search.trim().toLowerCase();
    return !q || `${v.title} ${v.department}`.toLowerCase().includes(q);
  }).sort((a, b) => mode === "publish" ? PUBLISH_ORDER[a.status] - PUBLISH_ORDER[b.status] : 0);

  // Summary cards for each page
  const stats =
    mode === "create"
      ? [
          { label: "Drafts", value: counts.DRAFT || 0, caption: "Not submitted yet", icon: FileText, tone: "primary" },
          { label: "Sent back", value: sentBack, caption: "Need changes", icon: AlertTriangle, tone: "red" },
          { label: "Waiting for approval", value: counts.PENDING_APPROVAL || 0, caption: "Already submitted", icon: Clock, tone: "slate" },
        ]
      : mode === "approval"
        ? [
            { label: "Pending approval", value: counts.PENDING_APPROVAL || 0, caption: "Waiting for you", icon: Clock, tone: "amber" },
            { label: "Approved", value: counts.APPROVED || 0, caption: "Ready to publish", icon: CheckCircle2, tone: "primary" },
            { label: "Sent back", value: sentBack, caption: "Returned to draft", icon: XCircle, tone: "slate" },
          ]
        : mode === "publish"
          ? [
              { label: "Ready to publish", value: counts.APPROVED || 0, caption: "Approved", icon: Send, tone: "primary" },
              { label: "Published", value: counts.PUBLISHED || 0, caption: "Open for applications", icon: Megaphone, tone: "green" },
              { label: "Closed", value: counts.CLOSED || 0, caption: "Ended or filled", icon: Ban, tone: "slate" },
            ]
          : [
              { label: "Total vacancies", value: vacancies.length, caption: "All vacancies", icon: BriefcaseBusiness, tone: "primary" },
              { label: "Pending approval", value: counts.PENDING_APPROVAL || 0, caption: "Waiting for an approver", icon: Clock, tone: "amber" },
              { label: "Published", value: counts.PUBLISHED || 0, caption: "Open for applications", icon: Megaphone, tone: "green" },
              { label: "Drafts", value: counts.DRAFT || 0, caption: "Not submitted yet", icon: FileText, tone: "slate" },
            ];

  // "New vacancy" only belongs on the create page (and the old combined page)
  const showNewButton = canCreate && (!mode || mode === "create");
    const refreshButton = (
    <button
      onClick={load}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold shadow-sm"
    >
      <RefreshCw size={16} /> Refresh
    </button>
  );

  return (
    <PageLayout
      role="recruiter"
      activePage={cfg.activePage}
      title={cfg.title}
      subtitle={cfg.subtitle}
                  actions={
        <div className="flex items-center gap-2">
          {mode === "publish" && (
            <a
              href="/careers"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold shadow-sm"
            >
              <ExternalLink size={16} /> View careers page
            </a>
          )}
          {refreshButton}
          {showNewButton && (
            <button
              onClick={() => setModal({ vacancy: null })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-sm"
            >
              <Plus size={16} /> New vacancy
            </button>
          )}
        </div>
      }
    >
      <div className="p-6 space-y-5">
        {/* Summary cards */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${stats.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
          {stats.map((s) => (
            <StatCard
              key={s.label}
              label={s.label}
              value={loading ? "-" : s.value}
              caption={s.caption}
              icon={s.icon}
              tone={s.tone}
            />
          ))}
        </div>

        {/* Filters + search */}
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search title or department..."
          pills={{
            value: filter,
            onChange: setFilter,
            items: cfg.filters.map((f) => ({
              value: f,
              label: filterLabel(f, cfg),
              count: filterCount(f),
            })),
          }}
          count={visible.length}
          countLabel="vacancy"
          countPlural="vacancies"
          hasActiveFilters={search !== "" || filter !== "ALL"}
          onReset={() => {
            setSearch("");
            setFilter("ALL");
          }}
        />

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-sm">
            <Loader2 size={18} className="animate-spin" /> Loading vacancies...
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary-50 text-primary-500 flex items-center justify-center mb-4">
              <BriefcaseBusiness size={28} />
            </div>
            <p className="text-slate-800 font-semibold">No vacancies here</p>
            <p className="text-slate-500 text-sm mt-1">
              {search
                ? "Nothing matches your search."
                : canCreate
                  ? cfg.emptyCreate
                  : cfg.emptyOther}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {visible.map((v) => {
              const due = deadlineInfo(v.deadline, v.status);
              const busy = busyId === v.id;
              return (
                <div
                  key={v.id}
                  className="flex flex-wrap items-center gap-x-5 gap-y-3 bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Title + details */}
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" className="font-bold text-slate-900 hover:text-primary-700 text-left">{v.title}</button>
                      {v.status === "DRAFT" && v.rejectionReason && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                          <AlertTriangle size={12} /> Sent back: {v.rejectionReason}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5">{v.department}</span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5">{v.jobType}</span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5">
                        {v.vacancyCount} {v.vacancyCount === 1 ? "opening" : "openings"}
                      </span>
                    </div>
                  </div>

                  {/* Deadline */}
                  <div className="w-28 text-xs text-slate-500">
                    Deadline
                    <p className="text-sm font-semibold text-slate-900">{due.date}</p>
                    <p className={due.tone}>{due.hint}</p>
                  </div>

                  {/* Status */}
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[v.status] || STATUS_STYLE.DRAFT}`}>
                    {statusLabel(v.status)}
                  </span>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-end gap-1.5 min-w-[130px]" onClick={(e) => e.stopPropagation()}>
                    <ViewButton onClick={() => setViewing(v)} />
                    {v.status === "DRAFT" && canCreate && (
                      <>
                        <button
                          disabled={busy}
                          onClick={() => runAction(v, recruitmentApi.submitVacancy, "Failed to submit vacancy")}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                        >
                          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Submit
                        </button>
                        <button
                          title="Edit"
                          onClick={() => setModal({ vacancy: v })}
                          className="p-2 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-primary-50"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          title="Delete"
                          disabled={busy}
                          onClick={() => setDeleting(v)}
                          className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    {v.status === "PENDING_APPROVAL" && canApprove && (
                      <>
                        <button
                          disabled={busy}
                          onClick={() => runAction(v, recruitmentApi.approveVacancy, "Failed to approve vacancy")}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve
                        </button>
                        <button
                          title="Reject"
                          disabled={busy}
                          onClick={() => setRejecting(v)}
                          className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                    {v.status === "APPROVED" && canPublish && (
                      <button
                        disabled={busy}
                        onClick={() => runAction(v, recruitmentApi.publishVacancy, "Failed to publish vacancy")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />} Publish
                      </button>
                    )}
                    {v.status === "PUBLISHED" && canPublish && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleShareLinkedIn(v)}
                          title="Share on LinkedIn"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0077b5] hover:bg-[#006097] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors"
                        >
                          <Linkedin size={13} /> Share on LinkedIn
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => setClosing(v)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-50"
                        >
                          <Ban size={14} /> Close
                        </button>
                      </div>
                    )}
                    {!hasActions(v) && <span className="text-slate-300">—</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {viewing && (
        <VacancyDetailsModal
          vacancy={viewing}
          canEdit={viewing.status === "DRAFT" && canCreate}
          onClose={() => setViewing(null)}
          onEdit={(v) => {
            setViewing(null);
            setModal({ vacancy: v });
          }}
        />
      )}
      {modal && (
        <VacancyModal vacancy={modal.vacancy} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {deleting && (
        <DeleteConfirmModal
          vacancy={deleting}
          busy={busyId === deleting.id}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
      {rejecting && (
        <RejectModal
          vacancy={rejecting}
          busy={busyId === rejecting.id}
          onCancel={() => setRejecting(null)}
          onConfirm={confirmReject}
        />
      )}
      {closing && (
        <CloseConfirmModal
          vacancy={closing}
          busy={busyId === closing.id}
          onCancel={() => setClosing(null)}
          onConfirm={confirmClose}
        />
      )}
      {sharePromptVacancy && canPublish && (
        <LinkedInShareModal
          vacancy={sharePromptVacancy}
          publicUrl={getPublicJobUrl(sharePromptVacancy)}
          onShare={handleShareLinkedIn}
          onClose={() => setSharePromptVacancy(null)}
        />
      )}
      {shareToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{shareToast}</span>
        </div>
      )}
    </PageLayout>
  );
}