package com.automationportal.apitesting.common;

import com.automationportal.apitesting.execution.dto.AuthConfig;
import com.automationportal.apitesting.execution.dto.KeyValueItem;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/** Deserializes the JSON columns of stored API definitions into engine DTOs. */
@Component
@RequiredArgsConstructor
public class RequestConfigMapper {

    private final ObjectMapper objectMapper;

    public List<KeyValueItem> keyValues(String json) {
        if (json == null || json.isBlank()) return new ArrayList<>();
        try {
            return objectMapper.readValue(json, new TypeReference<List<KeyValueItem>>() { });
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public AuthConfig auth(String json) {
        if (json == null || json.isBlank()) return new AuthConfig();
        try {
            return objectMapper.readValue(json, AuthConfig.class);
        } catch (Exception e) {
            return new AuthConfig();
        }
    }

    public String toJson(Object o) {
        try {
            return objectMapper.writeValueAsString(o);
        } catch (Exception e) {
            return null;
        }
    }
}
