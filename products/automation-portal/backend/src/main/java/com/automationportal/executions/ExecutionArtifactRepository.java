package com.automationportal.executions;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExecutionArtifactRepository extends JpaRepository<ExecutionArtifact, Long> {
    List<ExecutionArtifact> findByExecutionId(Long executionId);
    List<ExecutionArtifact> findByExecutionIdAndArtifactType(Long executionId, String artifactType);
    void deleteByExecutionIdAndFilePath(Long executionId, String filePath);
}
