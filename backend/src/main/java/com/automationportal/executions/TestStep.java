package com.automationportal.executions;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "test_steps")
public class TestStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "test_case_id", nullable = false)
    private Long testCaseId;

    @Column(name = "step_name", nullable = false)
    private String stepName;

    @Column(nullable = false)
    private String status;

    @Column(name = "duration_ms")
    private Long durationMs = 0L;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "stack_trace", columnDefinition = "TEXT")
    private String stackTrace;

    @Column(name = "step_order")
    private int stepOrder;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    // ── Getters & Setters ───────────────────────────────────────────────────
    public Long getId()                          { return id; }
    public Long getTestCaseId()                  { return testCaseId; }
    public void setTestCaseId(Long testCaseId)   { this.testCaseId = testCaseId; }
    public String getStepName()                  { return stepName; }
    public void setStepName(String stepName)     { this.stepName = stepName; }
    public String getStatus()                    { return status; }
    public void setStatus(String status)         { this.status = status; }
    public Long getDurationMs()                  { return durationMs; }
    public void setDurationMs(Long durationMs)   { this.durationMs = durationMs; }
    public String getErrorMessage()              { return errorMessage; }
    public void setErrorMessage(String e)        { this.errorMessage = e; }
    public String getStackTrace()                { return stackTrace; }
    public void setStackTrace(String s)          { this.stackTrace = s; }
    public int getStepOrder()                    { return stepOrder; }
    public void setStepOrder(int stepOrder)      { this.stepOrder = stepOrder; }
    public Instant getCreatedAt()                { return createdAt; }
}
