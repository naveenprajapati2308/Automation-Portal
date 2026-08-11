package com.automationportal.perftesting.perftest;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PerformanceTestRepository extends JpaRepository<PerformanceTest, Long> {

    List<PerformanceTest> findByProjectId(Long projectId);

    long countByProjectId(Long projectId);
}
