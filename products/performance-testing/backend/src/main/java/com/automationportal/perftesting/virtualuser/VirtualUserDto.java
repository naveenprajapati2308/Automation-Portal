package com.automationportal.perftesting.virtualuser;

import com.automationportal.perftesting.common.KeyValue;
import com.automationportal.perftesting.common.Variable;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VirtualUserDto {
    private Long id;
    private String name;
    private String description;
    private AuthType authType;
    private String authValue; // Masked on read, sent fully on write
    private String authKeyName;
    private AuthKeyIn authKeyIn;
    private List<KeyValue> headers;
    private List<KeyValue> queryParams;
    private String bodyTemplate;
    private List<Variable> variables; // Variable values may be masked
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static VirtualUserDto fromEntity(VirtualUser entity) {
        if (entity == null) return null;
        return VirtualUserDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .authType(entity.getAuthType())
                .authValue(maskAuthValue(entity.getAuthValue(), entity.getAuthType()))
                .authKeyName(entity.getAuthKeyName())
                .authKeyIn(entity.getAuthKeyIn())
                .headers(entity.getHeaders())
                .queryParams(entity.getQueryParams())
                .bodyTemplate(entity.getBodyTemplate())
                .variables(maskVariables(entity.getVariables()))
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

    private static List<Variable> maskVariables(List<Variable> vars) {
        if (vars == null) return null;
        return vars.stream()
                .map(v -> {
                    if (v.masked() && v.value() != null && !v.value().isBlank()) {
                        String mv = v.value().length() <= 4 ? "****" : v.value().substring(0, 2) + "...***";
                        return new Variable(v.key(), mv, true);
                    }
                    return v;
                })
                .collect(Collectors.toList());
    }
}
