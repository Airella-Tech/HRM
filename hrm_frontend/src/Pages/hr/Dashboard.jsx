import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, CalendarCheck, FileText, DollarSign,
  Building2, BarChart3, LogOut, Bell, Menu, X, UserPlus, TrendingUp,
  CheckCircle, XCircle, Clock, Award, UserCheck, Search,
  Loader, RefreshCw, Save, AlertCircle, Plus, Trash2, Pencil,
  Eye, ChevronRight, Briefcase, ArrowLeft, Tag, User,
  Download, Filter, Calendar, UserX, ArrowUpDown, ChevronUp, ChevronDown,
  ShieldCheck,
} from "lucide-react";
import logo from "../../assets/logo.jpg";
import { BASE_URL, AUTH_URL, hrApi } from "../../services/api";
import AddEmployeeModal from "./AddEmployeeModal";
import NotificationPopup from "../../components/NotificationPopup";
import RoleSwitch from "../../components/RoleSwitch";
import { groupSessionsByEmployee, toLocalDateString } from "../../utils/attendance";

// ─── API helper layer ─────────────────────────────────────────────────────────
const _headers = () => {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
};

const makeApi = (base) => ({
  get: async (path) => {
    const res = await fetch(`${base}${path}`, { headers: _headers() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  post: async (path, body) => {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: _headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || `HTTP ${res.status}`); }
    return res.json();
  },
  put: async (path, body) => {
    const res = await fetch(`${base}${path}`, {
      method: "PUT",
      headers: _headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  delete: async (path) => {
    const res = await fetch(`${base}${path}`, {
      method: "DELETE",
      headers: _headers(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
});

// HR_Backend (hrm_db_hr) — departments and other HR-owned data live only here.
const api = makeApi(BASE_URL);
// User_Backend (hrm_db_user) — the source-of-truth accounts table. Account
// listing/management reads from here so it reflects what was actually created,
// not a possibly-stale synced copy.
const userApi = makeApi(AUTH_URL);

// ─── TOAST ────────────────────────────────────────────────────────────────────
const Toast = ({ toasts, removeToast }) => (
  <div className="fixed top-4 right-4 z-50 space-y-2">
    {toasts.map((t) => (
      <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
        ${t.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : t.type === "error" ? "bg-red-50 text-red-700 border border-red-200"
            : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
        {t.type === "success" ? <CheckCircle size={15} /> : t.type === "error" ? <XCircle size={15} /> : <AlertCircle size={15} />}
        {t.message}
        <button onClick={() => removeToast(t.id)} className="ml-1 opacity-60 hover:opacity-100"><X size={13} /></button>
      </div>
    ))}
  </div>
);

const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);
  const removeToast = (id) => setToasts((p) => p.filter((t) => t.id !== id));
  return { toasts, addToast, removeToast };
};

const newRole = () => ({ _k: `${Date.now()}-${Math.random()}`, title: "", description: "" });

// ─── DEPARTMENT FORM MODAL ────────────────────────────────────────────────────
const DeptFormModal = ({ open, onClose, onSave, initDept, initRoles, employees }) => {
  const [dept, setDept] = useState({ name: "", description: "", managerId: "", active: true });
  const [roles, setRoles] = useState([newRole()]);
  const [errs, setErrs] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initDept) {
      setDept({ name: initDept.name || "", description: initDept.description || "", managerId: initDept.managerId?.toString() || "", managerName: initDept.managerName || "", active: initDept.active !== false });
      setRoles(initRoles?.length
        ? initRoles.map(r => ({ _k: String(r.id || Math.random()), id: r.id, title: r.title || "", description: r.description || "" }))
        : [newRole()]);
    } else {
      setDept({ name: "", description: "", managerId: "", managerName: "", active: true });
      setRoles([newRole()]);
    }
    setErrs({});
  }, [open, initDept]);

  if (!open) return null;

  const setRole = (i, f, v) => setRoles(p => p.map((r, idx) => idx === i ? { ...r, [f]: v } : r));
  const addRole = () => setRoles(p => [...p, newRole()]);
  const rmRole = (i) => setRoles(p => p.filter((_, idx) => idx !== i));
  const clrErr = (k) => setErrs(p => { const n = { ...p }; delete n[k]; return n; });

  const validate = () => {
    const e = {};
    if (!dept.name.trim()) e.name = "Department name is required";
    roles.forEach((r, i) => {
      if (!r.title.trim()) e[`t${i}`] = "Job title is required";
    });
    setErrs(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(
        { name: dept.name.trim(), description: dept.description.trim() || null, managerId: dept.managerId ? +dept.managerId : null, managerName: dept.managerName?.trim() || null, active: dept.active },
        roles.filter(r => r.title.trim()).map(r => ({
          ...(r.id ? { id: r.id } : {}),
          title: r.title.trim(),
          description: r.description.trim() || null,
          active: true,
        }))
      );
    } finally { setSaving(false); }
  };

  const isEdit = !!initDept;
  const filled = roles.filter(r => r.title.trim()).length;

  // Same input/label classes as AddEmployeePanel
  const ic = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition";
  const icErr = "w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-red-50 transition";
  const lc = "block text-xs font-semibold text-gray-600 mb-1";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col z-10">

        {/* ── HEADER ── */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg"><Building2 className="text-white" size={20} /></div>
            <div>
              <h2 className="text-white font-bold text-lg">{isEdit ? "Edit Department" : "Add New Department"}</h2>
              <p className="text-blue-100 text-xs">{isEdit ? "Update department details and job roles" : "Fill in the details below"}</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition"><X className="text-white" size={18} /></button>
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Department Info */}
          <div className="mb-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 size={12} /> Department Info
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={lc}>Department Name <span className="text-red-500">*</span></label>
                <input
                  value={dept.name}
                  onChange={e => { setDept(p => ({ ...p, name: e.target.value })); clrErr("name"); }}
                  placeholder="e.g. Engineering, Sales, Human Resources"
                  className={errs.name ? icErr : ic}
                />
                {errs.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} />{errs.name}</p>}
              </div>

              <div className="col-span-2">
                <label className={lc}>Description</label>
                <textarea
                  value={dept.description}
                  onChange={e => setDept(p => ({ ...p, description: e.target.value }))}
                  placeholder="Purpose, key responsibilities, goals of this department…"
                  rows={3}
                  className={ic + " resize-none"}
                />
              </div>

              <div>
                <label className={lc}>Manager</label>
                <input
                  value={dept.managerName ?? ""}
                  onChange={e => setDept(p => ({ ...p, managerName: e.target.value, managerId: "" }))}
                  placeholder="e.g. John Silva"
                  className={ic}
                />
              </div>

              <div>
                <label className={lc}>Status</label>
                <select
                  value={dept.active ? "active" : "inactive"}
                  onChange={e => setDept(p => ({ ...p, active: e.target.value === "active" }))}
                  className={ic}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Job Roles */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Briefcase size={12} /> Job Roles
              {filled > 0 && (
                <span className="bg-blue-100 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 text-xs font-semibold">{filled} defined</span>
              )}
            </h3>

            {roles.map((role, i) => (
              <div key={role._k} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">{i + 1}</span>
                    Role #{i + 1}
                  </span>
                  {roles.length > 1 && (
                    <button type="button" onClick={() => rmRole(i)}
                      className="p-1.5 bg-red-50 border border-red-200 rounded-lg text-red-400 hover:bg-red-100 hover:text-red-600 transition" title="Remove role">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className={lc}>Job Title <span className="text-red-500">*</span></label>
                    <input
                      value={role.title}
                      onChange={e => { setRole(i, "title", e.target.value); clrErr(`t${i}`); }}
                      placeholder="e.g. Senior Software Engineer, Marketing Lead"
                      className={errs[`t${i}`] ? icErr : ic}
                    />
                    {errs[`t${i}`] && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} />{errs[`t${i}`]}</p>}
                  </div>

                  <div className="col-span-2">
                    <label className={lc}>Role Description</label>
                    <input
                      value={role.description}
                      onChange={e => setRole(i, "description", e.target.value)}
                      placeholder="Key responsibilities, required skills, seniority level…"
                      className={ic}
                    />
                  </div>

                </div>
              </div>
            ))}

            <button type="button" onClick={addRole}
              className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-semibold text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition flex items-center justify-center gap-2">
              <Plus size={15} /> Add Another Job Role
            </button>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="p-5 border-t bg-gray-50 flex gap-3 flex-shrink-0 rounded-b-2xl">
          <button onClick={onClose} type="button"
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
            {saving ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Department"}
          </button>
        </div>

      </div>
    </div>
  );
};

// ─── CONFIRM DIALOG ───────────────────────────────────────────────────────────
const ConfirmDialog = ({ open, title, message, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-red-100 p-2 rounded-xl"><Trash2 className="text-red-500" size={18} /></div>
          <h3 className="font-bold text-gray-800">{title}</h3>
        </div>
        <p className="text-gray-500 text-sm mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm font-medium">Delete</button>
        </div>
      </div>
    </div>
  );
};

// ─── DEPARTMENT DETAIL VIEW ───────────────────────────────────────────────────
const DeptDetail = ({ dept, employees, onBack, onEdit, addToast }) => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      const r = await api.get(`/departments/${dept.id}/job-roles`);
      setRoles(r.data || []);
    } catch { addToast("Failed to load job roles", "error"); }
    finally { setLoading(false); }
  }, [dept.id, addToast]);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const deptEmps = (employees || []).filter(e => e.departmentId === dept.id);

  return (
    <div className="space-y-5">
      <button onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-blue-600 text-sm font-medium transition-colors">
        <ArrowLeft size={15} /> Back to Departments
      </button>

      {/* Dept card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <Building2 className="text-white" size={26} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{dept.name}</h2>
              <p className="text-gray-400 text-sm mt-0.5">{dept.description || "No description"}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${dept.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                  {dept.active ? "Active" : "Inactive"}
                </span>
                {dept.managerName && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <User size={11} /> {dept.managerName}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition flex-shrink-0">
            <Pencil size={13} /> Edit
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-5">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide">Employees</p>
            <p className="text-3xl font-bold text-blue-700 mt-1">{deptEmps.length}</p>
          </div>
          <div className="bg-indigo-50 rounded-xl p-4">
            <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide">Job Roles</p>
            <p className="text-3xl font-bold text-indigo-700 mt-1">{roles.filter(r => r.active).length}</p>
          </div>
        </div>
      </div>

      {/* Job roles */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <Briefcase size={17} className="text-indigo-500" />
          <h3 className="font-bold text-gray-800">Job Roles</h3>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold ml-1">{roles.length}</span>
        </div>
        {loading
          ? <div className="flex justify-center py-10"><Loader className="animate-spin text-indigo-400" size={22} /></div>
          : roles.length === 0
            ? <div className="py-10 text-center text-gray-400">
              <Briefcase size={34} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">No job roles — click Edit to add some</p>
            </div>
            : <div className="divide-y divide-gray-50">
              {roles.map(r => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Tag size={14} className="text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{r.title}</p>
                      {r.description && <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${r.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                    {r.active ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
        }
      </div>

      {/* Employees */}
      {deptEmps.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <Users size={17} className="text-blue-500" />
            <h3 className="font-bold text-gray-800">Employees</h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold ml-1">{deptEmps.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {deptEmps.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {e.fullName?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{e.fullName}</p>
                  <p className="text-xs text-gray-400">{e.designation || e.role}</p>
                </div>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-semibold ${e.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── DEPARTMENT MANAGEMENT SECTION ───────────────────────────────────────────
const DepartmentSection = ({ employees, addToast }) => {
  const [departments, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [editRoles, setEditRoles] = useState([]);
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });
  const [viewId, setViewId] = useState(null);

  const loadDepts = useCallback(async () => {
    try {
      setLoading(true);
      const r = await api.get("/departments");
      setDepts(r.data || []);
    } catch (e) { addToast("Failed to load departments", "error"); }
    finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { loadDepts(); }, [loadDepts]);

  const openCreate = () => { setEditDept(null); setEditRoles([]); setFormOpen(true); };
  const openEdit = async (dept) => {
    setEditDept(dept);
    try { const r = await api.get(`/departments/${dept.id}/job-roles`); setEditRoles(r.data || []); }
    catch { setEditRoles([]); }
    setFormOpen(true);
  };

  const handleSave = async (deptPayload, rolesPayload) => {
    let deptId;
    if (editDept) {
      await api.put(`/departments/${editDept.id}`, deptPayload);
      deptId = editDept.id;
      addToast("Department updated", "success");
    } else {
      const res = await api.post("/departments", deptPayload);
      deptId = res.data?.id;
      addToast("Department created", "success");
    }
    for (const role of rolesPayload) {
      if (role.id) await api.put(`/departments/job-roles/${role.id}`, role);
      else await api.post(`/departments/${deptId}/job-roles`, role);
    }
    setFormOpen(false);
    loadDepts();
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/departments/${confirm.id}`);
      addToast(`"${confirm.name}" deactivated`, "success");
      setConfirm({ open: false, id: null, name: "" });
      loadDepts();
    } catch (e) { addToast(e.message || "Failed", "error"); }
  };

  const filtered = departments.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Detail view ──────────────────────────────────────────────────────────
  if (viewId) {
    const dept = departments.find(d => d.id === viewId) || {};
    return (
      <>
        <DeptDetail
          dept={dept} employees={employees}
          onBack={() => setViewId(null)}
          onEdit={() => openEdit(dept)}
          addToast={addToast}
        />
        <DeptFormModal
          open={formOpen} onClose={() => setFormOpen(false)}
          onSave={handleSave}
          initDept={editDept} initRoles={editRoles}
          employees={employees}
        />
      </>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Page header — same style as Attendance / Leave */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-xl"><Building2 className="text-blue-600" size={28} /></div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Department Management</h2>
            <p className="text-sm text-gray-500 mt-0.5">Create departments &amp; define job roles — all in one place</p>
          </div>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-md shadow-blue-200">
          <Plus size={16} /> Add Department
        </button>
      </div>

      {/* Gradient stat cards — same style as Attendance / Leave */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Total Departments", value: departments.length, icon: Building2, from: "from-blue-500", to: "to-blue-600", sub: "All departments" },
          { label: "Active", value: departments.filter(d => d.active).length, icon: CheckCircle, from: "from-green-500", to: "to-emerald-600", sub: "Currently active" },
          { label: "Inactive", value: departments.filter(d => !d.active).length, icon: XCircle, from: "from-red-500", to: "to-red-600", sub: "Deactivated" },
          { label: "Total Employees", value: (employees || []).length, icon: Users, from: "from-indigo-500", to: "to-indigo-600", sub: "Across all depts" },
        ].map(({ label, value, icon: Icon, from, to, sub }) => (
          <div key={label} className={`bg-gradient-to-br ${from} ${to} p-6 rounded-xl shadow-lg text-white hover:scale-105 transition-transform`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/80 text-sm">{label}</p>
              <Icon size={22} className="opacity-80" />
            </div>
            <p className="text-4xl font-bold">{value}</p>
            <p className="text-white/70 text-sm mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search departments…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm">
              <th className="text-left px-5 py-4 font-semibold">#</th>
              <th className="text-left px-5 py-4 font-semibold">Department</th>
              <th className="text-left px-5 py-4 font-semibold">Manager</th>
              <th className="text-left px-5 py-4 font-semibold">Headcount</th>
              <th className="text-left px-5 py-4 font-semibold">Status</th>
              <th className="text-center px-5 py-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12">
                <Loader className="animate-spin text-blue-400 mx-auto" size={22} />
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-14 text-gray-400">
                <Building2 size={38} className="mx-auto mb-2 opacity-20" />
                <p className="font-medium text-sm">No departments yet</p>
                <p className="text-xs mt-1">Click "Add Department" to get started</p>
              </td></tr>
            ) : filtered.map((dept, idx) => {
              const cnt = (employees || []).filter(e => e.departmentId === dept.id).length;
              return (
                <tr key={dept.id}
                  onClick={() => setViewId(dept.id)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors group">
                  <td className="px-5 py-4 text-sm text-gray-400">{idx + 1}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                        {dept.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{dept.name}</p>
                        {dept.description && (
                          <p className="text-xs text-gray-400 line-clamp-1 max-w-[200px]">{dept.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">
                    {dept.managerName || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                      <Users size={12} className="text-gray-400" />{cnt}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${dept.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {dept.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setViewId(dept.id)} title="View"
                        className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => openEdit(dept)} title="Edit"
                        className="p-2 text-amber-500 hover:bg-amber-100 rounded-lg transition">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirm({ open: true, id: dept.id, name: dept.name })} title="Delete"
                        className="p-2 text-red-400 hover:bg-red-100 rounded-lg transition">
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400 transition-colors ml-0.5" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <DeptFormModal
        open={formOpen} onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initDept={editDept} initRoles={editRoles}
        employees={employees}
      />
      <ConfirmDialog
        open={confirm.open} title="Deactivate Department"
        message={`"${confirm.name}" and all its job roles will be deactivated. This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, id: null, name: "" })}
      />
    </div>
  );
};

// ─── ADD EMPLOYEE MODAL ───────────────────────────────────────────────────────
// NOTE: Employee creation now always goes through the same <AddEmployeeModal />
// component used on the Employees page (./AddEmployeeModal.jsx), so the popup
// that appears from the Overview "Add New Employee" quick action, from the
// dashboard's own Employees tab, and from the dedicated Employees page are all
// the identical, fully-featured form — see its usage in <HRDashboard /> below.

// ─── EMPLOYMENT TYPE BADGE ─────────────────────────────────────────────────────
const employmentTypeBadge = (type) => {
  const normalized = type?.toString().toUpperCase().replace(/[\s-]/g, "_");
  const styles = { FULL_TIME: "bg-blue-100 text-blue-700 border border-blue-200", PART_TIME: "bg-purple-100 text-purple-700 border border-purple-200", CONTRACT: "bg-orange-100 text-orange-700 border border-orange-200", INTERNSHIP: "bg-pink-100 text-pink-700 border border-pink-200", FREELANCE: "bg-teal-100 text-teal-700 border border-teal-200" };
  const labels = { FULL_TIME: "Full Time", PART_TIME: "Part Time", CONTRACT: "Contract", INTERNSHIP: "Internship", FREELANCE: "Freelance" };
  if (!normalized || !labels[normalized]) return <span className="text-gray-400 text-xs">—</span>;
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[normalized]}`}>{labels[normalized]}</span>;
};

// ─── EMPLOYEE SECTION ─────────────────────────────────────────────────────────
const EmployeeSection = ({ toast, onAddClick, refreshKey }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userApi.get("/hr/employees");
      const data = res.data || [];
      if (data.length > 0) console.log("[Employee fields]", Object.keys(data[0]), data[0]);
      setEmployees(data);
    } catch { toast.addToast("Failed to load employees", "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees, refreshKey]);

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Deactivate ${name}?`)) return;
    try { await userApi.put(`/hr/employees/${id}/deactivate`); toast.addToast("Employee deactivated", "success"); fetchEmployees(); }
    catch { toast.addToast("Failed to deactivate", "error"); }
  };

  const filtered = employees.filter((e) =>
    e.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase()) ||
    e.employeeId?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase()) ||
    e.departmentName?.toLowerCase().includes(search.toLowerCase())
  );

  const active = employees.filter(e => e.status === "ACTIVE").length;
  const inactive = employees.filter(e => e.status === "INACTIVE").length;
  const terminated = employees.filter(e => e.status === "TERMINATED").length;
  const fullTime = employees.filter(e => (e.employmentType || e.employment_type || "").toUpperCase().includes("FULL")).length;

  const statusBadge = (s) => {
    const c = { ACTIVE: "bg-emerald-100 text-emerald-700", INACTIVE: "bg-gray-100 text-gray-600", TERMINATED: "bg-red-100 text-red-700" };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${c[s] || "bg-gray-100 text-gray-600"}`}>{s}</span>;
  };

  const statCards = [
    { label: "Total Employees", value: employees.length, icon: Users, from: "from-blue-500", to: "to-blue-600", sub: "All staff" },
    { label: "Active", value: active, icon: UserCheck, from: "from-green-500", to: "to-emerald-600", sub: "Currently working" },
    { label: "Inactive", value: inactive, icon: Clock, from: "from-yellow-500", to: "to-orange-500", sub: "On hold" },
    { label: "Terminated", value: terminated, icon: UserX, from: "from-red-500", to: "to-red-600", sub: "No longer active" },
    { label: "Full Time", value: fullTime, icon: Award, from: "from-indigo-500", to: "to-indigo-600", sub: "Full-time staff" },
    { label: "Showing", value: filtered.length, icon: Search, from: "from-purple-500", to: "to-purple-600", sub: "After filter" },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-xl"><Users className="text-blue-600" size={28} /></div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Employee Management</h2>
            <p className="text-sm text-gray-500 mt-0.5">Manage all employees across your organization</p>
          </div>
        </div>
        <button onClick={onAddClick}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-md shadow-blue-200">
          <UserPlus size={16} /> Add Employee
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(({ label, value, icon: Icon, from, to, sub }) => (
          <div key={label} className={`bg-gradient-to-br ${from} ${to} p-5 rounded-xl shadow-lg text-white hover:scale-105 transition-transform`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/80 text-xs font-medium">{label}</p>
              <Icon size={18} className="opacity-80" />
            </div>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-white/70 text-xs mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Search + actions bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, ID, dept…"
              className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition w-64" />
          </div>
          <button onClick={fetchEmployees} className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-500">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader className="animate-spin text-blue-500" size={28} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm">
                  {["Employee", "ID", "Department", "Designation", "Role", "Employment Type", "Joining Date", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left px-5 py-4 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-16 text-gray-400"><Users size={36} className="mx-auto mb-2 opacity-20" /><p>No employees found</p></td></tr>
                ) : filtered.map((emp, i) => (
                  <tr key={emp.id} className={`hover:bg-blue-50/40 transition-colors ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{emp.fullName?.charAt(0)}</div>
                        <div><p className="font-semibold text-sm text-gray-800">{emp.fullName}</p><p className="text-xs text-gray-400">{emp.email}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-mono text-gray-600">{emp.employeeId}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {(() => { const d = emp.departmentName || emp.department || emp.dept || emp.departmentTitle || emp.department_name || emp.deptName; return d ? <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-indigo-100">{d}</span> : <span className="text-gray-400 text-xs">—</span>; })()}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{emp.designation || "—"}</td>
                    <td className="px-5 py-3.5"><span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">{emp.role}</span></td>
                    <td className="px-5 py-3.5">{employmentTypeBadge(emp.employmentType || emp.employment_type || emp.empType || emp.type)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{emp.joiningDate || "—"}</td>
                    <td className="px-5 py-3.5">{statusBadge(emp.status)}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => handleDeactivate(emp.id, emp.fullName)} className="p-1.5 hover:bg-orange-50 text-orange-500 rounded-lg transition" title="Deactivate"><XCircle size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── ATTENDANCE SECTION ───────────────────────────────────────────────────────
const AttendanceSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterStatus, setFilterStatus] = useState("all");

  const attendanceData = [
    { id: 1, empId: "EMP001", name: "John Doe", department: "IT", date: "2026-01-21", checkIn: "09:00 AM", checkOut: "06:00 PM", status: "Present", workHours: "9h 0m" },
    { id: 2, empId: "EMP002", name: "Jane Smith", department: "HR", date: "2026-01-21", checkIn: "08:45 AM", checkOut: "05:45 PM", status: "Present", workHours: "9h 0m" },
    { id: 3, empId: "EMP003", name: "Mike Johnson", department: "Finance", date: "2026-01-21", checkIn: "-", checkOut: "-", status: "Absent", workHours: "-" },
    { id: 4, empId: "EMP004", name: "Sarah Williams", department: "IT", date: "2026-01-21", checkIn: "09:15 AM", checkOut: "-", status: "Half Day", workHours: "4h 30m" },
    { id: 5, empId: "EMP005", name: "David Brown", department: "Marketing", date: "2026-01-21", checkIn: "09:30 AM", checkOut: "06:30 PM", status: "Present", workHours: "9h 0m" },
  ];

  const stats = { totalEmployees: 45, present: 38, absent: 5, halfDay: 2, late: 8, onTime: 30 };

  const filtered = attendanceData.filter(r => {
    const s = searchTerm.toLowerCase();
    const matchSearch = r.name.toLowerCase().includes(s) || r.empId.toLowerCase().includes(s) || r.department.toLowerCase().includes(s);
    const matchStatus = filterStatus === "all" || r.status.toLowerCase() === filterStatus.toLowerCase();
    return matchSearch && matchStatus;
  });

  const statCards = [
    { label: "Total Employees", value: stats.totalEmployees, icon: Users, from: "from-blue-500", to: "to-blue-600" },
    { label: "Present", value: stats.present, icon: CheckCircle, from: "from-green-500", to: "to-emerald-600" },
    { label: "Absent", value: stats.absent, icon: XCircle, from: "from-red-500", to: "to-red-600" },
    { label: "Half Day", value: stats.halfDay, icon: Clock, from: "from-yellow-500", to: "to-orange-500" },
    { label: "Late", value: stats.late, icon: UserX, from: "from-purple-500", to: "to-purple-600" },
    { label: "On Time", value: stats.onTime, icon: UserCheck, from: "from-indigo-500", to: "to-indigo-600" },
  ];

  const statusStyle = s => s === "Present" ? "bg-green-100 text-green-700" : s === "Absent" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-xl"><CalendarCheck className="text-blue-600" size={28} /></div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Attendance Management</h2>
            <p className="text-sm text-gray-500 mt-0.5">Track and manage employee attendance</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 font-medium">Today's Date</p>
          <p className="text-base font-bold text-gray-700">{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(({ label, value, icon: Icon, from, to }) => (
          <div key={label} className={`bg-gradient-to-br ${from} ${to} p-5 rounded-xl shadow-lg text-white hover:scale-105 transition-transform`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/80 text-xs font-medium">{label}</p>
              <Icon size={18} className="opacity-80" />
            </div>
            <p className="text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search by name, ID, or dept…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition" />
          </div>
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition" />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 appearance-none">
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="half day">Half Day</option>
            </select>
          </div>
          <button onClick={() => alert("Exporting attendance data…")}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition shadow-md shadow-blue-200">
            <Download size={16} /> Export Data
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm">
              {["Emp ID", "Employee Name", "Department", "Date", "Check In", "Check Out", "Work Hours", "Status"].map(h => (
                <th key={h} className="px-5 py-4 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0
              ? <tr><td colSpan={8} className="text-center py-14 text-gray-400"><CalendarCheck size={36} className="mx-auto mb-2 opacity-20" /><p>No attendance records found</p></td></tr>
              : filtered.map((r, i) => (
                <tr key={r.id} className={`hover:bg-blue-50/40 transition-colors ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                  <td className="px-5 py-3.5 text-sm font-mono font-semibold text-gray-700">{r.empId}</td>
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{r.name}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{r.department}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{r.date}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">{r.checkIn}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">{r.checkOut}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-gray-700">{r.workHours}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle(r.status)}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── LEAVE SECTION ────────────────────────────────────────────────────────────
const LeaveSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewing, setViewing] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([
    { id: 1, empId: "EMP001", name: "John Doe", department: "IT", leaveType: "Sick Leave", startDate: "2026-01-25", endDate: "2026-01-27", days: 3, reason: "Medical checkup and recovery", appliedOn: "2026-01-20", status: "Pending" },
    { id: 2, empId: "EMP002", name: "Jane Smith", department: "HR", leaveType: "Casual Leave", startDate: "2026-02-01", endDate: "2026-02-03", days: 3, reason: "Personal work", appliedOn: "2026-01-19", status: "Pending" },
    { id: 3, empId: "EMP003", name: "Mike Johnson", department: "Finance", leaveType: "Annual Leave", startDate: "2026-01-22", endDate: "2026-01-23", days: 2, reason: "Family function", appliedOn: "2026-01-18", status: "Approved" },
    { id: 4, empId: "EMP004", name: "Sarah Williams", department: "IT", leaveType: "Sick Leave", startDate: "2026-01-20", endDate: "2026-01-20", days: 1, reason: "Fever", appliedOn: "2026-01-19", status: "Rejected" },
    { id: 5, empId: "EMP005", name: "David Brown", department: "Marketing", leaveType: "Casual Leave", startDate: "2026-02-05", endDate: "2026-02-07", days: 3, reason: "Vacation trip", appliedOn: "2026-01-21", status: "Pending" },
  ]);

  const stats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter(r => r.status === "Pending").length,
    approved: leaveRequests.filter(r => r.status === "Approved").length,
    rejected: leaveRequests.filter(r => r.status === "Rejected").length,
  };

  const filtered = leaveRequests.filter(r => {
    const s = searchTerm.toLowerCase();
    const matchSearch = r.name.toLowerCase().includes(s) || r.empId.toLowerCase().includes(s) || r.department.toLowerCase().includes(s) || r.leaveType.toLowerCase().includes(s);
    const matchStatus = filterStatus === "all" || r.status.toLowerCase() === filterStatus.toLowerCase();
    return matchSearch && matchStatus;
  });

  const approve = id => { setLeaveRequests(p => p.map(r => r.id === id ? { ...r, status: "Approved" } : r)); setViewing(null); };
  const reject = id => { setLeaveRequests(p => p.map(r => r.id === id ? { ...r, status: "Rejected" } : r)); setViewing(null); };

  const statusStyle = s => s === "Approved" ? "bg-green-100 text-green-700" : s === "Rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700";

  const statCards = [
    { label: "Total Requests", value: stats.total, icon: FileText, from: "from-blue-500", to: "to-blue-600", sub: "All time" },
    { label: "Pending", value: stats.pending, icon: Clock, from: "from-yellow-500", to: "to-orange-500", sub: "Awaiting approval" },
    { label: "Approved", value: stats.approved, icon: CheckCircle, from: "from-green-500", to: "to-emerald-600", sub: "Granted leaves" },
    { label: "Rejected", value: stats.rejected, icon: XCircle, from: "from-red-500", to: "to-red-600", sub: "Denied requests" },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
        <div className="bg-blue-100 p-3 rounded-xl"><FileText className="text-blue-600" size={28} /></div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Leave Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">Approve and manage employee leave requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map(({ label, value, icon: Icon, from, to, sub }) => (
          <div key={label} className={`bg-gradient-to-br ${from} ${to} p-6 rounded-xl shadow-lg text-white hover:scale-105 transition-transform`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/80 text-sm">{label}</p>
              <Icon size={22} className="opacity-80" />
            </div>
            <p className="text-4xl font-bold">{value}</p>
            <p className="text-white/70 text-sm mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search by name, ID, department, or leave type…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition" />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 appearance-none">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm">
              {["Emp ID", "Employee", "Department", "Leave Type", "Duration", "Days", "Applied On", "Status", "Actions"].map(h => (
                <th key={h} className="px-5 py-4 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0
              ? <tr><td colSpan={9} className="text-center py-14 text-gray-400"><FileText size={36} className="mx-auto mb-2 opacity-20" /><p>No leave requests found</p></td></tr>
              : filtered.map((r, i) => (
                <tr key={r.id} className={`hover:bg-blue-50/40 transition-colors ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                  <td className="px-5 py-3.5 text-sm font-mono font-semibold text-gray-700">{r.empId}</td>
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{r.name}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{r.department}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">{r.leaveType}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{r.startDate} → {r.endDate}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-gray-700">{r.days}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{r.appliedOn}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => setViewing(r)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-semibold transition">
                      <Eye size={14} /> View
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl">
              <h3 className="text-xl font-bold">Leave Request Details</h3>
              <p className="text-blue-100 text-sm mt-0.5">{viewing.name} · {viewing.empId}</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-5">
                {[
                  ["Employee ID", viewing.empId],
                  ["Employee Name", viewing.name],
                  ["Department", viewing.department],
                  ["Leave Type", viewing.leaveType],
                  ["Start Date", viewing.startDate],
                  ["End Date", viewing.endDate],
                  ["Total Days", `${viewing.days} day${viewing.days > 1 ? "s" : ""}`],
                  ["Applied On", viewing.appliedOn],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-sm font-semibold text-gray-800">{val}</p>
                  </div>
                ))}
              </div>
              <div className="mb-5">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Reason</p>
                <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 p-3 rounded-lg">{viewing.reason}</p>
              </div>
              <div className="mb-5">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Status</p>
                <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${statusStyle(viewing.status)}`}>{viewing.status}</span>
              </div>
              {viewing.status === "Pending" && (
                <div className="flex gap-3 mb-3">
                  <button onClick={() => approve(viewing.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                    <CheckCircle size={16} /> Approve Leave
                  </button>
                  <button onClick={() => reject(viewing.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                    <XCircle size={16} /> Reject Leave
                  </button>
                </div>
              )}
              <button onClick={() => setViewing(null)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── EMPLOYEE DISTRIBUTION BARS ────────────────────────────────────────────────
// Renders real, database-backed department headcounts (Department.employeeCount,
// counted server-side from the employees table). `limit` shows only the busiest
// N departments; omit it to show every department (used inside the "view all" modal).
const DIST_COLORS = [
  { from: "from-blue-500", to: "to-cyan-500", color: "text-blue-600" },
  { from: "from-green-500", to: "to-emerald-500", color: "text-green-600" },
  { from: "from-purple-500", to: "to-pink-500", color: "text-purple-600" },
  { from: "from-orange-500", to: "to-yellow-500", color: "text-orange-600" },
  { from: "from-red-500", to: "to-pink-500", color: "text-red-600" },
  { from: "from-teal-500", to: "to-cyan-500", color: "text-teal-600" },
  { from: "from-indigo-500", to: "to-blue-500", color: "text-indigo-600" },
  { from: "from-pink-500", to: "to-rose-500", color: "text-pink-600" },
];

const DistributionBars = ({ departments, limit }) => {
  const sorted = [...departments].sort((a, b) => (b.employeeCount || 0) - (a.employeeCount || 0));
  const shown = limit ? sorted.slice(0, limit) : sorted;
  const max = Math.max(1, ...sorted.map((d) => d.employeeCount || 0));

  if (sorted.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Building2 size={32} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm">No departments added yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {shown.map((d, i) => {
        const c = DIST_COLORS[i % DIST_COLORS.length];
        const count = d.employeeCount || 0;
        const pct = Math.max(4, Math.round((count / max) * 100));
        return (
          <div key={d.id ?? d.name}>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">{d.name}</span>
              <span className={`text-sm font-bold ${c.color}`}>{count} employee{count === 1 ? "" : "s"}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className={`bg-gradient-to-r ${c.from} ${c.to} h-3 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
const HRDashboard = () => {
  const [user, setUser] = useState(null);
  const [activeMenu, setActiveMenu] = useState("Overview");
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState({ totalDepartments: 0, totalEmployees: 0, pendingLeaves: 0, todayPresent: 0 });
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [pendingAllowances, setPendingAllowances] = useState([]); // employees' allowance requests waiting for HR
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]); // real accounts from User_Backend — source of truth for headcount
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [empRefresh, setEmpRefresh] = useState(0);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      if (userData.role !== "HR_MANAGER" && userData.role !== "ADMIN") { navigate("/unauthorized"); return; }
      setUser(userData);
    } else { navigate("/login"); }
  }, [navigate]);

  useEffect(() => { if (user) { fetchDashboardData(); } }, [user]);

  const fetchDashboardData = async () => {
    try {
      const today = toLocalDateString(new Date());
      // Every number on this page is read straight from its own real table —
      // no external "dashboard stats" proxy involved:
      //   • Departments        -> HR_Backend departments table (hrApi.getDepartments)
      //   • Total Employees    -> User_Backend accounts table, the actual source
      //                           of truth for employees (userApi -> AUTH_URL/hr/employees),
      //                           same list the Employees page uses
      //   • Today Present      -> the real attendance table for today
      //                           (hrApi.getDailyAttendance), same source the
      //                           Attendance page and Employee page use
      //   • Pending Leaves     -> the real leave table (hrApi.getPendingLeaves)
      const [deptsRes, employeesRes, leavesRes, attendanceRes, allowanceRes] = await Promise.all([
        hrApi.getDepartments().catch(() => ({ data: [] })),
        userApi.get("/hr/employees").catch(() => ({ data: [] })),
        hrApi.getPendingLeaves().catch(() => ({ data: [] })),
        hrApi.getDailyAttendance(today).catch(() => ({ data: [] })),
        hrApi.getAllowanceRequests().catch(() => ({ data: [] })),
      ]);

      const deptList = Array.isArray(deptsRes?.data) ? deptsRes.data : [];
      const employeeList = Array.isArray(employeesRes?.data) ? employeesRes.data : [];
      const leaveList = Array.isArray(leavesRes?.data) ? leavesRes.data : [];
      const sessions = Array.isArray(attendanceRes?.data) ? attendanceRes.data : [];

      // Same grouping logic the Attendance page and Employee page use: collapse
      // every clock-in/out session into one row per employee for today, then
      // count how many of those rows ended the day as PRESENT.
      const presentToday = groupSessionsByEmployee(sessions).filter((row) => row.status === "PRESENT").length;

      setDepartments(deptList);
      setEmployees(employeeList);
      setPendingLeaves(leaveList);
      setPendingAllowances((Array.isArray(allowanceRes?.data) ? allowanceRes.data : []).filter((r) => r.status === "PENDING"));
      setStats({
        totalDepartments: deptList.length,
        totalEmployees: employeeList.length,
        todayPresent: presentToday,
        pendingLeaves: leaveList.length,
      });
    } catch { }
  };

  const handleApproveLeave = async (id) => { try { await hrApi.approveLeave(id); toast.addToast("Leave approved", "success"); fetchDashboardData(); } catch { toast.addToast("Failed to approve", "error"); } };
  const handleRejectLeave = async (id) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    try { await hrApi.rejectLeave(id, reason || "Rejected"); toast.addToast("Leave rejected", "success"); fetchDashboardData(); } catch { toast.addToast("Failed to reject", "error"); }
  };
  const handleLogout = () => { localStorage.removeItem("user"); localStorage.removeItem("token"); navigate("/login"); };

  // Real per-department headcounts — built the same way the Departments page
  // builds them: match each real employee (User_Backend) to a department by
  // name, so this always agrees with what the Departments page shows, however
  // employees were assigned. Not the HR backend's own possibly-stale count.
  const departmentsWithCounts = useMemo(() => {
    const countByName = {};
    employees.forEach((emp) => {
      const name = (emp.departmentName || emp.department || "").trim().toLowerCase();
      if (!name) return;
      countByName[name] = (countByName[name] || 0) + 1;
    });
    return departments.map((d) => ({
      ...d,
      employeeCount: countByName[(d.name || "").trim().toLowerCase()] || 0,
    }));
  }, [departments, employees]);

  useEffect(() => {
    if (activeMenu === "Departments") {
      navigate("/hr/departments");
    }
  }, [activeMenu, navigate]);

  // Same full menu as every other HR page, so nothing disappears on Overview
  const menuItems = [
    { name: "Overview", icon: LayoutDashboard, path: null },
    { name: "Departments", icon: Building2, path: "/hr/departments" },
    { name: "Employees", icon: Users, path: "/hr/employees" },
    { name: "Attendance", icon: CalendarCheck, path: "/hr/attendance" },
    { name: "Leave Management", icon: FileText, path: "/hr/leave" },
    { name: "Payroll", icon: DollarSign, path: "/hr/payslip" },
    { name: "Reports", icon: BarChart3, path: "/hr/report" },
    { name: "Notifications", icon: Bell, path: "/hr/notifications" },
    { name: "Roles & Permissions", icon: ShieldCheck, path: "/hr/roles-permissions" },
    { name: "Profile", icon: User, path: "/hr/profile" },
  ];

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toast toasts={toast.toasts} removeToast={toast.removeToast} />

      <AddEmployeeModal
        open={showAddEmployee}
        onClose={() => setShowAddEmployee(false)}
        departments={departments}
        onSuccess={() => { setEmpRefresh(r => r + 1); fetchDashboardData(); toast.addToast("Employee created successfully!", "success"); setShowAddEmployee(false); }}
      />

      {/* ── Employee Distribution — expanded view (all departments) ── */}
      {showDeptModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeptModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col z-10">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-5 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg"><Building2 className="text-white" size={20} /></div>
                <div>
                  <h2 className="text-white font-bold text-lg">Employee Distribution</h2>
                  <p className="text-purple-100 text-xs">All {departments.length} department{departments.length === 1 ? "" : "s"}</p>
                </div>
              </div>
              <button onClick={() => setShowDeptModal(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition"><X className="text-white" size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <DistributionBars departments={departmentsWithCounts} />
            </div>
          </div>
        </div>
      )}

      {/* ── Premium Navy Sidebar ── */}
      <nav
        className={`flex flex-col transition-all duration-300 shadow-2xl flex-shrink-0 ${isSidebarOpen ? 'w-64' : 'w-20'}`}
        style={{ background: 'linear-gradient(180deg, #0a1120 0%, #0f172a 100%)' }}
      >
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 flex-shrink-0">
          <img src={logo} alt="Logo" className="w-9 h-9 rounded-xl flex-shrink-0 shadow-md" />
          {isSidebarOpen && <span className="text-white text-base font-bold tracking-tight">HRM Portal</span>}
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="ml-auto p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
        <ul className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
          {menuItems.map(item => {
            const isActive = activeMenu === item.name;
            return (
              <li key={item.name}>
                <button
                  onClick={() => {
                    if (item.path) {
                      navigate(item.path);
                    } else {
                      setActiveMenu(item.name);
                    }
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}
                    ${!isSidebarOpen ? 'justify-center px-0' : ''}`}
                  style={isActive ? {
                    background: 'linear-gradient(135deg, rgba(20,184,166,0.75), rgba(13,148,136,0.55))',
                    boxShadow: '0 2px 12px rgba(20,184,166,0.3)'
                  } : {}}
                  title={!isSidebarOpen ? item.name : undefined}
                >
                  <item.icon size={18} className="flex-shrink-0" />
                  {isSidebarOpen && <span>{item.name}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="px-3 pb-3 flex-shrink-0">
          <RoleSwitch mode="hr" sidebar collapsed={!isSidebarOpen} />
        </div>
        <div className="border-t border-white/10 p-3 space-y-2 flex-shrink-0">
          {isSidebarOpen && (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md">
                {user.fullName?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{user.fullName}</p>
                <p className="text-gray-500 text-xs">HR Manager</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-red-500/20 transition-all ${!isSidebarOpen ? 'justify-center' : ''}`}
          >
            <LogOut size={18} />
            {isSidebarOpen && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <main className="flex-1 overflow-auto flex flex-col">
        <header className="flex-shrink-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shadow-sm sticky top-0 z-20">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{activeMenu}</h1>
            <p className="text-xs text-gray-400">HR Management Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsNotificationsOpen(v => !v)} title="Notifications" className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 bg-red-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            <div onClick={() => navigate("/hr/profile")} title="My Profile" className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold shadow">
                {user.fullName?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-semibold text-gray-800 leading-tight">{user.fullName}</span>
                <span className="text-xs text-gray-400">HR Manager</span>
              </div>
            </div>
          </div>
        </header>

        <NotificationPopup
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          onUnreadCountChange={setUnreadCount}
          role="hr"
        />

        <div className="p-6">

          {/* ── OVERVIEW ── */}
          {activeMenu === "Overview" && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {[
                  { label: "Total Departments", val: stats.totalDepartments, sub: "All departments", icon: Building2, from: "from-blue-500", to: "to-blue-600", tc: "text-blue-100", path: "/hr/departments" },
                  { label: "Total Employees", val: stats.totalEmployees, sub: "Across all departments", icon: Users, from: "from-green-500", to: "to-emerald-600", tc: "text-green-100", path: "/hr/employees" },
                  { label: "Today Present", val: stats.todayPresent, sub: "Checked in today", icon: UserCheck, from: "from-purple-500", to: "to-pink-600", tc: "text-purple-100", path: "/hr/attendance" },
                  { label: "Pending Leaves", val: stats.pendingLeaves, sub: "Awaiting approval", icon: Clock, from: "from-yellow-500", to: "to-orange-500", tc: "text-yellow-100", path: "/hr/leave" },
                ].map(({ label, val, sub, icon: Icon, from, to, tc, path }) => (
                  <div
                    key={label}
                    onClick={() => navigate(path)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(path); }}
                    className={`bg-gradient-to-br ${from} ${to} p-6 rounded-xl shadow-xl text-white transform hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer relative overflow-hidden`}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-12 -mt-12" />
                    <div className="flex items-center justify-between mb-3 relative z-10"><div className="bg-white bg-opacity-20 p-3 rounded-lg"><Icon size={28} /></div></div>
                    <p className={`${tc} text-sm font-medium mb-1 relative z-10`}>{label}</p>
                    <h3 className="text-4xl font-bold relative z-10">{val}</h3>
                    <p className={`text-sm ${tc} mt-2 relative z-10`}>{sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                  <h3 className="text-xl font-bold mb-6 flex items-center justify-between text-gray-800">
                    <span onClick={() => navigate("/hr/leave")} role="link" tabIndex={0} title="Open Leave Management"
                      onKeyDown={(e) => { if (e.key === "Enter") navigate("/hr/leave"); }}
                      className="flex items-center cursor-pointer hover:text-yellow-700 transition-colors"><div className="bg-yellow-100 p-2 rounded-lg mr-3"><FileText className="text-yellow-600" size={24} /></div>Pending Leave Requests</span>
                    <button onClick={() => navigate("/hr/leave")} title="Open Leave Management"
                      className="text-sm text-gray-500 font-normal bg-yellow-100 hover:bg-yellow-200 px-3 py-1 rounded-full transition-colors">{pendingLeaves.length} pending · View all →</button>
                  </h3>
                  <div className="space-y-3">
                    {pendingLeaves.length === 0
                      ? <div className="text-center py-8 text-gray-400"><CheckCircle size={32} className="mx-auto mb-2 opacity-30" /><p className="text-sm">No pending leave requests</p></div>
                      : pendingLeaves.slice(0, 5).map((leave) => (
                        <div key={leave.id} onClick={() => navigate("/hr/leave")} title="Open Leave Management" className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition cursor-pointer">
                          <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 flex-shrink-0">{leave.employeeName?.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                          <div className="flex-1"><p className="font-semibold">{leave.employeeName}</p><p className="text-sm text-gray-500">{leave.leaveTypeName} • {leave.numberOfDays} day(s)</p><p className="text-xs text-gray-400">{leave.startDate} → {leave.endDate}</p></div>
                          <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); handleApproveLeave(leave.id); }} className="bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition flex items-center gap-1 text-sm"><CheckCircle size={14} /> Approve</button>
                            <button onClick={(e) => { e.stopPropagation(); handleRejectLeave(leave.id); }} className="bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition flex items-center gap-1 text-sm"><XCircle size={14} /> Reject</button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                  <h3 className="text-xl font-bold mb-6 flex items-center text-gray-800"><div className="bg-blue-100 p-2 rounded-lg mr-3"><LayoutDashboard className="text-blue-600" size={24} /></div>Quick Actions</h3>
                  <div className="space-y-3">
                    <button onClick={() => setShowAddEmployee(true)} className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-2 font-medium"><UserPlus size={20} /> Add New Employee</button>
                    <button onClick={() => navigate("/hr/payslip")} className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-2 font-medium"><DollarSign size={20} /> Generate Payslips</button>
                    <button onClick={() => navigate("/hr/report")} className="w-full bg-purple-500 text-white py-3 px-4 rounded-lg hover:bg-purple-600 transition flex items-center justify-center gap-2 font-medium"><BarChart3 size={20} /> Export Report</button>
                    <button onClick={() => navigate("/hr/departments")} className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition flex items-center justify-center gap-2 font-medium"><Building2 size={20} /> Manage Departments</button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 mb-6">
                <h3 className="text-xl font-bold mb-6 flex items-center justify-between text-gray-800">
                  <span className="flex items-center"><div className="bg-emerald-100 p-2 rounded-lg mr-3"><DollarSign className="text-emerald-600" size={24} /></div>Pending Allowance Requests</span>
                  <span className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 font-normal bg-emerald-100 px-3 py-1 rounded-full">{pendingAllowances.length} pending</span>
                    <button onClick={() => navigate("/hr/payroll/allowance-requests")} className="text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg transition">Review requests</button>
                  </span>
                </h3>
                <div className="space-y-3">
                  {pendingAllowances.length === 0
                    ? <div className="text-center py-8 text-gray-400"><CheckCircle size={32} className="mx-auto mb-2 opacity-30" /><p className="text-sm">No pending allowance requests</p></div>
                    : pendingAllowances.slice(0, 5).map((r) => (
                      <div key={r.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition">
                        <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center font-bold text-emerald-600 flex-shrink-0">{(r.employeeName || r.employeeEmail || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                        <div className="flex-1 min-w-0"><p className="font-semibold">{r.employeeName || r.employeeEmail}</p><p className="text-sm text-gray-500 truncate">{r.name} • Rs.{(Number(r.amount) || 0).toLocaleString()}</p><p className="text-xs text-gray-400">Requested {(r.createdAt || "").replace("T", " ").slice(0, 16)}</p></div>
                        <button onClick={() => navigate("/hr/payroll/allowance-requests")} className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition text-sm">Review</button>
                      </div>
                    ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div
                  onClick={() => departments.length > 0 && setShowDeptModal(true)}
                  className={`bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ${departments.length > 0 ? "cursor-pointer" : ""}`}
                >
                  <h3 className="text-xl font-bold mb-6 flex items-center justify-between text-gray-800">
                    <span className="flex items-center"><div className="bg-purple-100 p-2 rounded-lg mr-3"><Building2 className="text-purple-600" size={24} /></div>Employee Distribution</span>
                    {departments.length > 5 && (
                      <span className="text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">View all {departments.length}</span>
                    )}
                  </h3>
                  <DistributionBars departments={departmentsWithCounts} limit={5} />
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                  <h3 className="text-xl font-bold mb-6 flex items-center text-gray-800"><div className="bg-yellow-100 p-2 rounded-lg mr-3"><Award className="text-yellow-600" size={24} /></div>Top Performers This Month</h3>
                  <div className="space-y-3">
                    {[{ medal: "🥇", initials: "AK", name: "Alice Kim", dept: "Engineering", pct: "98%", bg: "bg-blue-500", wrap: "from-yellow-50 to-orange-50" }, { medal: "🥈", initials: "MB", name: "Michael Brown", dept: "Sales", pct: "95%", bg: "bg-purple-500", wrap: "bg-gray-50" }, { medal: "🥉", initials: "EW", name: "Emma Wilson", dept: "Finance", pct: "93%", bg: "bg-green-500", wrap: "bg-gray-50" }].map(p => (
                      <div key={p.name} className={`flex items-center gap-3 p-3 bg-gradient-to-r ${p.wrap} rounded-lg`}>
                        <div className="text-2xl">{p.medal}</div>
                        <div className={`h-10 w-10 ${p.bg} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}>{p.initials}</div>
                        <div className="flex-1"><p className="font-semibold">{p.name}</p><p className="text-sm text-gray-500">{p.dept} • {p.pct} Performance</p></div>
                        <TrendingUp className="text-green-500" size={20} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── EMPLOYEES ── */}
          {activeMenu === "Employees" && (
            <EmployeeSection toast={toast} onAddClick={() => setShowAddEmployee(true)} refreshKey={empRefresh} />
          )}

          {/* ── DEPARTMENTS ── */}
          {activeMenu === "Departments" && (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
              <p className="text-gray-600 mb-4 font-medium">Redirecting to Department Management…</p>
              <button onClick={() => navigate("/hr/departments")} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold shadow hover:bg-blue-700 transition">Open Departments</button>
            </div>
          )}

          {activeMenu === "Attendance" && <AttendanceSection />}
          {activeMenu === "Leave Management" && <LeaveSection />}
          {activeMenu === "Payroll" && <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-xl font-bold mb-4">Payroll Management</h3><p className="text-gray-500">Payroll processing interface will be implemented here.</p></div>}
          {activeMenu === "Reports" && <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-xl font-bold mb-4">Reports & Analytics</h3><p className="text-gray-500">Reporting interface will be implemented here.</p></div>}

        </div>
      </main>
    </div>
  );
};

export default HRDashboard;