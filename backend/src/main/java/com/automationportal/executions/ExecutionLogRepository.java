package com.automationportal.executions;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExecutionLogRepository extends JpaRepository<ExecutionLog, Long> {
    List<ExecutionLog> findByExecutionId(Long executionId);
}
