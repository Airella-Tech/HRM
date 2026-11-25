import React from "react";
import { Eye } from "lucide-react";

/**
 * Standard "View" button for tables and cards across the Recruitment module.
 * Soft indigo pill, same size as the other row actions (Publish, Close, Submit...).
 * Use label="View Progress" etc. when the page needs a different word.
 */
export default function ViewButton({
  label = "View",
  title,
  onClick,
  disabled = false,
  className = "",
  ...rest
}) {
  return (
    <button
      type="button"
      title={title || label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    >
      <Eye size={14} />
      {label}
    </button>
  );
}