package com.airella.hrm.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * People live only in User_Backend (hrm_db_user.employees). Older versions kept a local
 * employees table here and linked every record to it by employee_id. On startup this
 * re-points those links to the User_Backend id (user_id, plus the company for company-scoped
 * records), drops the old columns and then the local employees table. Does nothing once
 * the table is gone. Runs before any other startup task.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class EmployeeTableRemover implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(EmployeeTableRemover.class);

    /** table, old column (employees.id), new column (User_Backend id), also copy company_id */
    private static final Object[][] LINKS = {
            {"attendance", "employee_id", "user_id", true},
            {"leave_applications", "employee_id", "user_id", true},
            {"leave_applications", "approved_by", "approved_by_user_id", false},
            {"leave_balances", "employee_id", "user_id", true},
            {"payslips", "employee_id", "user_id", true},
            {"salaries", "employee_id", "user_id", true},
            {"allowance_requests", "employee_id", "user_id", true},
            {"notifications", "employee_id", "user_id", false},
            {"audit_logs", "employee_id", "user_id", false},
            {"departments", "manager_id", "manager_user_id", false},
    };

    private final JdbcTemplate jdbcTemplate;

    public EmployeeTableRemover(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            if (!tableExists("employees")) {
                return;
            }
            for (Object[] link : LINKS) {
                relink((String) link[0], (String) link[1], (String) link[2], (Boolean) link[3]);
            }
            jdbcTemplate.execute("DROP TABLE employees CASCADE");
            log.info("Dropped local employees table; people are now read from User_Backend");
        } catch (Exception e) {
            log.error("Could not migrate away from the local employees table (will retry next start): {}", e.getMessage());
        }
    }

    private void relink(String table, String oldColumn, String newColumn, boolean copyCompany) {
        if (!columnExists(table, oldColumn)) {
            return;
        }
        jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN IF NOT EXISTS " + newColumn + " BIGINT");
        jdbcTemplate.update("UPDATE " + table + " t SET " + newColumn + " = e.user_id FROM employees e "
                + "WHERE e.id = t." + oldColumn + " AND t." + newColumn + " IS NULL");
        if (copyCompany) {
            jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN IF NOT EXISTS company_id BIGINT");
            jdbcTemplate.update("UPDATE " + table + " t SET company_id = e.company_id FROM employees e "
                    + "WHERE e.id = t." + oldColumn + " AND t.company_id IS NULL");
        }
        jdbcTemplate.execute("ALTER TABLE " + table + " DROP COLUMN " + oldColumn + " CASCADE");
        log.info("Re-linked {}.{} -> {}", table, oldColumn, newColumn);
    }

    private boolean tableExists(String table) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject("SELECT to_regclass(?) IS NOT NULL", Boolean.class, table));
    }

    private boolean columnExists(String table, String column) {
        Integer n = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM information_schema.columns WHERE table_schema = current_schema() "
                        + "AND table_name = ? AND column_name = ?", Integer.class, table, column);
        return n != null && n > 0;
    }
}
