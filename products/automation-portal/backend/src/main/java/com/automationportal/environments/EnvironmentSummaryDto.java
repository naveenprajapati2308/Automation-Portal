package com.automationportal.environments;

/**
 * Non-secret projection of EnvironmentEntity for endpoints any authenticated user can call
 * (dropdown/selector data only). Deliberately excludes configJson — that stays admin-only,
 * same rule ModuleController.environmentOptions() already follows for module/env options.
 */
public record EnvironmentSummaryDto(Long id, String code, String name, String baseUrl, boolean active) {
    public static EnvironmentSummaryDto from(EnvironmentEntity e) {
        return new EnvironmentSummaryDto(e.getId(), e.getCode(), e.getName(), e.getBaseUrl(), e.isActive());
    }
}
