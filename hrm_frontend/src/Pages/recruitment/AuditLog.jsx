/**
 * Audit Log — read-only history of recruitment actions (vacancies, roles, applications).
 * Only HR Manager / Admin can open it. Search and filters work on the loaded entries.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";
import { Activity, Loader2, RefreshCw, Search } from "lucide-react";

const PAGE_SIZE = 15;

const errorText = (error, fallback) => (error?.message || fallback).replace(/^\d{3}:\s*/, "");

const label = (s) =>
  (s || "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

// Colour the action badge by what kind of action it is
const actionStyle = (action = "") => {
  if (action.includes("DELETE") || action.includes("REJECT") || action.includes("CLOSED") || action.includes("UNASSIGN"))
    return "bg-red-100 text-red-700";
  if (action.includes("APPROVE") || action.includes("PUBLISH") || action.includes("CREATE") || action.includes("ASSIGN"))
    return "bg-emerald-100 text-emerald-700";
  if (action.includes("SUBMIT") || action.includes("UPDATE"))
    return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
};

const formatTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
};

const selectCls =
  "rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await recruitmentApi.getAuditLogs();
      setLogs(res.data || []);
    } catch (e) {
      setError(errorText(e, "Failed to load the audit log"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const actions = useMemo(() => [...new Set(logs.map((l) => l.action))].sort(), [logs]);
  const entities = useMemo(() => [...new Set(logs.map((l) => l.entity))].sort(), [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (actionFilter !== "ALL" && l.action !== actionFilter) return false;
      if (entityFilter !== "ALL" && l.entity !== entityFilter) return false;
      if (!q) return true;
      return (
        (l.description || "").toLowerCase().includes(q) ||
        (l.userName || "").toLowerCase().includes(q) ||
        (l.action || "").toLowerCase().includes(q)
      );
    });
  }, [logs, search, actionFilter, entityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <PageLayout
      role="recruiter"
      activePage="Audit Log"
      title="Audit Log"
      subtitle="A record of recruitment actions: who did what, and when"
    >
      <div className="space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by person, action or description"
              className={`${selectCls} w-full pl-10`}
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className={selectCls}
          >
            <option value="ALL">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {label(a)}
              </option>
            ))}
          </select>

          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className={selectCls}
          >
            <option value="ALL">All items</option>
            {entities.map((en) => (
              <option key={en} value={en}>
                {en}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Loading audit log...
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center text-slate-500">
              <Activity size={28} className="text-slate-300" />
              <p className="text-sm">
                {logs.length === 0 ? "No actions have been recorded yet." : "No entries match your filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Time</th>
                    <th className="px-4 py-3 font-semibold">Done by</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatTime(l.createdAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">{l.userName}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${actionStyle(l.action)}`}>
                          {label(l.action)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {l.entity}
                        {l.entityId ? ` #${l.entityId}` : ""}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{l.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              Showing {visible.length} of {filtered.length} entries (latest 500 are loaded)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default AuditLog;