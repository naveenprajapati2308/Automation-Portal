package com.automationportal.perftesting.perftest;

import com.automationportal.perftesting.common.KeyValue;
import com.automationportal.perftesting.common.KeyValueListConverter;
import com.automationportal.perftesting.virtualuser.AuthKeyIn;
import com.automationportal.perftesting.virtualuser.AuthType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "perf_performance_test")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PerformanceTest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    @Builder.Default
    private TargetType targetType = TargetType.URL;

    @Column(name = "target_url", length = 2000)
    private String targetUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "http_method", nullable = false)
    @Builder.Default
    private HttpMethod httpMethod = HttpMethod.GET;

    @Convert(converter = KeyValueListConverter.class)
    @Column(name = "request_headers")
    private List<KeyValue> requestHeaders = new ArrayList<>();

    @Column(name = "request_body", columnDefinition = "TEXT")
    private String requestBody;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_type", nullable = false)
    @Builder.Default
    private AuthType authType = AuthType.NONE;

    @Column(name = "auth_value", columnDefinition = "TEXT")
    private String authValue;

    @Column(name = "auth_key_name", length = 100)
    private String authKeyName;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_key_in")
    private AuthKeyIn authKeyIn;

    @Column(name = "timeout_ms", nullable = false)
    @Builder.Default
    private Integer timeoutMs = 10000;

    @Column(name = "follow_redirects", nullable = false)
    @Builder.Default
    private Boolean followRedirects = true;

    @Column(nullable = false)
    @Builder.Default
    private Integer iterations = 100;

    @Column(name = "think_time_ms", nullable = false)
    @Builder.Default
    private Integer thinkTimeMs = 1000;

    @Column(name = "threshold_p50_ms")
    private Integer thresholdP50Ms;

    @Column(name = "threshold_p75_ms")
    private Integer thresholdP75Ms;

    @Column(name = "threshold_p90_ms")
    private Integer thresholdP90Ms;

    @Column(name = "threshold_p95_ms")
    private Integer thresholdP95Ms;

    @Column(name = "threshold_p99_ms")
    private Integer thresholdP99Ms;

    @Column(name = "threshold_max_ms")
    private Integer thresholdMaxMs;

    @Column(name = "threshold_error_rate_pct")
    private Double thresholdErrorRatePct;

    @Column(name = "threshold_min_rps")
    private Double thresholdMinRps;

    @Convert(converter = AssertionListConverter.class)
    @Column(name = "assertions")
    private List<Assertion> assertions = new ArrayList<>();

    @Column(name = "schedule_cron", length = 100)
    private String scheduleCron;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
