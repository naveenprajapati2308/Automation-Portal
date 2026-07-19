package com.automationportal.apitesting.group;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

@Data
@Entity
@Table(name = "API_GROUP_MEMBER")
public class ApiGroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_id", nullable = false)
    private Long groupId;

    @Column(name = "regular_api_id", nullable = false)
    private Long regularApiId;

    /** Execution order within the group (API 1 → API 2 → …). */
    @Column(nullable = false)
    private int seq;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
