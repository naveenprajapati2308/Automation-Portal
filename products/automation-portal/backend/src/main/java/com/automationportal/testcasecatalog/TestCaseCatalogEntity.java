package com.automationportal.testcasecatalog;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Permanent, execution-independent inventory row: one per distinct (product, module_code,
 * framework, class_name, method_name, test_name) identity. Running the same test 1000 times never
 * creates a second row here — only in execution_test_cases. See TestCaseCatalogService for the
 * upsert logic and DashboardService.getModuleHealth() for the read path.
 */
@Entity
@Table(name = "test_case_catalog")
public class TestCaseCatalogEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "test_case_code", nullable = false)
    private String testCaseCode;

    @Column(name = "identity_hash", nullable = false, columnDefinition = "CHAR(64)")
    private String identityHash;

    @Column(name = "product", nullable = false)
    private String product = "AUTOMATION";

    @Column(name = "module_code", nullable = false)
    private String moduleCode;

    @Column(name = "framework", nullable = false)
    private String framework;

    @Column(name = "class_name", nullable = false)
    private String className;

    @Column(name = "method_name", nullable = false)
    private String methodName;

    @Column(name = "test_name", nullable = false)
    private String testName;

    @Column(name = "display_name")
    private String displayName;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "first_seen_execution_id")
    private Long firstSeenExecutionId;

    @Column(name = "last_seen_execution_id")
    private Long lastSeenExecutionId;

    @Column(name = "last_status")
    private String lastStatus;

    @Column(name = "last_run_at")
    private Instant lastRunAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private Instant updatedAt;

    public Long getId() { return id; }
    public String getTestCaseCode() { return testCaseCode; }
    public String getIdentityHash() { return identityHash; }
    public String getProduct() { return product; }
    public String getModuleCode() { return moduleCode; }
    public String getFramework() { return framework; }
    public String getClassName() { return className; }
    public String getMethodName() { return methodName; }
    public String getTestName() { return testName; }
    public String getDisplayName() { return displayName; }
    public boolean isActive() { return active; }
    public Long getFirstSeenExecutionId() { return firstSeenExecutionId; }
    public Long getLastSeenExecutionId() { return lastSeenExecutionId; }
    public String getLastStatus() { return lastStatus; }
    public Instant getLastRunAt() { return lastRunAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
