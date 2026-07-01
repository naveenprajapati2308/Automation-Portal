package com.automationportal.em.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "execution_jobs")
public class ExecutionJob {
    @Id
    @Column(name = "job_id", length = 100)
    private String jobId;

    @Column(name = "execution_id", nullable = false)
    private Long executionId;

    @Column(name = "suite_xml", nullable = false, length = 255)
    private String suiteXml;

    @Column(name = "priority", nullable = false, length = 20)
    private String priority = "MEDIUM";

    @Column(name = "state", nullable = false, length = 50)
    private String state = "QUEUED";

    @Column(name = "queue_position", nullable = false)
    private int queuePosition = 0;

    @Column(name = "max_retries", nullable = false)
    private int maxRetries = 0;

    @Column(name = "retry_count", nullable = false)
    private int retryCount = 0;

    @Column(name = "timeout_minutes", nullable = false)
    private int timeoutMinutes = 120;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt = Instant.now();

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "assigned_runner", length = 255)
    private String assignedRunner;

    @Column(name = "submitted_by", length = 255)
    private String submittedBy;

    // Getters and Setters
    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public Long getExecutionId() { return executionId; }
    public void setExecutionId(Long executionId) { this.executionId = executionId; }

    public String getSuiteXml() { return suiteXml; }
    public void setSuiteXml(String suiteXml) { this.suiteXml = suiteXml; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public int getQueuePosition() { return queuePosition; }
    public void setQueuePosition(int queuePosition) { this.queuePosition = queuePosition; }

    public int getMaxRetries() { return maxRetries; }
    public void setMaxRetries(int maxRetries) { this.maxRetries = maxRetries; }

    public int getRetryCount() { return retryCount; }
    public void setRetryCount(int retryCount) { this.retryCount = retryCount; }

    public int getTimeoutMinutes() { return timeoutMinutes; }
    public void setTimeoutMinutes(int timeoutMinutes) { this.timeoutMinutes = timeoutMinutes; }

    public Instant getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Instant submittedAt) { this.submittedAt = submittedAt; }

    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }

    public String getAssignedRunner() { return assignedRunner; }
    public void setAssignedRunner(String assignedRunner) { this.assignedRunner = assignedRunner; }

    public String getSubmittedBy() { return submittedBy; }
    public void setSubmittedBy(String submittedBy) { this.submittedBy = submittedBy; }
}
