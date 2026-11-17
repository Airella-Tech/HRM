import React, { useState } from "react";
import heroImg from "../assets/hrm-hero-illustration.png";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  LogIn,
  ArrowRight,
  Handshake,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Users,
  CalendarCheck,
  CreditCard,
} from "lucide-react";
import CompanyRequestModal from "../components/CompanyRequestModal";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";

const Hero = () => {
  const navigate = useNavigate();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const pillars = [
    {
      title: "Corporate Collaboration",
      desc: "Connect and empower teams with seamless cross-departmental coordination, shared workflows, and streamlined hierarchy.",
      icon: Handshake,
      badge: "Team Synergy",
    },
    {
      title: "Strategic Partnerships",
      desc: "Plan sustainable workforce growth, monitor attendance, automate compliant payroll calculations, and review real-time reports.",
      icon: TrendingUp,
      badge: "Operational Growth",
    },
    {
      title: "Infinite Possibilities",
      desc: "Scale your organization with an integrated multi-tenant cloud HRM platform engineered for modern agility and reliability.",
      icon: Sparkles,
      badge: "Next-Gen Tech",
    },
  ];

  const highlights = [
    "GPS-Verified Mobile & Web Attendance",
    "Automated Payroll & Allowance Processing",
    "Full-Lifecycle Recruitment & ATS Management",
    "Enterprise-Grade Role-Based Access Control",
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      {/* ── Public Navbar ── */}
      <PublicNavbar onRequestApplication={() => setIsRequestModalOpen(true)} />

      {/* ── Hero Section ── */}
      <section className="relative bg-[#0b1126] text-white overflow-hidden py-16 sm:py-24 lg:py-32">
        {/* Hero Background Image with subtle cinematic overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={heroImg}
            alt="HRM Hero"
            className="w-full h-full object-cover opacity-20 filter saturate-150"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070b1a] via-[#0b1126]/90 to-[#070b1a]/70" />
        </div>

        {/* Ambient mesh glow */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none opacity-30"
          style={{ background: "radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-300 text-xs font-semibold mb-6 backdrop-blur-xs">
              <ShieldCheck size={14} className="text-sky-400" />
              <span>Multi-Tenant Enterprise HRM Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-white">
              We Are Your Strategic Partners in{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-400">
                Human Resources
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
              Streamline organizational operations, employee onboarding, attendance tracking with GPS, automated payroll processing, and recruitment on one unified platform.
            </p>

            {/* Feature bullets */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl text-xs sm:text-sm text-slate-300">
              {highlights.map((h) => (
                <div key={h} className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-sky-400 shrink-0" />
                  <span>{h}</span>
                </div>
              ))}
            </div>

            {/* Hero CTAs */}
            <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-md shadow-sky-600/30 transition-all active:scale-[0.99]"
              >
                <Building2 size={16} />
                <span>Request Application</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm shadow-md transition-all active:scale-[0.99]"
              >
                <LogIn size={16} />
                <span>Sign In to Portal</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/about")}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-white/20 hover:border-white/40 text-white font-semibold text-sm transition-colors"
              >
                <span>Learn More</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pillars / Feature Cards Section ── */}
      <section className="relative z-20 -mt-10 sm:-mt-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300 p-7 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="h-12 w-12 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors duration-200">
                      <Icon size={22} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{card.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{card.desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => navigate("/about")}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors"
                  >
                    <span>Read about our approach</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Modules Overview Banner ── */}
      <section className="py-16 bg-white border-y border-slate-200/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              A Complete HRM Solution in One Ecosystem
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Designed to connect employees, HR administrators, and recruitment leaders seamlessly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="h-10 w-10 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center mb-4">
                <Users size={20} />
              </div>
              <h4 className="font-bold text-base text-slate-900 mb-1">Employee Self-Service</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Check-in with GPS verification, apply for leave, track monthly allowance claims, and download official monthly salary slips.
              </p>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-xs font-semibold text-sky-600 hover:underline"
              >
                Employee Portal →
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <CalendarCheck size={20} />
              </div>
              <h4 className="font-bold text-base text-slate-900 mb-1">HR Operations</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Manage employee lifecycle records, configure custom allowance rules, approve leaves, and process monthly salaries.
              </p>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                HR Workspace →
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                <CreditCard size={20} />
              </div>
              <h4 className="font-bold text-base text-slate-900 mb-1">Recruitment & Hiring</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Publish job vacancies, screen incoming resumes, schedule interview rounds, score candidates, and issue formal job offers.
              </p>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-xs font-semibold text-indigo-700 hover:underline"
              >
                Recruitment Suite →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Public Footer ── */}
      <PublicFooter />

      {/* Company Registration Request Modal */}
      {isRequestModalOpen && (
        <CompanyRequestModal onClose={() => setIsRequestModalOpen(false)} />
      )}
    </div>
  );
};

export default Hero;
