/**
 * Public vacancy detail page.
 * Link format: /careers/jobs/<id>?company=<registration number>
 */
import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Building2, Clock, CalendarDays, Users, Loader2, Banknote } from "lucide-react";
import { careersApi } from "../../services/api";
import { CareersLayout, Notice, errorText, formatDate, formatSalary } from "./careersShared";

const Section = ({ title, children }) => (
  <section className="mt-6">
    <h2 className="text-base font-bold text-slate-900 mb-2">{title}</h2>
    <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{children}</p>
  </section>
);

export default function CareerJob() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const company = params.get("company") || "";

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(Boolean(company));
  const [error, setError] = useState("");
  const [showApplyNote, setShowApplyNote] = useState(false);

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    careersApi
      .getJob(id, company)
      .then((res) => !cancelled && setJob(res.data))
      .catch((e) => !cancelled && setError(errorText(e, "Could not load this position")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, company]);

  const backTo = `/careers?company=${encodeURIComponent(company)}`;

  if (!company) {
    return (
      <CareersLayout>
        <Notice title="This careers link is incomplete" text="Please use the full careers link provided by the company." />
      </CareersLayout>
    );
  }

  return (
    <CareersLayout>
      <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 mb-5">
        <ArrowLeft size={16} /> All positions
      </Link>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading...
        </div>
      ) : error || !job ? (
        <Notice
          title="This position is no longer available"
          text="It may have been filled or closed. Have a look at our other open positions."
        />
      ) : (
        <article className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>

          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5"><Building2 size={15} /> {job.department}</span>
            <span className="inline-flex items-center gap-1.5"><Clock size={15} /> {job.jobType}</span>
            <span className="inline-flex items-center gap-1.5"><Users size={15} /> {job.vacancyCount} {job.vacancyCount === 1 ? "opening" : "openings"}</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} /> Apply by {formatDate(job.deadline)}</span>
            {formatSalary(job.salaryMin, job.salaryMax) && (
              <span className="inline-flex items-center gap-1.5"><Banknote size={15} /> {formatSalary(job.salaryMin, job.salaryMax)}</span>
            )}
          </div>

          {job.experienceLevel && (
            <p className="mt-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">Experience:</span> {job.experienceLevel}
            </p>
          )}

          <Section title="About the role">{job.description}</Section>
          <Section title="Minimum qualifications">{job.qualifications}</Section>

          {(job.requiredSkills || []).length > 0 && (
            <section className="mt-6">
              <h2 className="text-base font-bold text-slate-900 mb-2">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </section>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={() => setShowApplyNote(true)}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm"
            >
              Apply for this position
            </button>
            {showApplyNote && (
              <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                Online applications will open soon. Please check back shortly.
              </p>
            )}
          </div>
        </article>
      )}
    </CareersLayout>
  );
}