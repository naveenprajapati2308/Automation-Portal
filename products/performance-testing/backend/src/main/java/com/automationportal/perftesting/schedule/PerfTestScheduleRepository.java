package com.automationportal.perftesting.schedule;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PerfTestScheduleRepository extends JpaRepository<PerfTestSchedule, Long> {

    List<PerfTestSchedule> findByIsEnabled(boolean isEnabled);

    long countByIsEnabled(boolean isEnabled);

    List<PerfTestSchedule> findByTargetTypeAndTargetId(ScheduleTargetType targetType, Long targetId);

    @Query(value = "SELECT * FROM perf_test_schedule " +
           "WHERE is_enabled = true AND (next_run_at IS NULL OR next_run_at <= :now) " +
           "ORDER BY next_run_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED", nativeQuery = true)
    Optional<PerfTestSchedule> claimNextSchedule(@Param("now") LocalDateTime now);
}
