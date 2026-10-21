/**
 * Public vacancy detail page.
 * Link format: /careers/jobs/<id>?company=<registration number>
 */
import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Building2, Clock, Users, Banknote, Award } from "lucide-react";
import { careersApi } from "../../services/api";
import { CareersLayout, DeadlineMeter, Notice, errorText, formatSalary } from "./careersShared";

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
  const [showApplyNote, setShowApplyNote] = useState(false);

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
            onClick={() => setShowApplyNote(true)}
            className={`mt-6 w-full px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm ${focusRing}`}
          >
            Apply for this role
          </button>
          {showApplyNote && (
            <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              Online applications will open soon. Please check back shortly.
            </p>
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
    </CareersLayout>
  );
}