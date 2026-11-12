/**
 * Vacancy Removal Storage Helper
 * Ensures smooth tracking of removed/archived vacancies in the recruitment pipeline,
 * combining backend API flags with persistent client state (by ID, key, and title).
 */

const KEYS = {
  APPLICATIONS: "hrm_removed_vacancies_applications",
  SHORTLIST: "hrm_removed_vacancies_shortlist",
  REVIEW: "hrm_removed_vacancies_review",
};

function getMap(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function saveMap(key, map) {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch (err) {
    console.error("Failed to save to localStorage:", err);
  }
}

// ── Applications Stage ──────────────────────────────────────────
export function isRemovedFromApplications(vacancy) {
  if (!vacancy) return false;
  if (vacancy.removedFromApplications === true) return true;
  const map = getMap(KEYS.APPLICATIONS);
  const idStr = String(vacancy.id ?? vacancy.vacancyId ?? vacancy.key ?? "");
  const titleStr = vacancy.title ? String(vacancy.title).trim().toLowerCase() : "";
  return Boolean((idStr && map[idStr]) || (titleStr && map[`title:${titleStr}`]));
}

export function getApplicationsRemovedDate(vacancy) {
  if (!vacancy) return null;
  if (vacancy.removedFromApplicationsAt) return vacancy.removedFromApplicationsAt;
  const map = getMap(KEYS.APPLICATIONS);
  const idStr = String(vacancy.id ?? vacancy.vacancyId ?? vacancy.key ?? "");
  const titleStr = vacancy.title ? String(vacancy.title).trim().toLowerCase() : "";
  return map[idStr]?.date || (titleStr && map[`title:${titleStr}`]?.date) || vacancy.updatedAt || null;
}

export function setRemovedFromApplications(vacId, isRemoved = true, meta = {}) {
  const map = getMap(KEYS.APPLICATIONS);
  const idStr = vacId ? String(vacId) : "";
  const titleStr = meta.title ? String(meta.title).trim().toLowerCase() : "";

  if (isRemoved) {
    const entry = { date: new Date().toISOString() };
    if (idStr) map[idStr] = entry;
    if (titleStr) map[`title:${titleStr}`] = entry;
  } else {
    if (idStr) delete map[idStr];
    if (titleStr) delete map[`title:${titleStr}`];
  }
  saveMap(KEYS.APPLICATIONS, map);
}

// ── Shortlist Stage ─────────────────────────────────────────────
export function isRemovedFromShortlist(vacancy) {
  if (!vacancy) return false;
  if (vacancy.removedFromShortlist === true) return true;
  const map = getMap(KEYS.SHORTLIST);
  const idStr = String(vacancy.id ?? vacancy.vacancyId ?? vacancy.key ?? "");
  const titleStr = vacancy.title ? String(vacancy.title).trim().toLowerCase() : "";
  return Boolean((idStr && map[idStr]) || (titleStr && map[`title:${titleStr}`]));
}

export function getShortlistRemovedDate(vacancy) {
  if (!vacancy) return null;
  if (vacancy.removedFromShortlistAt) return vacancy.removedFromShortlistAt;
  const map = getMap(KEYS.SHORTLIST);
  const idStr = String(vacancy.id ?? vacancy.vacancyId ?? vacancy.key ?? "");
  const titleStr = vacancy.title ? String(vacancy.title).trim().toLowerCase() : "";
  return map[idStr]?.date || (titleStr && map[`title:${titleStr}`]?.date) || vacancy.updatedAt || null;
}

export function setRemovedFromShortlist(vacId, isRemoved = true, meta = {}) {
  const map = getMap(KEYS.SHORTLIST);
  const idStr = vacId ? String(vacId) : "";
  const titleStr = meta.title ? String(meta.title).trim().toLowerCase() : "";

  if (isRemoved) {
    const entry = { date: new Date().toISOString() };
    if (idStr) map[idStr] = entry;
    if (titleStr) map[`title:${titleStr}`] = entry;
  } else {
    if (idStr) delete map[idStr];
    if (titleStr) delete map[`title:${titleStr}`];
  }
  saveMap(KEYS.SHORTLIST, map);
}

// ── Review Stage ────────────────────────────────────────────────
export function isRemovedFromReview(vacancy) {
  if (!vacancy) return false;
  if (vacancy.removedFromReview === true) return true;
  const map = getMap(KEYS.REVIEW);
  const idStr = String(vacancy.id ?? vacancy.vacancyId ?? vacancy.key ?? "");
  const titleStr = vacancy.title ? String(vacancy.title).trim().toLowerCase() : "";
  return Boolean((idStr && map[idStr]) || (titleStr && map[`title:${titleStr}`]));
}

export function getReviewRemovedDate(vacancy) {
  if (!vacancy) return null;
  if (vacancy.removedFromReviewAt) return vacancy.removedFromReviewAt;
  const map = getMap(KEYS.REVIEW);
  const idStr = String(vacancy.id ?? vacancy.vacancyId ?? vacancy.key ?? "");
  const titleStr = vacancy.title ? String(vacancy.title).trim().toLowerCase() : "";
  return map[idStr]?.date || (titleStr && map[`title:${titleStr}`]?.date) || vacancy.updatedAt || null;
}

export function setRemovedFromReview(vacId, isRemoved = true, meta = {}) {
  const map = getMap(KEYS.REVIEW);
  const idStr = vacId ? String(vacId) : "";
  const titleStr = meta.title ? String(meta.title).trim().toLowerCase() : "";

  if (isRemoved) {
    const entry = { date: new Date().toISOString() };
    if (idStr) map[idStr] = entry;
    if (titleStr) map[`title:${titleStr}`] = entry;
  } else {
    if (idStr) delete map[idStr];
    if (titleStr) delete map[`title:${titleStr}`];
  }
  saveMap(KEYS.REVIEW, map);
}
