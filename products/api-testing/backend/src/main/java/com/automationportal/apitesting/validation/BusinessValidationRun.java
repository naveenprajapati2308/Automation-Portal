package com.automationportal.apitesting.validation;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

/**
 * One run of a "Business Validation Check" — fields the user has manually flagged
 * as business-logic-required were stripped from an otherwise-valid saved request,
 * the request was re-executed once, and the response was inspected to see which
 * of those fields the backend actually complained about. Entirely separate from
 * ExecutionHistory/schedules: this never runs automatically, only on demand.
 */
@Data
@Entity
@Table(name = "business_validation_run")
public class BusinessValidationRun {

    public enum ApiType { BASE, REGULAR, COLLECTION }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Enumerated(EnumType.STRING)
    @Column(name = "api_type", nullable = false, length = 20)
    private ApiType apiType;

    @Column(name = "api_id", nullable = false)
    private Long apiId;

    @Column(name = "total_required", nullable = false)
    private int totalRequired;

    @Column(name = "enforced_count", nullable = false)
    private int enforcedCount;

    @Column(name = "response_status_code")
    private Integer responseStatusCode;

    /** JSON array of FieldValidationResult. */
    @Lob
    @Column(name = "field_results", columnDefinition = "LONGTEXT")
    private String fieldResults;

    @Column(name = "triggered_by_email", length = 150)
    private String triggeredByEmail;

    @Column(name = "created_at", nullable = false, updatable = false, insertable = false)
    private Instant createdAt;
}
