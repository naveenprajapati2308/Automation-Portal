package com.automationportal.apitesting.history;

import com.automationportal.apitesting.execution.dto.ExecutionRequest;
import com.automationportal.apitesting.execution.dto.ExecutionResponse;
import com.automationportal.apitesting.execution.dto.KeyValueItem;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Records every execution (manual, scheduled, chain-dependency) with masked
 * secrets, deterministic status classification, and body offload above the
 * inline threshold.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExecutionHistoryService {

    private static final Set<String> SENSITIVE_HEADERS = Set.of(
            "authorization", "x-api-key", "api-key", "cookie", "set-cookie", "proxy-authorization");

    private final ExecutionHistoryRepository repository;
    private final BodyStore bodyStore;
    private final ObjectMapper objectMapper;

    @Value("${apitesting.history.inline-body-max-bytes}")
    private long inlineBodyMaxBytes;

    public ExecutionHistory record(ExecutionHistory.ApiType apiType, Long apiId, String apiName,
                                   Long moduleId, Long scheduleId,
                                   ExecutionHistory.TriggeredBy triggeredBy,
                                   ExecutionRequest request, ExecutionResponse response) {
        return record(apiType, apiId, apiName, moduleId, scheduleId, triggeredBy, request, response,
                null, null);
    }

    /**
     * Context-aware variant: also persists correlation/group linkage, the
     * masked variables injected from Base APIs, cookies, content type and
     * wall-clock start/end derived from the response duration.
     */
    public ExecutionHistory record(ExecutionHistory.ApiType apiType, Long apiId, String apiName,
                                   Long moduleId, Long scheduleId,
                                   ExecutionHistory.TriggeredBy triggeredBy,
                                   ExecutionRequest request, ExecutionResponse response,
                                   com.automationportal.apitesting.execution.dto.ExecutionContext context,
                                   Map<String, String> injectedVariables) {
        ExecutionHistory h = new ExecutionHistory();
        h.setApiType(apiType);
        h.setApiId(apiId);
        h.setApiName(apiName);
        h.setModuleId(moduleId);
        h.setScheduleId(scheduleId);
        h.setTriggeredBy(triggeredBy);

        if (context != null) {
            h.setGroupId(context.getGroupId());
            h.setGroupExecutionId(context.getGroupExecutionId());
            h.setCorrelationId(context.getCorrelationId());
            h.setExecutedBy(context.getExecutedBy());
        }
        if (injectedVariables != null && !injectedVariables.isEmpty()) {
            h.setInjectedVariables(toJson(injectedVariables));
        }

        h.setRequestMethod(request.getMethod().toUpperCase());
        h.setRequestUrl(truncate(request.getUrl(), 2048));
        h.setRequestHeaders(toJson(maskHeaders(request)));
        h.setRequestBody(request.getBody());

        h.setResponseStatusCode(response.getStatusCode());
        h.setResponseStatusClass(statusClass(response));
        h.setResponseStatusMessage(truncate(response.getStatusText(), 100));
        h.setResponseContentType(truncate(response.getContentType(), 255));
        h.setResponseHeaders(toJson(response.getHeaders()));
        h.setResponseCookies(toJson(extractCookies(response)));
        h.setResponseSizeBytes(response.getSizeBytes());
        h.setTotalTimeMs(response.getDurationMs());
        h.setTtfbMs(response.getTtfbMs() == null ? null : response.getTtfbMs().intValue());
        h.setErrorMessage(truncate(response.getErrorMessage(), 1000));

        Instant finished = Instant.now();
        h.setFinishedAt(finished);
        h.setStartedAt(finished.minusMillis(response.getDurationMs()));

        if (log.isInfoEnabled()) {
            log.info("execution recorded apiType={} apiId={} scheduleId={} groupExecutionId={} correlationId={} status={} timeMs={}",
                    apiType, apiId, scheduleId,
                    context == null ? null : context.getGroupExecutionId(),
                    context == null ? null : context.getCorrelationId(),
                    h.getResponseStatusClass(), h.getTotalTimeMs());
        }

        // Persist first (need the id for the object key), then attach the body.
        h = repository.save(h);

        String body = response.getBody();
        if (body != null && !body.isEmpty()) {
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            if (bytes.length <= inlineBodyMaxBytes) {
                h.setResponseBodyInline(body);
            } else {
                String key = bodyStore.store(h.getId(), bytes);
                if (key != null) {
                    h.setResponseBodyObjectKey(key);
                } else {
                    // Offload failed — keep a truncated inline prefix rather than nothing.
                    h.setResponseBodyInline(new String(bytes, 0, (int) inlineBodyMaxBytes, StandardCharsets.UTF_8));
                }
            }
            h = repository.save(h);
        }
        return h;
    }

    public void markValidation(ExecutionHistory history, boolean passed) {
        history.setValidationPassed(passed);
        repository.save(history);
    }

    /** Set-Cookie values only; cookies never carry other response metadata. */
    private List<String> extractCookies(ExecutionResponse response) {
        if (response.getHeaders() == null) return null;
        return response.getHeaders().entrySet().stream()
                .filter(e -> "set-cookie".equalsIgnoreCase(e.getKey()))
                .flatMap(e -> e.getValue().stream())
                .toList();
    }

    /** Deterministic status classification, computed once at write time. */
    public static String statusClass(ExecutionResponse response) {
        if (response.getStatusCode() != null) {
            int c = response.getStatusCode();
            if (c >= 200 && c < 300) return "2xx";
            if (c >= 300 && c < 400) return "3xx";
            if (c >= 400 && c < 500) return "4xx";
            if (c >= 500 && c < 600) return "5xx";
            return "ERROR";
        }
        return response.isTimedOut() ? "TIMEOUT" : "ERROR";
    }

    private Map<String, String> maskHeaders(ExecutionRequest request) {
        Map<String, String> out = new LinkedHashMap<>();
        if (request.getHeaders() != null) {
            for (KeyValueItem kv : request.getHeaders()) {
                if (kv.isEnabled() && kv.getKey() != null && !kv.getKey().isBlank()) {
                    out.put(kv.getKey(), maskIfSensitive(kv.getKey(), kv.getValue()));
                }
            }
        }
        // Auth applied by the engine is represented masked too, so history shows
        // that an Authorization header was sent without leaking the credential.
        var auth = request.getAuth();
        if (auth != null) {
            switch (auth.getType()) {
                case BASIC -> out.put("Authorization", "Basic ****");
                case BEARER -> out.put("Authorization", mask("Bearer ", auth.getToken()));
                case API_KEY -> {
                    if (auth.getKeyName() != null && !auth.getKeyName().isBlank()
                            && auth.getAddTo() == com.automationportal.apitesting.execution.dto.AuthConfig.ApiKeyLocation.HEADER) {
                        out.put(auth.getKeyName(), mask("", auth.getKeyValue()));
                    }
                }
                default -> { }
            }
        }
        return out;
    }

    private String maskIfSensitive(String name, String value) {
        if (value == null) return null;
        return SENSITIVE_HEADERS.contains(name.toLowerCase()) ? mask("", value) : value;
    }

    private static String mask(String prefix, String secret) {
        if (secret == null || secret.length() <= 4) return prefix + "****";
        return prefix + "****" + secret.substring(secret.length() - 4);
    }

    private String toJson(Object o) {
        if (o == null) return null;
        try {
            return objectMapper.writeValueAsString(o);
        } catch (Exception e) {
            return null;
        }
    }

    private String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
