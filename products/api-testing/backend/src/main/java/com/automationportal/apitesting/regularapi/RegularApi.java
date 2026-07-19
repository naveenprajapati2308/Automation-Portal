package com.automationportal.apitesting.regularapi;

import com.automationportal.apitesting.common.EncryptedStringConverter;
import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

@Data
@Entity
@Table(name = "API_MASTER")
public class RegularApi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "module_id")
    private Long moduleId;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 10)
    private String method;

    /** May contain {{variableName}} placeholders. */
    @Column(name = "url_template", nullable = false, length = 2048)
    private String urlTemplate;

    /** JSON array of {key,value,enabled}; values may contain {{variableName}}. */
    @Lob
    @Column(name = "headers_template", columnDefinition = "LONGTEXT")
    private String headersTemplate;

    @Lob
    @Column(name = "query_params_template", columnDefinition = "LONGTEXT")
    private String queryParamsTemplate;

    @Column(name = "body_type", length = 20)
    private String bodyType;

    @Column(name = "body_template", columnDefinition = "TEXT")
    private String bodyTemplate;

    @Column(name = "auth_type", length = 20)
    private String authType;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "auth_config", columnDefinition = "LONGTEXT")
    private String authConfig;

    @Column(name = "is_dynamic", nullable = false)
    private boolean isDynamic;

    @Column(name = "timeout_ms", nullable = false)
    private int timeoutMs = 15000;

    @Column(name = "follow_redirects", nullable = false)
    private boolean followRedirects = true;

    @Column(name = "verify_ssl", nullable = false)
    private boolean verifySsl = true;

    @Column(name = "created_at", nullable = false, updatable = false, insertable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;
}
