/**
 * Job Vacancies — recruitment page for creating and managing job vacancies.
 * List with status filter; create / edit drafts in a pop-up; delete drafts.
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";
import { Plus, Pencil, Trash2, BriefcaseBusiness, Loader2, X, Save, AlertTriangle, Send, CheckCircle2, XCircle } from "lucide-react";

const FILTERS = ["ALL", "DRAFT", "PENDING_APPROVAL", "APPROVED", "PUBLISHED", "CLOSED"];
const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];

const STATUS_STYLE = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  APPROVED: "bg-blue-100 text-blue-700",
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-red-100 text-red-700",
};

const statusLabel = (s) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

// Server errors come back as "400: <reason>"; show just the reason
const errorText = (error, fallback) => (error?.message || fallback).replace(/^\d{3}:\s*/, "");

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

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
    <span className="block text-sm font-semibold text-slate-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{editing ? "Edit vacancy" : "New vacancy"}</h2>
            <p className="text-sm text-slate-500">Saved as a draft until it is submitted for approval</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Job title" required>
              <input className={inputCls} value={form.title} onChange={set("title")} maxLength={120} placeholder="e.g. Senior Java Developer" />
            </Field>
            <Field label="Department" required>
              <input className={inputCls} value={form.department} onChange={set("department")} maxLength={100} placeholder="e.g. Engineering" />
            </Field>
            <Field label="Job type" required>
              <select className={inputCls} value={form.jobType} onChange={set("jobType")}>
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Number of openings" required>
              <input type="number" min="1" className={inputCls} value={form.vacancyCount} onChange={set("vacancyCount")} />
            </Field>
            <Field label="Experience level">
              <input className={inputCls} value={form.experienceLevel} onChange={set("experienceLevel")} maxLength={50} placeholder="e.g. 3+ years" />
            </Field>
            <Field label="Application deadline" required>
              <input type="date" min={tomorrow()} className={inputCls} value={form.deadline} onChange={set("deadline")} />
            </Field>
            <Field label="Minimum salary">
              <input type="number" min="0" className={inputCls} value={form.salaryMin} onChange={set("salaryMin")} placeholder="Optional" />
            </Field>
            <Field label="Maximum salary">
              <input type="number" min="0" className={inputCls} value={form.salaryMax} onChange={set("salaryMax")} placeholder="Optional" />
            </Field>
          </div>

          <Field label="Description and responsibilities" required>
            <textarea rows={4} className={inputCls} value={form.description} onChange={set("description")} placeholder="What will this person do?" />
          </Field>
          <Field label="Minimum qualifications" required>
            <textarea rows={3} className={inputCls} value={form.qualifications} onChange={set("qualifications")} placeholder="Education, certificates, experience..." />
          </Field>
          <Field label="Required skills" hint="Separate skills with commas, e.g. Java, Spring Boot, PostgreSQL">
            <input className={inputCls} value={form.skills} onChange={set("skills")} />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editing ? "Save changes" : "Save as draft"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
// ─── Delete confirmation pop-up ───────────────────────────────
const DeleteConfirmModal = ({ vacancy, busy, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 shrink-0 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
          <AlertTriangle size={22} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Delete this draft?</h3>
          <p className="text-sm text-slate-500 mt-1">
            <span className="font-semibold text-slate-700">"{vacancy.title}"</span> will be removed permanently.
            This can't be undone.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={onCancel}
          disabled={busy}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          Delete
        </button>
      </div>
    </div>
  </div>
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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-slate-900">Reject this vacancy?</h3>
        <p className="text-sm text-slate-500 mt-1">
          <span className="font-semibold text-slate-700">"{vacancy.title}"</span> goes back to draft
          with your reason attached.
        </p>
        <textarea
          rows={4}
          maxLength={500}
          value={reason}
          onChange={(e) => { setReason(e.target.value); setError(""); }}
          placeholder="e.g. Please add a salary range"
          className="mt-4 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};
// ─── Page ─────────────────────────────────────────────────────
export default function RecruitmentVacancies() {
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  // null = closed, { vacancy: null } = create, { vacancy } = edit
  const [modal, setModal] = useState(null);
    const [deleting, setDeleting] = useState(null); // vacancy waiting for delete confirmation
      const [rejecting, setRejecting] = useState(null); // vacancy waiting for a rejection reason

  const load = async (status = filter) => {
    setLoading(true);
    setError("");
    try {
      const res = await recruitmentApi.getVacancies(status === "ALL" ? undefined : status);
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
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

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

    // Submit for approval / approve — one call, then reload
  const runAction = async (v, call, fallback) => {
    setBusyId(v.id);
    setError("");
    try {
      await call(v.id);
      await load();
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
  const handleSaved = () => {
    setModal(null);
    load();
  };

  return (
    <PageLayout
      role="recruiter"
      activePage="Job Vacancies"
      title="Job Vacancies"
      subtitle="Create and manage job vacancies"
      actions={
        <button
          onClick={() => setModal({ vacancy: null })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm"
        >
          <Plus size={16} /> New vacancy
        </button>
      }
    >
      <div className="p-6 space-y-5">
        {/* Status filter */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filter === f
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f === "ALL" ? "All" : statusLabel(f)}
            </button>
          ))}
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-[2.2fr_1.2fr_1fr_0.7fr_1fr_1.1fr_130px] gap-4 px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-semibold uppercase tracking-wide">
            <span>Title</span>
            <span>Department</span>
            <span>Type</span>
            <span>Openings</span>
            <span>Deadline</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-sm">
              <Loader2 size={18} className="animate-spin" /> Loading vacancies...
            </div>
          ) : vacancies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-4">
                <BriefcaseBusiness size={28} />
              </div>
              <p className="text-slate-800 font-semibold">No vacancies yet</p>
              <p className="text-slate-500 text-sm mt-1">Click "New vacancy" to create the first draft.</p>
            </div>
          ) : (
            vacancies.map((v) => (
              <div
                key={v.id}
                className="grid grid-cols-1 md:grid-cols-[2.2fr_1.2fr_1fr_0.7fr_1fr_1.1fr_130px] gap-2 md:gap-4 px-6 py-4 border-t border-slate-100 items-center text-sm"
              >
                                <div>
                  <span className="font-semibold text-slate-900">{v.title}</span>
                  {v.status === "DRAFT" && v.rejectionReason && (
                    <p className="mt-1 text-xs text-red-600">Sent back: {v.rejectionReason}</p>
                  )}
                </div>
                <span className="text-slate-600">{v.department}</span>
                <span className="text-slate-600">{v.jobType}</span>
                <span className="text-slate-600">{v.vacancyCount}</span>
                <span className="text-slate-600">{v.deadline}</span>
                <span>
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[v.status] || STATUS_STYLE.DRAFT}`}>
                    {statusLabel(v.status)}
                  </span>
                </span>
                               <span className="flex md:justify-end gap-1">
                  {v.status === "DRAFT" && (
                    <>
                      <button
                        title="Submit for approval"
                        disabled={busyId === v.id}
                        onClick={() => runAction(v, recruitmentApi.submitVacancy, "Failed to submit vacancy")}
                        className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        {busyId === v.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      </button>
                      <button
                        title="Edit"
                        onClick={() => setModal({ vacancy: v })}
                        className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        title="Delete"
                        disabled={busyId === v.id}
                        onClick={() => setDeleting(v)}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                  {v.status === "PENDING_APPROVAL" && (
                    <>
                      <button
                        title="Approve"
                        disabled={busyId === v.id}
                        onClick={() => runAction(v, recruitmentApi.approveVacancy, "Failed to approve vacancy")}
                        className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        {busyId === v.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      </button>
                      <button
                        title="Reject"
                        disabled={busyId === v.id}
                        onClick={() => setRejecting(v)}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <XCircle size={16} />
                      </button>
                    </>
                  )}
                  {v.status !== "DRAFT" && v.status !== "PENDING_APPROVAL" && (
                    <span className="text-slate-300">—</span>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

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
    </PageLayout>
  );
}