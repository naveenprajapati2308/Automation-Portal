package com.automationportal.apitesting.execution.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Correlation metadata threaded through an execution chain (group run →
 * regular API → base API dependencies) so every history row produced by one
 * logical run shares the same correlationId and group linkage.
 *
 * Also carries per-run resolution state so a multi-hop dependency chain
 * (Regular -> Regular -> Base) behaves as one consistent run: each Base or
 * Regular dependency executes at most once no matter how many nodes in the
 * chain need its value (baseApiCache / regularApiCache), reserved dynamic
 * placeholders like {{$randomMobile}} resolve to the same value everywhere
 * they appear (dynamicValueCache), and a Regular API can't depend on itself
 * transitively (regularApiCallStack).
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

    @Builder.Default
    private Map<Long, String> baseApiCache = new HashMap<>();
    @Builder.Default
    private Map<Long, String> regularApiCache = new HashMap<>();
    @Builder.Default
    private Map<String, String> dynamicValueCache = new HashMap<>();
    @Builder.Default
    private Set<Long> regularApiCallStack = new HashSet<>();

    /** Standalone context for a single ad-hoc run: fresh correlation id only. */
    public static ExecutionContext standalone() {
        return ExecutionContext.builder()
                .correlationId(UUID.randomUUID().toString())
                .build();
    }
}
