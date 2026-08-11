package com.automationportal.perftesting.drift;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PerfDriftAlertRepository extends JpaRepository<PerfDriftAlert, Long> {
    List<PerfDriftAlert> findByIsAcknowledgedFalseOrderByCreatedAtDesc();

    List<PerfDriftAlert> findByProjectIdAndIsAcknowledgedFalseOrderByCreatedAtDesc(Long projectId);
}
