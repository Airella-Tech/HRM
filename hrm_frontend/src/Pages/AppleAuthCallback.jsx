import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const AppleAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAppleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const idToken = searchParams.get("id_token");

        if (!code && !idToken) {
          throw new Error("No authorization code or ID token received");
        }

        console.log("Apple OAuth callback — not connected yet, redirecting to login.");
        throw new Error("Apple OAuth is not connected yet. Please use email and password to sign in.");
      } catch (error) {
        console.error("Apple authentication error:", error);
        setError(error.message || "Authentication failed. Please try again.");
        setTimeout(() => navigate("/login?error=apple_auth_failed"), 3000);
      }
    };

    handleAppleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-4">
        {error ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Authentication Failed
            </h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <p className="text-xs text-gray-500 mb-6">
              Redirecting back to login in a few seconds...
            </p>
            <button
              onClick={() => window.location.href = "/login"}
              className="w-full bg-black text-white py-2.5 rounded-lg hover:bg-gray-900 transition"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="mb-6 flex justify-center">
              <svg
                className="animate-spin h-12 w-12 text-gray-800"
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
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Authenticating with Apple...
            </h1>
            <p className="text-gray-600 text-sm">
              Please wait while we complete your login securely
            </p>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                This process typically takes a few seconds. Do not close this window.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppleAuthCallback;
