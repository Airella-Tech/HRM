package com.airella.hrm.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Closes published vacancies once their deadline has passed.
 * Runs 30 seconds after startup (catches anything missed while the app was off), then every hour.
 */
@Component
public class VacancyAutoCloseScheduler {

    private static final Logger log = LoggerFactory.getLogger(VacancyAutoCloseScheduler.class);

    private final JobVacancyService vacancyService;

    public VacancyAutoCloseScheduler(JobVacancyService vacancyService) {
        this.vacancyService = vacancyService;
    }

    @Scheduled(initialDelay = 30_000, fixedRate = 3_600_000)
    public void closeExpiredVacancies() {
        try {
            vacancyService.autoCloseExpired();
        } catch (Exception e) {
            log.error("Auto-close of expired vacancies failed: {}", e.getMessage());
        }
    }
}