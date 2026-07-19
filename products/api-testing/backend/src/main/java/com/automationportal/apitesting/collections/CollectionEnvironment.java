package com.automationportal.apitesting.collections;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

@Data
@Entity
@Table(name = "collection_environment")
public class CollectionEnvironment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "collection_id", nullable = false)
    private Long collectionId;

    @Column(nullable = false, length = 100)
    private String name;

    /** JSON array of {key,value,enabled} — overrides collection variables on key conflict. */
    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String variables;

    @Column(name = "created_at", nullable = false, updatable = false, insertable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;
}
