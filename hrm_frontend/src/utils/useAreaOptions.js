/**
 * useAreaOptions — the areas (HR / Employee / Recruitment) the logged-in user
 * may switch to. Returns an empty array when the user has no switch at all.
 *
 *  - HR managers always get HR, Employee and Recruitment.
 *  - Everyone else gets Employee, plus Recruitment when they have recruitment access.
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
  const canRecruit =
    access?.hasRecruitmentAccess === true || access?.fullAccess === true;

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
    {
      key: "recruitment",
      label: "Recruitment",
      icon: UsersRound,
      path: "/recruitment/dashboard",
      active: "bg-primary-600 text-white shadow",
    },
  ];
};

export default useAreaOptions;