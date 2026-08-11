package com.automationportal.testengine;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

/**
 * Per-engine credential lifecycle (docs/version2.3.md §19): generate once, store only the hash,
 * validate by re-hashing an incoming key, rotate/revoke. The raw key is never persisted or
 * logged anywhere after the moment it's returned to the caller.
 */
@Service
public class TestEngineCredentialService {
    private static final SecureRandom RANDOM = new SecureRandom();

    private final TestEngineCredentialRepository credentialRepository;

    public TestEngineCredentialService(TestEngineCredentialRepository credentialRepository) {
        this.credentialRepository = credentialRepository;
    }

    public record IssuedCredential(String plaintextKey, String keyPrefix) {}

    /** Generates and stores a new active credential for the engine. Caller is responsible for
     *  revoking any prior active credential first (see rotate()) if only one should be active. */
    public IssuedCredential issue(Long testEngineId) {
        byte[] raw = new byte[32];
        RANDOM.nextBytes(raw);
        String plaintextKey = "tk_" + Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        String keyPrefix = plaintextKey.substring(0, Math.min(12, plaintextKey.length()));

        TestEngineCredential credential = new TestEngineCredential();
        credential.setTestEngineId(testEngineId);
        credential.setCredentialHash(hash(plaintextKey));
        credential.setKeyPrefix(keyPrefix);
        credentialRepository.save(credential);

        return new IssuedCredential(plaintextKey, keyPrefix);
    }

    public IssuedCredential rotate(Long testEngineId) {
        credentialRepository.findByTestEngineIdAndRevokedAtIsNull(testEngineId)
                .ifPresent(existing -> {
                    existing.setRevokedAt(Instant.now());
                    credentialRepository.save(existing);
                });
        return issue(testEngineId);
    }

    public void revoke(Long testEngineId) {
        credentialRepository.findByTestEngineIdAndRevokedAtIsNull(testEngineId)
                .ifPresent(existing -> {
                    existing.setRevokedAt(Instant.now());
                    credentialRepository.save(existing);
                });
    }

    /** Resolves a raw incoming X-API-Key to its owning engine's credential row, if active. */
    public Optional<TestEngineCredential> validate(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) return Optional.empty();
        Optional<TestEngineCredential> found = credentialRepository.findByCredentialHashAndRevokedAtIsNull(hash(rawKey));
        found.ifPresent(c -> {
            c.setLastUsedAt(Instant.now());
            credentialRepository.save(c);
        });
        return found;
    }

    public Optional<String> activeKeyPrefix(Long testEngineId) {
        return credentialRepository.findByTestEngineIdAndRevokedAtIsNull(testEngineId).map(TestEngineCredential::getKeyPrefix);
    }

    private static String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
