package com.automationportal.moduleenvironments;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ModuleEnvironmentRepository extends JpaRepository<ModuleEnvironmentEntity, Long> {
    List<ModuleEnvironmentEntity> findByModuleId(Long moduleId);
    List<ModuleEnvironmentEntity> findByEnvironmentId(Long environmentId);
    Optional<ModuleEnvironmentEntity> findByModuleIdAndEnvironmentId(Long moduleId, Long environmentId);
    Optional<ModuleEnvironmentEntity> findByModuleIdAndEnvironmentIdAndEnabledTrue(Long moduleId, Long environmentId);
}
