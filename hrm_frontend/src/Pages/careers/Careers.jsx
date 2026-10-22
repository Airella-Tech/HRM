/**
 * Public Careers page — lists the company's open vacancies, with search and filters.
 * Link format: /careers?company=<registration number>
 */
import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Building2, Clock, Banknote, ChevronRight } from "lucide-react";
import { careersApi } from "../../services/api";
import { CareersLayout, DeadlineMeter, Notice } from "./careersShared";
import { errorText, formatSalary, isNew } from "../../utils/careersFormat";

const focusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";

const SkeletonRow = () => (
  <div className="px-5 py-5 sm:px-6 animate-pulse motion-reduce:animate-none">
    <div className="h-5 w-1/3 rounded bg-slate-200" />
    <div className="h-4 w-1/2 rounded bg-slate-100 mt-3" />
    <div className="h-4 w-1/4 rounded bg-slate-100 mt-3" />
  </div>
);

export default function Careers() {
  const [params] = useSearchParams();
  const company = params.get("company") || "";

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(Boolean(company));
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [jobType, setJobType] = useState("");

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    careersApi
      .getJobs(company)
      .then((res) => !cancelled && setJobs(res.data || []))
      .catch((e) => !cancelled && setError(errorText(e, "Could not load the open roles")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [company]);

  const departments = useMemo(() => [...new Set(jobs.map((j) => j.department))].sort(), [jobs]);
  const jobTypes = useMemo(() => [...new Set(jobs.map((j) => j.jobType))].sort(), [jobs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter(
      (j) =>
        (!department || j.department === department) &&
        (!jobType || j.jobType === jobType) &&
        (!q ||
          j.title.toLowerCase().includes(q) ||
          j.department.toLowerCase().includes(q) ||
          (j.requiredSkills || []).some((s) => s.toLowerCase().includes(q)))
    );
  }, [jobs, search, department, jobType]);

  const hasFilters = Boolean(search.trim() || department || jobType);
  const clearFilters = () => {
    setSearch("");
    setDepartment("");
    setJobType("");
  };

  if (!company) {
    return (
      <CareersLayout>
        <Notice
          title="This careers link is incomplete"
          text="Please open the full careers link shared by the company."
        />
      </CareersLayout>
    );
  }

  const hero = (
    <div className="pt-6 pb-10 sm:pt-10 sm:pb-14">
      <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.1] max-w-2xl">
        Find your next role
      </h1>
      <p className="mt-3 text-indigo-100/80 max-w-xl">
        Browse the positions open right now, and apply before the deadline.
      </p>
      <div className="relative mt-6 max-w-2xl">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by job title, department or skill"
          aria-label="Search open roles"
          className={`w-full rounded-xl bg-white pl-11 pr-4 py-3.5 text-[15px] text-slate-900 placeholder:text-slate-400 shadow-lg shadow-black/10 ${focusRing} focus-visible:ring-offset-[#0F1B3D]`}
        />
      </div>
    </div>
  );

  return (
    <CareersLayout hero={hero}>
      {/* Filters */}
      {!loading && jobs.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by department">
            {["", ...departments].map((d) => (
              <button
                key={d || "all"}
                onClick={() => setDepartment(d)}
                aria-pressed={department === d}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${focusRing} ${
                  department === d
                    ? "bg-[#0F1B3D] text-white border-[#0F1B3D]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {d || "All departments"}
              </button>
            ))}
          </div>
          {jobTypes.length > 1 && (
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              aria-label="Filter by job type"
              className={`rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 ${focusRing}`}
            >
              <option value="">All job types</option>
              {jobTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          <SkeletonRow /><SkeletonRow /><SkeletonRow />
        </div>
      ) : error ? (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        jobs.length === 0 ? (
          <Notice
            title="No open roles right now"
            text="There are no positions open at the moment. Please check back soon."
          />
        ) : (
          <Notice title="No roles match your search" text="Try a different word, or show all roles.">
            {hasFilters && (
              <button
                onClick={clearFilters}
                className={`px-4 py-2 rounded-xl bg-[#0F1B3D] text-white text-sm font-semibold hover:bg-[#1a2a55] ${focusRing}`}
              >
                Clear filters
              </button>
            )}
          </Notice>
        )
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-3">
            {filtered.length} open {filtered.length === 1 ? "role" : "roles"}
          </p>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {filtered.map((job) => {
              const salary = formatSalary(job.salaryMin, job.salaryMax);
              return (
                <Link
                  key={job.id}
                  to={`/careers/jobs/${job.id}?company=${encodeURIComponent(company)}`}
                  className={`group grid sm:grid-cols-[1fr_220px_24px] gap-x-8 gap-y-4 items-center px-5 py-5 sm:px-6 hover:bg-slate-50 transition-colors ${focusRing} focus-visible:ring-inset`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg font-bold text-slate-900 tracking-tight truncate">{job.title}</h2>
                      {isNew(job.publishedAt) && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                          New
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-1.5 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1.5"><Building2 size={14} />{job.department}</span>
                      <span className="inline-flex items-center gap-1.5"><Clock size={14} />{job.jobType}</span>
                      {salary && <span className="inline-flex items-center gap-1.5"><Banknote size={14} />{salary}</span>}
                    </div>
                    {(job.requiredSkills || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {job.requiredSkills.slice(0, 4).map((s) => (
                          <span key={s} className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                            {s}
                          </span>
                        ))}
                        {job.requiredSkills.length > 4 && (
                          <span className="px-1 py-0.5 text-xs text-slate-400">+{job.requiredSkills.length - 4} more</span>
                        )}
                      </div>
                    )}
                  </div>

                  <DeadlineMeter deadline={job.deadline} publishedAt={job.publishedAt} />

                  <ChevronRight
                    size={20}
                    className="hidden sm:block text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition motion-reduce:transition-none"
                  />
                </Link>
              );
            })}
          </div>
        </>
      )}
    </CareersLayout>
  );
}