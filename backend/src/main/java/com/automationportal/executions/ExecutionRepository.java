package com.automationportal.executions;

import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface ExecutionRepository extends JpaRepository<Execution, Long> {
    List<Execution> findTop25ByOrderByCreatedAtDesc();
    List<Execution> findByStatus(ExecutionStatus status);
    List<Execution> findByExecutionCode(String executionCode);

    @Query(value = "SELECT DATE(created_at) as date, AVG(pass_percentage) as passRate, AVG(fail_percentage) as failRate, COUNT(*) as execCount FROM executions WHERE created_at >= :since GROUP BY DATE(created_at) ORDER BY date ASC", nativeQuery = true)
    List<Object[]> findDailyTrend(@Param("since") Instant since);

    @Query(value = "SELECT DATE(created_at) as date, AVG(total_duration_ms) as avgDuration, COUNT(*) as execCount FROM executions WHERE created_at >= :since GROUP BY DATE(created_at) ORDER BY date ASC", nativeQuery = true)
    List<Object[]> findDurationTrend(@Param("since") Instant since);

    @Query(value = "SELECT DAYOFWEEK(created_at) as dow, HOUR(created_at) as hour, COUNT(*) as count FROM executions WHERE created_at >= :since GROUP BY DAYOFWEEK(created_at), HOUR(created_at)", nativeQuery = true)
    List<Object[]> findRunHeatmap(@Param("since") Instant since);

    @Query(value = "SELECT environment_id as envId, COUNT(*) as count FROM executions WHERE created_at >= :since GROUP BY environment_id", nativeQuery = true)
    List<Object[]> findEnvDistribution(@Param("since") Instant since);
}
