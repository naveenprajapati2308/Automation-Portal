package com.automationportal.environments;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EnvironmentRepository extends JpaRepository<EnvironmentEntity, Long> {
    // No longer globally unique (V32 — code is now unique per-project, since two different
    // projects legitimately both want a "UAT"/"QA" environment) — matches 0 or MORE rows now.
    // Never call this expecting a single global result; use findByProjectIdAndCode instead.
    List<EnvironmentEntity> findByCode(String code);

    List<EnvironmentEntity> findByProjectId(Long projectId);

    Optional<EnvironmentEntity> findByProjectIdAndCode(Long projectId, String code);
}
