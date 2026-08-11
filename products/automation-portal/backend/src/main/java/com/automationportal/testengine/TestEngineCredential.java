package com.automationportal.testengine;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "test_engine_credentials")
public class TestEngineCredential {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "test_engine_id", nullable = false)
    private Long testEngineId;

    @Column(name = "credential_hash", nullable = false, unique = true, length = 64)
    private String credentialHash;

    @Column(name = "key_prefix", nullable = false, length = 16)
    private String keyPrefix;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "last_used_at")
    private Instant lastUsedAt;

    public Long getId() { return id; }
    public Long getTestEngineId() { return testEngineId; }
    public void setTestEngineId(Long testEngineId) { this.testEngineId = testEngineId; }
    public String getCredentialHash() { return credentialHash; }
    public void setCredentialHash(String credentialHash) { this.credentialHash = credentialHash; }
    public String getKeyPrefix() { return keyPrefix; }
    public void setKeyPrefix(String keyPrefix) { this.keyPrefix = keyPrefix; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getRevokedAt() { return revokedAt; }
    public void setRevokedAt(Instant revokedAt) { this.revokedAt = revokedAt; }
    public Instant getLastUsedAt() { return lastUsedAt; }
    public void setLastUsedAt(Instant lastUsedAt) { this.lastUsedAt = lastUsedAt; }
}
