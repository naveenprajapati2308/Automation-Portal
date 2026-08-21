package com.automationportal.apitesting.validation;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class ValidationCheckResult {
    private Long id;
    private int totalRequired;
    private int enforcedCount;
    private Integer responseStatusCode;
    private List<FieldValidationResult> fields;
    private Instant createdAt;
}
