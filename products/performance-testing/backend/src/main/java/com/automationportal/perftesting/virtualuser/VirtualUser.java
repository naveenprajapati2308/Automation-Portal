package com.automationportal.perftesting.virtualuser;

import com.automationportal.perftesting.common.KeyValue;
import com.automationportal.perftesting.common.KeyValueListConverter;
import com.automationportal.perftesting.common.Variable;
import com.automationportal.perftesting.common.VariableListConverter;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "perf_virtual_user")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VirtualUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "project_id")
    private Long projectId;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_type", nullable = false)
    @Builder.Default
    private AuthType authType = AuthType.NONE;

    @Column(name = "auth_value", columnDefinition = "TEXT")
    private String authValue;

    @Column(name = "auth_key_name", length = 100)
    private String authKeyName;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_key_in")
    private AuthKeyIn authKeyIn;

    @Convert(converter = KeyValueListConverter.class)
    @Column(name = "headers")
    private List<KeyValue> headers = new ArrayList<>();

    @Convert(converter = KeyValueListConverter.class)
    @Column(name = "query_params")
    private List<KeyValue> queryParams = new ArrayList<>();

    @Column(name = "body_template", columnDefinition = "TEXT")
    private String bodyTemplate;

    @Convert(converter = VariableListConverter.class)
    @Column(name = "variables")
    private List<Variable> variables = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
