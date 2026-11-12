// Shared text/date/salary formatting for the public Careers pages (src/Pages/careers)

// Server errors come back as "404: <reason>"; show just the reason
export const errorText = (error, fallback) =>
  (error?.message || fallback).replace(/^\d{3}:\s*/, "");

export const formatDate = (iso) => {
  if (!iso) return "";
  try {
    const d =
      typeof iso === "string" && !iso.includes("T")
        ? new Date(`${iso}T00:00:00`)
        : new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
};

export const formatSalary = (min, max) => {
  const fmt = (n) => Number(n).toLocaleString();
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `From ${fmt(min)}`;
  if (max != null) return `Up to ${fmt(max)}`;
  return null;
};

const DAY = 24 * 60 * 60 * 1000;

/** Whole days from today until the deadline (0 = closes today). */
export const daysLeft = (deadline) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((new Date(`${deadline}T00:00:00`) - today) / DAY));
};

/** True if the role was published within the last 3 days. */
export const isNew = (publishedAt) =>
  Boolean(publishedAt) && Date.now() - new Date(publishedAt).getTime() < 3 * DAY;
