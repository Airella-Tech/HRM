package com.airella.hrm.repository;

import com.airella.hrm.model.SystemConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SystemConfigurationRepository extends JpaRepository<SystemConfiguration, Long> {
    Optional<SystemConfiguration> findByConfigKey(String configKey);
}
