package com.automationportal.apitesting.baseapi;

import com.automationportal.apitesting.common.RequestConfigMapper;
import com.automationportal.apitesting.execution.ExecutionEngineService;
import com.automationportal.apitesting.execution.dto.ExecutionContext;
import com.automationportal.apitesting.execution.dto.ExecutionRequest;
import com.automationportal.apitesting.execution.dto.ExecutionResponse;
import com.automationportal.apitesting.history.ExecutionHistory;
import com.automationportal.apitesting.history.ExecutionHistoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

/**
 * Executes Base APIs and manages their cached responses.
 *
 * Cache semantics (spec §4):
 *  - PER_CALL: always execute fresh.
 *  - CACHED_TTL: Redis first (shared across instances), refresh on miss/expiry.
 *  - SCHEDULED_REFRESH: never block on a live call; read latest cached value
 *    (Redis, falling back to the DB snapshot).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BaseApiExecutionService {

    private final BaseApiRepository repository;
    private final ExecutionEngineService engine;
    private final ExecutionHistoryService historyService;
    private final RequestConfigMapper configMapper;
    private final StringRedisTemplate redis;

    public record CachedResult(String body, boolean freshlyExecuted) { }

    /** Manual "Run" from the UI: always executes, refreshes snapshot + cache. */
    public ExecutionResponse executeManually(BaseApi api) {
        ExecutionResponse response = executeAndRecord(api, ExecutionHistory.TriggeredBy.MANUAL,
                ExecutionContext.standalone());
        return response;
    }

    public CachedResult resolveForDependency(BaseApi api) {
        return resolveForDependency(api, ExecutionContext.standalone());
    }

    /**
     * Resolves the response body for dependency resolution, honoring the cache
     * strategy. Returns null body if execution fails. The context ties any live
     * execution into the caller's correlation/group chain.
     */
    public CachedResult resolveForDependency(BaseApi api, ExecutionContext context) {
        switch (api.getCacheStrategy()) {
            case CACHED_TTL -> {
                String cached = cacheGet(api.getId());
                if (cached != null) {
                    return new CachedResult(cached, false);
                }
                ExecutionResponse resp = executeAndRecord(api, ExecutionHistory.TriggeredBy.CHAIN_DEPENDENCY, context);
                return new CachedResult(resp.isSuccess() ? resp.getBody() : null, true);
            }
            case SCHEDULED_REFRESH -> {
                String cached = cacheGet(api.getId());
                if (cached != null) return new CachedResult(cached, false);
                // Cold start: fall back to the last DB snapshot, never a live call.
                return new CachedResult(api.getLastResponseSnapshot(), false);
            }
            default -> {
                ExecutionResponse resp = executeAndRecord(api, ExecutionHistory.TriggeredBy.CHAIN_DEPENDENCY, context);
                return new CachedResult(resp.isSuccess() ? resp.getBody() : null, true);
            }
        }
    }

    /** Used by schedules that keep SCHEDULED_REFRESH base APIs warm. */
    public ExecutionResponse executeAndRecord(BaseApi api, ExecutionHistory.TriggeredBy trigger) {
        return executeAndRecord(api, trigger, ExecutionContext.standalone());
    }

    public ExecutionResponse executeAndRecord(BaseApi api, ExecutionHistory.TriggeredBy trigger,
                                              ExecutionContext context) {
        ExecutionRequest request = toExecutionRequest(api);
        ExecutionResponse response = engine.execute(request);

        historyService.record(ExecutionHistory.ApiType.BASE, api.getId(), api.getName(),
                api.getModuleId(), null, trigger, request, response, context, null);

        if (response.isSuccess()) {
            api.setLastExecutedAt(Instant.now());
            api.setLastResponseSnapshot(response.getBody());
            repository.save(api);
            cachePut(api, response.getBody());
        }
        return response;
    }

    public ExecutionRequest toExecutionRequest(BaseApi api) {
        ExecutionRequest req = new ExecutionRequest();
        req.setMethod(api.getMethod());
        req.setUrl(api.getUrl());
        req.setHeaders(configMapper.keyValues(api.getHeaders()));
        req.setBodyType(parseBodyType(api.getBodyType()));
        req.setBody(api.getBody());
        req.setAuth(configMapper.auth(api.getAuthConfig()));
        req.setTimeoutMs(api.getTimeoutMs());
        return req;
    }

    private ExecutionRequest.BodyType parseBodyType(String s) {
        if (s == null || s.isBlank()) return ExecutionRequest.BodyType.NONE;
        try {
            return ExecutionRequest.BodyType.valueOf(s);
        } catch (IllegalArgumentException e) {
            return ExecutionRequest.BodyType.NONE;
        }
    }

    private String cacheKey(Long id) {
        return "base_api:" + id + ":cache";
    }

    private String cacheGet(Long id) {
        try {
            return redis.opsForValue().get(cacheKey(id));
        } catch (Exception e) {
            log.debug("Redis unavailable, cache miss for base api {}", id);
            return null;
        }
    }

    private void cachePut(BaseApi api, String body) {
        if (body == null) return;
        try {
            if (api.getCacheStrategy() == BaseApi.CacheStrategy.CACHED_TTL && api.getCacheTtlSeconds() != null) {
                redis.opsForValue().set(cacheKey(api.getId()), body, Duration.ofSeconds(api.getCacheTtlSeconds()));
            } else if (api.getCacheStrategy() == BaseApi.CacheStrategy.SCHEDULED_REFRESH) {
                redis.opsForValue().set(cacheKey(api.getId()), body);
            }
        } catch (Exception e) {
            log.debug("Redis unavailable, skipping cache write for base api {}", api.getId());
        }
    }
}
