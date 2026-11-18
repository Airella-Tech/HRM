import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.jpg";

export const PublicFooter = () => {
  return (
    <footer className="bg-slate-900 text-white border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-white/20 flex-shrink-0 bg-white">
                <img src={logo} alt="HRM System" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="text-lg font-bold text-white block leading-tight">HRM System</span>
                <span className="text-xs text-sky-400 font-medium">Enterprise Workforce Solutions</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Modern multi-tenant human resources management software designed for organizational excellence, seamless attendance, automated payroll, and streamlined hiring.
            </p>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-white transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-white transition-colors">
                  Blog & Insights
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Access & Portals */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
              Access
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Employee Portal Sign In
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  HR Management Workspace
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Administrator Portal
                </Link>
              </li>
              <li>
                <Link to="/createaccount" className="hover:text-white transition-colors">
                  Create Account
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & disclaimer */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} HRM System. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-400 cursor-pointer">Security Overview</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;

