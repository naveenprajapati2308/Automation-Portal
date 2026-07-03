package com.automationportal.executions;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;

public interface ExecutionTestCaseRepository extends JpaRepository<ExecutionTestCase, Long> {
    List<ExecutionTestCase> findByExecutionId(Long executionId);
    List<ExecutionTestCase> findByExecutionIdAndStatus(Long executionId, String status);
    
    java.util.Optional<ExecutionTestCase> findFirstByExecutionIdAndTestNameAndClassNameAndMethodName(
            Long executionId, String testName, String className, String methodName);

    java.util.Optional<ExecutionTestCase> findFirstByExecutionIdAndClassNameAndMethodName(
            Long executionId, String className, String methodName);
    
    @Query("SELECT tc.exceptionType, COUNT(tc), tc.methodName, MAX(e.executionCode) " +
           "FROM ExecutionTestCase tc JOIN Execution e ON tc.executionId = e.id " +
           "WHERE tc.status = 'FAIL' AND tc.isConfigMethod = false AND tc.createdAt >= :since " +
           "GROUP BY tc.exceptionType, tc.methodName")
    List<Object[]> findFailureAnalysisRaw(@Param("since") Instant since);

    @Query("SELECT tc FROM ExecutionTestCase tc " +
           "WHERE tc.isConfigMethod = false AND tc.createdAt >= :since " +
           "ORDER BY tc.durationMs DESC")
    List<ExecutionTestCase> findSlowTestsRaw(@Param("since") Instant since);

    @Query("SELECT tc.className, tc.methodName, COUNT(tc), " +
           "SUM(CASE WHEN tc.status = 'FAIL' THEN 1 ELSE 0 END), " +
           "SUM(CASE WHEN tc.status = 'PASS' THEN 1 ELSE 0 END), " +
           "SUM(tc.retries), " +
           "tc.moduleCode " +
           "FROM ExecutionTestCase tc " +
           "WHERE tc.createdAt >= :since AND tc.isConfigMethod = false " +
           "GROUP BY tc.className, tc.methodName, tc.moduleCode")
    List<Object[]> findFlakyTestsRaw(@Param("since") Instant since);
}
