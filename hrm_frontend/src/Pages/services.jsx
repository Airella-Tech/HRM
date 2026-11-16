import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Clock,
  CalendarDays,
  DollarSign,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Check,
  Sparkles,
  Building2,
  Layers,
  Zap,
} from "lucide-react";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import CompanyRequestModal from "../components/CompanyRequestModal";

const Services = () => {
  const navigate = useNavigate();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const services = [
    {
      icon: Users,
      title: "Employee Lifecycle Management",
      description: "Centralized employee directory, detailed profiles, role assignments, and lifecycle tracking.",
      features: [
        "Digital employee records & documents",
        "Role-based permission assignment",
        "Department & designation management",
        "Self-service employee profile viewer",
      ],
    },
    {
      icon: Clock,
      title: "Attendance & Time Tracking",
      description: "Automated attendance tracking with real-time GPS coordinate capture and active session timers.",
      features: [
        "GPS clock-in and clock-out logging",
        "Multi-session daily timekeeping",
        "Late arrival and absence detection",
        "Working hour calculations & map links",
      ],
    },
    {
      icon: CalendarDays,
      title: "Leave Management",
      description: "Comprehensive leave management with live balance counters, custom types, and approval chains.",
      features: [
        "Self-service time-off applications",
        "Per-leave-type balance meters",
        "Manager approval & rejection workflows",
        "Auditable leave history logs",
      ],
    },
    {
      icon: DollarSign,
      title: "Payroll & Allowances",
      description: "Automated salary processing with allowances, deductions, and downloadable PDF payslips.",
      features: [
        "Salary structure configuration",
        "Allowance request & proof upload",
        "Automated deduction handling",
        "Printable official salary slips",
      ],
    },
    {
      icon: BarChart3,
      title: "Analytics & Workforce Reporting",
      description: "Actionable dashboards and exportable metrics for data-driven organizational planning.",
      features: [
        "Attendance rates & punctuality metrics",
        "Department headcount summaries",
        "Auditable operational logs",
        "PDF & tabular report generation",
      ],
    },
    {
      icon: ShieldCheck,
      title: "Enterprise Governance & Security",
      description: "Robust data protection with multi-tenant tenancy isolation and comprehensive audit logging.",
      features: [
        "Role-Based Access Control (RBAC)",
        "Audit trail for recruitment & admin actions",
        "Encrypted credential protection",
        "Secure cloud-first infrastructure",
      ],
    },
  ];

  // Implementation Process Steps
  const processSteps = [
    {
      step: "01",
      title: "Setup & Configuration",
      description: "We configure organizational roles, departments, leave quotas, and work shifts based on your needs.",
    },
    {
      step: "02",
      title: "Data Migration",
      description: "Seamlessly import employee profiles, past payroll records, and leave balances with zero data loss.",
    },
    {
      step: "03",
      title: "Training & Support",
      description: "Dedicated onboarding training for HR leaders, managers, and employees with ongoing 24/7 assistance.",
    },
    {
      step: "04",
      title: "Optimization & Growth",
      description: "Continuous performance audits, feature rollouts, and scalability optimizations as your team expands.",
    },
  ];

  // Pricing / Package Details
  const packages = [
    {
      name: "Starter",
      badge: "Small Business",
      price: "$99",
      period: "per month",
      users: "Up to 50 employees",
      description: "Perfect for growing startups and smaller teams looking to streamline day-to-day HR operations.",
      features: [
        "Employee records & profiles (up to 50)",
        "GPS attendance & shift timekeeping",
        "Self-service leave requests & balances",
        "Basic monthly payroll & salary slips",
        "Standard email customer support",
      ],
      popular: false,
    },
    {
      name: "Professional",
      badge: "Most Popular",
      price: "$299",
      period: "per month",
      users: "Up to 200 employees",
      description: "Comprehensive solution designed for medium organizations with multi-department hierarchies.",
      features: [
        "Complete employee management (up to 200)",
        "Advanced attendance & live GPS location map",
        "Multi-tier leave approval chains",
        "Allowance claims & receipt attachment upload",
        "Department-level workforce analytics & reports",
        "Priority 24/7 technical support",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      badge: "Tailored Suite",
      price: "Custom",
      period: "annual billing",
      users: "Unlimited employees",
      description: "Tailored enterprise deployment for large corporations with strict compliance and custom workflows.",
      features: [
        "Unlimited employees & corporate entities",
        "Full ATS recruitment pipeline & applicant screening",
        "Custom payroll formula & statutory deductions",
        "Comprehensive audit logging & role-based RBAC",
        "Dedicated account manager & SLA guarantee",
        "Custom API integrations & single sign-on (SSO)",
      ],
      popular: false,
    },
  ];

  const benefits = [
    {
      title: "Operational Efficiency",
      desc: "Eliminate paper bottlenecks and redundant manual spreadsheets across departments.",
    },
    {
      title: "Financial Transparency",
      desc: "Give employees full visibility into salary calculations, deductions, and claims.",
    },
    {
      title: "Accurate Attendance",
      desc: "Verify workplace attendance reliably through GPS coordinates and active work timers.",
    },
    {
      title: "Faster Onboarding",
      desc: "Seamlessly transition new hires from job applicant to employee record.",
    },
    {
      title: "Regulatory Compliance",
      desc: "Maintain auditable records of leave requests, salary payments, and recruiter decisions.",
    },
    {
      title: "Cloud Agility",
      desc: "Access your HRM workspace securely from any desktop, tablet, or mobile browser.",
    },
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
              "radial-gradient(circle at 75% 25%, rgba(56, 189, 248, 0.4) 0%, transparent 60%)",
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400 block mb-2">
              Platform Modules & Pricing
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Comprehensive Services & Flexible Packages for Every Organization
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
              Explore our core HRM capabilities and transparent package options designed to scale smoothly from emerging startups to large enterprises.
            </p>
          </div>
        </div>
      </section>

      {/* ── Core Services Grid ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-600 block mb-1">
            Core Modules
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Complete Human Resource Management Suite
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Automate time-consuming administrative workflows and give leadership instant operational visibility.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {services.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-lg transition-all duration-200 p-7 flex flex-col justify-between"
              >
                <div>
                  <div className="h-12 w-12 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center mb-5">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-5">{s.description}</p>

                  <ul className="space-y-2 border-t border-slate-100 pt-4">
                    {s.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-xs text-slate-700">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Implementation Process ── */}
      <section className="bg-white border-y border-slate-200/90 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-600 block mb-1">
              Onboarding Journey
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Our 4-Step Implementation Process
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Guaranteed quick rollout with dedicated migration specialists supporting every step.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {processSteps.map((step) => (
              <div
                key={step.step}
                className="relative bg-slate-50 rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="h-12 w-12 rounded-xl bg-sky-600 text-white font-extrabold text-base flex items-center justify-center mb-4 shadow-sm shadow-sky-600/30">
                    {step.step}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Package Details & Flexible Pricing Plans ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-600 block mb-1">
            Packages & Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Flexible Package Plans for Any Team Size
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Transparent pricing with no hidden fees. Select the plan that matches your organization today and scale as you grow.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className={`rounded-2xl border transition-all duration-200 p-8 flex flex-col justify-between relative ${
                pkg.popular
                  ? "bg-white border-sky-500 shadow-xl shadow-sky-600/10 ring-2 ring-sky-500"
                  : "bg-white border-slate-200/90 shadow-sm hover:shadow-md"
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-sky-600 text-white text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md shadow-sky-600/30 flex items-center gap-1.5">
                  <Sparkles size={12} />
                  <span>{pkg.badge}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-2xl font-bold text-slate-900">{pkg.name}</h3>
                  {!pkg.popular && (
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {pkg.badge}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  {pkg.description}
                </p>

                <div className="pb-6 mb-6 border-b border-slate-100">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                      {pkg.price}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/{pkg.period}</span>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg">
                    <Users size={13} />
                    <span>{pkg.users}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Included Features
                  </div>
                  <ul className="space-y-2.5">
                    {pkg.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-xs text-slate-700">
                        <Check size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(true)}
                  className={`w-full py-3 rounded-xl font-semibold text-xs tracking-wide uppercase transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 ${
                    pkg.popular
                      ? "bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/30"
                      : "bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                  }`}
                >
                  <span>Select {pkg.name}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Strategic Benefits ── */}
      <section className="bg-white border-y border-slate-200/90 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-600 block mb-1">
              Measurable Impact
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Business Value You Can Count On
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              How our integrated architecture drives immediate return on investment.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="h-2 w-2 rounded-full bg-sky-500" />
                  <h4 className="font-bold text-sm text-slate-900">{b.title}</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-4">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Call To Action Banner ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-slate-900 text-white rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ready to Upgrade Your HR Operations?
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Join leading organizations transforming their workforce management with our complete HRM platform.
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

export default Services;
