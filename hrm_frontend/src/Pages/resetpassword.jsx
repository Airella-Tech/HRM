import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2, Loader2, KeyRound } from "lucide-react";
import logo from "../assets/logo.jpg";
import { authApi } from "../services/api";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setErrorMessage("Reset token is missing in the URL. Please request a new link.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await authApi.resetPassword(token, password);
      setSuccessMessage("Password reset successfully! Redirecting to sign in...");
      setTimeout(() => navigate("/login"), 2500);
    } catch (error) {
      console.error("Reset password error:", error);
      setIsLoading(false);
      setErrorMessage(error.message || "Failed to reset password.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 text-slate-900 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-xl p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl overflow-hidden ring-1 ring-slate-200 shadow-sm mx-auto mb-3">
            <img src={logo} alt="HRM System" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Set New Password
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Create a secure new password for your account.
          </p>
        </div>

        {successMessage && (
          <div className="flex gap-3 items-start bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm mb-5">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
            <div>
              <p className="font-semibold text-xs uppercase tracking-wider">Success</p>
              <p className="text-xs text-emerald-700 mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="flex gap-3 items-start bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm mb-5">
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-semibold text-xs uppercase tracking-wider">Error</p>
              <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type={showPass ? "text" : "password"}
                required
                value={password}
                disabled={isLoading || !token}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage("");
                }}
                className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all disabled:opacity-60"
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type={showConfirm ? "text" : "password"}
                required
                value={confirmPassword}
                disabled={isLoading || !token}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrorMessage("");
                }}
                className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all disabled:opacity-60"
                placeholder="Repeat new password"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !token}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99] mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Updating password...</span>
              </>
            ) : (
              "Save New Password"
            )}
          </button>
        </form>

        <div className="pt-6 mt-6 border-t border-slate-100 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
