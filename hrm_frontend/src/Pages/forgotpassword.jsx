import React, { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.jpg";
import sideImage from "../assets/002.jpg";


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
          A password reset token was generated. Click here to reset your password:{" "}
          <Link to={resetLink} className="underline font-bold text-green-800 hover:text-green-950">
            Reset Password Link
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
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Section */}
      <div className="hidden md:flex w-1/2 bg-gray-900 text-white flex-col justify-center px-10">
        <div className="mb-10">
          <img
            src={sideImage}
            alt="Team working"
            className="rounded-lg shadow-lg object-cover w-full h-auto"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-4 leading-snug">
            Recover your account quickly and securely.
          </h1>
          <p className="text-gray-300">
            We'll help you reset your password in just a few simple steps.
          </p>
        </div>
      </div>

      {/* Right Section (Form) */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 bg-white">
        <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <img
              src={logo}
              alt="HRM logo"
              className="w-12 h-12 mr-2 rounded-full shadow-sm"
              loading="lazy"
            />
            <h2 className="text-3xl font-bold text-gray-800">
              Reset <span className="text-blue-600">Password</span>
            </h2>
          </div>

          {/* Description */}
          <p className="text-center text-gray-600 mb-6 text-sm">
            Enter your email address and we'll send you a link to reset your
            password.
          </p>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Success Message */}
            {successMessage && (
              <div
                className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg"
                role="alert"
              >
                <div className="flex items-start">
                  <span className="text-xl mr-2">✅</span>
                  <div>
                    <p className="font-semibold">Success</p>
                    <p className="text-sm">{successMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
                role="alert"
              >
                <div className="flex items-start">
                  <span className="text-xl mr-2">⚠️</span>
                  <div>
                    <p className="font-semibold">Error</p>
                    <p className="text-sm">{errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address<span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage("");
                }}
                className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="hr@test.com"
                disabled={isLoading}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the email associated with your account
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition transform hover:scale-[1.02] disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>

          {/* Back to Login */}
          <p className="text-center text-sm mt-6">
            Remember your password?{" "}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Back to Login
            </Link>
          </p>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-4">
            © 2025 HRM Web & Mobile Application. All rights reserved.{" "}
            <span className="hover:underline cursor-pointer">
              Terms & Conditions
            </span>{" "}
            |{" "}
            <span className="hover:underline cursor-pointer">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
