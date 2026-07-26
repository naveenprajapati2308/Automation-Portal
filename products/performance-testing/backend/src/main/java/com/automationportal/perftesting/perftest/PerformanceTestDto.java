package com.automationportal.perftesting.perftest;

import com.automationportal.perftesting.common.KeyValue;
import com.automationportal.perftesting.virtualuser.AuthKeyIn;
import com.automationportal.perftesting.virtualuser.AuthType;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PerformanceTestDto {
    private Long id;
    private String name;
    private String description;
    private TargetType targetType;
    private String targetUrl;
    private HttpMethod httpMethod;
    private List<KeyValue> requestHeaders;
    private String requestBody;
    private AuthType authType;
    private String authValue; // Masked on read
    private String authKeyName;
    private AuthKeyIn authKeyIn;
    private Integer timeoutMs;
    private Boolean followRedirects;
    private Integer iterations;
    private Integer thinkTimeMs;
    private Integer thresholdP50Ms;
    private Integer thresholdP75Ms;
    private Integer thresholdP90Ms;
    private Integer thresholdP95Ms;
    private Integer thresholdP99Ms;
    private Integer thresholdMaxMs;
    private Double thresholdErrorRatePct;
    private Double thresholdMinRps;
    private List<Assertion> assertions;
    private String scheduleCron;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Last run statistics (populated dynamically on list/get if needed)
    private String lastRunStatus;
    private LocalDateTime lastRunAt;
    private Double lastP95Ms;

    public static PerformanceTestDto fromEntity(PerformanceTest entity) {
        if (entity == null) return null;
        return PerformanceTestDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .targetType(entity.getTargetType())
                .targetUrl(entity.getTargetUrl())
                .httpMethod(entity.getHttpMethod())
                .requestHeaders(entity.getRequestHeaders())
                .requestBody(entity.getRequestBody())
                .authType(entity.getAuthType())
                .authValue(maskAuthValue(entity.getAuthValue(), entity.getAuthType()))
                .authKeyName(entity.getAuthKeyName())
                .authKeyIn(entity.getAuthKeyIn())
                .timeoutMs(entity.getTimeoutMs())
                .followRedirects(entity.getFollowRedirects())
                .iterations(entity.getIterations())
                .thinkTimeMs(entity.getThinkTimeMs())
                .thresholdP50Ms(entity.getThresholdP50Ms())
                .thresholdP75Ms(entity.getThresholdP75Ms())
                .thresholdP90Ms(entity.getThresholdP90Ms())
                .thresholdP95Ms(entity.getThresholdP95Ms())
                .thresholdP99Ms(entity.getThresholdP99Ms())
                .thresholdMaxMs(entity.getThresholdMaxMs())
                .thresholdErrorRatePct(entity.getThresholdErrorRatePct())
                .thresholdMinRps(entity.getThresholdMinRps())
                .assertions(entity.getAssertions())
                .scheduleCron(entity.getScheduleCron())
                .isActive(entity.getIsActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private static String maskAuthValue(String val, AuthType type) {
        if (val == null || val.isBlank() || type == AuthType.NONE) {
            return null;
        }
        if (val.length() <= 8) {
            return "********";
        }
        return val.substring(0, 8) + "...***";
    }
}
