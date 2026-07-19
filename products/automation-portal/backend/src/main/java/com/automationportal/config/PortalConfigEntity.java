package com.automationportal.config;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "portal_configs")
public class PortalConfigEntity {
    @Id
    @Column(name = "config_key")
    private String configKey;

    @Column(name = "config_value", nullable = false)
    private String configValue;

    private String description;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private Instant updatedAt;

    public PortalConfigEntity() {
    }

    public PortalConfigEntity(String configKey, String configValue, String description) {
        this.configKey = configKey;
        this.configValue = configValue;
        this.description = description;
    }

    public String getConfigKey() {
        return configKey;
    }

    public void setConfigKey(String configKey) {
        this.configKey = configKey;
    }

    public String getConfigValue() {
        return configValue;
    }

    public void setConfigValue(String configValue) {
        this.configValue = configValue;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
