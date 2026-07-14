package com.automationportal.apitesting.execution.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Correlation metadata threaded through an execution chain (group run →
 * regular API → base API dependencies) so every history row produced by one
 * logical run shares the same correlationId and group linkage.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExecutionContext {

    private Long groupId;
    private Long groupExecutionId;
    private String correlationId;
    private String executedBy;

    /** Standalone context for a single ad-hoc run: fresh correlation id only. */
    public static ExecutionContext standalone() {
        return ExecutionContext.builder()
                .correlationId(UUID.randomUUID().toString())
                .build();
    }
}
