import React from "react";
import { ExternalLink } from "lucide-react";
import { isBirthday, kindOf, linkLabel, timeAgo } from "../utils/notifications";

/** Name / employee id / department / job role of the birthday person. */
export const BirthdayDetails = ({ subject, compact }) => {
  const rows = [
    ["Name", subject.name],
    ["Employee ID", subject.employeeId],
    ["Department", subject.department],
    ["Job role", subject.jobRole],
  ];
  return (
    <dl className={`mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg bg-pink-50 border border-pink-100 ${compact ? "p-2" : "p-3"}`}>
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[10px] uppercase tracking-wide text-pink-400 font-semibold">{label}</dt>
          <dd className={`${compact ? "text-[11px]" : "text-xs"} font-semibold text-gray-800 truncate`} title={value || ""}>{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
};

/**
 * One notification. Clickable ones (leave / allowance ...) open their page; birthdays are display-only
 * and show the person's details instead.
 */
const NotificationItem = ({ n, theme, onClick, compact = false, trailing = null }) => {
  const { icon: Icon, chip } = kindOf(n);
  const clickable = !!n.link;
  const birthday = isBirthday(n);

  return (
    <div
      onClick={() => onClick?.(n)}
      role={clickable ? "link" : undefined}
      className={`rounded-xl border transition-all ${compact ? "p-3" : "p-4"} ${
        n.read ? "bg-white border-gray-100" : theme.unreadRow
      } ${clickable ? `cursor-pointer ${theme.hoverRow}` : "cursor-default"}`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-0.5 p-1.5 rounded-lg ${chip}`}><Icon size={compact ? 16 : 18} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`font-bold text-gray-800 ${compact ? "text-xs" : "text-sm"} leading-snug`}>{n.title}</p>
            <div className="flex items-center gap-2 shrink-0">
              {!n.read && <span className={`w-2 h-2 rounded-full ${theme.dot}`} title="Unread" />}
              <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
            </div>
          </div>

          {birthday && n.category === "BIRTHDAY" && n.subject.name ? (
            <BirthdayDetails subject={n.subject} compact={compact} />
          ) : (
            <p className={`text-gray-600 mt-1 leading-snug ${compact ? "text-[11px]" : "text-sm"}`}>{n.message}</p>
          )}

          {clickable && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold mt-2 ${theme.link}`}>
              {linkLabel(n)} <ExternalLink size={11} />
            </span>
          )}
        </div>
        {trailing}
      </div>
    </div>
  );
};

export default NotificationItem;
