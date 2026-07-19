package com.automationportal.apitesting.history;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

@Data
@Entity
@Table(name = "API_EXECUTION_HISTORY")
public class ExecutionHistory {

    /** COLLECTION = a saved request inside a Tester collection (manual testing workspace). */
    public enum ApiType { BASE, REGULAR, COLLECTION }

    public enum TriggeredBy { MANUAL, SCHEDULE, CHAIN_DEPENDENCY }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "api_type", nullable = false, length = 10)
    private ApiType apiType;

    @Column(name = "api_id")
    private Long apiId;

    @Column(name = "api_name", length = 200)
    private String apiName;

    @Column(name = "module_id")
    private Long moduleId;

    @Column(name = "schedule_id")
    private Long scheduleId;

    @Column(name = "group_id")
    private Long groupId;

    @Column(name = "group_execution_id")
    private Long groupExecutionId;

    @Column(name = "correlation_id", length = 64)
    private String correlationId;

    @Column(name = "executed_by", length = 100)
    private String executedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "triggered_by", nullable = false, length = 20)
    private TriggeredBy triggeredBy;

    @Column(name = "request_method", nullable = false, length = 10)
    private String requestMethod;

    @Column(name = "request_url", nullable = false, length = 2048)
    private String requestUrl;

    @Lob
    @Column(name = "request_headers", columnDefinition = "LONGTEXT")
    private String requestHeaders;

    @Lob
    @Column(name = "request_body", columnDefinition = "LONGTEXT")
    private String requestBody;

    /** Masked values injected from Base APIs at execution time (JSON map). */
    @Lob
    @Column(name = "injected_variables", columnDefinition = "LONGTEXT")
    private String injectedVariables;

    @Column(name = "response_status_code")
    private Integer responseStatusCode;

    @Column(name = "response_status_class", length = 10)
    private String responseStatusClass;

    @Column(name = "response_status_message", length = 100)
    private String responseStatusMessage;

    @Column(name = "response_content_type", length = 255)
    private String responseContentType;

    @Lob
    @Column(name = "response_headers", columnDefinition = "LONGTEXT")
    private String responseHeaders;

    /** Set-Cookie values from the response (JSON array). */
    @Lob
    @Column(name = "response_cookies", columnDefinition = "LONGTEXT")
    private String responseCookies;

    @Lob
    @Column(name = "response_body_inline", columnDefinition = "LONGTEXT")
    private String responseBodyInline;

    @Column(name = "response_body_object_key", length = 500)
    private String responseBodyObjectKey;

    @Column(name = "response_size_bytes")
    private Long responseSizeBytes;

    @Column(name = "dns_time_ms")
    private Integer dnsTimeMs;

    @Column(name = "connect_time_ms")
    private Integer connectTimeMs;

    @Column(name = "ttfb_ms")
    private Integer ttfbMs;

    @Column(name = "total_time_ms", nullable = false)
    private long totalTimeMs;

    @Column(name = "validation_passed")
    private Boolean validationPassed;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Column(name = "executed_at", nullable = false, updatable = false)
    private Instant executedAt = Instant.now();

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;
}
