package com.automationportal.apitesting.validation;

/** Flattened validation result joined with its rule, for history detail views. */
public record ValidationResultView(
        Long id,
        Long ruleId,
        String jsonPath,
        String operator,
        String expectedValue,
        boolean passed,
        String actualValue
) {
}
