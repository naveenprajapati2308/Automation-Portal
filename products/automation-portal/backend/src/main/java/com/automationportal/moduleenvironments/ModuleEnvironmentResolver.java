package com.automationportal.moduleenvironments;

import java.util.Arrays;
import java.util.List;

/**
 * Pure resolution rules for a Module + Environment combination's overridable settings.
 * A NULL/blank override on the mapping means "inherit the environment/framework default" —
 * shared by both the public /options endpoint (browsers/baseUrl/timeout only, no secrets)
 * and ExecutionWorker's full config-merge at run time.
 */
public final class ModuleEnvironmentResolver {
    private ModuleEnvironmentResolver() {
    }

    public static List<String> resolveBrowsers(ModuleEnvironmentEntity mapping, List<String> frameworkBrowsers) {
        if (mapping != null && mapping.getBrowsers() != null && !mapping.getBrowsers().isBlank()) {
            return Arrays.stream(mapping.getBrowsers().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        }
        return frameworkBrowsers != null ? frameworkBrowsers : List.of();
    }

    public static String resolveBaseUrl(ModuleEnvironmentEntity mapping, String environmentBaseUrl) {
        if (mapping != null && mapping.getBaseUrl() != null && !mapping.getBaseUrl().isBlank()) {
            return mapping.getBaseUrl();
        }
        return environmentBaseUrl;
    }

    public static int resolveTimeoutMinutes(ModuleEnvironmentEntity mapping, int defaultMinutes) {
        if (mapping != null && mapping.getTimeoutMinutes() != null) {
            return mapping.getTimeoutMinutes();
        }
        return defaultMinutes;
    }
}
