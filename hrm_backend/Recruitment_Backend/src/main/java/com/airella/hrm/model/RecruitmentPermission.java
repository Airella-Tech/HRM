package com.airella.hrm.model;

/**
 * The fixed list of things a recruitment role can be allowed to do.
 * HR managers create roles by picking from this list.
 */
public enum RecruitmentPermission {
    VACANCY_VIEW("View vacancies", "See job vacancies and their status"),
    VACANCY_MANAGE("Manage vacancies", "Create, edit, close and delete job vacancies"),
    VACANCY_APPROVE("Approve vacancies", "Approve or reject a vacancy before it is published"),
    CANDIDATE_VIEW("View candidates", "See applications and candidate profiles"),
    CANDIDATE_SCREEN("Screen candidates", "Shortlist, reject and move applications between stages"),
    INTERVIEW_MANAGE("Manage interviews", "Schedule interviews and assign interviewers"),
    INTERVIEW_EVALUATE("Submit evaluations", "Submit evaluations for interviews assigned to the user"),
    OFFER_MANAGE("Manage offers", "Prepare and send job offers"),
    OFFER_APPROVE("Approve offers", "Give final hiring approval on offers"),
    REPORT_VIEW("View reports", "See recruitment reports and statistics");

    private final String label;
    private final String description;

    RecruitmentPermission(String label, String description) {
        this.label = label;
        this.description = description;
    }

    public String getLabel() { return label; }
    public String getDescription() { return description; }
}