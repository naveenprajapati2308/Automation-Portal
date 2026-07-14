package com.automationportal.apitesting.collections;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

@Data
@Entity
@Table(name = "collection_request")
public class CollectionRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "collection_id", nullable = false)
    private Long collectionId;

    /** Null = sits directly under the collection ("Ungrouped"). */
    @Column(name = "folder_id")
    private Long folderId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false)
    private int seq;

    @Column(nullable = false, length = 10)
    private String method;

    @Column(nullable = false, length = 2048)
    private String url;

    /** Full ExecutionRequest config JSON, replayed as-is by the tester. */
    @Lob
    @Column(name = "config_json", nullable = false, columnDefinition = "LONGTEXT")
    private String configJson;

    @Column(name = "created_at", nullable = false, updatable = false, insertable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;
}
