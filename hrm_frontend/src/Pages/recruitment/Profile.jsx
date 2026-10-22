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
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</label>
        <div className="relative">
            {Icon && <Icon size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${tone}`} />}
            <input
                type="text"
                value={value || ""}
                readOnly
                tabIndex={-1}
                placeholder="—"
                className={`w-full ${Icon ? "pl-10" : "pl-4"} pr-4 py-3 border border-gray-200 rounded-xl text-sm text-slate-800 bg-gray-50 cursor-default focus:outline-none`}
            />
        </div>
    </div>
);

const SectionTitle = ({ icon: Icon, tone, children }) => (
    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <span className={`${tone} p-1.5 rounded-md`}><Icon size={16} /></span> {children}
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
                {message && <div className="p-4 rounded-xl text-white text-sm bg-red-500">{message}</div>}

                {/* Hero */}
                <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-8 text-white shadow-xl">
                    <div className="flex items-center gap-6">
                        <div className="h-24 w-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-4xl font-bold shadow-xl border-2 border-white/40">
                            {initials}
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold mb-1">{loading ? "Loading profile..." : profile.fullName}</h2>
                            <p className="text-white/80 text-base mb-3">{profile.designation || "—"}</p>
                            <div className="flex flex-wrap gap-4 text-sm text-white/80">
                                <span className="flex items-center gap-1.5"><Mail size={14} />{profile.email || "—"}</span>
                                <span className="flex items-center gap-1.5"><Phone size={14} />{profile.phone || "—"}</span>
                                <span className="flex items-center gap-1.5"><IdCard size={14} />ID: {profile.employeeId || "—"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex gap-1 p-3 border-b border-gray-100 overflow-x-auto">
                        {tabs.map(([key, label, TabIcon]) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${activeTab === key ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"
                                    }`}
                            >
                                <TabIcon size={15} /> {label}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        {activeTab === "personal" && (
                            <div className="space-y-5">
                                <SectionTitle icon={User} tone="bg-sky-50 text-sky-600">Personal Details</SectionTitle>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Field label="Full Name" value={profile.fullName} icon={User} tone="text-sky-500" />
                                    <Field label="Email Address" value={profile.email} icon={Mail} tone="text-indigo-500" />
                                    <Field label="Date of Birth" value={fmtDate(profile.dob)} icon={Calendar} tone="text-amber-500" />
                                    <Field label="Gender" value={GENDER_LABEL[profile.gender] || titleCase(profile.gender)} icon={Users} tone="text-violet-500" />
                                    <Field label="Phone Number" value={profile.phone} icon={Phone} tone="text-emerald-500" />
                                </div>

                            </div>
                        )}

                        {activeTab === "employment" && (
                            <div className="space-y-5">
                                <SectionTitle icon={Briefcase} tone="bg-emerald-50 text-emerald-600">Employment Details</SectionTitle>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Field label="Employee ID" value={profile.employeeId} icon={IdCard} tone="text-slate-500" />
                                    <Field label="Department" value={profile.department} icon={Building2} tone="text-emerald-500" />
                                    <Field label="Designation" value={profile.designation} icon={Briefcase} tone="text-sky-500" />
                                    <Field label="Employment Type" value={profile.employmentType} icon={Briefcase} tone="text-blue-500" />
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
