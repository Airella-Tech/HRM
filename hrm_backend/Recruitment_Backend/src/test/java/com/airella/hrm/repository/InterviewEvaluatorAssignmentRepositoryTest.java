
package com.airella.hrm.repository;

import com.airella.hrm.model.InterviewEvaluatorAssignment;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class InterviewEvaluatorAssignmentRepositoryTest {

    @Autowired
    private InterviewEvaluatorAssignmentRepository repository;

    private InterviewEvaluatorAssignment assignment1;
    private InterviewEvaluatorAssignment assignment2;
    private InterviewEvaluatorAssignment assignment3;

    @BeforeEach
    void setUp() {
        repository.deleteAll();

        // Company 1, Interview 100, Employee 501, Assigned by 10
        assignment1 = repository.save(
                new InterviewEvaluatorAssignment(
                        1L, 100L, 501L, 10L
                )
        );

        // Company 1, Interview 101, Employee 502, Assigned by 501
        assignment2 = repository.save(
                new InterviewEvaluatorAssignment(
                        1L, 101L, 502L, 501L
                )
        );

        // Company 2, Interview 100, Employee 503, Assigned by 601
        assignment3 = repository.save(
                new InterviewEvaluatorAssignment(
                        2L, 100L, 503L, 601L
                )
        );
    }

    @Test
    void saveShouldGenerateAssignmentId() {
        assertThat(assignment1.getId()).isNotNull();
        assertThat(assignment1.getCompanyId()).isEqualTo(1L);
        assertThat(assignment1.getInterviewId()).isEqualTo(100L);
        assertThat(assignment1.getEmployeeId()).isEqualTo(501L);
        assertThat(assignment1.getAssignedBy()).isEqualTo(10L);
    }

    @Test
    void findByInterviewIdShouldReturnAssignments() {
        List<InterviewEvaluatorAssignment> results =
                repository.findByInterviewId(100L);

        assertThat(results).hasSize(2);

        assertThat(results)
                .extracting(InterviewEvaluatorAssignment::getEmployeeId)
                .containsExactlyInAnyOrder(501L, 503L);
    }

    @Test
    void findByCompanyIdAndInterviewIdShouldReturnCompanyAssignments() {
        List<InterviewEvaluatorAssignment> results =
                repository.findByCompanyIdAndInterviewId(1L, 100L);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getEmployeeId()).isEqualTo(501L);
        assertThat(results.get(0).getCompanyId()).isEqualTo(1L);
    }

    @Test
    void findByCompanyIdAndEmployeeIdShouldReturnAssignments() {
        List<InterviewEvaluatorAssignment> results =
                repository.findByCompanyIdAndEmployeeId(1L, 501L);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getInterviewId()).isEqualTo(100L);
        assertThat(results.get(0).getEmployeeId()).isEqualTo(501L);
    }

    @Test
    void existsByCompanyIdAndInterviewIdAndEmployeeIdShouldCheckCompany() {
        assertThat(
                repository.existsByCompanyIdAndInterviewIdAndEmployeeId(
                        1L, 100L, 501L
                )
        ).isTrue();

        // The employee is not assigned to this interview in company 2.
        assertThat(
                repository.existsByCompanyIdAndInterviewIdAndEmployeeId(
                        2L, 100L, 501L
                )
        ).isFalse();

        // The assignment does exist for employee 503 in company 2.
        assertThat(
                repository.existsByCompanyIdAndInterviewIdAndEmployeeId(
                        2L, 100L, 503L
                )
        ).isTrue();
    }

    @Test
    void findByCompanyIdAndInterviewIdAndEmployeeIdShouldFindAssignment() {
        Optional<InterviewEvaluatorAssignment> result =
                repository.findByCompanyIdAndInterviewIdAndEmployeeId(
                        1L, 100L, 501L
                );

        assertThat(result).isPresent();
        assertThat(result.get().getEmployeeId()).isEqualTo(501L);
        assertThat(result.get().getAssignedBy()).isEqualTo(10L);
    }

    @Test
    void deleteByCompanyIdAndInterviewIdAndEmployeeIdShouldDeleteOnlyMatchingAssignment() {
        repository.deleteByCompanyIdAndInterviewIdAndEmployeeId(
                1L, 100L, 501L
        );

        assertThat(
                repository.existsByCompanyIdAndInterviewIdAndEmployeeId(
                        1L, 100L, 501L
                )
        ).isFalse();

        // The assignment belonging to company 2 must remain.
        assertThat(
                repository.existsByCompanyIdAndInterviewIdAndEmployeeId(
                        2L, 100L, 503L
                )
        ).isTrue();
    }

    @Test
    void deleteByCompanyIdAndInterviewIdShouldDeleteOnlyMatchingCompanyAssignments() {
        repository.deleteByCompanyIdAndInterviewId(1L, 100L);

        assertThat(repository.findByCompanyIdAndInterviewId(1L, 100L))
                .isEmpty();

        // Other interviews and other companies must remain unchanged.
        assertThat(repository.findByCompanyIdAndInterviewId(1L, 101L))
                .hasSize(1);

        assertThat(repository.findByCompanyIdAndInterviewId(2L, 100L))
                .hasSize(1);
    }
}
