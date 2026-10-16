package com.airella.hrm.config;

import org.modelmapper.ModelMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * ModelMapper bean configuration.
 */
@Configuration
public class ModelMapperConfig {

    @Bean
    public ModelMapper modelMapper() {
        ModelMapper modelMapper = new ModelMapper();
        // If two source fields match one DTO field, pick one instead of throwing a 500 error.
        modelMapper.getConfiguration().setAmbiguityIgnored(true);
        return modelMapper;
    }
}