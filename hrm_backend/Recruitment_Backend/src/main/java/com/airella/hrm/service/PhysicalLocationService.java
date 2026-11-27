
package com.airella.hrm.service;

import com.airella.hrm.dto.PhysicalLocationDTO;
import com.airella.hrm.dto.PhysicalLocationRequestDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.PhysicalLocation;
import com.airella.hrm.repository.PhysicalLocationRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@Transactional
public class PhysicalLocationService {

    private final PhysicalLocationRepository locationRepository;
    private final AuthService authService;

    public PhysicalLocationService(
            PhysicalLocationRepository locationRepository,
            AuthService authService) {

        this.locationRepository = locationRepository;
        this.authService = authService;
    }

    // CREATE LOCATION
    public PhysicalLocationDTO create(
            PhysicalLocationRequestDTO request) {

        validateRequest(request);

        Long companyId = authService.getCurrentCompanyId();

        PhysicalLocation location = new PhysicalLocation();

        location.setCompanyId(companyId);

        apply(location, request);

        location = locationRepository.save(location);

        return toDto(location);
    }

    // GET ALL LOCATIONS
    @Transactional(readOnly = true)
    public List<PhysicalLocationDTO> list(String status) {

        Long companyId = authService.getCurrentCompanyId();

        List<PhysicalLocation> locations;

        if (status == null || status.isBlank()) {

            locations =
                    locationRepository.findByCompanyIdOrderByNameAsc(
                            companyId
                    );

        } else {

            String normalizedStatus = normalizeStatus(status);

            locations =
                    locationRepository
                            .findByCompanyIdAndStatusOrderByNameAsc(
                                    companyId,
                                    normalizedStatus
                            );
        }

        return locations.stream()
                .map(this::toDto)
                .toList();
    }

    // GET SINGLE LOCATION
    @Transactional(readOnly = true)
    public PhysicalLocationDTO get(Long id) {

        Long companyId = authService.getCurrentCompanyId();

        return toDto(find(id, companyId));
    }

    // UPDATE LOCATION
    public PhysicalLocationDTO update(
            Long id,
            PhysicalLocationRequestDTO request) {

        validateRequest(request);

        Long companyId = authService.getCurrentCompanyId();

        PhysicalLocation location = find(id, companyId);

        apply(location, request);

        location = locationRepository.save(location);

        return toDto(location);
    }

    // DEACTIVATE LOCATION
    public void delete(Long id) {

        Long companyId = authService.getCurrentCompanyId();

        PhysicalLocation location = find(id, companyId);

        location.setStatus("Inactive");

        locationRepository.save(location);
    }

    // FIND LOCATION WITH COMPANY ISOLATION
    private PhysicalLocation find(Long id, Long companyId) {

        return locationRepository.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Physical location",
                                "id",
                                id
                        )
                );
    }

    // APPLY REQUEST DATA
    private void apply(
            PhysicalLocation location,
            PhysicalLocationRequestDTO request) {

        location.setName(request.name().trim());
        location.setBuilding(blankToNull(request.building()));
        location.setRoomNumber(blankToNull(request.roomNumber()));
        location.setCapacity(request.capacity());
        location.setDescription(blankToNull(request.description()));

        String status = request.status();

        location.setStatus(
                status == null || status.isBlank()
                        ? "Active"
                        : normalizeStatus(status)
        );
    }

    // VALIDATE REQUEST
    private void validateRequest(PhysicalLocationRequestDTO request) {

        if (request == null) {
            throw new BusinessException(
                    "Physical location details are required."
            );
        }

        if (request.name() == null || request.name().isBlank()) {
            throw new BusinessException(
                    "Location name is required."
            );
        }

        if (request.capacity() == null
                || request.capacity() < 1) {

            throw new BusinessException(
                    "Location capacity must be at least 1."
            );
        }

        if (request.status() != null
                && !request.status().isBlank()) {

            normalizeStatus(request.status());
        }
    }

    private String normalizeStatus(String status) {

        if (status == null) {
            throw new BusinessException("Location status is required.");
        }

        return switch (status.trim().toLowerCase(Locale.ROOT)) {

            case "active" -> "Active";

            case "inactive" -> "Inactive";

            default -> throw new BusinessException(
                    "Location status must be Active or Inactive."
            );
        };
    }

    private String blankToNull(String value) {

        return value == null || value.isBlank()
                ? null
                : value.trim();
    }

    // ENTITY TO DTO
    private PhysicalLocationDTO toDto(PhysicalLocation location) {

        return new PhysicalLocationDTO(
                location.getId(),
                location.getName(),
                location.getBuilding(),
                location.getRoomNumber(),
                location.getCapacity(),
                location.getDescription(),
                location.getStatus(),
                location.getCreatedAt(),
                location.getUpdatedAt()
        );
    }
}
