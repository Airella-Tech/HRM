import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { recruitmentApi } from "../../services/api";

const RecruitmentRouteGuard = ({
  children,
  requiredAny = [],
}) => {
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    recruitmentApi
      .getMyAccess()
      .then((response) => {
        if (cancelled) return;

        const data =
          response?.data?.data ??
          response?.data ??
          response;

        setAccess({
          fullAccess: data?.fullAccess === true,
          hasRecruitmentAccess:
            data?.hasRecruitmentAccess === true,
          permissions: Array.isArray(data?.permissions)
            ? data.permissions
            : [],
        });
      })
      .catch((error) => {
        console.error("Failed to verify recruitment access:", error);

        if (!cancelled) {
          setAccess(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="p-6">Checking access...</div>;
  }

  if (!access?.hasRecruitmentAccess) {
    return <Navigate to="/login" replace />;
  }

  if (
    !access.fullAccess &&
    requiredAny.length > 0 &&
    !requiredAny.some((permission) =>
      access.permissions.includes(permission)
    )
  ) {
    return <Navigate to="/recruitment/dashboard" replace />;
  }

  return children;
};

export default RecruitmentRouteGuard;