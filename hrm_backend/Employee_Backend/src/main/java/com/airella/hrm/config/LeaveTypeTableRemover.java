package com.airella.hrm.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Leave types are owned by HR_Backend (hrm_db_hr) now. Older versions kept their own copy in
 * hrm_db_employee's leave_types table, with foreign keys from leave_applications and leave_balances.
 * On startup this copies each type's name onto the rows that use it, then drops the table
 * (CASCADE removes those foreign keys). Does nothing once the table is gone.
 */
@Component
public class LeaveTypeTableRemover implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(LeaveTypeTableRemover.class);

    private final JdbcTemplate jdbcTemplate;

    public LeaveTypeTableRemover(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            if (jdbcTemplate.queryForObject("SELECT to_regclass('leave_types') IS NOT NULL", Boolean.class) != Boolean.TRUE) {
                return;
            }
            for (String table : new String[]{"leave_applications", "leave_balances"}) {
                jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN IF NOT EXISTS leave_type_name VARCHAR(255)");
                jdbcTemplate.update("UPDATE " + table + " t SET leave_type_name = lt.name FROM leave_types lt "
                        + "WHERE lt.id = t.leave_type_id AND t.leave_type_name IS NULL");
            }
            jdbcTemplate.execute("DROP TABLE leave_types CASCADE");
            log.info("Dropped local leave_types table; leave types are now read from HR_Backend");
        } catch (Exception e) {
            log.warn("Could not remove local leave_types table: {}", e.getMessage());
        }
    }
}
