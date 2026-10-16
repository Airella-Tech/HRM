package com.airella.hrm.model;

public enum RecruitmentPermission {

    // Vacancies (Member 1)
    VACANCY_VIEW("View vacancies", "See all vacancies, including drafts"),
    VACANCY_CREATE("Create vacancies", "Create and edit vacancy drafts"),
    VACANCY_APPROVE("Approve vacancies", "Approve or reject vacancies"),
    VACANCY_PUBLISH("Publish vacancies", "Publish approved vacancies and close them"),

    // Applications and screening (Member 2)
    APPLICATION_VIEW("View applications", "See candidates and their resumes"),
    APPLICATION_SCREEN("Screen candidates", "Score and review candidates"),
    APPLICATION_SHORTLIST("Shortlist candidates", "Move candidates between stages"),

    // Interviews and offers (Member 3)
    INTERVIEW_SCHEDULE("Schedule interviews", "Create interviews and assign interviewers"),
    INTERVIEW_EVALUATE("Evaluate interviews", "Submit feedback for assigned interviews"),
    OFFER_MANAGE("Manage offers", "Create and track job offers");

    private final String label;
    private final String description;

    RecruitmentPermission(String label, String description) {
        this.label = label;
        this.description = description;
    }

    public String getLabel() {
        return label;
    }

    public String getDescription() {
        return description;
    }
}