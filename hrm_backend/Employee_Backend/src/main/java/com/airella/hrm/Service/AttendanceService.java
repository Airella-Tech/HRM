package com.airella.hrm.service;

import com.airella.hrm.dto.AttendanceDTO;
import com.airella.hrm.exception.BusinessException;
import com.airella.hrm.exception.ResourceNotFoundException;
import com.airella.hrm.model.Attendance;
import com.airella.hrm.model.Employee;
import com.airella.hrm.repository.AttendanceRepository;
import org.modelmapper.ModelMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Attendance service — handles clock-in/out, GPS tracking, and adjustment requests.
 */
@Service
@Transactional
public class AttendanceService {

    private static final Logger log = LoggerFactory.getLogger(AttendanceService.class);

    private final AttendanceRepository attendanceRepository;
    private final EmployeeDirectory employeeDirectory;
    private final ModelMapper modelMapper;
    private final AuditService auditService;

    public AttendanceService(AttendanceRepository attendanceRepository,
                             EmployeeDirectory employeeDirectory,
                             ModelMapper modelMapper,
                             AuditService auditService) {
        this.attendanceRepository = attendanceRepository;
        this.employeeDirectory = employeeDirectory;
        this.modelMapper = modelMapper;
        this.auditService = auditService;
    }

    public AttendanceDTO clockIn(Long employeeId, LocalTime clockInTime) {
        LocalDate today = LocalDate.now();
        ensureNoOpenSession(employeeId, today);

        Employee employee = employeeDirectory.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", employeeId));

        Attendance attendance = new Attendance();
        attendance.setUserId(employee.getId());
        attendance.setCompanyId(employee.getCompany().getId());
        attendance.setDate(today);
        attendance.setClockInTime(clockInTime != null ? clockInTime : LocalTime.now());
        attendance.setAttendanceType(Attendance.AttendanceType.MANUAL);
        attendance.setStatus(Attendance.AttendanceStatus.PRESENT);

        Attendance saved = attendanceRepository.save(attendance);
        auditService.logAction("CLOCK_IN", "Attendance", saved.getId(),
                "Employee clocked in", employee.getCompany().getId());
        log.info("Employee {} clocked in at {}", employeeId, saved.getClockInTime());
        return convertToDTO(saved);
    }

    public AttendanceDTO clockOut(Long employeeId, LocalTime clockOutTime) {
        LocalDate today = LocalDate.now();

        Attendance attendance = findOpenSession(employeeId, today);
        attendance.setClockOutTime(clockOutTime != null ? clockOutTime : LocalTime.now());
        Attendance saved = attendanceRepository.save(attendance);
        auditService.logAction("CLOCK_OUT", "Attendance", saved.getId(),
                "Employee clocked out", attendance.getCompanyId());
        log.info("Employee {} clocked out at {}", employeeId, saved.getClockOutTime());
        return convertToDTO(saved);
    }

    public AttendanceDTO clockInGPS(Long employeeId, String location) {
        LocalDate today = LocalDate.now();
        ensureNoOpenSession(employeeId, today);

        Employee employee = employeeDirectory.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", employeeId));

        Attendance attendance = new Attendance();
        attendance.setUserId(employee.getId());
        attendance.setCompanyId(employee.getCompany().getId());
        attendance.setDate(today);
        attendance.setClockInTime(LocalTime.now());
        attendance.setClockInLocation(location);
        attendance.setAttendanceType(Attendance.AttendanceType.GPS);
        attendance.setStatus(Attendance.AttendanceStatus.PRESENT);

        Attendance saved = attendanceRepository.save(attendance);
        auditService.logAction("CLOCK_IN_GPS", "Attendance", saved.getId(),
                "Employee clocked in via GPS", employee.getCompany().getId());
        return convertToDTO(saved);
    }

    public AttendanceDTO clockOutGPS(Long employeeId, String location) {
        LocalDate today = LocalDate.now();

        Attendance attendance = findOpenSession(employeeId, today);
        attendance.setClockOutTime(LocalTime.now());
        attendance.setClockOutLocation(location);
        Attendance saved = attendanceRepository.save(attendance);
        auditService.logAction("CLOCK_OUT_GPS", "Attendance", saved.getId(),
                "Employee clocked out via GPS", attendance.getCompanyId());
        return convertToDTO(saved);
    }

    private void ensureNoOpenSession(Long employeeId, LocalDate date) {
        attendanceRepository.findFirstByUserIdAndDateAndClockOutTimeIsNullOrderByClockInTimeDesc(employeeId, date)
                .ifPresent(a -> { throw new BusinessException("Already clocked in. Please clock out first."); });
    }

    private Attendance findOpenSession(Long employeeId, LocalDate date) {
        return attendanceRepository.findFirstByUserIdAndDateAndClockOutTimeIsNullOrderByClockInTimeDesc(employeeId, date)
                .orElseThrow(() -> new BusinessException("No active clock-in session found. Please clock in first."));
    }

    @Transactional(readOnly = true)
    public List<AttendanceDTO> getEmployeeAttendance(Long employeeId, LocalDate startDate, LocalDate endDate) {
        return attendanceRepository.findByUserIdAndDateBetween(employeeId, startDate, endDate)
                .stream().collect(Collectors.collectingAndThen(Collectors.toList(), this::toDTOs));
    }

    @Transactional(readOnly = true)
    public List<AttendanceDTO> getDailyAttendance(Long companyId, LocalDate date) {
        return attendanceRepository.findByCompanyIdAndDate(companyId, date)
                .stream().collect(Collectors.collectingAndThen(Collectors.toList(), this::toDTOs));
    }

    @Transactional(readOnly = true)
    public List<AttendanceDTO> getAttendanceRange(Long companyId, LocalDate startDate, LocalDate endDate) {
        return attendanceRepository.findByCompanyIdAndDateBetween(companyId, startDate, endDate)
                .stream().collect(Collectors.collectingAndThen(Collectors.toList(), this::toDTOs));
    }

    @Transactional(readOnly = true)
    public List<AttendanceDTO> getTodayAttendance(Long employeeId) {
        return attendanceRepository.findByUserIdAndDateOrderByClockInTimeAsc(employeeId, LocalDate.now())
                .stream().collect(Collectors.collectingAndThen(Collectors.toList(), this::toDTOs));
    }

    public AttendanceDTO requestAdjustment(Long attendanceId, String reason) {
        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance", "id", attendanceId));

        attendance.setIsAdjustmentRequested(true);
        attendance.setAdjustmentReason(reason);
        attendance.setAdjustmentStatus(Attendance.AdjustmentStatus.PENDING);

        Attendance saved = attendanceRepository.save(attendance);
        auditService.logAction("REQUEST_ATTENDANCE_ADJUSTMENT", "Attendance", saved.getId(),
                "Requested attendance adjustment", attendance.getCompanyId());
        return convertToDTO(saved);
    }

    public AttendanceDTO approveAdjustment(Long attendanceId, Long companyId) {
        Attendance attendance = companyAttendance(attendanceId, companyId);
        attendance.setAdjustmentStatus(Attendance.AdjustmentStatus.APPROVED);
        Attendance saved = attendanceRepository.save(attendance);
        auditService.logAction("APPROVE_ATTENDANCE_ADJUSTMENT", "Attendance", saved.getId(),
                "Approved attendance adjustment", attendance.getCompanyId());
        return convertToDTO(saved);
    }

    public AttendanceDTO rejectAdjustment(Long attendanceId, Long companyId) {
        Attendance attendance = companyAttendance(attendanceId, companyId);
        attendance.setAdjustmentStatus(Attendance.AdjustmentStatus.REJECTED);
        Attendance saved = attendanceRepository.save(attendance);
        auditService.logAction("REJECT_ATTENDANCE_ADJUSTMENT", "Attendance", saved.getId(),
                "Rejected attendance adjustment", attendance.getCompanyId());
        return convertToDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<AttendanceDTO> getPendingAdjustments(Long companyId) {
        return attendanceRepository.findByIsAdjustmentRequestedAndAdjustmentStatus(true, Attendance.AdjustmentStatus.PENDING)
                .stream()
                .filter(a -> companyId.equals(a.getCompanyId()))
                .collect(Collectors.collectingAndThen(Collectors.toList(), this::toDTOs));
    }

    /** The record, if it belongs to the given company (null = any, for admins); otherwise not found. */
    private Attendance companyAttendance(Long attendanceId, Long companyId) {
        return attendanceRepository.findById(attendanceId)
                .filter(a -> companyId == null || companyId.equals(a.getCompanyId()))
                .orElseThrow(() -> new ResourceNotFoundException("Attendance", "id", attendanceId));
    }

    private AttendanceDTO convertToDTO(Attendance attendance) {
        return convertToDTO(attendance, employeeDirectory.findById(attendance.getUserId()).orElse(null));
    }

    /** Converts a list with one User_Backend lookup for all the people in it. */
    private List<AttendanceDTO> toDTOs(List<Attendance> records) {
        Map<Long, Employee> people = employeeDirectory.mapByIds(records.stream().map(Attendance::getUserId).toList());
        return records.stream().map(a -> convertToDTO(a, people.get(a.getUserId()))).collect(Collectors.toList());
    }

    private AttendanceDTO convertToDTO(Attendance attendance, Employee employee) {
        AttendanceDTO dto = modelMapper.map(attendance, AttendanceDTO.class);
        dto.setEmployeeId(attendance.getUserId());
        if (employee != null) {
            dto.setEmployeeName(employee.getFullName());
            dto.setEmployeeIdNumber(employee.getEmployeeId());
            dto.setDepartmentName(employee.getDepartment() != null ? employee.getDepartment().getName() : employee.getDepartmentName());
        }
        if (attendance.getAttendanceType() != null) dto.setAttendanceType(attendance.getAttendanceType().name());
        if (attendance.getStatus() != null) dto.setStatus(attendance.getStatus().name());
        if (attendance.getAdjustmentStatus() != null) dto.setAdjustmentStatus(attendance.getAdjustmentStatus().name());
        return dto;
    }
}
