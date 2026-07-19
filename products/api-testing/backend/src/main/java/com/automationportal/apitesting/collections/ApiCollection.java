package com.automationportal.apitesting.collections;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

@Data
@Entity
@Table(name = "api_collection")
public class ApiCollection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 500)
    private String description;

    /** JSON array of {key,value,enabled} — {{key}} placeholders resolved at execution time. */
    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String variables;

    /** Currently-selected environment (Dev/QA/Prod); null = no environment active. */
    @Column(name = "active_environment_id")
    private Long activeEnvironmentId;

    @Column(name = "created_at", nullable = false, updatable = false, insertable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;
}
