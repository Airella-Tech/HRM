package com.airella.hrm.Repo;

import com.airella.hrm.Model.SystemConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SystemConfigurationRepo extends JpaRepository<SystemConfiguration, Long> {
    Optional<SystemConfiguration> findByConfigKey(String configKey);
}
