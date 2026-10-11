package com.airella.hrm.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Older versions of the employee sync inserted rows with ids copied from User_Backend,
 * which left the identity sequences behind MAX(id) and made new inserts fail with
 * duplicate keys. Moves each sequence past the highest existing id on startup.
 */
@Component
public class IdSequenceRealigner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(IdSequenceRealigner.class);
    private static final List<String> TABLES = List.of("companies", "departments", "attendance");

    private final JdbcTemplate jdbcTemplate;

    public IdSequenceRealigner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        for (String table : TABLES) {
            try {
                jdbcTemplate.execute("SELECT setval(pg_get_serial_sequence('" + table + "', 'id'), "
                        + "(SELECT COALESCE(MAX(id), 0) + 1 FROM " + table + "), false)");
            } catch (Exception e) {
                log.warn("Could not realign id sequence for {}: {}", table, e.getMessage());
            }
        }
    }
}
