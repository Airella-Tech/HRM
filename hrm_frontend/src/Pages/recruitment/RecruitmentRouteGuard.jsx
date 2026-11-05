import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  useRecruitmentAccess,
  fetchRecruitmentAccess,
} from "../../utils/useRecruitmentAccess";

const getFallbackDashboard = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user?.role === "HR_MANAGER") return "/hr/dashboard";
    if (user?.role === "ADMIN") return "/admin/dashboard";
    return "/employee/dashboard";
  } catch {
    return "/employee/dashboard";
  }
};

const RecruitmentRouteGuard = ({ children, requiredAny = [] }) => {
  // Cached access: when it's already known, the page shows immediately (no flash)
  const shared = useRecruitmentAccess();

  // Fallback for the very first load, or when the cache is empty
  const [fetched, setFetched] = useState(undefined);
  useEffect(() => {
    let cancelled = false;
    fetchRecruitmentAccess().then((result) => {
      if (!cancelled) setFetched(result || false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const access = shared || fetched || null;

  if (!access) {
    // Not logged in, or the access request failed
    if (fetched === false) return <Navigate to="/login" replace />;
    // First load only: keep the page background instead of a white flash
    return <div className="h-screen bg-slate-50" />;
  }

  // Check if user has recruitment access (must have assigned roles or operational permissions)
  const hasAssignedRole =
    (Array.isArray(access.roles) && access.roles.length > 0) ||
    (Array.isArray(access.permissions) &&
      access.permissions.some((p) => p !== "RECRUITMENT_ROLE_ADMIN"));

  if (!access.fullAccess && !hasAssignedRole && !access.hasRecruitmentAccess) {
    return <Navigate to={getFallbackDashboard()} replace />;
  }

  const permissions = Array.isArray(access.permissions) ? access.permissions : [];

  if (
    !access.fullAccess &&
    requiredAny.length > 0 &&
    !requiredAny.some((permission) => permissions.includes(permission))
  ) {
    return <Navigate to="/recruitment/dashboard" replace />;
  }

  return children;
};

export default RecruitmentRouteGuard;
