-- ====================================================================
-- Screening Configuration and Automatic Shortlisting Schema Migration
-- Module: Recruitment Service (hrm_db_recruitment)
-- ====================================================================

-- 1. Vacancy Screening Configurations Table
CREATE TABLE IF NOT EXISTS vacancy_screening_configs (
    id BIGSERIAL PRIMARY KEY,
    vacancy_id BIGINT NOT NULL UNIQUE,
    company_ref VARCHAR(150) NOT NULL,
    skills_weight INTEGER NOT NULL DEFAULT 40,
    experience_weight INTEGER NOT NULL DEFAULT 25,
    qualifications_weight INTEGER NOT NULL DEFAULT 20,
    evidence_weight INTEGER NOT NULL DEFAULT 15,
    minimum_score INTEGER NOT NULL DEFAULT 75,
    auto_shortlist_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    criteria_json TEXT,
    config_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by BIGINT
);

CREATE INDEX IF NOT EXISTS idx_vsc_vacancy_id ON vacancy_screening_configs(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_vsc_company_ref ON vacancy_screening_configs(company_ref);

-- 2. Candidate Screening Results Table (Historical preservation)
CREATE TABLE IF NOT EXISTS candidate_screening_results (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL,
    vacancy_id BIGINT NOT NULL,
    company_ref VARCHAR(150) NOT NULL,
    config_version INTEGER NOT NULL DEFAULT 1,
    overall_score NUMERIC(5, 2) NOT NULL,
    skills_score INTEGER NOT NULL DEFAULT 0,
    experience_score INTEGER NOT NULL DEFAULT 0,
    qualifications_score INTEGER NOT NULL DEFAULT 0,
    evidence_score INTEGER NOT NULL DEFAULT 0,
    mandatory_skills_met VARCHAR(30) NOT NULL DEFAULT 'MET',
    mandatory_experience_met VARCHAR(30) NOT NULL DEFAULT 'MET',
    mandatory_qualifications_met VARCHAR(30) NOT NULL DEFAULT 'MET',
    all_mandatory_met BOOLEAN NOT NULL DEFAULT TRUE,
    has_unknown_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    recommendation VARCHAR(50) NOT NULL DEFAULT 'REQUIRES_MANUAL_REVIEW',
    auto_shortlisted BOOLEAN NOT NULL DEFAULT FALSE,
    decision_source VARCHAR(50) NOT NULL DEFAULT 'SYSTEM_AUTOMATED',
    decision_reason VARCHAR(1000),
    breakdown_json TEXT,
    evaluated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    evaluated_by BIGINT
);

CREATE INDEX IF NOT EXISTS idx_csr_application_id ON candidate_screening_results(application_id);
CREATE INDEX IF NOT EXISTS idx_csr_vacancy_id ON candidate_screening_results(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_csr_company_ref ON candidate_screening_results(company_ref);
