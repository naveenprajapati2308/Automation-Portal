package com.automationportal.testengine;

import java.time.Instant;

public final class TestEngineDtos {
    private TestEngineDtos() {}

    public record RegisterRequest(
        EngineType engineType,
        String name,
        String description,
        DeploymentType deploymentType,
        String endpoint,
        String frameworkPath,
        String reportPath
    ) {}

    public record UpdateRequest(
        String name,
        String description,
        DeploymentType deploymentType,
        String endpoint,
        String frameworkPath,
        String reportPath
    ) {}

    public record Summary(
        Long id,
        String businessId,
        EngineType engineType,
        String name,
        String description,
        DeploymentType deploymentType,
        String endpoint,
        String frameworkPath,
        String reportPath,
        EngineStatus status,
        String health,
        Instant lastHeartbeatAt,
        String activeKeyPrefix,
        Instant createdAt
    ) {
        public static Summary from(TestEngine e, String activeKeyPrefix) {
            return new Summary(
                e.getId(), e.getBusinessId(), e.getEngineType(), e.getName(), e.getDescription(),
                e.getDeploymentType(), e.getEndpoint(), e.getFrameworkPath(), e.getReportPath(), e.getStatus(), health(e),
                e.getLastHeartbeatAt(), activeKeyPrefix, e.getCreatedAt()
            );
        }

        private static String health(TestEngine e) {
            if (e.getStatus() == EngineStatus.DISABLED) return "DISABLED";
            if (e.getLastHeartbeatAt() == null) return "NEVER_CONNECTED";
            boolean stale = e.getLastHeartbeatAt().isBefore(Instant.now().minusSeconds(600));
            return stale ? "STALE" : "HEALTHY";
        }
    }

    /** Returned exactly once, at registration or rotation — never retrievable again afterward. */
    public record CredentialIssued(String plaintextKey, String keyPrefix, Instant issuedAt) {}

    /**
     * apiKey is optional — sent only in the moment right after registration/rotation, while the
     * caller still has the just-revealed plaintext in hand (Testrix itself never stores or
     * re-exposes it). Omitted on a later download, which falls back to a placeholder in the zip.
     * portalUrl is supplied by the browser (window.location.origin + "/automation") rather than
     * guessed server-side, so it's correct regardless of hostname/port the workspace actually uses.
     */
    public record StarterKitRequest(String apiKey, String portalUrl) {}
}
