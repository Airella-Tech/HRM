import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import CompanyRequestModal from "../components/CompanyRequestModal";

const Contact = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
      setSubmitted(false);
    }, 3500);
  };

  const contactCards = [
    {
      icon: Phone,
      title: "Call Our Support",
      content: "0552223456",
      href: "tel:0552223456",
      description: "Monday to Friday, 9:00 AM – 6:00 PM",
    },
    {
      icon: Mail,
      title: "Email Support",
      content: "info@ruhunahr.com",
      href: "mailto:info@ruhunahr.com",
      description: "We typically reply within 24 business hours",
    },
    {
      icon: MapPin,
      title: "Head Office",
      content: "Galle, Sri Lanka",
      href: "https://maps.app.goo.gl/MSdw16Bxp8TSUfG76",
      description: "25/A Unawatuna, Mihiripenna, Galle",
    },
  ];

  const faqs = [
    {
      question: "What is your standard inquiry response time?",
      answer: "We typically respond to inquiries within 24 hours. For urgent workplace escalations, our hotline is open during office hours.",
    },
    {
      question: "Do you offer tailored demos for HR departments?",
      answer: "Yes. You can request a personalized walkthrough for your organization by clicking 'Request Access' or contacting us directly.",
    },
    {
      question: "How is employee attendance and location secured?",
      answer: "Employee clock-ins capture encrypted GPS coordinates only at the moment of clock-in and clock-out to guarantee privacy and accuracy.",
    },
    {
      question: "Can our company configure custom allowance rules and deduction types?",
      answer: "Yes. HR managers can configure role-wide allowances, job-grade salary assignments, and individual employee claims with proof attachments.",
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
              "radial-gradient(circle at 80% 20%, rgba(56, 189, 248, 0.4) 0%, transparent 60%)",
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400 block mb-2">
              Get in Touch
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              We're Here to Help Your Team Succeed
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
              Reach out to our customer success and onboarding specialists for any questions, partnership inquiries, or platform assistance.
            </p>
          </div>
        </div>
      </section>

      {/* ── Contact Info Cards ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {contactCards.map((info) => {
            const Icon = info.icon;
            return (
              <div
                key={info.title}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-md p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className="h-12 w-12 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-4">
                  <Icon size={22} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">{info.title}</h3>
                <a
                  href={info.href}
                  target={info.icon === MapPin ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="text-sm font-bold text-sky-600 hover:text-sky-700 hover:underline block mb-1.5"
                >
                  {info.content}
                </a>
                <p className="text-xs text-slate-500">{info.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Contact Form & Office Hours ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Form container */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Send Us a Message</h2>
            <p className="text-xs text-slate-500 mb-6">
              Fill in the form below and our team will get back to you shortly.
            </p>

            {submitted && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Thank you! Your message has been sent successfully. We'll be in touch soon.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Your name"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="name@company.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+94 77 123 4567"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Subject <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    placeholder="Inquiry topic"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="4"
                  placeholder="How can our HRM team help you?..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <Send size={15} />
                <span>Send Message</span>
              </button>
            </form>
          </div>

          {/* Office hours & Response times */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Clock size={18} className="text-sky-600" />
                Office Working Hours
              </h3>
              <div className="space-y-3 text-xs">
                {[
                  { day: "Monday – Friday", hours: "9:00 AM – 6:00 PM" },
                  { day: "Saturday", hours: "10:00 AM – 4:00 PM" },
                  { day: "Sunday & Public Holidays", hours: "Closed (Emergency Support Only)" },
                ].map((s) => (
                  <div key={s.day} className="flex justify-between py-2 border-b border-slate-100 last:border-b-0">
                    <span className="font-semibold text-slate-700">{s.day}</span>
                    <span className="text-slate-500">{s.hours}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-6 sm:p-8">
              <h3 className="text-base font-bold text-sky-950 mb-3">Prompt Response Guarantee</h3>
              <p className="text-xs text-sky-800 leading-relaxed mb-4">
                We value your time and prioritize all communications:
              </p>
              <ul className="space-y-2 text-xs text-sky-900 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-sky-600 shrink-0" />
                  <span>Email inquiries answered within 24 business hours.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-sky-600 shrink-0" />
                  <span>Telephone assistance during active office hours.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Location Map Section ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Headquarters Location</h3>
              <p className="text-xs text-slate-500 mt-0.5">25/A Unawatuna, Mihiripenna, Galle, Sri Lanka</p>
            </div>
            <a
              href="https://maps.app.goo.gl/MSdw16Bxp8TSUfG76"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
            >
              <ExternalLink size={14} /> Open in Google Maps
            </a>
          </div>
          <div className="rounded-xl overflow-hidden border border-slate-200 h-80 sm:h-96">
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3961.3286088452306!2d80.76497!3d6.14674!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae38c1d5d5d5d5d%3A0x1234567890!2s25%2FA%20unawatuna%2C%20mihiripenna%2C%20Galle!5e0!3m2!1sen!2slk!4v1642768800000&zoom=15"
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="HRM Office Location"
            />
          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section className="bg-white border-t border-slate-200/90 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-500 mt-1">Quick answers to common questions about our platform</p>
          </div>

          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.question} className="p-5 rounded-xl bg-slate-50 border border-slate-200/80">
                <h4 className="text-sm font-bold text-slate-900 mb-1.5 flex items-center gap-2">
                  <HelpCircle size={15} className="text-sky-600 shrink-0" />
                  {f.question}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed pl-6">{f.answer}</p>
              </div>
            ))}
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

export default Contact;
