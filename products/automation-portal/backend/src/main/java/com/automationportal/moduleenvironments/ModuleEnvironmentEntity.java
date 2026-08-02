package com.automationportal.moduleenvironments;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * Explicit Module + Environment relationship: whether a module may run in an environment at
 * all, plus optional overrides layered on top of the environment's own base config. A NULL
 * override field means "inherit the environment/framework default" — see
 * ModuleEnvironmentResolver for the actual merge order.
 */
@Entity
@Table(name = "module_environments")
public class ModuleEnvironmentEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "module_id", nullable = false)
    private Long moduleId;

    @Column(name = "environment_id", nullable = false)
    private Long environmentId;

    private boolean enabled = true;

    @Column(name = "base_url")
    private String baseUrl;

    @Column(name = "config_json", columnDefinition = "TEXT")
    private String configJson;

    /** CSV override of allowed browsers; NULL/blank = inherit the framework's full list. */
    private String browsers;

    @Column(name = "timeout_minutes")
    private Integer timeoutMinutes;

    @Column(name = "execution_params_json", columnDefinition = "TEXT")
    private String executionParamsJson;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private Instant updatedAt;

    public Long getId() { return id; }
    public Long getModuleId() { return moduleId; }
    public void setModuleId(Long moduleId) { this.moduleId = moduleId; }
    public Long getEnvironmentId() { return environmentId; }
    public void setEnvironmentId(Long environmentId) { this.environmentId = environmentId; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
    public String getConfigJson() { return configJson; }
    public void setConfigJson(String configJson) { this.configJson = configJson; }
    public String getBrowsers() { return browsers; }
    public void setBrowsers(String browsers) { this.browsers = browsers; }
    public Integer getTimeoutMinutes() { return timeoutMinutes; }
    public void setTimeoutMinutes(Integer timeoutMinutes) { this.timeoutMinutes = timeoutMinutes; }
    public String getExecutionParamsJson() { return executionParamsJson; }
    public void setExecutionParamsJson(String executionParamsJson) { this.executionParamsJson = executionParamsJson; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
