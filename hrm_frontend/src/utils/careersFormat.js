// Shared text/date/salary formatting for the public Careers pages (src/Pages/careers)

// Server errors come back as "404: <reason>"; show just the reason
export const errorText = (error, fallback) =>
  (error?.message || fallback).replace(/^\d{3}:\s*/, "");

export const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatSalary = (min, max) => {
  const fmt = (n) => Number(n).toLocaleString();
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `From ${fmt(min)}`;
  if (max != null) return `Up to ${fmt(max)}`;
  return null;
};
