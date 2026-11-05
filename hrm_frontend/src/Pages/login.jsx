import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import {
  Eye, EyeOff, Mail, Lock, AlertCircle, LogIn,
  Shield, Users, BarChart3, TrendingUp, CheckCircle,
} from "lucide-react";
import logo from "../assets/logo.jpg";
import { authApi } from "../services/api";
import { clearRecruitmentAccessCache } from "../utils/useRecruitmentAccess";

/* ─── Tiny floating orb ─── */
const Orb = ({ size, x, y, delay, dur }) => (
  <div
    className="absolute rounded-full pointer-events-none"
    style={{
      width: size, height: size, left: `${x}%`, top: `${y}%`,
      background: "radial-gradient(circle, rgba(99,102,241,0.35) 0%, rgba(139,92,246,0.1) 70%, transparent 100%)",
      animation: `orbFloat ${dur}s ease-in-out ${delay}s infinite alternate`,
    }}
  />
);

const ORBS = [
  { size: 280, x: -8,  y: -5,  delay: 0,   dur: 8  },
  { size: 180, x: 60,  y: 60,  delay: 1.5, dur: 7  },
  { size: 120, x: 80,  y: 5,   delay: 0.5, dur: 9  },
  { size: 90,  x: 10,  y: 75,  delay: 2,   dur: 6  },
  { size: 60,  x: 50,  y: 30,  delay: 3,   dur: 10 },
];

const FEATURES = [
  { icon: Shield,    title: "Role-Based Access",  desc: "Admin · HR Manager · Employee" },
  { icon: Users,     title: "Team Management",    desc: "Departments & employee records"  },
  { icon: BarChart3, title: "Smart Analytics",    desc: "Payroll · Attendance · Reports"  },
];

const STATS = [["99.9%","Uptime SLA"],["500+","Companies"],["50K+","Employees"]];

/* ───────────────────────── Main Component ───────────────────────── */
const Login = () => {
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPass,     setShowPass]     = useState(false);
  const [rememberMe,   setRememberMe]   = useState(false);
  const [error,        setError]        = useState("");
  const [isLoading,    setIsLoading]    = useState(false);
  const [ready,        setReady]        = useState(false);
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

  useEffect(() => { const t = setTimeout(() => setReady(true), 80); return () => clearTimeout(t); }, []);

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
        // HR managers go straight to the HR dashboard; they can switch to the
        // Employee dashboard from the toggle in the header.
        navigate("/hr/dashboard");
      } else {
        navigate("/employee/dashboard");
      }
    } catch (err) {
      setIsLoading(false);
      if      (err.response) setError(err.response.data?.message || "Invalid email or password.");
      else if (err.request)  setError("Cannot connect to server. Please ensure the backend is running.");
      else                   setError(err.message || "An unexpected error occurred.");
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
      setChangePassError(err.message || "Failed to update password. Please check credentials and try again.");
    } finally {
      setChangePassLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes orbFloat {
          from { transform: translateY(0)   scale(1);    opacity: .22; }
          to   { transform: translateY(-40px) scale(1.12); opacity: .35; }
        }
        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        @keyframes shimmerText {
          0%   { background-position: -300% center; }
          100% { background-position:  300% center; }
        }
        @keyframes pulseDot {
          0%,100% { opacity:1; transform:scale(1);   }
          50%      { opacity:.5; transform:scale(1.4); }
        }
        .anim-1 { animation: fadeSlideUp .6s ease both; }
        .anim-2 { animation: fadeSlideUp .6s .15s ease both; }
        .anim-3 { animation: fadeSlideUp .6s .3s  ease both; }
        .shimmer {
          background: linear-gradient(90deg,#c7d2fe,#a5b4fc,#818cf8,#a5b4fc,#c7d2fe);
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmerText 4s linear infinite;
        }
        .pulse-dot { animation: pulseDot 2s ease infinite; }
        .card-hover { transition: all .25s ease; }
        .card-hover:hover { transform: translateX(4px); background: rgba(255,255,255,.08) !important; }
        .btn-primary {
          background: linear-gradient(135deg,#6366f1,#7c3aed);
          transition: all .25s ease;
        }
        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg,#4f46e5,#6d28d9);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(99,102,241,.45);
        }
        .input-field {
          background: #f8faff;
          border: 1.5px solid #e2e8f4;
          transition: all .2s ease;
        }
        .input-field:focus {
          background: #fff;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,.12);
          outline: none;
        }
      `}</style>

      <div className="min-h-screen flex" style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>

        {/* ═══════════════ LEFT PANEL ═══════════════ */}
        <div
          className="hidden lg:flex lg:w-[55%] xl:w-1/2 flex-col justify-between p-10 xl:p-14 relative overflow-hidden"
          style={{ background: "linear-gradient(155deg,#04091a 0%,#080f24 45%,#0c1a3a 100%)" }}
        >
          {/* Grid lines */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "linear-gradient(rgba(99,102,241,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.08) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }} />

          {/* Floating orbs */}
          {ORBS.map((o, i) => <Orb key={i} {...o} />)}

          {/* ── Logo ── */}
          <div className={`relative z-10 flex items-center gap-3 ${ready ? "anim-1" : "opacity-0"}`}>
            <div className="w-11 h-11 rounded-2xl overflow-hidden ring-2 ring-indigo-500/30 shadow-xl shadow-indigo-900/40 flex-shrink-0">
              <img src={logo} alt="HRM" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-white font-bold text-base leading-none">HRM System</p>
              <p className="text-indigo-400 text-xs mt-0.5 font-medium">Human Resource Management</p>
            </div>
          </div>

          {/* ── Hero ── */}
          <div className={`relative z-10 ${ready ? "anim-2" : "opacity-0"}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/10 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
              <span className="text-indigo-300 text-xs font-semibold tracking-wide">Trusted by 500+ companies worldwide</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-4">
              Unlock your team's<br />
              <span className="shimmer">full potential</span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-md mb-8">
              Streamline HR operations with intelligent automation, real-time analytics, and seamless collaboration tools.
            </p>

            {/* Feature cards */}
            <div className="space-y-3">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="card-hover flex items-center gap-4 rounded-2xl px-5 py-4 cursor-default"
                  style={{
                    background: "rgba(255,255,255,.04)",
                    border: "1px solid rgba(255,255,255,.08)",
                    animationDelay: `${.35 + i * .1}s`,
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,rgba(99,102,241,.3),rgba(139,92,246,.15))" }}>
                    <f.icon size={17} className="text-indigo-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{f.title}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{f.desc}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow shadow-emerald-400/50 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* ── Stats ── */}
          <div className={`relative z-10 flex items-center gap-10 ${ready ? "anim-3" : "opacity-0"}`}>
            {STATS.map(([val, label]) => (
              <div key={label}>
                <p className="text-2xl font-bold text-white">{val}</p>
                <p className="text-slate-500 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════ RIGHT PANEL ═══════════════ */}
        <div
          className="flex-1 flex items-center justify-center p-6 sm:p-10 relative overflow-hidden"
          style={{ background: "linear-gradient(145deg,#f5f7ff 0%,#eef1fd 100%)" }}
        >
          {/* Subtle decorative blobs */}
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle,rgba(99,102,241,.15),transparent 70%)", transform: "translate(30%,-30%)" }} />
          <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle,rgba(167,139,250,.12),transparent 70%)", transform: "translate(-30%,30%)" }} />

          <div className={`w-full max-w-[420px] relative z-10 ${ready ? "anim-2" : "opacity-0"}`}>

            {/* Mobile logo */}
            <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-indigo-400/30">
                <img src={logo} alt="HRM" className="w-full h-full object-cover" />
              </div>
              <p className="text-slate-800 font-bold text-xl">HRM System</p>
            </div>

            {/* ── Card ── */}
            <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-indigo-100/60" style={{ border: "1px solid rgba(99,102,241,.1)" }}>

              {/* Icon + Heading */}
              <div className="mb-7">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-indigo-300/30"
                  style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
                  <LogIn size={24} className="text-white" />
                </div>
                <h2 className="text-[1.6rem] font-extrabold text-slate-900 leading-tight">Welcome back</h2>
                <p className="text-slate-500 text-sm mt-1">Sign in to your HRM account to continue</p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex gap-3 items-start bg-red-50 border border-red-200 text-red-700 px-4 py-3.5 rounded-2xl mb-5 text-sm anim-1">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Login Failed</p>
                    <p className="text-red-500 text-xs mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="email" type="email" required autoComplete="email"
                      value={email} disabled={isLoading}
                      placeholder="you@company.com"
                      onChange={e => { setEmail(e.target.value); setError(""); }}
                      className="input-field w-full pl-11 pr-4 py-3 rounded-xl text-sm text-slate-800 placeholder-slate-400 disabled:opacity-60"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 ml-1">Hint: hr@test.com</p>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="password" type={showPass ? "text" : "password"} required autoComplete="current-password"
                      value={password} disabled={isLoading}
                      placeholder="••••••••"
                      onChange={e => { setPassword(e.target.value); setError(""); }}
                      className="input-field w-full pl-11 pr-12 py-3 rounded-xl text-sm text-slate-800 placeholder-slate-400 disabled:opacity-60"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowPass(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 ml-1">Hint: test123</p>
                </div>

                {/* Remember / Forgot */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                      onClick={() => setRememberMe(v => !v)}
                      className="w-4 h-4 rounded-md flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
                      style={{
                        border: rememberMe ? "none" : "1.5px solid #cbd5e1",
                        background: rememberMe ? "linear-gradient(135deg,#6366f1,#7c3aed)" : "white",
                      }}
                    >
                      {rememberMe && <CheckCircle size={11} className="text-white" />}
                    </div>
                    <span className="text-sm text-slate-600">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">Forgot password?</Link>
                </div>

                {/* Sign In button */}
                <button
                  type="submit" disabled={isLoading}
                  className="btn-primary w-full text-white font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing in…
                    </>
                  ) : (
                    <><LogIn size={16} /> Sign In</>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">or continue with</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Social */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: <FcGoogle size={18} />, label: "Google" },
                  { icon: <FaApple size={18} className="text-slate-800" />, label: "Apple" },
                ].map(btn => (
                  <button key={btn.label}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-slate-700 transition-all"
                    style={{ border: "1.5px solid #e2e8f0", background: "white" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#f8faff"; e.currentTarget.style.borderColor = "#c7d2fe"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
                  >
                    {btn.icon} {btn.label}
                  </button>
                ))}
              </div>

              <p className="text-center text-sm text-slate-500 mt-6">
                New to HRM?{" "}
                <Link to="" className="text-indigo-600 hover:text-indigo-800 font-bold transition-colors">Request for Application</Link>
              </p>
            </div>

            <p className="text-center text-[11px] text-slate-400 mt-5">
              © 2026 HRM System · All rights reserved ·{" "}
              <span className="hover:text-indigo-500 cursor-pointer transition-colors">Terms</span>
              {" · "}
              <span className="hover:text-indigo-500 cursor-pointer transition-colors">Privacy Policy</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── First-Time Password Change Modal ── */}
      {showFirstTimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-indigo-100 animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-300/40 bg-gradient-to-br from-indigo-500 to-violet-600">
                <Lock size={26} className="text-white" />
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                First-Time Security Action
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2">Change Temporary Password</h2>
              <p className="text-xs text-slate-500 mt-1">
                You logged in with an auto-generated temporary password. Please set a new secure password to activate your account.
              </p>
            </div>

            {changePassError && (
              <div className="flex gap-2 items-start bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-4 text-xs">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{changePassError}</span>
              </div>
            )}

            <form onSubmit={handleFirstTimeChangeSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Temporary Password</label>
                <input
                  type="password"
                  disabled
                  value={tempPassword}
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 chars)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={changePassLoading || !newPassword || !confirmPassword}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl text-xs shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {changePassLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Updating Password...
                  </>
                ) : (
                  "Set Password & Proceed to Dashboard"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;