/**
 * Shared pieces for the public Careers pages: layout and notice components.
 */
import React from "react";
import logo from "../../assets/logo.jpg";

export const CareersLayout = ({ children }) => (
  <div className="min-h-screen bg-slate-50 flex flex-col">
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
        <img src={logo} alt="Company logo" className="h-10 w-10 rounded-xl object-cover" />
        <div>
          <p className="text-lg font-bold text-slate-900 leading-tight">Careers</p>
          <p className="text-xs text-slate-500">Join our team</p>
        </div>
      </div>
    </header>

    <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">{children}</main>

    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 text-xs text-slate-400">
        Powered by HRM System
      </div>
    </footer>
  </div>
);

export const Notice = ({ title, text }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 px-6 text-center">
    <p className="text-slate-800 font-semibold">{title}</p>
    {text && <p className="text-slate-500 text-sm mt-1">{text}</p>}
  </div>
);