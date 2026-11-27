import React from "react";
import { ExternalLink } from "lucide-react";
import { isBirthday, kindOf, linkLabel, timeAgo } from "../utils/notifications";

/** Name / employee id / department / job role of the birthday person. */
export const BirthdayDetails = ({ subject, compact, theme }) => {
  const rows = [
    ["Name", subject.name],
    ["Employee ID", subject.employeeId],
    ["Department", subject.department],
    ["Job role", subject.jobRole],
  ];
  return (
    <dl className={`mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg ${theme?.birthdayBox || "bg-teal-50 border-teal-100"} ${compact ? "p-2" : "p-3"}`}>
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className={`text-[10px] uppercase tracking-wide font-semibold ${theme?.birthdayLabel || "text-teal-700"}`}>{label}</dt>
          <dd className={`${compact ? "text-[11px]" : "text-xs"} font-semibold text-slate-800 truncate`} title={value || ""}>{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
};

/**
 * One notification item. Styled according to the HR sky color scheme and typography.
 * Clickable ones open their page; birthdays show person details.
 */
const NotificationItem = ({ n, theme, onClick, compact = false, trailing = null }) => {
  const { icon: Icon, chip } = kindOf(n);
  const clickable = !!n.link;
  const birthday = isBirthday(n);
  const unreadClass = theme?.unreadRow || "bg-sky-50/50 border-sky-200/90 hover:bg-sky-50/80 hover:border-sky-300 shadow-2xs";
  const dotClass = theme?.dot || "bg-sky-500 ring-4 ring-sky-100";

  return (
    <div
      onClick={() => onClick?.(n)}
      role={clickable ? "link" : undefined}
      className={`group relative rounded-xl border transition-all duration-150 ${compact ? "p-3.5" : "p-4"} ${n.read
        ? "bg-white border-slate-200/80 hover:bg-slate-50/60 hover:border-slate-300"
        : `${unreadClass} shadow-2xs`
        } ${clickable ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-start gap-3">
        {/* Category Icon Badge */}
        <div className={`flex-shrink-0 mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center border shadow-2xs ${chip}`}>
          <Icon size={16} />
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-[13px] font-semibold text-slate-900 group-hover:text-sky-900 leading-snug tracking-tight">
              {n.title}
            </h4>
            <div className="flex items-center gap-1.5 shrink-0">
              {!n.read && (
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} title="Unread" />
              )}
              <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                {timeAgo(n.createdAt)}
              </span>
            </div>
          </div>

          {birthday && n.category === "BIRTHDAY" && n.subject.name ? (
            <BirthdayDetails subject={n.subject} compact={compact} theme={theme} />
          ) : (
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {n.message}
            </p>
          )}

          {clickable && (
            <div className="mt-2.5 flex items-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-sky-700 bg-sky-50 group-hover:bg-sky-100 border border-sky-200/70 shadow-2xs transition-all">
                <span>{linkLabel(n)}</span>
                <ExternalLink size={11} className="opacity-70 group-hover:opacity-100 transition-opacity" />
              </span>
            </div>
          )}
        </div>

        {trailing}
      </div>
    </div>
  );
};

export default NotificationItem;
