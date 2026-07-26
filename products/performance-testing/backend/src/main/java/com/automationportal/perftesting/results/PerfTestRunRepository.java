package com.automationportal.perftesting.results;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PerfTestRunRepository extends JpaRepository<PerfTestRun, Long> {

    List<PerfTestRun> findByTestTypeAndTestIdOrderByCreatedAtDesc(TestType testType, Long testId);

    @Query("SELECT r FROM PerfTestRun r WHERE " +
           "(:testType IS NULL OR r.testType = :testType) AND " +
           "(:status IS NULL OR r.status = :status) AND " +
           "(:trigger IS NULL OR r.runTrigger = :trigger)")
    Page<PerfTestRun> findFiltered(@Param("testType") TestType testType,
                                   @Param("status") RunStatus status,
                                   @Param("trigger") RunTrigger trigger,
                                   Pageable pageable);

    @Query(value = "SELECT * FROM perf_test_run WHERE test_type = :testType AND test_id = :testId AND status = 'PASSED' ORDER BY created_at DESC LIMIT 1", nativeQuery = true)
    Optional<PerfTestRun> findLatestPassedRun(@Param("testType") String testType, @Param("testId") Long testId);
}
