import React from "react";
import { useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  Users,
  FileText,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Plus,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";

const summaryCards = [
  {
    title: "Active Vacancies",
    value: "0",
    description: "Currently open positions",
    icon: BriefcaseBusiness,
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    title: "Applications",
    value: "0",
    description: "Applications received",
    icon: FileText,
    color: "bg-sky-50 text-sky-600",
  },
  {
    title: "Shortlisted Candidates",
    value: "0",
    description: "Candidates shortlisted",
    icon: Users,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Upcoming Interviews",
    value: "0",
    description: "Interviews scheduled",
    icon: CalendarDays,
    color: "bg-amber-50 text-amber-600",
  },
];

const recruitmentModules = [
  {
    title: "Job Vacancies",
    description: "Create, update, and manage job openings.",
    icon: BriefcaseBusiness,
    path: "/recruitment/vacancies",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    title: "Applications",
    description: "Review applications submitted by candidates.",
    icon: FileText,
    path: "/recruitment/applications",
    color: "bg-sky-50 text-sky-600",
  },
  {
    title: "Candidate Records",
    description: "View and manage candidate application records.",
    icon: Users,
    path: "/recruitment/candidates",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Interview Scheduling",
    description: "Organize interviews and view scheduled sessions.",
    icon: CalendarDays,
    path: "/recruitment/interviews",
    color: "bg-amber-50 text-amber-600",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();

  let user = {};
  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    user = {};
  }

  return (
    <PageLayout
      role="recruiter"
      activePage="Overview"
      title={`Welcome${user.fullName ? `, ${user.fullName}` : ""}!`}
      subtitle="Recruitment overview and hiring activities"
    >
      <div className="space-y-6">
        {/* Welcome section */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-sm md:p-8">
          <div className="relative z-10 max-w-2xl">
            <p className="mb-2 text-sm font-medium text-indigo-100">
              RECRUITMENT WORKSPACE
            </p>
            <h2 className="text-2xl font-bold md:text-3xl">
              Find the right people for your team.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100 md:text-base">
              Manage vacancies, review candidate applications, coordinate
              interviews, and support your hiring process from one place.
            </p>

            <button
              type="button"
              onClick={() => navigate("/recruitment/vacancies")}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              <Plus size={17} />
              Manage Vacancies
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="pointer-events-none absolute -right-8 -top-12 h-56 w-56 rounded-full border-[28px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-20 right-28 h-48 w-48 rounded-full bg-white/5" />
        </section>

        {/* Summary cards */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-800">
              Recruitment Overview
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              A quick overview of your hiring activities.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        {card.title}
                      </p>
                      <p className="mt-3 text-3xl font-bold text-slate-800">
                        {card.value}
                      </p>
                    </div>

                    <div className={`rounded-xl p-3 ${card.color}`}>
                      <Icon size={21} />
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recruitment modules */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-800">
              Recruitment Management
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Open a section to manage that part of recruitment.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {recruitmentModules.map((module) => {
              const Icon = module.icon;

              return (
                <button
                  key={module.title}
                  type="button"
                  onClick={() => navigate(module.path)}
                  className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                >
                  <div className={`rounded-xl p-3 ${module.color}`}>
                    <Icon size={22} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-800 group-hover:text-indigo-700">
                      {module.title}
                    </h3>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {module.description}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600">
                      Open section
                      <ArrowRight
                        size={15}
                        className="transition group-hover:translate-x-1"
                      />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Hiring workflow */}
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
              <TrendingUp size={21} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">
                Recruitment Workflow
              </h2>
              <p className="text-sm text-slate-500">
                Follow applications through the hiring process.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Applications", icon: FileText, color: "text-sky-600" },
              {
                label: "Shortlisting",
                icon: CheckCircle2,
                color: "text-emerald-600",
              },
              {
                label: "Interviews",
                icon: CalendarDays,
                color: "text-amber-600",
              },
              {
                label: "Final Decision",
                icon: Clock3,
                color: "text-violet-600",
              },
            ].map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.label}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"
                >
                  <Icon size={20} className={step.color} />
                  <div>
                    <p className="text-xs text-slate-400">
                      STEP {index + 1}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <p className="text-xs text-slate-400">
          Dashboard figures will be connected to recruitment data when the
          backend API is ready.
        </p>
      </div>
    </PageLayout>
  );
};

export default Dashboard;