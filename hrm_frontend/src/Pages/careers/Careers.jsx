/**
 * Public Careers page — lists the company's open vacancies, with search and filters.
 * Link format: /careers?company=<registration number>
 */
import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  Building2,
  Clock,
  Banknote,
  ChevronRight,
  Filter,
  X,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { careersApi } from "../../services/api";
import { CareersLayout, DeadlineMeter, Notice } from "./careersShared";
import { errorText, formatSalary, isNew } from "../../utils/careersFormat";

const SkeletonRow = () => (
  <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm animate-pulse space-y-3">
    <div className="h-5 w-1/3 rounded-lg bg-slate-200" />
    <div className="h-4 w-1/2 rounded-lg bg-slate-100" />
    <div className="h-4 w-1/4 rounded-lg bg-slate-100" />
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
      .catch((e) => !cancelled && setError(errorText(e, "Could not load open roles")))
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
          title="Careers Link Incomplete"
          text="Please open the full careers portal link provided by the hiring organization."
        />
      </CareersLayout>
    );
  }

  const hero = (
    <div className="pt-6 pb-10 sm:pt-8 sm:pb-12">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-300 text-xs font-semibold mb-3">
          <Sparkles size={13} /> Open Opportunities
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white">
          Find Your Next Career Move
        </h1>
        <p className="mt-2 text-slate-300 text-sm sm:text-base leading-relaxed">
          Explore positions open right now, review role requirements, and submit your application online.
        </p>
      </div>

      {/* Hero search bar */}
      <div className="relative mt-6 max-w-2xl">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by job title, department, or required skills..."
          className="w-full rounded-xl bg-white pl-11 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-md focus:outline-none focus:ring-4 focus:ring-sky-500/20 transition-all"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
          >
            <X size={15} />
          </button>
        )}
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <CareersLayout hero={hero}>
      {/* ── Filters Toolbar ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Filter size={13} /> Filter:
          </span>

          {departments.length > 0 && (
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-sky-500 transition-all"
            >
              <option value="">All Departments ({departments.length})</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}

          {jobTypes.length > 0 && (
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-sky-500 transition-all"
            >
              <option value="">All Job Types ({jobTypes.length})</option>
              {jobTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing <strong className="text-slate-900">{filtered.length}</strong> of {jobs.length} roles
        </span>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl border text-sm font-medium bg-rose-50 border-rose-200 text-rose-800 mb-6">
          {error}
        </div>
      )}

      {/* ── Vacancies List ── */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : filtered.length === 0 ? (
        <Notice
          title={hasFilters ? "No matching roles found" : "No open positions at this time"}
          text={
            hasFilters
              ? "Try broadening your search keywords or resetting active filters."
              : "Please check back soon for future openings."
          }
        >
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </Notice>
      ) : (
        <div className="space-y-4">
          {filtered.map((job) => {
            const salary = formatSalary(job.salaryMin, job.salaryMax);
            const isBrandNew = isNew(job.publishedAt);
            const jobUrl = `/careers/jobs/${job.id}?company=${encodeURIComponent(company)}`;

            return (
              <div
                key={job.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex-1 min-w-0 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={jobUrl}
                      className="text-lg font-bold text-slate-900 hover:text-sky-600 transition-colors"
                    >
                      {job.title}
                    </Link>
                    {isBrandNew && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        New
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                      <Building2 size={13} className="text-slate-400" />
                      {job.department}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={13} className="text-slate-400" />
                      {job.jobType}
                    </span>
                    {salary && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                          <Banknote size={13} className="text-slate-400" />
                          {salary}
                        </span>
                      </>
                    )}
                  </div>

                  {job.requiredSkills && job.requiredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {job.requiredSkills.slice(0, 5).map((skill) => (
                        <span
                          key={skill}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.requiredSkills.length > 5 && (
                        <span className="text-[11px] text-slate-400 self-center">
                          +{job.requiredSkills.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Deadline & Apply Action */}
                <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between md:justify-center gap-4 shrink-0 min-w-[180px]">
                  {job.deadline && (
                    <div className="w-full max-w-[160px]">
                      <DeadlineMeter deadline={job.deadline} publishedAt={job.publishedAt} />
                    </div>
                  )}

                  <Link
                    to={jobUrl}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.99]"
                  >
                    <span>View Role</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CareersLayout>
  );
}
