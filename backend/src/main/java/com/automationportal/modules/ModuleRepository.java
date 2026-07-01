package com.automationportal.modules;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ModuleRepository extends JpaRepository<ModuleEntity, Long> {
    Optional<ModuleEntity> findByCode(String code);
}
