import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle, Trash2 } from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import NotificationItem from "../../components/NotificationItem";
import useNotifications from "../../utils/useNotifications";
import { NOTIF_THEME, topicOf } from "../../utils/notifications";

const theme = NOTIF_THEME.hr;

const TOPICS = [
  ["all", "All topics"],
  ["leave", "Leave"],
  ["allowance", "Allowance"],
  ["birthday", "Birthdays"],
  ["recruitment", "Recruitment"],
];


/**
 * HR notifications page — everything that reached the header bell, newest first.
 * Clicking a leave / allowance notification opens that request's form; birthdays only show the
 * person's details (name, employee id, department, job role).
 */
const Notifications = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [topic, setTopic] = useState("all");
  const { notifications, loading, error, markRead, markAllRead, remove } = useNotifications("hr");

  const unread = notifications.filter((n) => !n.read).length;
  const topicCounts = {
  all: notifications.length,
  leave: notifications.filter((n) => topicOf(n) === "leave").length,
  allowance: notifications.filter((n) => topicOf(n) === "allowance").length,
  birthday: notifications.filter((n) => topicOf(n) === "birthday").length,
  recruitment: notifications.filter((n) => topicOf(n) === "recruitment").length,
};
  const visible = notifications.filter(
    (n) => (filter === "all" || (filter === "unread" && !n.read) || (filter === "read" && n.read)) && (topic === "all" || topicOf(n) === topic)
  );

  const open = (n) => {
    markRead(n);
    if (n.link) navigate(n.link);
  };

  return (
    <PageLayout
      role="hr"
      activePage="Notifications"
      title="Notifications"
      subtitle={unread > 0 ? `You have ${unread} unread notification${unread > 1 ? "s" : ""}` : "All notifications read"}
      actions={unread > 0 ? (
        <button onClick={markAllRead} className="text-sm font-semibold text-sky-600 hover:text-sky-800 transition-colors">Mark all as read</button>
      ) : null}
    >
      <div className="space-y-5">
                {/* Notification Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

          {[
            {
              key: "all",
              label: "Total Notifications",
              count: topicCounts.all,
              icon: Bell,
              color: "from-sky-600 to-sky-700",
              description: "All notifications",
            },
            {
              key: "leave",
              label: "Leave",
              count: topicCounts.leave,
              icon: CheckCircle,
              color: "from-sky-500 to-sky-600",
              description: "Leave notifications",
            },
            {
              key: "allowance",
              label: "Allowance",
              count: topicCounts.allowance,
              icon: CheckCircle,
              color: "from-sky-600 to-sky-700",
              description: "Allowance notifications",
            },
            {
              key: "birthday",
              label: "Birthdays",
              count: topicCounts.birthday,
              icon: Bell,
              color: "from-sky-400 to-sky-500",
              description: "Birthday notifications",
            },
            {
              key: "recruitment",
              label: "Recruitment",
              count: topicCounts.recruitment,
              icon: CheckCircle,
              color: "from-sky-700 to-sky-800",
              description: "Recruitment notifications",
            },
          ].map((card) => {
            const Icon = card.icon;
            const active = topic === card.key;

            return (
              <button
                key={card.key}
                onClick={() => setTopic(active && card.key !== "all" ? "all" : card.key)}
                className={`relative overflow-hidden text-left rounded-xl p-5 text-white bg-gradient-to-br ${card.color}
                  shadow-sm hover:shadow-lg transition-all duration-300
                  hover:-translate-y-1 ${active ? "ring-2 ring-offset-2 ring-slate-400" : ""}`}
              >
                {/* Decorative circles */}
                <div className="absolute -right-5 -top-5 w-24 h-24 rounded-full bg-white/10" />
                <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/10" />

                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80">
                      {card.label}
                    </p>
                    <h3 className="text-3xl font-bold mt-2">
                      {card.count}
                    </h3>
                    <p className="text-xs text-white/70 mt-2">
                      {card.description}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/20">
                    <Icon size={21} />
                  </div>
                </div>
              </button>
            );
          })}

        </div>
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 w-fit">
            {[["all", "All"], ["unread", `Unread (${unread})`], ["read", "Read"]].map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${filter === key ? theme.tabOn : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"}`}>
                {label}
              </button>
            ))}
          </div>
          <select value={topic} onChange={(e) => setTopic(e.target.value)}
            className={`px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:border-sky-500 focus:ring-sky-500/10 w-fit`}>
            {TOPICS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>

        {error && notifications.length === 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error.replace(/^\d{3}:\s*/, "")}</div>
        )}

        {/* List */}
        <div className="space-y-3">
          {visible.map((n) => (
            <NotificationItem
              key={n.id}
              n={n}
              theme={theme}
              onClick={open}
              trailing={
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {!n.read && (
                    <button onClick={() => markRead(n)} title="Mark as read"
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><CheckCircle size={16} /></button>
                  )}
                  <button onClick={() => remove(n)} title="Delete"
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                </div>
              }
            />
          ))}
          {!loading && visible.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              <Bell size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">{filter === "unread" ? "All notifications have been read" : "No notifications yet"}</p>
            </div>
          )}
          {loading && notifications.length === 0 && <div className="text-center py-20 text-slate-400">Loading notifications…</div>}
        </div>

        
      </div>
    </PageLayout>
  );
};

export default Notifications;
