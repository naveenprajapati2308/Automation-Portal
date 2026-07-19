package com.automationportal.apitesting.validation;

import com.automationportal.apitesting.history.ExecutionHistory;
import com.jayway.jsonpath.Configuration;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.Option;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Evaluates active validation rules against an execution's response body and
 * persists one ValidationResult per rule. Overall pass = all active rules pass.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ValidationEngine {

    private static final Configuration JSONPATH_CONFIG = Configuration.builder()
            .options(Option.SUPPRESS_EXCEPTIONS)
            .build();

    private final ApiValidationRuleRepository ruleRepository;
    private final ValidationResultRepository resultRepository;

    /**
     * Runs all active rules for the API against the body.
     * Returns null when there are no active rules (nothing to judge),
     * otherwise the overall pass/fail.
     */
    public Boolean validate(ExecutionHistory.ApiType apiType, Long apiId,
                            Long executionHistoryId, String responseBody) {
        List<ApiValidationRule> rules = ruleRepository.findByApiTypeAndApiIdAndIsActiveTrue(apiType, apiId);
        if (rules.isEmpty()) return null;

        Object document = parseSafely(responseBody);
        boolean allPassed = true;
        List<ValidationResult> results = new ArrayList<>();

        for (ApiValidationRule rule : rules) {
            Object actual = (document == null) ? null : JsonPath.using(JSONPATH_CONFIG).parse(document).read(rule.getJsonPath());
            boolean passed = evaluate(rule, actual, document != null);
            allPassed &= passed;

            ValidationResult r = new ValidationResult();
            r.setExecutionHistoryId(executionHistoryId);
            r.setRuleId(rule.getId());
            r.setPassed(passed);
            r.setActualValue(stringify(actual));
            results.add(r);
        }
        resultRepository.saveAll(results);
        return allPassed;
    }

    private boolean evaluate(ApiValidationRule rule, Object actual, boolean bodyParseable) {
        String expected = rule.getExpectedValue();
        return switch (rule.getOperator()) {
            case EXISTS -> bodyParseable && actual != null;
            case EQUALS -> actual != null && valueEquals(actual, expected);
            case NOT_EQUALS -> actual == null || !valueEquals(actual, expected);
            case CONTAINS -> contains(actual, expected);
            case REGEX -> actual != null && expected != null
                    && Pattern.compile(expected).matcher(String.valueOf(stringify(actual))).find();
            case TYPE_IS -> typeIs(actual, expected);
            case RANGE -> inRange(actual, expected);
        };
    }

    private boolean valueEquals(Object actual, String expected) {
        if (expected == null) return false;
        if (actual instanceof Number n) {
            try {
                return Double.compare(n.doubleValue(), Double.parseDouble(expected.trim())) == 0;
            } catch (NumberFormatException e) {
                return false;
            }
        }
        if (actual instanceof Boolean b) {
            return String.valueOf(b).equalsIgnoreCase(expected.trim());
        }
        return String.valueOf(actual).equals(expected);
    }

    private boolean contains(Object actual, String expected) {
        if (actual == null || expected == null) return false;
        if (actual instanceof Collection<?> c) {
            return c.stream().anyMatch(item -> String.valueOf(item).equals(expected));
        }
        return String.valueOf(actual).contains(expected);
    }

    private boolean typeIs(Object actual, String expected) {
        if (expected == null) return false;
        String type = expected.trim().toLowerCase();
        return switch (type) {
            case "string" -> actual instanceof String;
            case "number" -> actual instanceof Number;
            case "boolean" -> actual instanceof Boolean;
            case "array" -> actual instanceof Collection;
            case "object" -> actual instanceof Map;
            case "null" -> actual == null;
            default -> false;
        };
    }

    private boolean inRange(Object actual, String expected) {
        if (!(actual instanceof Number n) || expected == null) return false;
        String[] parts = expected.split(",");
        if (parts.length != 2) return false;
        try {
            double min = Double.parseDouble(parts[0].trim());
            double max = Double.parseDouble(parts[1].trim());
            double v = n.doubleValue();
            return v >= min && v <= max;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    private Object parseSafely(String body) {
        if (body == null || body.isBlank()) return null;
        try {
            return Configuration.defaultConfiguration().jsonProvider().parse(body);
        } catch (Exception e) {
            return null;
        }
    }

    private String stringify(Object o) {
        if (o == null) return null;
        String s = String.valueOf(o);
        return s.length() > 1000 ? s.substring(0, 1000) : s;
    }
}
