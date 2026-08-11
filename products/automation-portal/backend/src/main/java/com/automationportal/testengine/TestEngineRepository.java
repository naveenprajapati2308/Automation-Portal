package com.automationportal.testengine;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TestEngineRepository extends JpaRepository<TestEngine, Long> {
    List<TestEngine> findByProjectId(Long projectId);
    Optional<TestEngine> findByIdAndProjectId(Long id, Long projectId);
    Optional<TestEngine> findByBusinessId(String businessId);
}
