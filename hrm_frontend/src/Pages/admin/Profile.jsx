import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  Shield,
  Edit2,
  Save,
  X,
  Lock,
  Bell,
  Briefcase,
  Award,
  Settings,
  MapPin,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";

const ProfilePage = ({ role = "admin" }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [isEditing, setIsEditing] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  const isAdmin = role === "admin";
  const ringColor = isAdmin ? "focus:ring-indigo-500/20 focus:border-indigo-500" : "focus:ring-sky-500/20 focus:border-sky-500";

  const defaultProfile = isAdmin
    ? {
      fullName: "System Administrator",
      email: "admin@hrmsystem.com",
      phone: "+92 300 9876543",
      role: "ADMIN",
      privileges: [
        "Full System Access",
        "Tenant Onboarding & Approval",
        "Role & Permission Administration",
        "Global Policy Configuration",
      ],
      systemInfo: {
        lastLogin: "2026-01-21 09:00 AM",
        accountCreated: "2020-01-01",
        accessLevel: "Super Administrator",
      },
    }
    : {
      fullName: "HR Manager",
      email: "hr.manager@company.com",
      phone: "+92 300 1234567",
      address: "123 Business Street, Karachi",
      employeeId: "HR001",
      designation: "HR Manager",
      department: "Human Resources",
      joiningDate: "2020-01-15",
      experience: "6 years",
      education: "MBA in Human Resource Management",
      certifications: ["SHRM-CP", "PHR", "CIPD Level 5"],
      skills: [
        "Recruitment",
        "Employee Relations",
        "Payroll Management",
        "Performance Appraisal",
      ],
    };

  const [profileData, setProfileData] = useState(defaultProfile);

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (s) {
      const u = JSON.parse(s);
      const allowed = isAdmin
        ? u.role === "ADMIN"
        : u.role === "HR_MANAGER" || u.role === "ADMIN";
      if (!allowed) {
        navigate("/unauthorized");
        return;
      }
      setUser(u);
      setProfileData((prev) => ({
        ...prev,
        fullName: u.fullName || prev.fullName,
        email: u.email || prev.email,
      }));
    } else navigate("/login");
  }, [navigate, isAdmin]);

  const handleSave = () => {
    setIsEditing(false);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 2500);
  };

  const field = (label, key, type = "text", disabled = false) => (
    <div key={key}>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={profileData[key] || ""}
        disabled={disabled || !isEditing}
        onChange={(e) => setProfileData({ ...profileData, [key]: e.target.value })}
        className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 ${ringColor} disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed transition-all font-medium text-slate-900`}
      />
    </div>
  );

  const tabs = isAdmin
    ?[
  ["personal", "Personal Information"],
  ["security", "Security & System Access"],
]
    : [
  ["personal", "Personal Information"],
  ["employment", "Employment Record"],
  ["qualifications", "Qualifications & Skills"],
  ["settings", "Preferences & Security"],
];

if (!user) return null;

return (
    <PageLayout
      role={role}
      activePage="Profile"
      title={isAdmin ? "Administrator Profile" : "My Profile"}
      subtitle="Manage your identity, credentials, and platform privileges"
      actions={
        isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            >
              <Save size={14} />
              <span>Save Changes</span>
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
            >
              <X size={14} />
              <span>Cancel</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all"
          >
            <Edit2 size={13} />
            <span>Edit Profile</span>
          </button>
        )
      }
    >
      <div className="space-y-6 animate-fade-in">
        {successToast && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl text-xs flex items-center gap-2.5 shadow-2xs">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="font-semibold">Profile details saved successfully!</span>
          </div>
        )}

        {/* Profile Hero Banner */}
        <div
          className="relative overflow-hidden rounded-2xl p-7 text-white shadow-xl"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #172554 100%)" }}
        >
          <div
            className="absolute -top-12 -right-12 w-64 h-64 rounded-full pointer-events-none opacity-20"
            style={{ background: "radial-gradient(circle, #818cf8 0%, transparent 70%)" }}
          />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="h-20 w-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl font-bold shadow-xl border border-white/20 shrink-0 text-white">
              {profileData.fullName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[11px] font-semibold text-indigo-200 mb-1.5">
                <ShieldCheck size={13} className="text-indigo-300" />
                <span>{isAdmin ? profileData.systemInfo?.accessLevel : profileData.designation}</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">{profileData.fullName}</h2>
              <div className="flex flex-wrap gap-4 text-xs text-indigo-200/80 mt-2">
                <span className="flex items-center gap-1.5">
                  <Mail size={13} />
                  <span>{profileData.email}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone size={13} />
                  <span>{profileData.phone}</span>
                </span>
                {!isAdmin && (
                  <span className="flex items-center gap-1.5">
                    <Shield size={13} />
                    <span>ID: {profileData.employeeId}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs + Content */}
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
          <div className="flex gap-1.5 p-2 border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeTab === key
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "personal" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {field("Full Name", "fullName")}
                {field("Email Address", "email", "email")}
                {field("Phone Number", "phone", "tel")}
                {isAdmin ? field("System Role", "role", "text", true) : field("Address", "address")}
                {isAdmin && (
                  <div className="md:col-span-2 pt-2 border-t border-slate-100">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                      Assigned Platform Privileges
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {profileData.privileges.map((p, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200/80 text-indigo-700 rounded-xl text-xs font-semibold shadow-2xs"
                        >
                          <CheckCircle2 size={13} className="text-indigo-600" />
                          <span>{p}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "employment" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {field("Employee ID", "employeeId", "text", true)}
                {field("Designation", "designation")}
                {field("Department", "department")}
                {field("Joining Date", "joiningDate", "date", true)}
                {field("Experience", "experience")}
              </div>
            )}

            {activeTab === "qualifications" && (
              <div className="space-y-6">
                {field("Education", "education")}
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Professional Certifications
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profileData.certifications.map((c, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-semibold"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Skills & Competencies
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profileData.skills.map((s, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {(activeTab === "security" || activeTab === "settings") && (
              <div className="space-y-5 max-w-2xl">
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-200/60">
                    <KeyRound size={17} className="text-indigo-600" />
                    <h3 className="font-bold text-sm text-slate-900">Account Security & Credentials</h3>
                  </div>
                  {isAdmin && activeTab === "security" && (
                    <div className="space-y-2 mb-4 text-xs">
                      {[
                        ["Last Session Login", profileData.systemInfo?.lastLogin],
                        ["Account Provisioned", profileData.systemInfo?.accountCreated],
                        ["Authorization Level", profileData.systemInfo?.accessLevel],
                      ].map(([l, v]) => (
                        <div
                          key={l}
                          className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs"
                        >
                          <span className="text-slate-500 font-medium">{l}</span>
                          <span className="font-bold text-slate-800">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2.5">
                    <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all">
                      Change Master Password
                    </button>
                    <button className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-semibold shadow-2xs transition-colors">
                      Enable Multi-Factor Auth (MFA)
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-200/60">
                    <Bell size={17} className="text-indigo-600" />
                    <h3 className="font-bold text-sm text-slate-900">System Notification Subscriptions</h3>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      "System alerts and critical security updates",
                      "Tenant registration & onboarding notifications",
                      "Administrative audit events",
                      "Daily summary email digests",
                    ].map((p, i) => (
                      <label key={i} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked={i < 3}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span className="text-xs text-slate-700 font-medium">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export const AdminProfile = () => <ProfilePage role="admin" />;
export const HRProfile = () => <ProfilePage role="hr" />;
export default AdminProfile;
