package com.automationportal.apitesting.formdata;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

@Data
@Entity
@Table(name = "form_data_file")
public class FormDataFile {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "original_filename", length = 255)
    private String originalFilename;

    @Column(name = "content_type", length = 100)
    private String contentType;

    @Column(name = "size_bytes")
    private long sizeBytes;

    @Column(name = "created_at", nullable = false, updatable = false, insertable = false)
    private Instant createdAt;
}
