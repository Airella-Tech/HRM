import { useState, useEffect } from "react";
import { recruitmentApi } from "../services/api";

let cachedAccess = null;
let fetchPromise = null;
const listeners = new Set();

export const getCachedRecruitmentAccess = () => {
  if (cachedAccess) return cachedAccess;
  try {
    const raw = sessionStorage.getItem("recruitment_my_access");
    if (raw) {
      cachedAccess = JSON.parse(raw);
      return cachedAccess;
    }
  } catch {
    // Ignore — fall through to the caller fetching fresh access
  }
  return null;
};

export const fetchRecruitmentAccess = async (force = false) => {
  const token = localStorage.getItem("token");
  if (!token) {
    cachedAccess = null;
    sessionStorage.removeItem("recruitment_my_access");
    return null;
  }

  if (cachedAccess && !force) return cachedAccess;
  if (fetchPromise && !force) return fetchPromise;

  fetchPromise = recruitmentApi
    .getMyAccess()
    .then((res) => {
      const data = res?.data || {
        fullAccess: false,
        hasRecruitmentAccess: false,
        permissions: [],
        roles: [],
      };
      cachedAccess = data;
      try {
        sessionStorage.setItem("recruitment_my_access", JSON.stringify(data));
      } catch {
        // Ignore — in-memory cache still has the fresh value
      }
      listeners.forEach((fn) => {
        try {
          fn(cachedAccess);
        } catch {
          // Ignore — a listener's own error shouldn't break the others
        }
      });
      return cachedAccess;
    })
    .catch((err) => {
      console.warn("Failed to load recruitment access:", err);
      return (
        cachedAccess || {
          fullAccess: false,
          hasRecruitmentAccess: false,
          permissions: [],
          roles: [],
        }
      );
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
};

export const clearRecruitmentAccessCache = () => {
  cachedAccess = null;
  try {
    sessionStorage.removeItem("recruitment_my_access");
  } catch {
    // Ignore — in-memory cache is already cleared
  }
  listeners.forEach((fn) => {
    try {
      fn(null);
    } catch {
      // Ignore — a listener's own error shouldn't break the others
    }
  });
};

export const useRecruitmentAccess = () => {
  const [access, setAccess] = useState(getCachedRecruitmentAccess);

  useEffect(() => {
    listeners.add(setAccess);
    fetchRecruitmentAccess();
    return () => {
      listeners.delete(setAccess);
    };
  }, []);

  return access;
};

export default useRecruitmentAccess;
