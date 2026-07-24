package com.automationportal.em.callback;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;

@Component
public class PortalCallbackClient {
    private static final Logger log = LoggerFactory.getLogger(PortalCallbackClient.class);
    private final HttpClient httpClient;

    @Value("${em.portal-backend-url:http://localhost:8080}")
    private String portalBackendUrl;

    // Matches portal.events.api-key on the backend side — these two callback endpoints are
    // permitAll at the Spring Security layer (the runner isn't a logged-in user, so it has no
    // JWT) and rely on this shared secret instead, same as ExecutionEventController.
    @Value("${em.portal-api-key:shared-secret}")
    private String portalApiKey;

    public PortalCallbackClient() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    /**
     * Fired every time a runner's process exits, success or failure. If MPHIDB's own listener
     * already pushed SUITE_COMPLETED and the portal computed a real terminal status, this is a
     * no-op there. It only matters when the run failed before any listener code ran at all (e.g.
     * the Maven build itself failing) — otherwise the execution stays stuck on RUNNING and blocks
     * ExecutionWorker's "one at a time" queue gate forever.
     */
    public void notifyJobFinished(Long executionId) {
        try {
            String url = portalBackendUrl + "/api/executions/" + executionId + "/job-finished";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .header("X-API-Key", portalApiKey)
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .timeout(Duration.ofSeconds(5))
                    .build();

            log.info("Sending job-finished callback to portal backend: {}", url);
            httpClient.sendAsync(request, HttpResponse.BodyHandlers.discarding())
                    .thenAccept(res -> log.info("Job-finished callback completed with status: {}", res.statusCode()))
                    .exceptionally(ex -> {
                        log.error("Failed to send job-finished callback for executionId: {}", executionId, ex);
                        return null;
                    });
        } catch (Exception e) {
            log.error("Exception in job-finished callback for executionId: {}", executionId, e);
        }
    }

    public void notifyStateChange(Long executionId, String state) {
        try {
            String url = portalBackendUrl + "/api/executions/" + executionId + "/state";
            String jsonBody = String.format("{\"state\":\"%s\",\"timestamp\":\"%s\"}", state, Instant.now());

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .header("X-API-Key", portalApiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .timeout(Duration.ofSeconds(5))
                    .build();

            log.info("Sending state callback to portal backend: {} with body: {}", url, jsonBody);
            httpClient.sendAsync(request, HttpResponse.BodyHandlers.discarding())
                    .thenAccept(res -> log.info("State callback completed with status: {}", res.statusCode()))
                    .exceptionally(ex -> {
                        log.error("Failed to send state callback for executionId: {}", executionId, ex);
                        return null;
                    });
        } catch (Exception e) {
            log.error("Exception in state callback for executionId: {}", executionId, e);
        }
    }
}
