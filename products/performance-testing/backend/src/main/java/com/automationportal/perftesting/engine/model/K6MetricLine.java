package com.automationportal.perftesting.engine.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class K6MetricLine {
    private String type;     // "Point" or "Summary"
    private String metric;   // "http_req_duration", "vus", "http_reqs", "http_req_failed", etc.
    private MetricData data;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MetricData {
        private String time;
        private Double value;
        private Map<String, String> tags;
        private Map<String, Object> metrics; // populated on "Summary" type
    }
}
