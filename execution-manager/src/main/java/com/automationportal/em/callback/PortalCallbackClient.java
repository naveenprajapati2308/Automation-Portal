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

    public PortalCallbackClient() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    public void notifyStateChange(Long executionId, String state) {
        try {
            String url = portalBackendUrl + "/api/executions/" + executionId + "/state";
            String jsonBody = String.format("{\"state\":\"%s\",\"timestamp\":\"%s\"}", state, Instant.now());

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
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
