package com.airella.hrm.service;

import com.airella.hrm.exception.BusinessException;

import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class InterviewerLeaveValidationService {

    private final JdbcTemplate hrJdbcTemplate;

    public InterviewerLeaveValidationService(
            @Qualifier("hrJdbcTemplate") JdbcTemplate hrJdbcTemplate) {
        this.hrJdbcTemplate = hrJdbcTemplate;
    }

    public void validateNoApprovedLeave(
            List<Long> interviewerIds,
            Long companyId,
            LocalDate interviewDate) {

        if (interviewerIds == null
                || interviewerIds.isEmpty()
                || interviewDate == null) {
            return;
        }

        String sql = """
                SELECT EXISTS (
                    SELECT 1
                    FROM leave_applications
                    WHERE user_id = ?
                      AND company_id = ?
                      AND status = 'APPROVED'
                      AND start_date <= ?
                      AND end_date >= ?
                )
                """;

        for (Long interviewerId : interviewerIds) {

            if (interviewerId == null) {
                continue;
            }

            Boolean hasApprovedLeave = hrJdbcTemplate.queryForObject(
                    sql,
                    Boolean.class,
                    interviewerId,
                    companyId,
                    interviewDate,
                    interviewDate
            );

            if (Boolean.TRUE.equals(hasApprovedLeave)) {
                throw new BusinessException(
                        "The selected interviewer has approved leave on "
                                + interviewDate
                );
            }
        }
    }
}
