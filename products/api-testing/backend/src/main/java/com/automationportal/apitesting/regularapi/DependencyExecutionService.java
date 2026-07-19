package com.automationportal.apitesting.regularapi;

import com.automationportal.apitesting.baseapi.ApiVariableBinding;
import com.automationportal.apitesting.baseapi.ApiVariableBindingRepository;
import com.automationportal.apitesting.baseapi.BaseApi;
import com.automationportal.apitesting.baseapi.BaseApiExecutionService;
import com.automationportal.apitesting.baseapi.BaseApiRepository;
import com.automationportal.apitesting.common.RequestConfigMapper;
import com.automationportal.apitesting.execution.ExecutionEngineService;
import com.automationportal.apitesting.execution.dto.ExecutionContext;
import com.automationportal.apitesting.execution.dto.ExecutionRequest;
import com.automationportal.apitesting.execution.dto.ExecutionResponse;
import com.automationportal.apitesting.execution.dto.KeyValueItem;
import com.automationportal.apitesting.history.ExecutionHistory;
import com.automationportal.apitesting.history.ExecutionHistoryService;
import com.automationportal.apitesting.validation.ValidationEngine;
import com.jayway.jsonpath.Configuration;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.Option;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Executes a Regular API: resolves Base API dependencies (per cache strategy),
 * extracts bound variables via JSONPath, substitutes {{placeholders}} in the
 * templates, executes the resolved request, runs validation rules, and records
 * everything to history. Never sends a request containing an unresolved
 * {{placeholder}}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DependencyExecutionService {

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{\\s*([a-zA-Z0-9_.-]+)\\s*}}");
    private static final Configuration JSONPATH_CONFIG = Configuration.builder()
            .options(Option.SUPPRESS_EXCEPTIONS).build();

    private final RegularApiRepository regularApiRepository;
    private final BaseApiRepository baseApiRepository;
    private final ApiVariableBindingRepository bindingRepository;
    private final BaseApiExecutionService baseApiExecutionService;
    private final ExecutionEngineService engine;
    private final ExecutionHistoryService historyService;
    private final ValidationEngine validationEngine;
    private final RequestConfigMapper configMapper;

    @Data
    public static class RegularExecutionResult {
        private ExecutionResponse response;
        private Long executionHistoryId;
        private Boolean validationPassed;
        private Map<String, String> resolvedVariables = new HashMap<>();
    }

    public RegularExecutionResult execute(RegularApi api, ExecutionHistory.TriggeredBy trigger, Long scheduleId) {
        return execute(api, trigger, scheduleId, ExecutionContext.standalone());
    }

    public RegularExecutionResult execute(RegularApi api, ExecutionHistory.TriggeredBy trigger, Long scheduleId,
                                          ExecutionContext context) {
        RegularExecutionResult result = new RegularExecutionResult();
        ExecutionRequest request = buildRequest(api);
        log.info("executing regular api id={} name='{}' trigger={} scheduleId={} correlationId={}",
                api.getId(), api.getName(), trigger, scheduleId, context.getCorrelationId());

        // 1. Resolve dependencies if dynamic
        if (api.isDynamic()) {
            try {
                Map<String, String> variables = resolveVariables(api, context);
                result.setResolvedVariables(maskValues(variables));
                substitute(request, variables);
            } catch (DependencyResolutionException ex) {
                ExecutionResponse failed = ExecutionResponse.builder()
                        .success(false)
                        .errorMessage(ex.getMessage())
                        .durationMs(0)
                        .build();
                ExecutionHistory h = historyService.record(ExecutionHistory.ApiType.REGULAR, api.getId(),
                        api.getName(), api.getModuleId(), scheduleId, trigger, request, failed,
                        context, result.getResolvedVariables());
                result.setResponse(failed);
                result.setExecutionHistoryId(h.getId());
                return result;
            }
        }

        // 2. Guard: no unresolved placeholders may leave the platform
        String unresolved = firstUnresolvedPlaceholder(request);
        if (unresolved != null) {
            ExecutionResponse failed = ExecutionResponse.builder()
                    .success(false)
                    .errorMessage("Unresolved variable {{" + unresolved + "}} — no binding provides it. "
                            + (api.isDynamic() ? "Check the API's variable bindings." : "Enable dynamic data and bind it to a Base API."))
                    .durationMs(0)
                    .build();
            ExecutionHistory h = historyService.record(ExecutionHistory.ApiType.REGULAR, api.getId(),
                    api.getName(), api.getModuleId(), scheduleId, trigger, request, failed,
                    context, result.getResolvedVariables());
            result.setResponse(failed);
            result.setExecutionHistoryId(h.getId());
            return result;
        }

        // 3. Execute + record
        ExecutionResponse response = engine.execute(request);
        ExecutionHistory history = historyService.record(ExecutionHistory.ApiType.REGULAR, api.getId(),
                api.getName(), api.getModuleId(), scheduleId, trigger, request, response,
                context, result.getResolvedVariables());

        // 4. Auto-run validation rules
        Boolean passed = validationEngine.validate(ExecutionHistory.ApiType.REGULAR, api.getId(),
                history.getId(), response.getBody());
        if (passed != null) {
            historyService.markValidation(history, passed);
        }

        result.setResponse(response);
        result.setExecutionHistoryId(history.getId());
        result.setValidationPassed(passed);
        return result;
    }

    // ------------------------------------------------------------------

    private static class DependencyResolutionException extends RuntimeException {
        DependencyResolutionException(String message) {
            super(message);
        }
    }

    private Map<String, String> resolveVariables(RegularApi api, ExecutionContext context) {
        List<ApiVariableBinding> bindings = bindingRepository.findByRegularApiId(api.getId());
        Map<String, String> variables = new HashMap<>();

        // Group by base API so each dependency executes at most once per run
        Set<Long> baseIds = new LinkedHashSet<>();
        bindings.forEach(b -> baseIds.add(b.getBaseApiId()));

        Map<Long, String> baseBodies = new HashMap<>();
        for (Long baseId : baseIds) {
            BaseApi base = baseApiRepository.findById(baseId)
                    .orElseThrow(() -> new DependencyResolutionException(
                            "Dependency Base API #" + baseId + " no longer exists"));
            BaseApiExecutionService.CachedResult cached = baseApiExecutionService.resolveForDependency(base, context);
            if (cached.body() == null) {
                throw new DependencyResolutionException(
                        "Dependency Base API '" + base.getName() + "' could not be resolved (execution failed or no cached value)");
            }
            baseBodies.put(baseId, cached.body());
        }

        for (ApiVariableBinding b : bindings) {
            Object value = JsonPath.using(JSONPATH_CONFIG)
                    .parse(baseBodies.get(b.getBaseApiId()))
                    .read(b.getSourceJsonPath());
            if (value == null) {
                BaseApi base = baseApiRepository.findById(b.getBaseApiId()).orElse(null);
                throw new DependencyResolutionException(
                        "Dependency '" + b.getVariableName() + "' could not be resolved: path "
                                + b.getSourceJsonPath() + " not found in Base API '"
                                + (base != null ? base.getName() : b.getBaseApiId()) + "' response");
            }
            variables.put(b.getVariableName(), String.valueOf(value));
        }
        return variables;
    }

    private ExecutionRequest buildRequest(RegularApi api) {
        ExecutionRequest req = new ExecutionRequest();
        req.setMethod(api.getMethod());
        req.setUrl(api.getUrlTemplate());
        req.setHeaders(configMapper.keyValues(api.getHeadersTemplate()));
        req.setQueryParams(configMapper.keyValues(api.getQueryParamsTemplate()));
        req.setBodyType(parseBodyType(api.getBodyType()));
        req.setBody(api.getBodyTemplate());
        req.setAuth(configMapper.auth(api.getAuthConfig()));
        req.setTimeoutMs(api.getTimeoutMs());
        req.setFollowRedirects(api.isFollowRedirects());
        req.setVerifySsl(api.isVerifySsl());
        return req;
    }

    private void substitute(ExecutionRequest req, Map<String, String> variables) {
        req.setUrl(substitute(req.getUrl(), variables));
        req.setBody(substitute(req.getBody(), variables));
        for (KeyValueItem h : req.getHeaders()) {
            h.setKey(substitute(h.getKey(), variables));
            h.setValue(substitute(h.getValue(), variables));
        }
        for (KeyValueItem q : req.getQueryParams()) {
            q.setKey(substitute(q.getKey(), variables));
            q.setValue(substitute(q.getValue(), variables));
        }
        var auth = req.getAuth();
        if (auth != null) {
            auth.setToken(substitute(auth.getToken(), variables));
            auth.setUsername(substitute(auth.getUsername(), variables));
            auth.setPassword(substitute(auth.getPassword(), variables));
            auth.setKeyValue(substitute(auth.getKeyValue(), variables));
        }
    }

    private String substitute(String template, Map<String, String> variables) {
        if (template == null || template.isEmpty()) return template;
        Matcher m = PLACEHOLDER.matcher(template);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String name = m.group(1);
            String replacement = variables.get(name);
            m.appendReplacement(sb, Matcher.quoteReplacement(replacement != null ? replacement : m.group(0)));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private String firstUnresolvedPlaceholder(ExecutionRequest req) {
        for (String s : collectTemplates(req)) {
            if (s == null) continue;
            Matcher m = PLACEHOLDER.matcher(s);
            if (m.find()) return m.group(1);
        }
        return null;
    }

    private List<String> collectTemplates(ExecutionRequest req) {
        List<String> all = new java.util.ArrayList<>();
        all.add(req.getUrl());
        all.add(req.getBody());
        req.getHeaders().forEach(h -> { all.add(h.getKey()); all.add(h.getValue()); });
        req.getQueryParams().forEach(q -> { all.add(q.getKey()); all.add(q.getValue()); });
        if (req.getAuth() != null) {
            all.add(req.getAuth().getToken());
            all.add(req.getAuth().getUsername());
            all.add(req.getAuth().getPassword());
            all.add(req.getAuth().getKeyValue());
        }
        return all;
    }

    private Map<String, String> maskValues(Map<String, String> variables) {
        Map<String, String> masked = new HashMap<>();
        variables.forEach((k, v) -> masked.put(k,
                v == null || v.length() <= 4 ? "****" : "****" + v.substring(v.length() - 4)));
        return masked;
    }

    private ExecutionRequest.BodyType parseBodyType(String s) {
        if (s == null || s.isBlank()) return ExecutionRequest.BodyType.NONE;
        try {
            return ExecutionRequest.BodyType.valueOf(s);
        } catch (IllegalArgumentException e) {
            return ExecutionRequest.BodyType.NONE;
        }
    }
}
