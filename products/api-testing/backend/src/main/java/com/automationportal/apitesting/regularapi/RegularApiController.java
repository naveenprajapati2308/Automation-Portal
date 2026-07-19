package com.automationportal.apitesting.regularapi;

import com.automationportal.apitesting.baseapi.ApiVariableBinding;
import com.automationportal.apitesting.baseapi.ApiVariableBindingRepository;
import com.automationportal.apitesting.history.ExecutionHistory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/regular-apis")
@RequiredArgsConstructor
public class RegularApiController {

    private final RegularApiRepository repository;
    private final ApiVariableBindingRepository bindingRepository;
    private final DependencyExecutionService dependencyExecutionService;
    private final com.automationportal.apitesting.audit.AuditService auditService;

    @Data
    public static class RegularApiPayload {
        @NotBlank private String name;
        @NotBlank private String method;
        @NotBlank private String urlTemplate;
        private Long moduleId;
        private String headersTemplate;
        private String queryParamsTemplate;
        private String bodyType;
        private String bodyTemplate;
        private String authType;
        private String authConfig;
        private boolean dynamic;
        private int timeoutMs = 15000;
        private boolean followRedirects = true;
        private boolean verifySsl = true;
    }

    @Data
    public static class BindingPayload {
        @NotNull private Long baseApiId;
        @NotBlank private String sourceJsonPath;
        @NotBlank private String variableName;
    }

    @GetMapping
    public List<RegularApi> list(@RequestParam(required = false) Long moduleId) {
        return moduleId == null ? repository.findAll() : repository.findByModuleId(moduleId);
    }

    @GetMapping("/{id}")
    public RegularApi get(@PathVariable Long id) {
        return find(id);
    }

    @PostMapping
    public RegularApi create(@Valid @RequestBody RegularApiPayload payload) {
        RegularApi api = new RegularApi();
        apply(api, payload);
        api = repository.save(api);
        audit(api.getId(), com.automationportal.apitesting.audit.AuditLog.Action.CREATE,
                "Created regular API '" + api.getName() + "'");
        return api;
    }

    @PutMapping("/{id}")
    public RegularApi update(@PathVariable Long id, @Valid @RequestBody RegularApiPayload payload) {
        RegularApi api = find(id);
        apply(api, payload);
        api = repository.save(api);
        audit(id, com.automationportal.apitesting.audit.AuditLog.Action.UPDATE,
                "Updated regular API '" + api.getName() + "'");
        return api;
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repository.findById(id).ifPresent(api ->
                audit(id, com.automationportal.apitesting.audit.AuditLog.Action.DELETE,
                        "Deleted regular API '" + api.getName() + "'"));
        repository.deleteById(id);
    }

    /** Resolves dependencies, executes, auto-runs validation, records history. */
    @PostMapping("/{id}/execute")
    public DependencyExecutionService.RegularExecutionResult execute(@PathVariable Long id) {
        return dependencyExecutionService.execute(find(id), ExecutionHistory.TriggeredBy.MANUAL, null);
    }

    @GetMapping("/{id}/bindings")
    public List<ApiVariableBinding> bindings(@PathVariable Long id) {
        find(id);
        return bindingRepository.findByRegularApiId(id);
    }

    /** Bind a base-API variable into this regular API. */
    @PostMapping("/{id}/bindings")
    public ApiVariableBinding addBinding(@PathVariable Long id, @Valid @RequestBody BindingPayload payload) {
        find(id);
        ApiVariableBinding b = new ApiVariableBinding();
        b.setRegularApiId(id);
        b.setBaseApiId(payload.getBaseApiId());
        b.setSourceJsonPath(payload.getSourceJsonPath());
        b.setVariableName(payload.getVariableName());
        try {
            b = bindingRepository.save(b);
            auditService.record(com.automationportal.apitesting.audit.AuditLog.EntityType.BINDING, b.getId(),
                    com.automationportal.apitesting.audit.AuditLog.Action.CREATE,
                    "Bound {{" + payload.getVariableName() + "}} from base API #" + payload.getBaseApiId()
                            + " into regular API #" + id);
            return b;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Variable '" + payload.getVariableName() + "' is already bound for this API");
        }
    }

    @DeleteMapping("/{id}/bindings/{bindingId}")
    public void deleteBinding(@PathVariable Long id, @PathVariable Long bindingId) {
        ApiVariableBinding b = bindingRepository.findById(bindingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Binding not found"));
        if (b.getRegularApiId() == null || !b.getRegularApiId().equals(id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Binding does not belong to this API");
        }
        bindingRepository.delete(b);
        auditService.record(com.automationportal.apitesting.audit.AuditLog.EntityType.BINDING, bindingId,
                com.automationportal.apitesting.audit.AuditLog.Action.DELETE,
                "Removed binding {{" + b.getVariableName() + "}} from regular API #" + id);
    }

    private RegularApi find(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Regular API not found"));
    }

    private void audit(Long id, com.automationportal.apitesting.audit.AuditLog.Action action, String details) {
        auditService.record(com.automationportal.apitesting.audit.AuditLog.EntityType.REGULAR_API, id, action, details);
    }

    private void apply(RegularApi api, RegularApiPayload p) {
        api.setName(p.getName());
        api.setMethod(p.getMethod().toUpperCase());
        api.setUrlTemplate(p.getUrlTemplate());
        api.setModuleId(p.getModuleId());
        api.setHeadersTemplate(p.getHeadersTemplate());
        api.setQueryParamsTemplate(p.getQueryParamsTemplate());
        api.setBodyType(p.getBodyType());
        api.setBodyTemplate(p.getBodyTemplate());
        api.setAuthType(p.getAuthType());
        api.setAuthConfig(p.getAuthConfig());
        api.setDynamic(p.isDynamic());
        api.setTimeoutMs(p.getTimeoutMs());
        api.setFollowRedirects(p.isFollowRedirects());
        api.setVerifySsl(p.isVerifySsl());
    }
}
