package com.automationportal.apitesting.validation;

import com.automationportal.apitesting.history.ExecutionHistory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/validation-rules")
@RequiredArgsConstructor
public class ValidationRuleController {

    private final ApiValidationRuleRepository repository;

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
        return repository.findByApiTypeAndApiId(apiType, apiId);
    }

    @PostMapping
    public ApiValidationRule create(@Valid @RequestBody RulePayload payload) {
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
        repository.deleteById(id);
    }
}
