/**
 * useAreaOptions — the areas (HR / Employee / Recruitment) the logged-in user
 * may switch to. Returns an empty array when the user has no switch at all.
 *
 *  - HR managers always get HR and Employee.
 *  - Recruitment is only offered to users who have recruitment access, as decided
 *    by the backend (full access, an assigned recruitment role, or an operational
 *    permission).
 */
import { Briefcase, UserRound, UsersRound } from "lucide-react";
import { useRecruitmentAccess } from "./useRecruitmentAccess";

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

export const useAreaOptions = () => {
  const user = getStoredUser();
  const isHRManager = user?.role === "HR_MANAGER";

  // Shared, cached answer — no request of its own on every page
  const access = useRecruitmentAccess();

  // The backend decides who has recruitment access (full access, an assigned role, or an
  // operational permission). While the answer is still loading, an HR Manager is assumed
  // to have it, so the menu doesn't jump when it arrives.
  const canRecruit = access
    ? access.fullAccess === true || access.hasRecruitmentAccess === true
    : isHRManager;

  if (!isHRManager && !canRecruit) return [];

  return [
    ...(isHRManager
      ? [
          {
            key: "hr",
            label: "HR",
            icon: Briefcase,
            path: "/hr/dashboard",
            active: "bg-teal-500 text-white shadow",
          },
        ]
      : []),
    {
      key: "employee",
      label: "Employee",
      icon: UserRound,
      path: "/employee/dashboard",
      active: "bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow",
    },
    // Recruitment area only shown when the user actually has recruitment access
    ...(canRecruit
      ? [
          {
            key: "recruitment",
            label: "Recruitment",
            icon: UsersRound,
            path: "/recruitment/dashboard",
            active: "bg-primary-600 text-white shadow",
          },
        ]
      : []),
  ];
};

export default useAreaOptions;