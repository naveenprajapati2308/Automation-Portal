package com.automationportal.testcasecatalog;

import com.automationportal.common.ApiResponse;
import com.automationportal.config.TestCaseCatalogBackfillRunner;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Manual escape hatch for the one-time catalog backfill (see TestCaseCatalogBackfillRunner) -
 * clears the completed marker and re-runs the sync inline. Protected by SecurityConfig's blanket
 * /api/admin/** -> SUPER_ADMIN rule, same as ModuleAdminController.
 */
@RestController
@RequestMapping("/api/admin/test-case-catalog")
public class TestCaseCatalogAdminController {

    private final TestCaseCatalogBackfillRunner backfillRunner;

    public TestCaseCatalogAdminController(TestCaseCatalogBackfillRunner backfillRunner) {
        this.backfillRunner = backfillRunner;
    }

    @PostMapping("/resync")
    public ApiResponse<Map<String, Object>> resync() {
        int processed = backfillRunner.resync();
        return ApiResponse.ok(Map.of("executionsProcessed", processed));
    }
}
