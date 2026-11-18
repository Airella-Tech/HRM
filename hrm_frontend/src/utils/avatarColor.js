const AVATAR_COLORS = [
  "bg-primary-600",
  "bg-teal-600",
  "bg-green-600",
  "bg-amber-700",
  "bg-orange-600",
  "bg-red-600",
  "bg-rose-600",
  "bg-sky-700",
  "bg-cyan-700",
  "bg-slate-600",
];

export function avatarColorClass(value) {
  const name = String(value ?? "").trim().toLowerCase();
  let hash = 0;

  for (const character of name) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
