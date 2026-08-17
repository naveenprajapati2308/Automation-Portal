package com.automationportal.environments;

import com.automationportal.executions.Execution;
import com.automationportal.executions.ExecutionRepository;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class EnvironmentHealthService {

    private final EnvironmentRepository environmentRepository;
    private final ExecutionRepository executionRepository;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public EnvironmentHealthService(EnvironmentRepository environmentRepository,
                                    ExecutionRepository executionRepository) {
        this.environmentRepository = environmentRepository;
        this.executionRepository = executionRepository;
    }

    /**
     * Scoped to one project — this used to be a platform-wide findAll() (every project's
     * environments AND executions, including raw configJson/credentials, all mixed together),
     * which is why it was locked to SUPER_ADMIN-only at the security layer. That made it
     * unreachable for the audience it's actually for: a project's own Environments page, used by
     * its Project Admin. Scoping it here is what makes it safe to open back up to project users.
     */
    public List<Map<String, Object>> health(Long projectId) {
        List<Execution> allExecutions = executionRepository.findByProjectId(projectId);
        List<Map<String, Object>> result = new ArrayList<>();

        for (EnvironmentEntity env : environmentRepository.findByProjectId(projectId)) {
            Map<String, Object> row = new HashMap<>();
            row.put("id", env.getId());
            row.put("code", env.getCode());
            row.put("name", env.getName());
            row.put("baseUrl", env.getBaseUrl());
            row.put("active", env.isActive());
            row.put("configJson", env.getConfigJson());

            // Reachability probe (only when a base URL is configured)
            if (env.getBaseUrl() == null || env.getBaseUrl().isBlank()) {
                row.put("reachability", "NO_URL");
                row.put("latencyMs", null);
            } else {
                long start = System.currentTimeMillis();
                try {
                    HttpRequest request = HttpRequest.newBuilder()
                            .uri(URI.create(env.getBaseUrl()))
                            .timeout(Duration.ofSeconds(8))
                            .GET()
                            .build();
                    HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
                    long latency = System.currentTimeMillis() - start;
                    row.put("reachability", response.statusCode() < 500 ? "UP" : "DEGRADED");
                    row.put("httpStatus", response.statusCode());
                    row.put("latencyMs", latency);
                } catch (Exception ex) {
                    row.put("reachability", "DOWN");
                    row.put("latencyMs", null);
                    row.put("probeError", ex.getClass().getSimpleName());
                }
            }

            // Execution stats for this environment
            List<Execution> envExecs = allExecutions.stream()
                    .filter(e -> env.getId().equals(e.getEnvironmentId()))
                    .toList();
            row.put("totalRuns", envExecs.size());
            envExecs.stream()
                    .filter(e -> e.getCreatedAt() != null)
                    .max(Comparator.comparing(Execution::getCreatedAt))
                    .ifPresentOrElse(last -> {
                        row.put("lastRunStatus", last.getStatus());
                        row.put("lastRunAt", last.getCreatedAt());
                        row.put("lastRunCode", last.getExecutionCode());
                    }, () -> {
                        row.put("lastRunStatus", null);
                        row.put("lastRunAt", null);
                        row.put("lastRunCode", null);
                    });
            double avgPassRate = envExecs.stream()
                    .filter(e -> e.getPassRate() != null)
                    .mapToDouble(e -> e.getPassRate().doubleValue())
                    .average().orElse(0.0);
            row.put("avgPassRate", Math.round(avgPassRate * 10.0) / 10.0);

            result.add(row);
        }
        return result;
    }
}
