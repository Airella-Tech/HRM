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

        // Employee now has both a flat "departmentName" field and a nested
        // "department.name" path, which both match EmployeeDTO.departmentName.
        // Without this, ModelMapper throws an "ambiguous mapping" exception
        // (surfacing as a 500 error) instead of picking one. The service
        // layer explicitly sets departmentName afterwards anyway, so letting
        // ModelMapper resolve the ambiguity itself is safe.
        modelMapper.getConfiguration().setAmbiguityIgnored(true);

        return modelMapper;
    }
}