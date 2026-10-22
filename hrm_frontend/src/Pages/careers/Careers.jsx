/**
 * Public Careers page — lists the company's open vacancies, with search and filters.
 * Link format: /careers?company=<registration number>
 */
import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Building2, Clock, CalendarDays, Loader2, ArrowRight } from "lucide-react";
import { careersApi } from "../../services/api";
import { CareersLayout, Notice } from "./careersShared";
import { errorText, formatDate } from "../../utils/careersFormat";

const selectCls =
  "rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

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
      .catch((e) => !cancelled && setError(errorText(e, "Could not load vacancies")))
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

  if (!company) {
    return (
      <CareersLayout>
        <Notice
          title="This careers link is incomplete"
          text="Please use the full careers link provided by the company."
        />
      </CareersLayout>
    );
  }

  return (
    <CareersLayout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Open positions</h1>
        <p className="text-slate-500 mt-1">Find a role that fits you and apply today.</p>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, department or skill"
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <select value={department} onChange={(e) => setDepartment(e.target.value)} className={selectCls}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select value={jobType} onChange={(e) => setJobType(e.target.value)} className={selectCls}>
          <option value="">All job types</option>
          {jobTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading positions...
        </div>
      ) : error ? (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <Notice
          title={jobs.length === 0 ? "No open positions right now" : "No positions match your search"}
          text={jobs.length === 0 ? "Please check back soon." : "Try a different word or clear the filters."}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {filtered.length} {filtered.length === 1 ? "position" : "positions"}
          </p>
          {filtered.map((job) => (
            <Link
              key={job.id}
              to={`/careers/jobs/${job.id}?company=${encodeURIComponent(company)}`}
              className="block bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-indigo-300 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-slate-900">{job.title}</h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><Building2 size={14} /> {job.department}</span>
                    <span className="inline-flex items-center gap-1.5"><Clock size={14} /> {job.jobType}</span>
                    <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} /> Apply by {formatDate(job.deadline)}</span>
                  </div>
                  {(job.requiredSkills || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {job.requiredSkills.slice(0, 5).map((s) => (
                        <span key={s} className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <ArrowRight size={20} className="text-slate-300 shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </CareersLayout>
  );
}