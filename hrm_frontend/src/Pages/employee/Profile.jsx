import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    User, Mail, Phone, Calendar, Briefcase, Building2,
    ShieldCheck, IdCard, Clock, Users,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { userSelfApi } from "../../services/api";

// Read-only page: every value comes from hrm_db_user.employees and nothing can be edited here.

const GENDER_LABEL = { MALE: "Male", FEMALE: "Female", OTHER: "Other" };

const titleCase = (s) =>
    String(s || "").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
    return Number.isNaN(d.getTime())
        ? iso
        : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

// Work experience = time between the joining date and today (calculated, never typed in)
const calcExperience = (joiningDate) => {
    if (!joiningDate) return "";
    const start = new Date(`${String(joiningDate).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(start.getTime())) return "";
    const now = new Date();
    if (start > now) return "Not started yet";

    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();
    if (days < 0) {
        months -= 1;
        // days in the month before the current one
        days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (months < 0) {
        years -= 1;
        months += 12;
    }

    const parts = [];
    if (years) parts.push(`${years} year${years > 1 ? "s" : ""}`);
    if (months) parts.push(`${months} month${months > 1 ? "s" : ""}`);
    if (!years && !months) parts.push(`${days} day${days === 1 ? "" : "s"}`);
    return parts.join(" ");
};

// API profile -> form values (nulls become "" so inputs stay controlled)
const toForm = (p = {}) => ({
    fullName: p.fullName || "",
    email: p.email || "",
    dob: p.dob || "",
    gender: p.gender || "",
    phone: p.phone || "",
    employeeId: p.employeeId || "",
    department: p.departmentName || "",
    designation: p.designation || "",
    employmentType: p.employmentType || "",
    joiningDate: p.joiningDate || "",
    status: p.status || "",
    company: p.companyName || "",
});

// Read-only field
const Field = ({ label, value, icon: Icon, tone = "text-slate-400" }) => (
    <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
        <div className="relative">
            {Icon && <Icon size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${tone}`} />}
            <input
                type="text"
                value={value || ""}
                readOnly
                tabIndex={-1}
                placeholder="—"
                className={`w-full ${Icon ? "pl-10" : "pl-4"} pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 bg-slate-50/70 cursor-default focus:outline-none`}
            />
        </div>
    </div>
);

const SectionTitle = ({ icon: Icon, tone, children }) => (
    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2.5">
        <span className={`${tone} p-1.5 rounded-lg border border-current/10`}><Icon size={16} /></span> {children}
    </h3>
);

const EmployeeProfile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState("personal");
    const [profile, setProfile] = useState(toForm());
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    // Server errors come back as "400: <reason>"; show just the reason
    const errorText = (e, fallback) => (e?.message || fallback).replace(/^\d{3}:\s*/, "");

    const load = useCallback(async () => {
        try {
            const res = await userSelfApi.getMyProfile();
            setProfile(toForm(res.data || {}));
        } catch (e) {
            setMessage("✗ " + errorText(e, "Failed to load your profile"));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const s = localStorage.getItem("user");
        if (!s) { navigate("/login"); return; }
        const u = JSON.parse(s);
        setUser(u);
        load();
    }, [navigate, load]);

    if (!user) return null;

    const experience = calcExperience(profile.joiningDate);
    const initials = (profile.fullName || "?").split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();

    const tabs = [
        ["personal", "Personal", User],
        ["employment", "Employment", Briefcase],
    ];

    return (
        <PageLayout
            role="employee"
            activePage="Profile"
            title="My Profile"
            subtitle="Your personal and employment details (view only)"
        >
            <div className="space-y-6">
                {message && (
                    <div className="px-4 py-3 rounded-xl border text-sm font-medium bg-rose-50 border-rose-200 text-rose-800">
                        {message}
                    </div>
                )}

                {/* Hero */}
                <div
                    className="text-white rounded-2xl p-7 shadow-sm border border-teal-900/50 relative overflow-hidden"
                    style={{ background: "linear-gradient(135deg, #102a2a 0%, #163b38 100%)" }}
                >
                    <div className="absolute -right-16 -top-16 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
                        <div className="h-20 w-20 bg-teal-500/20 backdrop-blur-xs rounded-2xl flex items-center justify-center text-3xl font-bold shadow-md border border-teal-400/30 text-teal-100 shrink-0">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-2xl font-bold text-white tracking-tight truncate">{loading ? "Loading profile..." : profile.fullName}</h2>
                            <p className="text-teal-300 text-sm font-medium mt-0.5">{profile.designation || "—"}</p>
                            <div className="flex flex-wrap gap-4 text-xs text-teal-100/75 mt-3">
                                <span className="flex items-center gap-1.5"><Mail size={14} className="text-teal-400" />{profile.email || "—"}</span>
                                <span className="flex items-center gap-1.5"><Phone size={14} className="text-teal-400" />{profile.phone || "—"}</span>
                                <span className="flex items-center gap-1.5"><IdCard size={14} className="text-teal-400" />ID: {profile.employeeId || "—"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200/90 overflow-hidden">
                    <div className="flex gap-2 p-3 border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
                        {tabs.map(([key, label, TabIcon]) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${activeTab === key ? "bg-teal-600 text-white shadow-sm shadow-teal-600/20" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                    }`}
                            >
                                <TabIcon size={15} /> {label}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        {activeTab === "personal" && (
                            <div className="space-y-5">
                                <SectionTitle icon={User} tone="bg-teal-50 text-teal-700">Personal Details</SectionTitle>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Field label="Full Name" value={profile.fullName} icon={User} tone="text-teal-600" />
                                    <Field label="Email Address" value={profile.email} icon={Mail} tone="text-indigo-500" />
                                    <Field label="Date of Birth" value={fmtDate(profile.dob)} icon={Calendar} tone="text-amber-500" />
                                    <Field label="Gender" value={GENDER_LABEL[profile.gender] || titleCase(profile.gender)} icon={Users} tone="text-violet-500" />
                                    <Field label="Phone Number" value={profile.phone} icon={Phone} tone="text-teal-500" />
                                </div>

                            </div>
                        )}

                        {activeTab === "employment" && (
                            <div className="space-y-5">
                                <SectionTitle icon={Briefcase} tone="bg-teal-50 text-teal-600">Employment Details</SectionTitle>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Field label="Employee ID" value={profile.employeeId} icon={IdCard} tone="text-slate-500" />
                                    <Field label="Department" value={profile.department} icon={Building2} tone="text-teal-500" />
                                    <Field label="Designation" value={profile.designation} icon={Briefcase} tone="text-teal-600" />
                                    <Field label="Employment Type" value={profile.employmentType} icon={Briefcase} tone="text-teal-600" />
                                    <Field label="Status" value={titleCase(profile.status)} icon={ShieldCheck} tone="text-emerald-500" />
                                    <Field label="Joining Date" value={fmtDate(profile.joiningDate)} icon={Calendar} tone="text-amber-500" />
                                    <Field label="Work Experience" value={experience} icon={Clock} tone="text-violet-500" />
                                </div>

                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PageLayout>
    );
};

export default EmployeeProfile;
