package com.automationportal.perftesting.loadtest;

import com.automationportal.perftesting.common.KeyValue;
import com.automationportal.perftesting.common.KeyValueListConverter;
import com.automationportal.perftesting.perftest.Assertion;
import com.automationportal.perftesting.perftest.AssertionListConverter;
import com.automationportal.perftesting.perftest.HttpMethod;
import com.automationportal.perftesting.perftest.TargetType;
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
@Table(name = "perf_load_test")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoadTest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "project_id")
    private Long projectId;

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

    @Convert(converter = StageListConverter.class)
    @Column(name = "stages", nullable = false)
    private List<Stage> stages = new ArrayList<>();

    @Convert(converter = VuAssignmentListConverter.class)
    @Column(name = "vu_assignments")
    private List<VuAssignment> vuAssignments = new ArrayList<>();

    // Simple ramp shape fields — used to auto-generate stages when stagesJson is not provided
    @Column(name = "virtual_user_count", nullable = false)
    @Builder.Default
    private Integer virtualUserCount = 10;

    @Column(name = "ramp_up_seconds", nullable = false)
    @Builder.Default
    private Integer rampUpSeconds = 30;

    @Column(name = "steady_duration_seconds", nullable = false)
    @Builder.Default
    private Integer steadyDurationSeconds = 60;

    @Column(name = "ramp_down_seconds", nullable = false)
    @Builder.Default
    private Integer rampDownSeconds = 15;

    @Column(name = "max_virtual_users", nullable = false)
    @Builder.Default
    private Integer maxVirtualUsers = 100;

    @Column(name = "threshold_p95_ms")
    private Integer thresholdP95Ms;

    @Column(name = "threshold_p99_ms")
    private Integer thresholdP99Ms;

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
