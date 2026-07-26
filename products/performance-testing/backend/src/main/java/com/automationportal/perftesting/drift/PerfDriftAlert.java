package com.automationportal.perftesting.drift;

import com.automationportal.perftesting.results.TestType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "perf_drift_alert")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PerfDriftAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "run_id", nullable = false)
    private Long runId;

    @Enumerated(EnumType.STRING)
    @Column(name = "test_type", nullable = false)
    private TestType testType;

    @Column(name = "test_id", nullable = false)
    private Long testId;

    @Column(name = "current_p95_ms", nullable = false)
    private Double currentP95Ms;

    @Column(name = "baseline_p95_ms", nullable = false)
    private Double baselineP95Ms;

    @Column(name = "drift_pct", nullable = false)
    private Double driftPct;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Severity severity;

    @Column(name = "is_acknowledged", nullable = false)
    @Builder.Default
    private Boolean isAcknowledged = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
