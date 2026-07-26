package com.automationportal.perftesting.results;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "perf_metric_sample")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PerfMetricSample {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "run_id", nullable = false)
    private Long runId;

    @Column(name = "sampled_at", nullable = false)
    private LocalDateTime sampledAt;

    @Column(nullable = false)
    @Builder.Default
    private Integer vus = 0;

    @Column(nullable = false)
    @Builder.Default
    private Double rps = 0.0;

    @Column(name = "p95_ms")
    private Double p95Ms;

    @Column(name = "avg_ms")
    private Double avgMs;

    @Column(name = "min_ms")
    private Double minMs;

    @Column(name = "max_ms")
    private Double maxMs;

    @Column(name = "error_rate", nullable = false)
    @Builder.Default
    private Double errorRate = 0.0;

    @Column(name = "total_requests", nullable = false)
    @Builder.Default
    private Long totalRequests = 0L;
}
