package com.automationportal.apitesting.validation;

import com.automationportal.apitesting.execution.ExecutionEngineService;
import com.automationportal.apitesting.execution.dto.ExecutionRequest;
import com.automationportal.apitesting.execution.dto.ExecutionResponse;
import com.automationportal.apitesting.execution.dto.FormDataItem;
import com.automationportal.apitesting.execution.dto.KeyValueItem;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Runs a "Business Validation Check": fields the user has manually flagged as
 * business-required (independent of whatever the backend actually enforces) are
 * stripped from one otherwise-valid, already-saved request config, that single
 * variant is executed once, and the response is inspected for each field's key
 * to see whether the backend actually complained about it being missing.
 *
 * Deliberately NOT wired into ScheduleWorker or any recurring run — this is an
 * on-demand check the user triggers manually, kept separate so it never adds
 * extra load to a live/production target on every scheduled cycle.
 */
@Service
@RequiredArgsConstructor
public class BusinessValidationService {

    private final ExecutionEngineService executionEngine;
    private final BusinessValidationRunRepository repository;
    private final ObjectMapper objectMapper;

    public ValidationCheckResult check(ExecutionRequest baseConfig, Long projectId,
                                       BusinessValidationRun.ApiType apiType, Long apiId,
                                       String triggeredByEmail) {
        List<FieldRef> required = collectRequired(baseConfig);
        if (required.isEmpty()) {
            throw new IllegalArgumentException(
                    "No fields are marked Required — mark at least one field before running a validation check.");
        }

        ExecutionRequest variant = strip(baseConfig, required);
        ExecutionResponse response = executionEngine.execute(variant);
        String haystack = (response.getBody() == null ? "" : response.getBody()).toLowerCase();

        List<FieldValidationResult> results = new ArrayList<>();
        int enforcedCount = 0;
        for (FieldRef ref : required) {
            // response.isSuccess() means "a real HTTP response came back" (any status code —
            // even 400/503 count), not "status was 2xx". A false here is a transport-level
            // failure (network/timeout/DNS), which never counts as "enforced" — that would
            // misreport an unrelated infra issue as a passing business rule.
            boolean enforced = response.isSuccess() && mentionsField(haystack, ref.key);
            FieldValidationResult r = new FieldValidationResult();
            r.setKey(ref.key);
            r.setSource(ref.source);
            r.setEnforced(enforced);
            results.add(r);
            if (enforced) enforcedCount++;
        }

        BusinessValidationRun run = new BusinessValidationRun();
        run.setProjectId(projectId);
        run.setApiType(apiType);
        run.setApiId(apiId);
        run.setTotalRequired(required.size());
        run.setEnforcedCount(enforcedCount);
        run.setResponseStatusCode(response.getStatusCode());
        run.setFieldResults(toJson(results));
        run.setTriggeredByEmail(triggeredByEmail);
        run = repository.save(run);

        return ValidationCheckResult.builder()
                .id(run.getId())
                .totalRequired(run.getTotalRequired())
                .enforcedCount(run.getEnforcedCount())
                .responseStatusCode(run.getResponseStatusCode())
                .fields(results)
                .createdAt(run.getCreatedAt())
                .build();
    }

    public List<ValidationCheckResult> history(Long projectId, BusinessValidationRun.ApiType apiType, Long apiId) {
        return repository.findByProjectIdAndApiTypeAndApiIdOrderByCreatedAtDesc(projectId, apiType, apiId)
                .stream().map(this::toResult).toList();
    }

    public ValidationCheckResult latest(Long projectId, BusinessValidationRun.ApiType apiType, Long apiId) {
        return repository.findFirstByProjectIdAndApiTypeAndApiIdOrderByCreatedAtDesc(projectId, apiType, apiId)
                .map(this::toResult).orElse(null);
    }

    private boolean mentionsField(String haystackLower, String key) {
        if (key == null || key.isBlank()) return false;
        Pattern p = Pattern.compile("\\b" + Pattern.quote(key.toLowerCase()) + "\\b");
        return p.matcher(haystackLower).find();
    }

    private record FieldRef(String key, String source) { }

    private List<FieldRef> collectRequired(ExecutionRequest config) {
        List<FieldRef> out = new ArrayList<>();
        for (KeyValueItem h : config.getHeaders()) {
            if (h.isRequired() && h.isEnabled() && h.getKey() != null && !h.getKey().isBlank()) {
                out.add(new FieldRef(h.getKey(), "HEADER"));
            }
        }
        for (KeyValueItem q : config.getQueryParams()) {
            if (q.isRequired() && q.isEnabled() && q.getKey() != null && !q.getKey().isBlank()) {
                out.add(new FieldRef(q.getKey(), "QUERY_PARAM"));
            }
        }
        if (config.getBodyType() == ExecutionRequest.BodyType.FORM_DATA) {
            for (FormDataItem f : config.getFormData()) {
                if (f.isRequired() && f.isEnabled() && f.getKey() != null && !f.getKey().isBlank()) {
                    out.add(new FieldRef(f.getKey(), "FORM_DATA"));
                }
            }
        }
        return out;
    }

    /** Disables (never removes — keeps list indices stable) every required field so the
     * existing enabled-checks already in ExecutionEngineService naturally omit them from
     * the outgoing request, exactly like a user manually unchecking a row. */
    private ExecutionRequest strip(ExecutionRequest baseConfig, List<FieldRef> required) {
        String json = toJson(baseConfig);
        ExecutionRequest variant = fromJson(json, ExecutionRequest.class);

        for (KeyValueItem h : variant.getHeaders()) {
            if (h.isRequired()) h.setEnabled(false);
        }
        for (KeyValueItem q : variant.getQueryParams()) {
            if (q.isRequired()) q.setEnabled(false);
        }
        for (FormDataItem f : variant.getFormData()) {
            if (f.isRequired()) f.setEnabled(false);
        }
        return variant;
    }

    private ValidationCheckResult toResult(BusinessValidationRun run) {
        List<FieldValidationResult> fields = fromJson(run.getFieldResults(),
                objectMapper.getTypeFactory().constructCollectionType(List.class, FieldValidationResult.class));
        return ValidationCheckResult.builder()
                .id(run.getId())
                .totalRequired(run.getTotalRequired())
                .enforcedCount(run.getEnforcedCount())
                .responseStatusCode(run.getResponseStatusCode())
                .fields(fields)
                .createdAt(run.getCreatedAt())
                .build();
    }

    private String toJson(Object o) {
        try {
            return objectMapper.writeValueAsString(o);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize validation check data", e);
        }
    }

    private <T> T fromJson(String json, Class<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to read validation check data", e);
        }
    }

    private <T> T fromJson(String json, com.fasterxml.jackson.databind.JavaType type) {
        try {
            if (json == null || json.isBlank()) return null;
            return objectMapper.readValue(json, type);
        } catch (Exception e) {
            return null;
        }
    }
}
