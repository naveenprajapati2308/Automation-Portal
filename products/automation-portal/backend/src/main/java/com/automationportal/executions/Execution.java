package com.automationportal.executions;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "executions")
public class Execution {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "execution_code")
    private String executionCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "execution_type")
    private ExecutionType executionType;

    @Enumerated(EnumType.STRING)
    private ExecutionStatus status;

    @Column(name = "environment_id")
    private Long environmentId;

    @Column(name = "triggered_by")
    private Long triggeredBy;

    @Column(name = "module_code")
    private String moduleCode;

    @Column(name = "suite_xml_path")
    private String suiteXmlPath;

    @Column(name = "total_tests")
    private int totalTests;

    @Column(name = "passed_tests")
    private int passedTests;

    @Column(name = "failed_tests")
    private int failedTests;

    @Column(name = "skipped_tests")
    private int skippedTests;

    @Column(name = "pass_rate")
    private BigDecimal passRate = BigDecimal.ZERO;

    @Column(name = "fail_rate")
    private BigDecimal failRate = BigDecimal.ZERO;

    @Column(name = "start_time")
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @Column(name = "duration_seconds")
    private Long durationSeconds;

    @Column(name = "final_report_path")
    private String finalReportPath;

    @Column(name = "suite_name")
    private String suiteName;

    @Column(name = "machine_name")
    private String machineName;

    @Column(name = "os_name")
    private String osName;

    @Column(name = "java_version")
    private String javaVersion;

    @Column(name = "browser_name")
    private String browserName;

    @Column(name = "browser_version")
    private String browserVersion;

    @Column(name = "machine_ip")
    private String machineIp;

    // ── Precomputed analytics columns (Plotex CQRS pattern) ──────────────────
    @Column(name = "total_duration_ms")
    private Long totalDurationMs = 0L;

    @Column(name = "pass_percentage")
    private BigDecimal passPercentage = BigDecimal.ZERO;

    @Column(name = "fail_percentage")
    private BigDecimal failPercentage = BigDecimal.ZERO;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    public Long getId() { return id; }
    public String getExecutionCode() { return executionCode; }
    public void setExecutionCode(String executionCode) { this.executionCode = executionCode; }
    public ExecutionType getExecutionType() { return executionType; }
    public void setExecutionType(ExecutionType executionType) { this.executionType = executionType; }
    public ExecutionStatus getStatus() { return status; }
    public void setStatus(ExecutionStatus status) { this.status = status; }
    public Long getEnvironmentId() { return environmentId; }
    public void setEnvironmentId(Long environmentId) { this.environmentId = environmentId; }
    public Long getTriggeredBy() { return triggeredBy; }
    public void setTriggeredBy(Long triggeredBy) { this.triggeredBy = triggeredBy; }
    public String getModuleCode() { return moduleCode; }
    public void setModuleCode(String moduleCode) { this.moduleCode = moduleCode; }
    public String getSuiteXmlPath() { return suiteXmlPath; }
    public void setSuiteXmlPath(String suiteXmlPath) { this.suiteXmlPath = suiteXmlPath; }

    public int getTotalTests() { return totalTests; }
    public void setTotalTests(int totalTests) { this.totalTests = totalTests; }
    public int getPassedTests() { return passedTests; }
    public void setPassedTests(int passedTests) { this.passedTests = passedTests; }
    public int getFailedTests() { return failedTests; }
    public void setFailedTests(int failedTests) { this.failedTests = failedTests; }
    public int getSkippedTests() { return skippedTests; }
    public void setSkippedTests(int skippedTests) { this.skippedTests = skippedTests; }

    public BigDecimal getPassRate() { return passRate; }
    public void setPassRate(BigDecimal passRate) { this.passRate = passRate; }
    public BigDecimal getFailRate() { return failRate; }
    public void setFailRate(BigDecimal failRate) { this.failRate = failRate; }

    public Instant getStartTime() { return startTime; }
    public void setStartTime(Instant startTime) { this.startTime = startTime; }
    public Instant getEndTime() { return endTime; }
    public void setEndTime(Instant endTime) { this.endTime = endTime; }

    public Long getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Long durationSeconds) { this.durationSeconds = durationSeconds; }

    public String getFinalReportPath() { return finalReportPath; }
    public void setFinalReportPath(String finalReportPath) { this.finalReportPath = finalReportPath; }

    public String getSuiteName() { return suiteName; }
    public void setSuiteName(String suiteName) { this.suiteName = suiteName; }

    public String getMachineName() { return machineName; }
    public void setMachineName(String machineName) { this.machineName = machineName; }
    public String getOsName() { return osName; }
    public void setOsName(String osName) { this.osName = osName; }
    public String getJavaVersion() { return javaVersion; }
    public void setJavaVersion(String javaVersion) { this.javaVersion = javaVersion; }
    public String getBrowserName()              { return browserName; }
    public void setBrowserName(String browserName) { this.browserName = browserName; }
    public String getBrowserVersion()           { return browserVersion; }
    public void setBrowserVersion(String browserVersion) { this.browserVersion = browserVersion; }
    public String getMachineIp()                { return machineIp; }
    public void setMachineIp(String machineIp) { this.machineIp = machineIp; }

    public Long getTotalDurationMs()             { return totalDurationMs; }
    public void setTotalDurationMs(Long ms)      { this.totalDurationMs = ms; }
    public BigDecimal getPassPercentage()        { return passPercentage; }
    public void setPassPercentage(BigDecimal p)  { this.passPercentage = p; }
    public BigDecimal getFailPercentage()        { return failPercentage; }
    public void setFailPercentage(BigDecimal f)  { this.failPercentage = f; }

    public Instant getCreatedAt() { return createdAt; }
}
