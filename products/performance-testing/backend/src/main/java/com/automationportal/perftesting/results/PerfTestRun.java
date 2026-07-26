package com.automationportal.perftesting.results;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "perf_test_run")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PerfTestRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "test_type", nullable = false)
    private TestType testType;

    @Column(name = "test_id", nullable = false)
    private Long testId;

    @Column(name = "test_name", length = 255)
    private String testName;

    @Enumerated(EnumType.STRING)
    @Column(name = "run_trigger", nullable = false)
    @Builder.Default
    private RunTrigger runTrigger = RunTrigger.MANUAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RunStatus status = RunStatus.RUNNING;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "duration_sec", insertable = false, updatable = false)
    private Integer durationSec;

    @Column(name = "total_requests", nullable = false)
    @Builder.Default
    private Long totalRequests = 0L;

    @Column(name = "error_count", nullable = false)
    @Builder.Default
    private Long errorCount = 0L;

    @Column(name = "error_rate_pct", nullable = false)
    @Builder.Default
    private Double errorRatePct = 0.0;

    @Column(name = "p50_ms")
    private Double p50Ms;

    @Column(name = "p75_ms")
    private Double p75Ms;

    @Column(name = "p90_ms")
    private Double p90Ms;

    @Column(name = "p95_ms")
    private Double p95Ms;

    @Column(name = "p99_ms")
    private Double p99Ms;

    @Column(name = "max_ms")
    private Double maxMs;

    @Column(name = "avg_ms")
    private Double avgMs;

    @Column(name = "min_ms")
    private Double minMs;

    @Column(name = "requests_per_sec")
    private Double requestsPerSec;

    @Column(name = "peak_vus")
    private Integer peakVus;

    @Convert(converter = ThresholdResultListConverter.class)
    @Column(name = "threshold_results")
    private List<ThresholdResult> thresholdResults = new ArrayList<>();

    @Convert(converter = AssertionResultListConverter.class)
    @Column(name = "assertion_results")
    private List<AssertionResult> assertionResults = new ArrayList<>();

    @Column(name = "k6_exit_code")
    private Integer k6ExitCode;

    @Column(name = "raw_output_path", length = 500)
    private String rawOutputPath;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
