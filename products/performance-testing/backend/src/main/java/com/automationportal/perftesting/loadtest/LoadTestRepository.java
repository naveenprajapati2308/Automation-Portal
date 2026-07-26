package com.automationportal.perftesting.loadtest;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LoadTestRepository extends JpaRepository<LoadTest, Long> {
}
