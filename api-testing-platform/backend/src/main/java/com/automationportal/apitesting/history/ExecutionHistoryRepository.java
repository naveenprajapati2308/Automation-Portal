package com.automationportal.apitesting.history;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface ExecutionHistoryRepository extends JpaRepository<ExecutionHistory, Long> {

    @Query("""
            SELECT h FROM ExecutionHistory h
            WHERE (:apiType IS NULL OR h.apiType = :apiType)
              AND (:apiId IS NULL OR h.apiId = :apiId)
              AND (:moduleId IS NULL OR h.moduleId = :moduleId)
              AND (:statusClass IS NULL OR h.responseStatusClass = :statusClass)
              AND (:scheduleId IS NULL OR h.scheduleId = :scheduleId)
              AND (:method IS NULL OR h.requestMethod = :method)
              AND (:groupExecutionId IS NULL OR h.groupExecutionId = :groupExecutionId)
              AND (:from IS NULL OR h.executedAt >= :from)
              AND (:to IS NULL OR h.executedAt <= :to)
            ORDER BY h.executedAt DESC
            """)
    Page<ExecutionHistory> search(@Param("apiType") ExecutionHistory.ApiType apiType,
                                  @Param("apiId") Long apiId,
                                  @Param("moduleId") Long moduleId,
                                  @Param("statusClass") String statusClass,
                                  @Param("scheduleId") Long scheduleId,
                                  @Param("method") String method,
                                  @Param("groupExecutionId") Long groupExecutionId,
                                  @Param("from") Instant from,
                                  @Param("to") Instant to,
                                  Pageable pageable);

    List<ExecutionHistory> findByExecutedAtAfter(Instant since);

    ExecutionHistory findFirstByApiTypeAndApiIdOrderByExecutedAtDesc(ExecutionHistory.ApiType apiType, Long apiId);

    List<ExecutionHistory> findByGroupExecutionIdOrderByExecutedAtAsc(Long groupExecutionId);

    List<ExecutionHistory> findByExecutedAtAfterAndModuleId(Instant since, Long moduleId);

    @Query("SELECT h.responseBodyObjectKey FROM ExecutionHistory h WHERE h.executedAt < :cutoff AND h.responseBodyObjectKey IS NOT NULL")
    List<String> findObjectKeysOlderThan(@Param("cutoff") Instant cutoff);

    @Modifying
    @Query("DELETE FROM ExecutionHistory h WHERE h.executedAt < :cutoff")
    int deleteOlderThan(@Param("cutoff") Instant cutoff);
}
