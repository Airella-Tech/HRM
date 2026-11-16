import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lightbulb,
  ShieldCheck,
  Award,
  Users,
  Leaf,
  Target,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import CompanyRequestModal from "../components/CompanyRequestModal";

const About = () => {
  const navigate = useNavigate();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const values = [
    {
      title: "Innovation",
      description: "We constantly innovate to deliver automated, cutting-edge workflows that solve real workplace challenges.",
      icon: Lightbulb,
    },
    {
      title: "Integrity & Trust",
      description: "We operate with total transparency, robust security, and deep respect for organizational confidentiality.",
      icon: ShieldCheck,
    },
    {
      title: "Excellence",
      description: "We hold ourselves to the highest technical and operational standards, delivering reliable HRM performance.",
      icon: Award,
    },
    {
      title: "Customer Centricity",
      description: "Your organizational success is our benchmark. We design tools that empower HR leaders and employees alike.",
      icon: Users,
    },
    {
      title: "Sustainability",
      description: "We foster paperless, cloud-first operations that drive environmental responsibility and efficiency.",
      icon: Leaf,
    },
    {
      title: "Collaborative Teamwork",
      description: "We believe shared insight and seamless team communication produce extraordinary organizational results.",
      icon: Target,
    },
  ];

  const reasons = [
    { title: "Enterprise Technology Stack", desc: "Built with a high-performance, modern multi-tenant cloud architecture." },
    { title: "Intuitive User Experience", desc: "Clean interfaces designed to minimize employee onboarding and training overhead." },
    { title: "All-in-One Workforce Suite", desc: "From GPS attendance and leave balances to multi-round recruitment and payroll." },
    { title: "Role-Based Data Security", desc: "Rigorous authorization safeguarding sensitive employee and payroll records." },
    { title: "Agile Scalability", desc: "Seamlessly expands alongside your organization from startup to enterprise fleet." },
    { title: "Transparent Audit & Reporting", desc: "Detailed audit trails and exportable compliance reports available on demand." },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      {/* ── Public Navbar ── */}
      <PublicNavbar onRequestApplication={() => setIsRequestModalOpen(true)} />

      {/* ── Header Banner ── */}
      <section className="bg-[#0b1126] text-white py-16 sm:py-20 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 20%, rgba(56, 189, 248, 0.4) 0%, transparent 60%)",
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400 block mb-2">
              Who We Are
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Transforming Workforce Management with Innovation & Excellence
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
              We empower organizations worldwide to build cohesive, high-performing teams through unified workforce operations, transparent payroll, and automated recruitment.
            </p>
          </div>
        </div>
      </section>

      {/* ── Mission & Vision ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Mission */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8 sm:p-10">
            <div className="h-12 w-12 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center mb-6">
              <Sparkles size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              At HRM System, we are dedicated to revolutionizing human capital management. Our mission is to deliver intuitive, cloud-native tools that remove operational friction, streamline time-consuming workflows, and cultivate engagement.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              We believe effective HR infrastructure is the bedrock of modern enterprises. By combining secure multi-tenant cloud engineering with thoughtful design, we help companies focus on what matters most: their people.
            </p>
          </div>

          {/* Vision */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8 sm:p-10">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
              <Target size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Vision</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              To be the most dependable and intelligent workforce management solution provider, enabling businesses across industries to unlock their full organizational potential.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              We envision a future where HR workflows—from candidate application and interview scheduling to GPS clock-in, leave approvals, and pay slip delivery—are completely unified and transparent.
            </p>
          </div>
        </div>
      </section>

      {/* ── Core Values ── */}
      <section className="bg-white border-y border-slate-200/90 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-600 block mb-1">
              Guiding Principles
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Our Core Values
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              The fundamental standards that guide our platform architecture and service.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 hover:bg-white hover:shadow-md transition-all duration-200"
                >
                  <div className="h-10 w-10 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center mb-4">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{v.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{v.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-600 block mb-1">
            Proven Capability
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Why Modern Teams Rely on HRM System
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Engineered to remove friction and provide real-time operational clarity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((r) => (
            <div
              key={r.title}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <h4 className="font-bold text-sm text-slate-900">{r.title}</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-7">{r.desc}</p>
            </div>
          ))}
        </div>

        {/* Call to action card */}
        <div className="mt-16 bg-slate-900 text-white rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ready to Upgrade Your HR Operations?
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Experience the clarity and power of unified workforce management today.
            </p>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.99]"
              >
                Sign In to Portal
              </button>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(true)}
                className="px-6 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm shadow-md transition-all active:scale-[0.99]"
              >
                Request Application
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Public Footer ── */}
      <PublicFooter />

      {isRequestModalOpen && (
        <CompanyRequestModal onClose={() => setIsRequestModalOpen(false)} />
      )}
    </div>
  );
};

export default About;
