package com.automationportal.apitesting.execution.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class ExecutionResponse {

    private boolean success;
    private String errorMessage;

    private Integer statusCode;
    private String statusText;
    private Map<String, List<String>> headers;
    private String contentType;
    private String body;

    private long durationMs;
    /** Time to first byte (headers received), best-effort. */
    private Long ttfbMs;
    private long sizeBytes;
    private boolean timedOut;
}
