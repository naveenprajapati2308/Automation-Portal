package com.automationportal.perftesting.loadtest;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoadTestRepository extends JpaRepository<LoadTest, Long> {

    List<LoadTest> findByProjectId(Long projectId);

    long countByProjectId(Long projectId);
}
