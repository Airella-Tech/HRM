package com.airella.hrm.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Ensures hrm_db_admin database only retains the 3 required tables:
 * - companies
 * - audit_logs
 * - system_configurations
 * 
 * Automatically drops any legacy unused tables leftover in hrm_db_admin.
 */
@Component
public class AdminDbCleanupRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminDbCleanupRunner.class);

    private final JdbcTemplate jdbcTemplate;

    public AdminDbCleanupRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        log.info("[ADMIN DB CLEANUP] Checking for unused legacy tables in hrm_db_admin...");

        List<String> legacyTables = List.of(
            "employees",
            "departments",
            "attendances",
            "attendance_adjustments",
            "leaves",
            "leave_applications",
            "leave_types",
            "leave_allocations",
            "salaries",
            "payrolls",
            "allowances",
            "allowance_requests",
            "additional_payments",
            "basic_payments",
            "work_locations",
            "employment_types",
            "notifications",
            "session_logs",
            "users"
        );

        for (String table : legacyTables) {
            try {
                jdbcTemplate.execute("DROP TABLE IF EXISTS " + table + " CASCADE;");
            } catch (Exception e) {
                log.warn("[ADMIN DB CLEANUP] Could not drop table {}: {}", table, e.getMessage());
            }
        }
        log.info("[ADMIN DB CLEANUP] Admin database restructuring cleanup complete. Active tables in hrm_db_admin: companies, audit_logs, system_configurations");
    }
}
