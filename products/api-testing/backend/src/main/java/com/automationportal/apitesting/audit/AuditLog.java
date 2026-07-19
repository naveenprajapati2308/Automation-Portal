package com.automationportal.apitesting.audit;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

/**
 * Who did what, when: create/update/delete of APIs, schedules, groups and
 * Base API mappings. performedBy carries a placeholder identity until RBAC
 * lands — the schema and service already support real users.
 */
@Data
@Entity
@Table(name = "audit_log")
public class AuditLog {

    public enum EntityType { BASE_API, REGULAR_API, SCHEDULE, GROUP, BINDING, MODULE }

    public enum Action { CREATE, UPDATE, DELETE, EXECUTE, PAUSE, RESUME }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false, length = 40)
    private EntityType entityType;

    @Column(name = "entity_id")
    private Long entityId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Action action;

    @Column(name = "performed_by", nullable = false, length = 100)
    private String performedBy = "system";

    @Column(length = 2000)
    private String details;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
