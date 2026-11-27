
package com.airella.hrm.config;

import javax.sql.DataSource;

import com.zaxxer.hikari.HikariDataSource;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class HrDatabaseConfig {

    // ============================================================
    // PRIMARY DATABASE - RECRUITMENT DATABASE
    // ============================================================

    @Primary
    @Bean
    @ConfigurationProperties("spring.datasource")
    public DataSourceProperties recruitmentDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Primary
    @Bean(name = "dataSource")
    @ConfigurationProperties("spring.datasource.hikari")
    public HikariDataSource recruitmentDataSource() {

        return recruitmentDataSourceProperties()
                .initializeDataSourceBuilder()
                .type(HikariDataSource.class)
                .build();
    }

    // ============================================================
    // SECONDARY DATABASE - HR DATABASE
    // ============================================================

    @Bean
    @ConfigurationProperties("app.datasource.hr")
    public DataSourceProperties hrDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean(name = "hrDataSource")
    public DataSource hrDataSource() {

        return hrDataSourceProperties()
                .initializeDataSourceBuilder()
                .build();
    }

    // ============================================================
    // HR DATABASE JDBC TEMPLATE
    // ============================================================

    @Bean(name = "hrJdbcTemplate")
    public JdbcTemplate hrJdbcTemplate(
            @Qualifier("hrDataSource") DataSource dataSource) {

        return new JdbcTemplate(dataSource);
    }
}
