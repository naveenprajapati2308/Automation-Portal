package com.automationportal.perftesting.loadtest;

import com.automationportal.perftesting.common.KeyValue;
import com.automationportal.perftesting.perftest.Assertion;
import com.automationportal.perftesting.perftest.HttpMethod;
import com.automationportal.perftesting.perftest.TargetType;
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
public class LoadTestDto {
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
    private List<Stage> stages;
    private List<VuAssignment> vuAssignments;
    private Integer virtualUserCount;
    private Integer rampUpSeconds;
    private Integer steadyDurationSeconds;
    private Integer rampDownSeconds;
    private Integer maxVirtualUsers;
    private Integer thresholdP95Ms;
    private Integer thresholdP99Ms;
    private Double thresholdErrorRatePct;
    private Double thresholdMinRps;
    private List<Assertion> assertions;
    private String scheduleCron;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Derived properties
    private Integer peakVus;
    private Integer totalDurationSec;

    // Last run statistics
    private String lastRunStatus;
    private LocalDateTime lastRunAt;
    private Double lastP95Ms;

    public static LoadTestDto fromEntity(LoadTest entity) {
        if (entity == null) return null;

        // Calculate peak VUs and total duration from stages
        int maxVus = 0;
        int duration = 0;
        if (entity.getStages() != null) {
            for (Stage s : entity.getStages()) {
                if (s.getTargetVus() != null && s.getTargetVus() > maxVus) {
                    maxVus = s.getTargetVus();
                }
                if (s.getDurationSec() != null) {
                    duration += s.getDurationSec();
                }
            }
        }

        return LoadTestDto.builder()
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
                .stages(entity.getStages())
                .vuAssignments(entity.getVuAssignments())
                .virtualUserCount(entity.getVirtualUserCount())
                .rampUpSeconds(entity.getRampUpSeconds())
                .steadyDurationSeconds(entity.getSteadyDurationSeconds())
                .rampDownSeconds(entity.getRampDownSeconds())
                .maxVirtualUsers(entity.getMaxVirtualUsers())
                .thresholdP95Ms(entity.getThresholdP95Ms())
                .thresholdP99Ms(entity.getThresholdP99Ms())
                .thresholdErrorRatePct(entity.getThresholdErrorRatePct())
                .thresholdMinRps(entity.getThresholdMinRps())
                .assertions(entity.getAssertions())
                .scheduleCron(entity.getScheduleCron())
                .isActive(entity.getIsActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .peakVus(maxVus)
                .totalDurationSec(duration)
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
