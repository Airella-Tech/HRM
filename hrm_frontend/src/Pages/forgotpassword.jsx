import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import logo from "../assets/logo.jpg";
import { authApi } from "../services/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const response = await authApi.forgotPassword(email);
      const token = response.data;
      const resetLink = `/reset-password?token=${token}`;
      setSuccessMessage(
        <span>
          A password reset link was generated.{" "}
          <Link to={resetLink} className="underline font-bold text-sky-700 hover:text-sky-900">
            Click here to set a new password
          </Link>
        </span>
      );
      setEmail("");
      setIsLoading(false);
    } catch (error) {
      console.error("Forgot password error:", error);
      setIsLoading(false);
      setErrorMessage(error.message || "An error occurred.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 text-slate-900 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-xl p-6 sm:p-8">
        {/* Logo & Heading */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl overflow-hidden ring-1 ring-slate-200 shadow-sm mx-auto mb-3">
            <img src={logo} alt="HRM System" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Reset Your Password
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Enter your account email address and we'll generate your secure password reset link.
          </p>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="flex gap-3 items-start bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm mb-5">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
            <div>
              <p className="font-semibold text-xs uppercase tracking-wider">Reset Link Ready</p>
              <div className="text-xs text-emerald-700 mt-0.5">{successMessage}</div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex gap-3 items-start bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm mb-5">
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-semibold text-xs uppercase tracking-wider">Request Failed</p>
              <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage("");
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all disabled:opacity-60"
                placeholder="name@company.com"
                disabled={isLoading}
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Hint: Enter the email you use to sign in</p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99] mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Sending link...</span>
              </>
            ) : (
              "Send Reset Link"
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

export default ForgotPassword;
