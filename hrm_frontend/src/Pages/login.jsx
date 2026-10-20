import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // <-- Import useNavigate
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import logo from "../assets/logo.jpg";
import sideImage from "../assets/002.jpg";
import axios from "axios"; // <-- Import axios

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate(); // <-- Initialize the navigate hook

  // --- THIS IS THE CORRECTED FUNCTION ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    const loginPayload = {
      email: email,
      password: password,
    };

    try {
      // Send the POST request to your login endpoint
      const response = await axios.post(
        "http://localhost:5001/api/hrm/login",
        loginPayload
      );

      // If login is successful (HTTP 200 OK)
      console.log("Login successful:", response.data);
      alert("Login successful! Welcome " + response.data.fullName);

      // Store user data in localStorage (optional, but good for sessions)
      localStorage.setItem("user", JSON.stringify(response.data));

      // Redirect to a dashboard page
      navigate("/dashboard"); // <-- Or any page you want to go to after login

    } catch (error) {
      // If login fails (e.g., HTTP 401 Unauthorized)
      console.error("Login failed:", error);
      alert("Invalid email or password. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Section (No changes) */}
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
            Unlock your employees’ full potential today.
          </h1>
          <p className="text-gray-300">
            Let’s make your HR processes effortless and smarter than ever.
          </p>
        </div>
      </div>

      {/* Right Section (Form changes) */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 bg-white">
        <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
          {/* Logo (No changes) */}
          <div className="flex items-center justify-center mb-8">
            <img
              src={logo}
              alt="HRM logo"
              className="w-12 h-12 mr-2 rounded-full shadow-sm"
              loading="lazy"
            />
            <h2 className="text-3xl font-bold text-gray-800">
              Log<span className="text-blue-600">In</span>
            </h2>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}> {/* <-- This now calls the new function */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address<span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
                required // <-- Added for validation
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password<span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                required // <-- Added for validation
              />
            </div>

            {/* Remember Me / Forgot Password (No changes) */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2 accent-blue-600"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember Me
              </label>
              <a href="#" className="text-blue-600 hover:underline">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition transform hover:scale-[1.02]"
            >
              Login
            </button>
          </form>

          {/* Divider (No changes) */}
          <div className="flex items-center my-6">
            <hr className="flex-grow border-gray-300" />
            <span className="px-2 text-gray-500 text-sm">Or login with</span>
            <hr className="flex-grow border-gray-300" />
          </div>

          {/* Social Buttons (No changes) */}
          <div className="flex gap-3">
            <button className="w-1/2 border border-gray-300 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition">
              <FcGoogle className="text-xl" />
              <span className="text-gray-700 font-medium">Google</span>
            </button>

            <button className="w-1/2 border border-gray-300 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition">
              <FaApple className="text-2xl text-black" />
              <span className="text-gray-700 font-medium">Apple</span>
            </button>
          </div>

          {/* Footer (No changes) */}
          <p className="text-center text-sm mt-6">
            You’re new in here?{" "}
            <Link to="/createaccount" className="text-blue-600 hover:underline font-medium">
              Create Account
            </Link>
          </p>

          <p className="text-center text-xs text-gray-400 mt-4">
            © 2025 HRM Web & Mobile Application. All rights reserved.{" "}
            <span className="hover:underline cursor-pointer">Terms & Conditions</span> |{" "}
            <span className="hover:underline cursor-pointer">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;