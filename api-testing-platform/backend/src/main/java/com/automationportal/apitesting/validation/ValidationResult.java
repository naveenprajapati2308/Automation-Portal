package com.automationportal.apitesting.validation;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

@Data
@Entity
@Table(name = "validation_result")
public class ValidationResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "execution_history_id", nullable = false)
    private Long executionHistoryId;

    @Column(name = "rule_id", nullable = false)
    private Long ruleId;

    @Column(nullable = false)
    private boolean passed;

    @Column(name = "actual_value", length = 1000)
    private String actualValue;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
