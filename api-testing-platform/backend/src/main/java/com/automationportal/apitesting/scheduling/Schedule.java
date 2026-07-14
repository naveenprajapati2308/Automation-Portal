package com.automationportal.apitesting.scheduling;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

@Data
@Entity
@Table(name = "API_SCHEDULE")
public class Schedule {

    public enum FrequencyType { EVERY_X_MIN, HOURLY, DAILY, WEEKLY, CRON }

    public enum Status { ACTIVE, PAUSED, DISABLED }

    public enum RunStatus { SUCCESS, FAILED, TIMEOUT }

    /** What this schedule runs: one Regular API, or a whole group. */
    public enum TargetType { API, GROUP }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 10)
    private TargetType targetType = TargetType.API;

    @Column(name = "regular_api_id")
    private Long regularApiId;

    @Column(name = "group_id")
    private Long groupId;

    @Enumerated(EnumType.STRING)
    @Column(name = "frequency_type", nullable = false, length = 20)
    private FrequencyType frequencyType;

    /** Minutes for EVERY_X_MIN, cron expression for CRON, else null. */
    @Column(name = "frequency_value", length = 50)
    private String frequencyValue;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.ACTIVE;

    @Column(name = "next_run_at", nullable = false)
    private Instant nextRunAt;

    @Column(name = "last_run_at")
    private Instant lastRunAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "last_run_status", length = 20)
    private RunStatus lastRunStatus;

    @Column(name = "locked_by", length = 100)
    private String lockedBy;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "retry_count", nullable = false)
    private int retryCount;

    @Column(name = "max_retries", nullable = false)
    private int maxRetries = 3;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
