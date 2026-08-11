package com.automationportal.integrationguide;

import com.automationportal.common.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Read-only Integration Guide — visible to every authenticated user (Super Admin included).
 * Platform-wide content, not project-scoped, so no CurrentProjectService involvement. Writes
 * live exclusively under IntegrationGuideAdminController (/api/admin/**, SUPER_ADMIN only).
 */
@RestController
@RequestMapping("/api/integration-guide")
public class IntegrationGuideController {
    private final IntegrationGuideSectionRepository repository;

    public IntegrationGuideController(IntegrationGuideSectionRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ApiResponse<List<IntegrationGuideSection>> list() {
        return ApiResponse.ok(repository.findAllByOrderBySortOrderAsc());
    }
}
