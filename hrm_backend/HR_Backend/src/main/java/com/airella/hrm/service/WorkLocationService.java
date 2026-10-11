package com.airella.hrm.service;

import com.airella.hrm.dto.WorkLocationDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.Employee;
import com.airella.hrm.model.WorkLocation;
import com.airella.hrm.repository.WorkLocationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * HR-defined work locations (hrm_db_hr.work_locations) — e.g. Head Office, Branch
 * Office, Remote, Hybrid. Selected on an employee's record when they are added or edited.
 */
@Service
@Transactional
public class WorkLocationService {

    private static final Logger log = LoggerFactory.getLogger(WorkLocationService.class);
    private static final int MAX_NAME_LENGTH = 100;

    private final WorkLocationRepository workLocationRepository;
    private final AuditService auditService;

    public WorkLocationService(WorkLocationRepository workLocationRepository, AuditService auditService) {
        this.workLocationRepository = workLocationRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<WorkLocationDTO> getWorkLocations(Long companyId) {
        return workLocationRepository.findByCompanyIdAndActive(companyId, true).stream()
                .sorted(Comparator.comparing(WorkLocation::getId))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<WorkLocationDTO> createWorkLocations(List<String> names, Employee hr) {
        Long companyId = hr.getCompany().getId();
        Collection<String> toAdd = newNames(names, workLocationRepository.findByCompanyIdAndActive(companyId, true));

        List<WorkLocationDTO> created = new ArrayList<>();
        for (String name : toAdd) {
            WorkLocation location = new WorkLocation();
            location.setName(name);
            location.setCompany(hr.getCompany());
            location.setActive(true);
            location.setCreatedById(hr.getId());
            location.setCreatedByName(hr.getFullName());
            WorkLocation saved = workLocationRepository.save(location);
            audit("CREATE", "WorkLocation", saved.getId(), "Added work location: " + name, companyId);
            created.add(toDTO(saved));
        }
        log.info("{} added {} work location(s) for company {}", hr.getEmail(), created.size(), companyId);
        return created;
    }

    /** Renames a work location. The new name must not already be used by another active location. */
    public WorkLocationDTO updateWorkLocation(Long id, String name, Employee hr) {
        Long companyId = hr.getCompany().getId();
        WorkLocation location = workLocationRepository.findById(id)
                .filter(l -> l.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new ResourceNotFoundException("WorkLocation", "id", id));

        String newName = name == null ? "" : name.trim().replaceAll("\\s+", " ");
        if (newName.isEmpty()) {
            throw new BusinessException("Work location name is required");
        }
        if (newName.length() > MAX_NAME_LENGTH) {
            throw new BusinessException("Work location name must be at most " + MAX_NAME_LENGTH + " characters");
        }
        boolean taken = workLocationRepository.findByCompanyIdAndActive(companyId, true).stream()
                .anyMatch(l -> !l.getId().equals(id) && l.getName().trim().equalsIgnoreCase(newName));
        if (taken) {
            throw new BusinessException("A work location named '" + newName + "' already exists");
        }

        String oldName = location.getName();
        location.setName(newName);
        WorkLocation saved = workLocationRepository.save(location);
        audit("UPDATE", "WorkLocation", saved.getId(), "Renamed work location '" + oldName + "' to '" + newName + "'", companyId);
        log.info("{} renamed work location {} to '{}' for company {}", hr.getEmail(), id, newName, companyId);
        return toDTO(saved);
    }

    /** Removes a work location permanently from the database. */
    public void deleteWorkLocation(Long id, Employee hr) {
        Long companyId = hr.getCompany().getId();
        WorkLocation location = workLocationRepository.findById(id)
                .filter(l -> l.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new ResourceNotFoundException("WorkLocation", "id", id));

        String name = location.getName();
        workLocationRepository.delete(location);
        workLocationRepository.flush();
        audit("DELETE", "WorkLocation", id, "Deleted work location: " + name, companyId);
        log.info("{} deleted work location {} ('{}') for company {}", hr.getEmail(), id, name, companyId);
    }

    // ── helpers ──────────────────────────────────────────────────

    /**
     * Cleans submitted names (trims, collapses spaces, drops blanks, merges case-insensitive repeats)
     * and rejects the whole request if any of them already exists.
     */
    private Collection<String> newNames(List<String> names, List<WorkLocation> existing) {
        Map<String, String> wanted = new LinkedHashMap<>();
        if (names != null) {
            for (String n : names) {
                String name = n == null ? "" : n.trim().replaceAll("\\s+", " ");
                if (!name.isEmpty()) wanted.putIfAbsent(name.toLowerCase(), name);
            }
        }
        if (wanted.isEmpty()) {
            throw new BusinessException("Enter at least one work location");
        }
        Set<String> taken = existing.stream()
                .map(e -> e.getName().trim().toLowerCase())
                .collect(Collectors.toSet());
        List<String> duplicates = wanted.entrySet().stream()
                .filter(e -> taken.contains(e.getKey()))
                .map(Map.Entry::getValue)
                .collect(Collectors.toList());
        if (!duplicates.isEmpty()) {
            throw new BusinessException("Already added: " + String.join(", ", duplicates));
        }
        return wanted.values();
    }

    private void audit(String action, String entity, Long id, String description, Long companyId) {
        try {
            auditService.logAction(action, entity, id, description, companyId);
        } catch (Exception ignored) {
            // auditing must never block the actual change
        }
    }

    private WorkLocationDTO toDTO(WorkLocation l) {
        return new WorkLocationDTO(l.getId(), l.getName(), l.getCreatedByName(), l.getCreatedAt());
    }
}
