import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  LogIn,
  Shield,
  Users,
  BarChart3,
  CheckCircle2,
  Building2,
  CalendarCheck,
  CreditCard,
  Loader2,
  X,
  KeyRound,
} from "lucide-react";
import logo from "../assets/logo.jpg";
import { authApi } from "../services/api";
import { clearRecruitmentAccessCache } from "../utils/useRecruitmentAccess";

const FEATURES = [
  {
    icon: Shield,
    title: "Role-Based Access Control",
    desc: "Dedicated workspaces for Admin, HR Managers, and Employees.",
  },
  {
    icon: CalendarCheck,
    title: "Automated Attendance & Leave",
    desc: "Real-time GPS clock-in, leave balances, and instant approvals.",
  },
  {
    icon: CreditCard,
    title: "Payroll & Allowances",
    desc: "Salary management, transparent allowances, and one-click payslips.",
  },
  {
    icon: Users,
    title: "End-to-End Recruitment",
    desc: "Job vacancy posting, ATS screening, scheduling, and onboarding.",
  },
];

const STATS = [
  { value: "99.9%", label: "Platform Uptime" },
  { value: "100%", label: "Cloud-Secured" },
  { value: "Multi-Tenant", label: "Architecture" },
];

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // First-time password change modal state
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [changePassError, setChangePassError] = useState("");
  const [changePassLoading, setChangePassLoading] = useState(false);
  const [pendingUserData, setPendingUserData] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const resp = await authApi.login(email, password);
      const data = resp.data ?? resp;
      clearRecruitmentAccessCache();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));

      if (data.mustChangePassword) {
        setPendingUserData(data);
        setTempPassword(password);
        setShowFirstTimeModal(true);
        setIsLoading(false);
        return;
      }

      if (data.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else if (data.role === "HR_MANAGER") {
        navigate("/hr/dashboard");
      } else {
        navigate("/employee/dashboard");
      }
    } catch (err) {
      setIsLoading(false);
      if (err.response) {
        setError(err.response.data?.message || "Invalid email or password.");
      } else if (err.request) {
        setError("Cannot connect to server. Please ensure the backend is running.");
      } else {
        setError(err.message || "An unexpected error occurred.");
      }
    }
  };

  const handleFirstTimeChangeSubmit = async (e) => {
    e.preventDefault();
    setChangePassError("");

    if (newPassword.length < 6) {
      setChangePassError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePassError("New password and confirmation do not match.");
      return;
    }

    setChangePassLoading(true);
    try {
      await authApi.changePassword(tempPassword, newPassword);

      if (pendingUserData) {
        const updatedUser = { ...pendingUserData, mustChangePassword: false };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      setShowFirstTimeModal(false);

      const userRole = pendingUserData?.role;
      if (userRole === "ADMIN") {
        navigate("/admin/dashboard");
      } else if (userRole === "HR_MANAGER") {
        navigate("/hr/dashboard");
      } else {
        navigate("/employee/dashboard");
      }
    } catch (err) {
      setChangePassError(
        err.message || "Failed to update password. Please check credentials and try again."
      );
    } finally {
      setChangePassLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
      {/* ═══════════════ LEFT BRAND PANEL (Desktop) ═══════════════ */}
      <div className="hidden lg:flex lg:w-[50%] xl:w-[48%] flex-col justify-between p-12 xl:p-16 relative bg-[#0b1126] text-white overflow-hidden">
        {/* Subtle background ambient mesh */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(59, 130, 246, 0.25) 0%, transparent 40%), radial-gradient(circle at 85% 80%, rgba(99, 102, 241, 0.2) 0%, transparent 50%)",
          }}
        />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Top: Logo & Platform Name */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl overflow-hidden ring-2 ring-white/10 shadow-lg flex-shrink-0 bg-white">
            <img src={logo} alt="HRM System" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white block">HRM System</span>
            <span className="text-xs text-sky-400 font-medium">Enterprise Workforce Management</span>
          </div>
        </div>

        {/* Middle: Value Prop & Key Feature Highlights */}
        <div className="relative z-10 my-10 space-y-8">
          <div>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-white">
              Unified Platform for Modern Human Resource Management
            </h1>
            <p className="mt-3 text-slate-300 text-sm leading-relaxed max-w-lg">
              Manage employees, process payroll, coordinate shifts, track attendance with GPS, and streamline hiring from candidate screening to job offers.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-lg">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-xs"
                >
                  <div className="h-9 w-9 rounded-lg bg-sky-500/15 border border-sky-400/25 text-sky-400 flex items-center justify-center shrink-0">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{feat.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom: Reliability Stats Bar */}
        <div className="relative z-10 pt-6 border-t border-white/10 grid grid-cols-3 gap-4">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-lg xl:text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════ RIGHT LOGIN FORM PANEL ═══════════════ */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile-only logo */}
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-slate-200 shadow-sm flex-shrink-0">
              <img src={logo} alt="HRM System" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900 leading-none">HRM System</p>
              <p className="text-xs text-slate-500 mt-0.5">Enterprise Portal</p>
            </div>
          </div>

          {/* Form Header */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Sign In to Your Account
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              Enter your credentials to access your organization workspace
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex gap-3 items-start bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm animate-in fade-in">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-semibold text-sm">Authentication Failed</p>
                <p className="text-xs text-rose-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  disabled={isLoading}
                  placeholder="name@company.com"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all disabled:opacity-60"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Example: hr@test.com</p>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  disabled={isLoading}
                  placeholder="••••••••"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  className="w-full pl-10 pr-11 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all disabled:opacity-60"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Example: test123</p>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500 cursor-pointer"
                />
                <span className="text-sm text-slate-600">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99] mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Social Sign-in Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold whitespace-nowrap">
              or continue with
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <FcGoogle size={18} />, label: "Google" },
              { icon: <FaApple size={18} className="text-slate-900" />, label: "Apple" },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
              >
                {btn.icon}
                <span>{btn.label}</span>
              </button>
            ))}
          </div>

          {/* Footer Registration Link */}
          <div className="text-center pt-2">
            <p className="text-sm text-slate-500">
              New employee or company?{" "}
              <Link
                to="/createaccount"
                className="font-bold text-sky-600 hover:text-sky-700 hover:underline transition-colors"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════ FIRST-TIME PASSWORD CHANGE MODAL ═══════════════ */}
      {showFirstTimeModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <KeyRound size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900">Change Temporary Password</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your administrator requires you to set a personal password before continuing.
                </p>
              </div>
            </div>

            {changePassError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {changePassError}
              </div>
            )}

            <form onSubmit={handleFirstTimeChangeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNewPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={changePassLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {changePassLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <span>Set New Password & Continue</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
