package com.automationportal.executions;

import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface ExecutionRepository extends JpaRepository<Execution, Long> {
    List<Execution> findTop25ByOrderByCreatedAtDesc();
    List<Execution> findTop25ByProjectIdOrderByCreatedAtDesc(Long projectId);
    List<Execution> findByStatus(ExecutionStatus status);
    List<Execution> findByExecutionCode(String executionCode);
    List<Execution> findByStatusAndStartTimeBefore(ExecutionStatus status, Instant cutoff);
    List<Execution> findByProjectId(Long projectId);

    // projectId is nullable in every aggregate below: NULL means "no restriction" (Super Admin's
    // global dashboard view), matching CurrentProjectService.canAccess()'s null-caller semantics.
    @Query(value = "SELECT DATE(created_at) as date, AVG(pass_percentage) as passRate, AVG(fail_percentage) as failRate, COUNT(*) as execCount FROM executions WHERE created_at >= :since AND (:projectId IS NULL OR project_id = :projectId) GROUP BY DATE(created_at) ORDER BY date ASC", nativeQuery = true)
    List<Object[]> findDailyTrend(@Param("since") Instant since, @Param("projectId") Long projectId);

    @Query(value = "SELECT DATE(created_at) as date, AVG(total_duration_ms) as avgDuration, COUNT(*) as execCount FROM executions WHERE created_at >= :since AND (:projectId IS NULL OR project_id = :projectId) GROUP BY DATE(created_at) ORDER BY date ASC", nativeQuery = true)
    List<Object[]> findDurationTrend(@Param("since") Instant since, @Param("projectId") Long projectId);

    @Query(value = "SELECT DAYOFWEEK(created_at) as dow, HOUR(created_at) as hour, COUNT(*) as count FROM executions WHERE created_at >= :since AND (:projectId IS NULL OR project_id = :projectId) GROUP BY DAYOFWEEK(created_at), HOUR(created_at)", nativeQuery = true)
    List<Object[]> findRunHeatmap(@Param("since") Instant since, @Param("projectId") Long projectId);

    @Query(value = "SELECT environment_id as envId, COUNT(*) as count FROM executions WHERE created_at >= :since AND (:projectId IS NULL OR project_id = :projectId) GROUP BY environment_id", nativeQuery = true)
    List<Object[]> findEnvDistribution(@Param("since") Instant since, @Param("projectId") Long projectId);

    // Full-cascade cleanup for deleting an execution. Native queries because some of
    // these tables (execution_jobs — Execution Manager's, execution_queue — legacy)
    // have no JPA entity in this service.
    @Modifying
    @Query(value = "DELETE FROM test_steps WHERE test_case_id IN (SELECT id FROM execution_test_cases WHERE execution_id = :id)", nativeQuery = true)
    void deleteTestStepsFor(@Param("id") Long id);

    @Modifying
    @Query(value = "DELETE FROM execution_test_case_tags WHERE test_case_id IN (SELECT id FROM execution_test_cases WHERE execution_id = :id)", nativeQuery = true)
    void deleteTestCaseTagLinksFor(@Param("id") Long id);

    @Modifying
    @Query(value = "DELETE FROM execution_test_cases WHERE execution_id = :id", nativeQuery = true)
    void deleteTestCasesFor(@Param("id") Long id);

    @Modifying
    @Query(value = "DELETE FROM execution_artifacts WHERE execution_id = :id", nativeQuery = true)
    void deleteArtifactRowsFor(@Param("id") Long id);

    @Modifying
    @Query(value = "DELETE FROM execution_logs WHERE execution_id = :id", nativeQuery = true)
    void deleteLogRowsFor(@Param("id") Long id);

    @Modifying
    @Query(value = "DELETE FROM execution_jobs WHERE execution_id = :id", nativeQuery = true)
    void deleteJobRowsFor(@Param("id") Long id);

    @Modifying
    @Query(value = "DELETE FROM execution_queue WHERE execution_id = :id", nativeQuery = true)
    void deleteQueueRowsFor(@Param("id") Long id);
}
