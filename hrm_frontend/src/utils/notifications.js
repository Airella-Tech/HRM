/**
 * Shared helpers for the notification bell popup and the HR notifications page.
 * The backend (Employee_Backend /employee/notifications and Recruitment_Backend /recruitment/notifications)
 * returns, per notification:
 *   id, title, message, type, isRead, createdAt, category, link, refId,
 *   subjectName / subjectEmployeeCode / subjectDepartment / subjectJobRole (birthdays)
 */
import {
  CalendarDays,
  Wallet,
  CheckCircle2,
  XCircle,
  Cake,
  Gift,
  Receipt,
  Building2,
  Bell,
  Send,
  Megaphone,
  CalendarClock,
  UserCheck,
  RefreshCw,
  ClipboardCheck,
  UserPlus,
  Handshake,
} from "lucide-react";

export const NOTIFICATIONS_CHANGED = "hrm:notifications-changed";

/** Tell every mounted bell / notifications page to reload now (instead of waiting for the next poll). */
export const announceNotificationsChanged = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));

export const isBirthday = (n) => n.category === "BIRTHDAY" || n.category === "BIRTHDAY_WISH";

// Icon + colour chip per notification category
const KIND = {
  LEAVE_REQUEST: { icon: CalendarDays, chip: "bg-amber-100 text-amber-700" },
  ALLOWANCE_REQUEST: { icon: Wallet, chip: "bg-violet-100 text-violet-700" },
  LEAVE_APPROVED: { icon: CheckCircle2, chip: "bg-emerald-100 text-emerald-700" },
  ALLOWANCE_APPROVED: { icon: CheckCircle2, chip: "bg-emerald-100 text-emerald-700" },
  LEAVE_REJECTED: { icon: XCircle, chip: "bg-red-100 text-red-700" },
  ALLOWANCE_REJECTED: { icon: XCircle, chip: "bg-red-100 text-red-700" },
  BIRTHDAY: { icon: Cake, chip: "bg-pink-100 text-pink-600" },
  BIRTHDAY_WISH: { icon: Gift, chip: "bg-pink-100 text-pink-600" },
  PAYSLIP: { icon: Receipt, chip: "bg-sky-100 text-sky-700" },
  COMPANY_REQUEST: { icon: Building2, chip: "bg-amber-100 text-amber-700" },
  VACANCY_CREATED: { icon: Send, chip: "bg-sky-100 text-sky-700" },
  VACANCY_SUBMITTED: { icon: Send, chip: "bg-amber-100 text-amber-700" },
  VACANCY_APPROVED: { icon: CheckCircle2, chip: "bg-emerald-100 text-emerald-700" },
  VACANCY_REJECTED: { icon: XCircle, chip: "bg-red-100 text-red-700" },
  VACANCY_PUBLISHED: { icon: Megaphone, chip: "bg-sky-100 text-sky-700" },
  VACANCY_CLOSED: { icon: XCircle, chip: "bg-slate-100 text-slate-700" },
  // Candidate notifications
  CANDIDATE_APPLIED: {
    icon: UserPlus,
    chip: "bg-sky-100 text-sky-700",
  },
  CANDIDATE_SHORTLISTED: {
    icon: UserCheck,
    chip: "bg-sky-100 text-sky-700",
  },
  CANDIDATES_AUTO_SHORTLISTED: {
    icon: UserCheck,
    chip: "bg-emerald-100 text-emerald-700",
  },
  // Interview notifications
  INTERVIEW_SCHEDULED: {
    icon: CalendarDays,
    chip: "bg-sky-100 text-sky-700",
  },
  INTERVIEW_RESCHEDULED: {
    icon: CalendarClock,
    chip: "bg-orange-100 text-orange-700",
  },
  INTERVIEWER_ASSIGNED: {
    icon: UserCheck,
    chip: "bg-sky-100 text-sky-700",
  },
  INTERVIEW_STATUS_UPDATED: {
    icon: RefreshCw,
    chip: "bg-sky-100 text-sky-700",
  },
  INTERVIEW_EVALUATION_SUBMITTED: {
    icon: ClipboardCheck,
    chip: "bg-emerald-100 text-emerald-700",
  },
  INTERVIEW_ROUND_APPROVED: {
    icon: CheckCircle2,
    chip: "bg-emerald-100 text-emerald-700",
  },
  INTERVIEW_ROUND_REJECTED: {
    icon: XCircle,
    chip: "bg-red-100 text-red-700",
  },
  CANDIDATE_REJECTED: {
    icon: XCircle,
    chip: "bg-red-100 text-red-700",
  },
  OFFER_CREATED: {
    icon: Handshake,
    chip: "bg-emerald-100 text-emerald-700",
  },
  OFFER_STATUS_UPDATED: {
    icon: Handshake,
    chip: "bg-sky-100 text-sky-700",
  },
  // Role & permission notifications
  ROLE_ASSIGNED: {
    icon: UserCheck,
    chip: "bg-sky-100 text-sky-700",
  },
  ROLES_UPDATED: {
    icon: UserCheck,
    chip: "bg-sky-100 text-sky-700",
  },
  ROLE_REMOVED: {
    icon: XCircle,
    chip: "bg-red-100 text-red-700",
  },
  ROLE_CREATED: {
    icon: CheckCircle2,
    chip: "bg-sky-100 text-sky-700",
  },
  ROLE_PERMISSIONS_UPDATED: {
    icon: RefreshCw,
    chip: "bg-sky-100 text-sky-700",
  },
};
const DEFAULT_KIND = { icon: Bell, chip: "bg-slate-100 text-slate-600" };

export const kindOf = (n) => KIND[n.category] || DEFAULT_KIND;

/** Turns an API row into what the UI renders. */
export const normalizeNotification = (n, role) => ({
  id: n.id,
  title: n.title || "Notification",
  message: n.message || "",
  category: n.category || "GENERAL",
  read: Boolean(n.isRead ?? n.seen ?? n.read),
  createdAt: n.createdAt || null,
  refId: n.refId || null,
  // Birthdays never navigate; everything else opens the page named by the backend.
  // A rejected vacancy opens that vacancy in edit mode instead of a blank form.
  link: isBirthday(n)
    ? null
    : (n.type || n.category) === "VACANCY_REJECTED" && n.refId && String(n.link || "").includes("/recruitment/vacancies")
      ? `/recruitment/vacancies?edit=${n.refId}`
      : n.link || (role === "admin" ? "/admin/companies" : null),
  subject: {
    name: n.subjectName || null,
    employeeId: n.subjectEmployeeCode || null,
    department: n.subjectDepartment || null,
    jobRole: n.subjectJobRole || null,
  },
});

export const topicOf = (n) => {
  const c = n.category || "";
  if (c.startsWith("LEAVE")) return "leave";
  if (c.startsWith("ALLOWANCE")) return "allowance";
  if (isBirthday(n)) return "birthday";
  if (["VACANCY", "INTERVIEW", "CANDIDATE", "OFFER", "ROLE"].some((p) => c.startsWith(p))) return "recruitment";
  return "other";
};

/** "just now", "5 min ago", "3 h ago", "Yesterday", or a date. */
export const timeAgo = (iso) => {
  if (!iso) return "Recently";
  const d = new Date(iso);
  if (isNaN(d)) return "Recently";
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString();
};

/** Short label for the "go to" hint under a clickable notification. */
export const linkLabel = (n) => {
  switch (n.category) {
    case "LEAVE_REQUEST": return "Review leave request";
    case "ALLOWANCE_REQUEST": return "Review allowance request";
    case "LEAVE_APPROVED":
    case "LEAVE_REJECTED": return "Open my leave";
    case "ALLOWANCE_APPROVED":
    case "ALLOWANCE_REJECTED": return "Open my allowance requests";
    case "PAYSLIP": return "Open payslip";
    case "VACANCY_CREATED": return "View vacancy";
    case "VACANCY_SUBMITTED": return "Review vacancy";
    case "VACANCY_APPROVED": return "Open vacancies";
    case "VACANCY_REJECTED": return "Fix and resubmit";
    case "VACANCY_PUBLISHED": return "View vacancies";
    case "VACANCY_CLOSED": return "View vacancies";
    case "CANDIDATE_APPLIED": return "Review applications";
    case "CANDIDATE_SHORTLISTED": return "Schedule interview";
    case "CANDIDATES_AUTO_SHORTLISTED": return "View shortlisted candidates";
    case "INTERVIEW_SCHEDULED": return "View scheduled interview";
    case "INTERVIEW_RESCHEDULED": return "View rescheduled interview";
    case "INTERVIEWER_ASSIGNED": return "View assigned interview";
    case "INTERVIEW_STATUS_UPDATED": return "View interview status";
    case "INTERVIEW_EVALUATION_SUBMITTED": return "View evaluation";
    case "INTERVIEW_ROUND_APPROVED": return "View approved interview round";
    case "INTERVIEW_ROUND_REJECTED": return "View rejected interview round";
    case "ROLE_ASSIGNED":
    case "ROLES_UPDATED": return "Open recruitment";
    case "ROLE_REMOVED": return "Open dashboard";
    case "ROLE_CREATED":
    case "ROLE_PERMISSIONS_UPDATED": return "Open roles & permissions";
    default: return n.link && n.link.startsWith("/admin") ? "Open companies" : "Open";
  }
};

/** Module colour themes matching the enterprise design system. */
export const NOTIF_THEME = {
  admin: {
    header: "from-blue-600 to-blue-700",
    headerSub: "text-blue-100",
    headerIcon: "text-blue-100",
    unreadRow: "bg-blue-50/70 border-blue-100",
    hoverRow: "hover:bg-blue-50",
    link: "text-blue-600 hover:text-blue-800",
    dot: "bg-blue-600",
    tabOn: "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm",
    action: "text-blue-600 hover:text-blue-800",
    ring: "focus:ring-blue-500",
  },
  hr: {
    header: "from-purple-600 to-purple-700",
    headerSub: "text-purple-100",
    headerIcon: "text-purple-100",
    unreadRow: "bg-purple-50/70 border-purple-100",
    hoverRow: "hover:bg-purple-50",
    link: "text-purple-600 hover:text-purple-800",
    dot: "bg-purple-600",
    tabOn: "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-sm",
    action: "text-purple-600 hover:text-purple-800",
    ring: "focus:ring-purple-500",
  },
  employee: {
    header: "from-teal-600 to-teal-700",
    headerSub: "text-teal-100",
    headerIcon: "text-teal-100",
    unreadRow: "bg-teal-50/70 border-teal-100",
    hoverRow: "hover:bg-teal-50",
    link: "text-teal-600 hover:text-teal-800",
    dot: "bg-teal-600",
    tabOn: "bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-sm",
    action: "text-teal-600 hover:text-teal-800",
    ring: "focus:ring-teal-500",
  },
  recruiter: {
    header: "from-indigo-600 to-indigo-700",
    headerSub: "text-indigo-100",
    headerIcon: "text-indigo-100",
    unreadRow: "bg-indigo-50/70 border-indigo-100",
    hoverRow: "hover:bg-indigo-50",
    link: "text-indigo-600 hover:text-indigo-800",
    dot: "bg-indigo-600",
    tabOn: "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-sm",
    action: "text-indigo-600 hover:text-indigo-800",
    ring: "focus:ring-indigo-500",
  },
  recruitment: {
    header: "from-indigo-600 to-indigo-700",
    headerSub: "text-indigo-100",
    headerIcon: "text-indigo-100",
    unreadRow: "bg-indigo-50/70 border-indigo-100",
    hoverRow: "hover:bg-indigo-50",
    link: "text-indigo-600 hover:text-indigo-800",
    dot: "bg-indigo-600",
    tabOn: "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-sm",
    action: "text-indigo-600 hover:text-indigo-800",
    ring: "focus:ring-indigo-500",
  },
};
