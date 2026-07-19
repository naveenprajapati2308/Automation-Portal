package com.automationportal.apitesting.validation;

import com.automationportal.apitesting.history.ExecutionHistory;
import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

@Data
@Entity
@Table(name = "api_validation_rule")
public class ApiValidationRule {

    public enum Operator { EQUALS, NOT_EQUALS, CONTAINS, REGEX, EXISTS, TYPE_IS, RANGE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "api_type", nullable = false, length = 10)
    private ExecutionHistory.ApiType apiType;

    @Column(name = "api_id", nullable = false)
    private Long apiId;

    @Column(name = "json_path", nullable = false, length = 500)
    private String jsonPath;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Operator operator;

    @Column(name = "expected_value", length = 1000)
    private String expectedValue;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
