import React from "react";
import { useLocation } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout";

export default function RecruitmentInterviews() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const view = searchParams.get("view");

  let activePage = "Schedule Interviews";
  let title = "Schedule Interviews";

  if (view === "assign") {
    activePage = "Assign Interviewers";
    title = "Assign Interviewers";
  }

  return (
    <PageLayout
      role="recruiter"
      activePage={activePage}
      title={title}
    >
    </PageLayout>
  );
}