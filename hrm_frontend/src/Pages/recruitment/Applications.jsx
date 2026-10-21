import React from "react";
import { useLocation } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout";

export default function RecruitmentApplications() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const view = searchParams.get("view");

  let activePage = "View Applications";
  let title = "View Applications";

  if (view === "review") {
    activePage = "Review Applications";
    title = "Review Applications";
  } else if (view === "shortlist") {
    activePage = "Shortlist Candidates";
    title = "Shortlist Candidates";
  } else if (view === "resumes") {
    activePage = "Download Resumes";
    title = "Download Resumes";
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