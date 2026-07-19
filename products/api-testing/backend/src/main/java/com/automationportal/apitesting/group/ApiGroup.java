package com.automationportal.apitesting.group;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

/**
 * A named execution set of Regular APIs. MODULE groups mirror a module's
 * APIs; TIME groups carry an execution cadence (NOW / DAILY / WEEKLY) and are
 * the natural target for schedules.
 */
@Data
@Entity
@Table(name = "API_GROUP")
public class ApiGroup {

    public enum GroupType { MODULE, TIME }

    public enum TimeFrequency { NOW, DAILY, WEEKLY }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "group_type", nullable = false, length = 10)
    private GroupType groupType = GroupType.MODULE;

    @Column(name = "module_id")
    private Long moduleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "time_frequency", length = 20)
    private TimeFrequency timeFrequency;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }
}
