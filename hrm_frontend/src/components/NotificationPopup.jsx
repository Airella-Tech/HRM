import React, { useEffect } from "react";
import { X, Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NotificationItem from "./NotificationItem";
import useNotifications from "../utils/useNotifications";
import { NOTIF_THEME } from "../utils/notifications";

/**
 * The dropdown opened from the header bell. Coloured for the signed-in role (HR = teal/emerald).
 * It stays mounted while closed so the unread badge on the bell keeps updating.
 *
 * Click a notification -> it is marked read and you go to the page it is about
 * (HR: the leave request / allowance request form; employee: their leave / allowance page).
 * Birthday notifications show the person's details and do not navigate.
 */
const NotificationPopup = ({ isOpen, onClose, onUnreadCountChange, role = "hr" }) => {
  const navigate = useNavigate();
  const theme = NOTIF_THEME[role] || NOTIF_THEME.hr;
  const { notifications, loading, markRead, markAllRead } = useNotifications(role);

  const unreadCount = notifications.filter((n) => !n.read).length;
  useEffect(() => { onUnreadCountChange?.(unreadCount); }, [unreadCount]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const handleClick = (n) => {
    markRead(n);
    if (n.link) {
      onClose();
      navigate(n.link);
    }
  };

  const allPage = role === "hr" ? "/hr/notifications" : role === "admin" ? "/admin/companies" : null;
  const allLabel = role === "hr" ? "View all notifications →" : role === "admin" ? "Manage Applications & Companies →" : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed top-16 right-4 sm:right-8 w-[26rem] max-w-[92vw] bg-white rounded-2xl shadow-2xl z-50 max-h-[560px] flex flex-col border border-gray-100">
        {/* Header */}
        <div className={`p-4 flex items-center justify-between bg-gradient-to-r ${theme.header} text-white rounded-t-2xl`}>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/15 rounded-lg"><Bell size={18} className={theme.headerIcon} /></div>
            <div>
              <h3 className="font-bold text-sm">Notifications</h3>
              <p className={`text-[11px] ${theme.headerSub}`}>{unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button onClick={markAllRead} title="Mark all as read"
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-white/90 hover:text-white">
                <CheckCheck size={18} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-white/90 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-2 space-y-1.5">
          {loading && notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading notifications...</div>
          ) : notifications.length > 0 ? (
            notifications.map((n) => (
              <NotificationItem key={n.id} n={n} theme={theme} onClick={handleClick} compact />
            ))
          ) : (
            <div className="p-10 text-center text-gray-400 text-xs">
              <Bell size={28} className="mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-gray-600">No notifications yet</p>
              <p className="text-[11px] text-gray-400 mt-1">You are all up to date!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {allPage && notifications.length > 0 && (
          <div className="p-3 border-t border-gray-100 text-center bg-gray-50 rounded-b-2xl">
            <button onClick={() => { onClose(); navigate(allPage); }}
              className={`text-xs font-semibold transition-colors ${theme.action}`}>
              {allLabel}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationPopup;
