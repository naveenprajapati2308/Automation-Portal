package com.automationportal.testengine;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TestEngineCredentialRepository extends JpaRepository<TestEngineCredential, Long> {
    Optional<TestEngineCredential> findByCredentialHashAndRevokedAtIsNull(String credentialHash);
    Optional<TestEngineCredential> findByTestEngineIdAndRevokedAtIsNull(Long testEngineId);
}
