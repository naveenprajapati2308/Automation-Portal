package com.automationportal.apitesting.group;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

/**
 * One run of a group: Group → (Base API → Regular API) per member → group
 * result. Individual API runs link back via
 * execution_history.group_execution_id; health = passed / total.
 */
@Data
@Entity
@Table(name = "API_GROUP_EXECUTION")
public class ApiGroupExecution {

    public enum Status { RUNNING, SUCCESS, PARTIAL, FAILED }

    public enum TriggeredBy { MANUAL, SCHEDULE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_id", nullable = false)
    private Long groupId;

    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "correlation_id", nullable = false, length = 64)
    private String correlationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "triggered_by", nullable = false, length = 20)
    private TriggeredBy triggeredBy;

    @Column(name = "schedule_id")
    private Long scheduleId;

    /** Email of the user who clicked "Run" for a MANUAL trigger; null for SCHEDULE (see the
     * owning Schedule's recipients instead). */
    @Column(name = "triggered_by_email", length = 150)
    private String triggeredByEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.RUNNING;

    @Column(name = "total_apis", nullable = false)
    private int totalApis;

    @Column(name = "passed_apis", nullable = false)
    private int passedApis;

    @Column(name = "failed_apis", nullable = false)
    private int failedApis;

    @Column(name = "health_percent")
    private Double healthPercent;

    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt = Instant.now();

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "report_email_sent_at")
    private Instant reportEmailSentAt;
}
