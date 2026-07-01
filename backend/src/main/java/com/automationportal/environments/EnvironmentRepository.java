package com.automationportal.environments;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EnvironmentRepository extends JpaRepository<EnvironmentEntity, Long> {
    Optional<EnvironmentEntity> findByCode(String code);
}
