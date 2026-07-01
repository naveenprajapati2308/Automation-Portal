package com.automationportal.environments;

import jakarta.persistence.*;

@Entity
@Table(name = "environments")
public class EnvironmentEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String code;
    private String name;

    @Column(name = "base_url")
    private String baseUrl;
    private boolean active = true;

    protected EnvironmentEntity() {
    }

    public EnvironmentEntity(String code, String name) {
        this.code = code;
        this.name = name;
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
