package com.automationportal.perftesting.perftest;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PerformanceTestRepository extends JpaRepository<PerformanceTest, Long> {
}
