package com.automationportal.perftesting.results;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PerfMetricSampleRepository extends JpaRepository<PerfMetricSample, Long> {
    List<PerfMetricSample> findByRunIdOrderBySampledAtAsc(Long runId);
}
