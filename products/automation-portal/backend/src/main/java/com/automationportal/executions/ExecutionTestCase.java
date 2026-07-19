package com.automationportal.executions;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "execution_test_cases")
public class ExecutionTestCase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "execution_id", nullable = false)
    private Long executionId;

    @Column(name = "module_code")
    private String moduleCode;

    @Column(name = "suite_name")
    private String suiteName;

    @Column(name = "class_name")
    private String className;

    @Column(name = "method_name")
    private String methodName;

    @Column(name = "test_name")
    private String testName;

    @Column(name = "display_name")
    private String displayName;

    @Column(nullable = false)
    private String status;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @Column(name = "exception_type")
    private String exceptionType;

    @Column(name = "stack_trace", columnDefinition = "TEXT")
    private String stackTrace;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "start_time")
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @Column(columnDefinition = "TEXT")
    private String parameters;

    @Column(name = "screenshot_path")
    private String screenshotPath;

    @Column(name = "log_path")
    private String logPath;

    @Column(name = "is_config_method", nullable = false)
    private boolean isConfigMethod;

    @Column(name = "retries", nullable = false)
    private int retries = 0;

    @Transient
    private java.util.List<TestStep> transientSteps = new java.util.ArrayList<>();

    public java.util.List<TestStep> getTransientSteps() { return transientSteps; }
    public void setTransientSteps(java.util.List<TestStep> steps) { this.transientSteps = steps; }

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "execution_test_case_tags",
        joinColumns = @JoinColumn(name = "test_case_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private java.util.Set<Tag> tags = new java.util.HashSet<>();

    // Getters and Setters
    public java.util.Set<Tag> getTags() { return tags; }
    public void setTags(java.util.Set<Tag> tags) { this.tags = tags; }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getExecutionId() { return executionId; }
    public void setExecutionId(Long executionId) { this.executionId = executionId; }

    public String getModuleCode() { return moduleCode; }
    public void setModuleCode(String moduleCode) { this.moduleCode = moduleCode; }

    public String getSuiteName() { return suiteName; }
    public void setSuiteName(String suiteName) { this.suiteName = suiteName; }

    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }

    public String getMethodName() { return methodName; }
    public void setMethodName(String methodName) { this.methodName = methodName; }

    public String getTestName() { return testName; }
    public void setTestName(String testName) { this.testName = testName; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }

    public String getExceptionType() { return exceptionType; }
    public void setExceptionType(String exceptionType) { this.exceptionType = exceptionType; }

    public String getStackTrace() { return stackTrace; }
    public void setStackTrace(String stackTrace) { this.stackTrace = stackTrace; }

    public Long getDurationMs() { return durationMs; }
    public void setDurationMs(Long durationMs) { this.durationMs = durationMs; }

    public Instant getStartTime() { return startTime; }
    public void setStartTime(Instant startTime) { this.startTime = startTime; }

    public Instant getEndTime() { return endTime; }
    public void setEndTime(Instant endTime) { this.endTime = endTime; }

    public String getParameters() { return parameters; }
    public void setParameters(String parameters) { this.parameters = parameters; }

    public String getScreenshotPath() { return screenshotPath; }
    public void setScreenshotPath(String screenshotPath) { this.screenshotPath = screenshotPath; }

    public String getLogPath() { return logPath; }
    public void setLogPath(String logPath) { this.logPath = logPath; }

    public boolean isConfigMethod() { return isConfigMethod; }
    public void setConfigMethod(boolean configMethod) { isConfigMethod = configMethod; }

    public int getRetries() { return retries; }
    public void setRetries(int retries) { this.retries = retries; }

    public Instant getCreatedAt() { return createdAt; }
}
