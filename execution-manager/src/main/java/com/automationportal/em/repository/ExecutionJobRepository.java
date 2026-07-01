package com.automationportal.em.repository;

import com.automationportal.em.model.ExecutionJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface ExecutionJobRepository extends JpaRepository<ExecutionJob, String> {
    List<ExecutionJob> findByStateOrderBySubmittedAtAsc(String state);
    List<ExecutionJob> findByState(String state);
    Optional<ExecutionJob> findByExecutionId(Long executionId);

    @Query("SELECT COALESCE(MAX(j.queuePosition), 0) FROM ExecutionJob j WHERE j.state = 'QUEUED'")
    int findMaxQueuePosition();

    @Query("SELECT j FROM ExecutionJob j WHERE j.state = 'QUEUED' ORDER BY j.priority DESC, j.submittedAt ASC")
    List<ExecutionJob> findQueuedJobsOrdered();
}
