import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle, Trash2, CalendarDays, Wallet, Receipt, Cake } from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import NotificationItem from "../../components/NotificationItem";
import useNotifications from "../../utils/useNotifications";
import { NOTIF_THEME, isBirthday } from "../../utils/notifications";

const theme = NOTIF_THEME.employee;

const TOPICS = [
  ["all", "All topics"],
  ["leave", "Leave"],
  ["allowance", "Allowance"],
  ["payslip", "Payslip"],
  ["birthday", "Birthdays"],
  ["recruitment", "Recruitment"],
];

const topicOf = (n) =>
  n.category?.startsWith("LEAVE")
    ? "leave"
    : n.category?.startsWith("ALLOWANCE")
      ? "allowance"
      : n.category?.startsWith("PAYSLIP")
        ? "payslip"
        : isBirthday(n)
          ? "birthday"
          : n.category?.startsWith("VACANCY") ||
            n.category?.startsWith("INTERVIEW") ||
            n.category?.startsWith("CANDIDATE") ||
            n.category?.startsWith("OFFER") ||
            n.category?.startsWith("ROLE")
            ? "recruitment"
            : "other";

/**
 * Employee notifications page — all notifications received by the employee, newest first.
 * Clicking a notification navigates to its related page (Leave, Allowance, Payslip, etc.).
 */
const EmployeeNotifications = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [topic, setTopic] = useState("all");
  const { notifications, loading, error, markRead, markAllRead, remove } = useNotifications("employee");

  const unread = notifications.filter((n) => !n.read).length;

  const topicCounts = {
    all: notifications.length,
    leave: notifications.filter((n) => topicOf(n) === "leave").length,
    allowance: notifications.filter((n) => topicOf(n) === "allowance").length,
    payslip: notifications.filter((n) => topicOf(n) === "payslip").length,
    birthday: notifications.filter((n) => topicOf(n) === "birthday").length,
    recruitment: notifications.filter((n) => topicOf(n) === "recruitment").length,
  };

  const visible = notifications.filter(
    (n) =>
      (filter === "all" || (filter === "unread" && !n.read) || (filter === "read" && n.read)) &&
      (topic === "all" || topicOf(n) === topic)
  );

  const open = (n) => {
    markRead(n);
    if (n.link) navigate(n.link);
  };

  return (
    <PageLayout
      role="employee"
      activePage="Notifications"
      title="Notifications"
      subtitle={
        unread > 0
          ? `You have ${unread} unread notification${unread > 1 ? "s" : ""}`
          : "All notifications are up to date"
      }
      actions={
        unread > 0 ? (
          <button
            onClick={markAllRead}
            className="text-sm font-semibold text-teal-600 hover:text-teal-800 transition-colors"
          >
            Mark all as read
          </button>
        ) : null
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Notification Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              key: "all",
              label: "All Notifications",
              count: topicCounts.all,
              icon: Bell,
              color: "from-teal-600 to-teal-700",
              description: "Total notifications",
            },
            {
              key: "leave",
              label: "Leave Updates",
              count: topicCounts.leave,
              icon: CalendarDays,
              color: "from-emerald-600 to-teal-700",
              description: "Leave approvals & requests",
            },
            {
              key: "allowance",
              label: "Allowances",
              count: topicCounts.allowance,
              icon: Wallet,
              color: "from-teal-700 to-teal-800",
              description: "Allowance requests & status",
            },
            {
              key: "payslip",
              label: "Payslip",
              count: topicCounts.payslip,
              icon: Receipt,
              color: "from-teal-800 to-teal-900",
              description: "Salary & payslip releases",
            },
            {
              key: "birthday",
              label: "Birthdays",
              count: topicCounts.birthday,
              icon: Cake,
              color: "from-pink-500 to-rose-600",
              description: "Colleague birthdays",
            },
          ].map((card) => {
            const Icon = card.icon;
            const active = topic === card.key;

            return (
              <button
                key={card.key}
                onClick={() => setTopic(active && card.key !== "all" ? "all" : card.key)}
                className={`relative overflow-hidden text-left rounded-2xl p-5 text-white bg-gradient-to-br ${card.color}
                  shadow-sm hover:shadow-md transition-all duration-300
                  hover:-translate-y-1 ${
                    active ? "ring-2 ring-offset-2 ring-teal-500" : ""
                  }`}
              >
                {/* Decorative circles */}
                <div className="absolute -right-5 -top-5 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
                <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />

                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white/80 uppercase tracking-wide">
                      {card.label}
                    </p>
                    <h3 className="text-3xl font-bold mt-2 tracking-tight">
                      {card.count}
                    </h3>
                    <p className="text-[11px] text-white/70 mt-2 font-medium">
                      {card.description}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/20 shrink-0">
                    <Icon size={20} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex gap-1.5 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200/80 w-fit">
            {[
              ["all", "All"],
              ["unread", `Unread (${unread})`],
              ["read", "Read"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  filter === key
                    ? theme.tabOn
                    : "text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Filter by topic:</span>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="px-4 py-2 border border-slate-200/80 rounded-xl text-xs font-semibold bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer shadow-xs"
            >
              {TOPICS.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && notifications.length === 0 && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl px-4 py-3">
            {error.replace(/^\d{3}:\s*/, "")}
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-3">
          {visible.map((n) => (
            <NotificationItem
              key={n.id}
              n={n}
              theme={theme}
              onClick={open}
              trailing={
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!n.read && (
                    <button
                      onClick={() => markRead(n)}
                      title="Mark as read"
                      className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => remove(n)}
                    title="Delete"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              }
            />
          ))}

          {!loading && visible.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-14 text-center max-w-md mx-auto space-y-3 my-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center mx-auto shadow-2xs">
                <Bell size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {filter === "unread" ? "All caught up!" : "No notifications yet"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                {filter === "unread"
                  ? "You have read all your notifications."
                  : "Updates regarding your leave requests, allowance submissions, and payslips will appear here."}
              </p>
            </div>
          )}

          {loading && notifications.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-teal-600 border-t-transparent" />
              </div>
              <p className="text-sm font-semibold text-slate-800">Loading notifications…</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default EmployeeNotifications;
