package com.automationportal.em.runner;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Component
public class RunnerClient {
    private static final Logger log = LoggerFactory.getLogger(RunnerClient.class);
    private final HttpClient httpClient;

    public RunnerClient() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    public boolean triggerRun(String runnerUrl, String executionId, String suiteXml, String portalUrl, String apiKey) {
        try {
            String url = runnerUrl + "/runner/run";
            // JSON body
            String jsonBody = String.format(
                    "{\"executionId\":\"%s\",\"suiteXml\":\"%s\",\"portalUrl\":\"%s\",\"apiKey\":\"%s\",\"openReport\":false}",
                    executionId, suiteXml, portalUrl, apiKey
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .timeout(Duration.ofSeconds(10))
                    .build();

            log.info("Sending run request to runner: {} with body: {}", url, jsonBody);
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("Runner response: status={}, body={}", response.statusCode(), response.body());

            return response.statusCode() == 200 || response.statusCode() == 202;
        } catch (Exception e) {
            log.error("Failed to trigger execution run on runner: {}", runnerUrl, e);
            return false;
        }
    }

    public boolean triggerCancel(String runnerUrl, String executionId) {
        try {
            String url = runnerUrl + "/runner/cancel";
            String jsonBody = String.format("{\"executionId\":\"%s\"}", executionId);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .timeout(Duration.ofSeconds(5))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200;
        } catch (Exception e) {
            log.error("Failed to send cancel request to runner: {}", runnerUrl, e);
            return false;
        }
    }

    public boolean checkHealth(String runnerUrl) {
        try {
            String url = runnerUrl + "/runner/health";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .timeout(Duration.ofSeconds(3))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200;
        } catch (Exception e) {
            return false;
        }
    }
}
