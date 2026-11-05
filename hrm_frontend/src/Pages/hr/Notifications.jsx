import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle, Trash2 } from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import NotificationItem from "../../components/NotificationItem";
import useNotifications from "../../utils/useNotifications";
import { NOTIF_THEME, isBirthday } from "../../utils/notifications";

const theme = NOTIF_THEME.hr;

const TOPICS = [
  ["all", "All topics"],
  ["leave", "Leave"],
  ["allowance", "Allowance"],
  ["birthday", "Birthdays"],
  ["recruitment", "Recruitment"],
];

const topicOf = (n) =>
  n.category?.startsWith("LEAVE")
    ? "leave"
    : n.category?.startsWith("ALLOWANCE")
      ? "allowance"
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
        <button onClick={markAllRead} className="text-sm font-semibold text-teal-600 hover:text-teal-800 transition-colors">Mark all as read</button>
      ) : null}
    >
      <div className="space-y-5">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-fit">
            {[["all", "All"], ["unread", `Unread (${unread})`], ["read", "Read"]].map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${filter === key ? theme.tabOn : "text-gray-600 hover:bg-gray-100"}`}>
                {label}
              </button>
            ))}
          </div>
          <select value={topic} onChange={(e) => setTopic(e.target.value)}
            className={`px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 ${theme.ring} w-fit`}>
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
            <div className="text-center py-20 text-gray-400">
              <Bell size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">{filter === "unread" ? "All notifications have been read" : "No notifications yet"}</p>
            </div>
          )}
          {loading && notifications.length === 0 && <div className="text-center py-20 text-gray-400">Loading notifications…</div>}
        </div>
      </div>
    </PageLayout>
  );
};

export default Notifications;
