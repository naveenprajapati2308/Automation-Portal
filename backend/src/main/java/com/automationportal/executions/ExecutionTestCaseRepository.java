package com.automationportal.executions;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;

public interface ExecutionTestCaseRepository extends JpaRepository<ExecutionTestCase, Long> {
    List<ExecutionTestCase> findByExecutionId(Long executionId);
    List<ExecutionTestCase> findByExecutionIdAndStatus(Long executionId, String status);

    // tags is @ManyToMany(LAZY) and open-in-view is disabled, so any endpoint that serializes
    // ExecutionTestCase straight to JSON (not through a DTO) must fetch tags inside the
    // transaction or Jackson hits "could not initialize proxy - no Session" while writing the
    // response body — which Spring's default resolver turns into an empty-bodied 401, not a 500,
    // so it was being misread client-side as an expired session.
    @Query("SELECT DISTINCT tc FROM ExecutionTestCase tc LEFT JOIN FETCH tc.tags WHERE tc.executionId = :executionId")
    List<ExecutionTestCase> findByExecutionIdWithTags(@Param("executionId") Long executionId);

    @Query("SELECT DISTINCT tc FROM ExecutionTestCase tc LEFT JOIN FETCH tc.tags " +
           "WHERE tc.executionId = :executionId AND tc.status = :status")
    List<ExecutionTestCase> findByExecutionIdAndStatusWithTags(@Param("executionId") Long executionId, @Param("status") String status);
    
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
