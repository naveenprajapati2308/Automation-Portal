package com.automationportal.testcasecatalog;

import com.automationportal.executions.Execution;
import com.automationportal.executions.ExecutionStatus;
import com.automationportal.executions.ExecutionTestCase;
import com.automationportal.executions.ExecutionTestCaseRepository;
import com.automationportal.frameworks.FrameworkDescriptor;
import com.automationportal.frameworks.FrameworkRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

/**
 * Owns the permanent test case catalog: syncs it from execution results (never the other way
 * around) and exposes the read path DashboardService uses for TOTAL. execution_test_cases stays
 * exactly what it always was (one row per test per run); this table adds exactly one row per
 * distinct test case identity, ever, regardless of how many times it's executed.
 */
@Service
public class TestCaseCatalogService {
    private static final Logger log = LoggerFactory.getLogger(TestCaseCatalogService.class);
    private static final String PRODUCT = "AUTOMATION";
    // Unit-separator control char - never appears in module/framework/class/method/test names -
    // so identity components can't collide across a field boundary via plain concatenation
    // (e.g. moduleCode="AB"+framework="C" hashing the same as moduleCode="A"+framework="BC").
    private static final String SEP = "";

    private final ExecutionTestCaseRepository testCaseRepository;
    private final TestCaseCatalogRepository catalogRepository;
    private final TestCaseCodeGeneratorService codeGeneratorService;
    private final FrameworkRegistry frameworkRegistry;
    private final JdbcTemplate jdbcTemplate;

    public TestCaseCatalogService(ExecutionTestCaseRepository testCaseRepository,
            TestCaseCatalogRepository catalogRepository,
            TestCaseCodeGeneratorService codeGeneratorService,
            FrameworkRegistry frameworkRegistry,
            JdbcTemplate jdbcTemplate) {
        this.testCaseRepository = testCaseRepository;
        this.catalogRepository = catalogRepository;
        this.codeGeneratorService = codeGeneratorService;
        this.frameworkRegistry = frameworkRegistry;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public void syncTestCasesForExecution(Execution execution) {
        if (execution.getStatus() == ExecutionStatus.QUEUED || execution.getStatus() == ExecutionStatus.RUNNING) {
            return;
        }

        List<ExecutionTestCase> testCases = testCaseRepository.findByExecutionId(execution.getId());
        String framework = execution.getFramework();
        String shortCode = frameworkRegistry.find(framework)
                .map(FrameworkDescriptor::shortCode)
                .orElse("GEN");

        for (ExecutionTestCase tc : testCases) {
            if (tc.isConfigMethod()) {
                continue;
            }
            // The execution's own module_code (the portal's real module identity, e.g.
            // "ARCHITECT_INDIVIDUAL") - not tc.getModuleCode(), which holds whatever free-text
            // label the framework's live event reported as "moduleName" (e.g. "Individual
            // Empanelment Tests" for Selenium, "individual-empanelment.spec" for Playwright of the
            // very same portal module). DashboardService's grouping, parent aggregation, and the
            // frontend's healthByKey lookup all key off Execution.moduleCode, so the catalog must
            // use the same identity or every downstream lookup silently misses.
            String moduleCode = execution.getModuleCode();
            if (moduleCode == null || tc.getClassName() == null || tc.getMethodName() == null || tc.getTestName() == null) {
                log.warn("Skipping catalog sync for test case id={} (execution {}) - missing identity field",
                        tc.getId(), execution.getExecutionCode());
                continue;
            }

            String hash = identityHash(moduleCode, framework, tc.getClassName(), tc.getMethodName());
            long catalogId = upsertCatalogRow(hash, moduleCode, framework, shortCode, tc, execution);

            jdbcTemplate.update("UPDATE execution_test_cases SET test_case_catalog_id = ? WHERE id = ?",
                    catalogId, tc.getId());
        }
    }

    private long upsertCatalogRow(String hash, String moduleCode, String framework, String shortCode,
            ExecutionTestCase tc, Execution execution) {
        Timestamp runAt = Timestamp.from(tc.getEndTime() != null ? tc.getEndTime() : Instant.now());

        List<Long> existing = jdbcTemplate.query(
                "SELECT id FROM test_case_catalog WHERE identity_hash = ?",
                (rs, rowNum) -> rs.getLong(1), hash);

        if (!existing.isEmpty()) {
            long id = existing.get(0);
            jdbcTemplate.update(
                    "UPDATE test_case_catalog SET display_name = ?, last_seen_execution_id = ?, " +
                            "last_status = ?, last_run_at = ?, active = TRUE WHERE id = ?",
                    tc.getDisplayName(), execution.getId(), tc.getStatus(), runAt, id);
            return id;
        }

        String code = codeGeneratorService.next(moduleCode, shortCode);
        jdbcTemplate.update(
                "INSERT INTO test_case_catalog (test_case_code, identity_hash, product, module_code, " +
                        "framework, class_name, method_name, test_name, display_name, active, " +
                        "first_seen_execution_id, last_seen_execution_id, last_status, last_run_at) " +
                        "VALUES (?,?,?,?,?,?,?,?,?,TRUE,?,?,?,?) " +
                        "ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), display_name = VALUES(display_name), " +
                        "last_seen_execution_id = VALUES(last_seen_execution_id), last_status = VALUES(last_status), " +
                        "last_run_at = VALUES(last_run_at), active = TRUE",
                code, hash, PRODUCT, moduleCode, framework, tc.getClassName(), tc.getMethodName(), tc.getTestName(),
                tc.getDisplayName(), execution.getId(), execution.getId(), tc.getStatus(), runAt);

        return jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
    }

    public Map<String, Long> countActiveByModuleAndFramework() {
        Map<String, Long> out = new HashMap<>();
        for (Object[] row : catalogRepository.countActiveGroupedByModuleAndFramework()) {
            out.put(row[0] + "::" + row[1], (Long) row[2]);
        }
        return out;
    }

    // testName deliberately excluded: the live TestNG listener reports it inconsistently for
    // skipped tests - a test skipped via a failed @BeforeClass sometimes arrives with the
    // suite-level <test name="..."> tag instead of the per-method name, which would otherwise
    // mint a second catalog row for the same class+method on every such run (caught live via
    // AUTO-SL-20260803-0004 duplicating 12 of 22 rows). class_name+method_name is the actual
    // stable identity; test_name/display_name stay purely cosmetic fields on the row.
    private String identityHash(String moduleCode, String framework, String className, String methodName) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String raw = String.join(SEP, PRODUCT, moduleCode.trim(), framework.trim(),
                    className.trim(), methodName.trim());
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
