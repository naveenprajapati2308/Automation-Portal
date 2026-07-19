package com.automationportal.executions;

import jakarta.validation.constraints.NotNull;

public record RunExecutionRequest(
    @NotNull ExecutionType executionType,
    @NotNull Long environmentId,
    String moduleCode,
    String suiteXmlPath
) {
}
