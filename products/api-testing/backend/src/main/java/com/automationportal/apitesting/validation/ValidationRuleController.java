package com.automationportal.apitesting.validation;

import com.automationportal.apitesting.baseapi.BaseApiRepository;
import com.automationportal.apitesting.collections.ApiCollectionRepository;
import com.automationportal.apitesting.history.ExecutionHistory;
import com.automationportal.apitesting.regularapi.RegularApiRepository;
import com.automationportal.apitesting.security.CurrentProjectService;
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
@RequestMapping("/api/v1/validation-rules")
@RequiredArgsConstructor
public class ValidationRuleController {

    private final ApiValidationRuleRepository repository;
    private final BaseApiRepository baseApiRepository;
    private final RegularApiRepository regularApiRepository;
    private final ApiCollectionRepository apiCollectionRepository;
    private final CurrentProjectService currentProjectService;

    @Data
    public static class RulePayload {
        @NotNull private ExecutionHistory.ApiType apiType;
        @NotNull private Long apiId;
        @NotBlank private String jsonPath;
        @NotNull private ApiValidationRule.Operator operator;
        private String expectedValue;
        private boolean active = true;
    }

    @GetMapping
    public List<ApiValidationRule> list(@RequestParam ExecutionHistory.ApiType apiType,
                                        @RequestParam Long apiId) {
        requireApiOwnership(apiType, apiId);
        return repository.findByApiTypeAndApiId(apiType, apiId);
    }

    @PostMapping
    public ApiValidationRule create(@Valid @RequestBody RulePayload payload) {
        requireApiOwnership(payload.getApiType(), payload.getApiId());
        ApiValidationRule rule = new ApiValidationRule();
        rule.setApiType(payload.getApiType());
        rule.setApiId(payload.getApiId());
        rule.setJsonPath(payload.getJsonPath());
        rule.setOperator(payload.getOperator());
        rule.setExpectedValue(payload.getExpectedValue());
        rule.setActive(payload.isActive());
        return repository.save(rule);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        ApiValidationRule rule = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Validation rule not found"));
        requireApiOwnership(rule.getApiType(), rule.getApiId());
        repository.deleteById(id);
    }

    private void requireApiOwnership(ExecutionHistory.ApiType apiType, Long apiId) {
        Long projectId = currentProjectService.requireProjectId();
        boolean owned = switch (apiType) {
            case BASE -> baseApiRepository.findById(apiId).map(a -> projectId.equals(a.getProjectId())).orElse(false);
            case REGULAR -> regularApiRepository.findById(apiId).map(a -> projectId.equals(a.getProjectId())).orElse(false);
            case COLLECTION -> apiCollectionRepository.findById(apiId).map(c -> projectId.equals(c.getProjectId())).orElse(false);
        };
        if (!owned) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "API not found");
        }
    }
}
