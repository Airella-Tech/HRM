import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Search,
  Calendar,
  User,
  ArrowRight,
  Sparkles,
  Tag,
  Clock,
  X,
} from "lucide-react";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import CompanyRequestModal from "../components/CompanyRequestModal";

const Blog = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [readingPost, setReadingPost] = useState(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const categories = [
    { id: "all", label: "All Insights" },
    { id: "HR Tech", label: "HR Technology" },
    { id: "Leadership", label: "Leadership" },
    { id: "Compliance", label: "Compliance" },
    { id: "Culture", label: "Workplace Culture" },
  ];

  const blogPosts = [
    {
      id: 1,
      title: "The Future of Hybrid Work: Managing Distributed Teams with Precision",
      excerpt:
        "How intelligent attendance tracking, GPS-verified check-ins, and asynchronous leave approval systems empower distributed workforces.",
      author: "Samantha Perera",
      role: "Head of People",
      date: "Oct 12, 2026",
      category: "HR Tech",
      readTime: "5 min read",
      content:
        "As organizations shift towards hybrid models, traditional timecards and physical registries become obsolete. Modern HRM platforms solve this by offering location-verified check-ins, real-time hours tracking, and automated calculation of overtime and weekend differentials. By decentralizing workforce administration and centralizing transparency, companies achieve higher employee satisfaction while retaining ironclad audit integrity.",
    },
    {
      id: 2,
      title: "Streamlining Leave Approvals: Reducing Administrative Bottlenecks",
      excerpt:
        "Why self-service leave counters and automated manager approval chains reduce payroll discrepancies and boost team morale.",
      author: "Kasun Silva",
      role: "Operations Director",
      date: "Sep 28, 2026",
      category: "Compliance",
      readTime: "4 min read",
      content:
        "Manual leave tracking through paperwork and ad-hoc chat messages creates dangerous compliance loopholes. With an automated leave management engine, employees see real-time balance calculations across statutory leave types, while managers receive instant notifications for pending requests. The result is zero dispute over remaining days and a clear paper trail for statutory audits.",
    },
    {
      id: 3,
      title: "Fair & Transparent Compensation: The Power of Automated Pay Sheets",
      excerpt:
        "Building employee trust through transparent salary slips, itemized allowances, and accessible historical compensation records.",
      author: "Dilani Fernando",
      role: "Compensation Lead",
      date: "Sep 15, 2026",
      category: "Leadership",
      readTime: "6 min read",
      content:
        "Nothing impacts employee retention more directly than payroll transparency. Giving team members instant digital access to downloadable, official salary slips that clearly separate basic pay, statutory deductions (EPF/ETF), and reimbursable claims builds trust and completely eliminates monthly payroll inquiry backlogs for HR teams.",
    },
    {
      id: 4,
      title: "Modernizing ATS: From Applicant Screening to Seamless Onboarding",
      excerpt:
        "Connecting candidate tracking directly into employee records to eliminate duplicate data entry and administrative overhead.",
      author: "Rohan Jayawardena",
      role: "Talent Acquisition",
      date: "Aug 30, 2026",
      category: "HR Tech",
      readTime: "4 min read",
      content:
        "Recruitment cannot live in a silo separate from Core HR. When candidate applications, interview evaluations, and offer letters feed directly into an employee record, new hires can be provisioned in minutes rather than days. This unified journey ensures that hiring managers and HR teams share a single source of truth.",
    },
    {
      id: 5,
      title: "Building High-Trust Culture Through Digital Employee Self-Service",
      excerpt:
        "Empowering workers to update their personal credentials, manage bank details, and track performance milestones independently.",
      author: "Nirosha Wickramasinghe",
      role: "Culture Strategist",
      date: "Aug 18, 2026",
      category: "Culture",
      readTime: "5 min read",
      content:
        "Self-service is more than administrative efficiency; it is an organizational signal of trust and respect. When employees have a dedicated portal to view their company record, check their monthly attendance statistics, and request allowances with proof attachments, they feel ownership over their workplace standing.",
    },
    {
      id: 6,
      title: "Statutory Compliance & Security in Cloud-Based HR Architecture",
      excerpt:
        "Key security safeguards, role-based access boundaries, and audit trail strategies for managing sensitive personnel records.",
      author: "Pradeep Mendis",
      role: "Security Architect",
      date: "Aug 02, 2026",
      category: "Compliance",
      readTime: "7 min read",
      content:
        "Personnel data carries strict regulatory and moral privacy requirements. Implementing fine-grained Role-Based Access Control (RBAC), multi-tenant tenant isolation, and detailed immutable audit logs ensures that only authorized officers can inspect candidate resumes, review salary figures, or adjust leave balances.",
    },
  ];

  const filteredPosts = blogPosts.filter((post) => {
    const matchesCategory =
      selectedCategory === "all" || post.category === selectedCategory;
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
              HR Insights & News
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Perspectives on People Operations, Technology & Compliance
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
              Actionable guides, industry trends, and strategic perspectives curated by human resource and operations practitioners.
            </p>
          </div>
        </div>
      </section>

      {/* ── Filter Bar & Search ── */}
      <section className="bg-white border-b border-slate-200/90 py-4 sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  selectedCategory === cat.id
                    ? "bg-sky-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Articles Grid ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        {filteredPosts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 py-16 px-6 text-center max-w-md mx-auto">
            <BookOpen size={36} className="text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No matching articles found</h3>
            <p className="text-xs text-slate-500 mt-1">Try selecting a different category or clearing your search filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredPosts.map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6 sm:p-7">
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-100 text-sky-700">
                      {post.category}
                    </span>
                    <span className="text-xs text-slate-400">{post.readTime}</span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-2 mb-2.5">
                    {post.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-5">
                    {post.excerpt}
                  </p>
                </div>

                <div className="px-6 sm:px-7 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <User size={13} className="text-slate-400" />
                    <span>{post.author}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReadingPost(post)}
                    className="inline-flex items-center gap-1 font-bold text-sky-600 hover:text-sky-700 transition-colors"
                  >
                    <span>Read Article</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── Community Testimonial Insights ── */}
      <section className="bg-white border-y border-slate-200/90 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-600 block mb-1">
              Community Voices
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              What People Are Saying
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote:
                  "The HR technology insights helped our leadership team migrate away from spreadsheets into a streamlined cloud workflow.",
                author: "John Smith",
                role: "Director of HR",
              },
              {
                quote:
                  "Practical, no-fluff tips on remote timekeeping and GPS attendance verification. A great resource for operations leads.",
                author: "Maria Garcia",
                role: "People Operations",
              },
              {
                quote:
                  "Clear analysis of automated allowances and payroll compliance. Saved us dozens of hours on our monthly audit prep.",
                author: "Alex Chen",
                role: "Operations VP",
              },
            ].map((c) => (
              <div
                key={c.author}
                className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between"
              >
                <p className="text-xs text-slate-700 leading-relaxed italic mb-4">
                  "{c.quote}"
                </p>
                <div>
                  <p className="text-xs font-bold text-slate-900">{c.author}</p>
                  <p className="text-[11px] text-slate-500">{c.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Public Footer ── */}
      <PublicFooter />

      {/* Article Detail Reading Modal */}
      {readingPost && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setReadingPost(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700">
                {readingPost.category}
              </span>
              <button
                type="button"
                onClick={() => setReadingPost(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-100"
              >
                Close ✕
              </button>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
              {readingPost.title}
            </h2>
            <div className="flex items-center gap-4 text-xs text-slate-500 mb-6">
              <span>By {readingPost.author}</span>
              <span>·</span>
              <span>{readingPost.date}</span>
              <span>·</span>
              <span>{readingPost.readTime}</span>
            </div>
            <div className="text-sm text-slate-700 leading-relaxed space-y-4">
              <p>{readingPost.content}</p>
              <p className="text-xs text-slate-500 italic pt-4 border-t border-slate-100">
                Published by HRM System Editorial. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      )}

      {isRequestModalOpen && (
        <CompanyRequestModal onClose={() => setIsRequestModalOpen(false)} />
      )}
    </div>
  );
};

export default Blog;
