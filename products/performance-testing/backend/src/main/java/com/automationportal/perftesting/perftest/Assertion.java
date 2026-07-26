package com.automationportal.perftesting.perftest;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Assertion {
    private String type;       // STATUS, BODY_CONTAINS, JSON_PATH, HEADER_EXISTS, HEADER_VALUE, RESPONSE_TIME
    private String operator;   // EQ, NE, IN, LT, GT, CONTAINS
    private String value;      // Expected value
    private String path;       // JSONPath expression
    private String key;        // Header key
}
