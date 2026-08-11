package com.automationportal.testengine;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "test_engines")
public class TestEngine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "business_id", nullable = false, unique = true)
    private String businessId;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Enumerated(EnumType.STRING)
    @Column(name = "engine_type", nullable = false, length = 30)
    private EngineType engineType;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "deployment_type", nullable = false, length = 30)
    private DeploymentType deploymentType = DeploymentType.LOCAL;

    @Column(length = 500)
    private String endpoint;

    @Column(name = "framework_path", length = 500)
    private String frameworkPath;

    @Column(name = "report_path", length = 500)
    private String reportPath;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EngineStatus status = EngineStatus.REGISTERED;

    @Column(name = "last_heartbeat_at")
    private Instant lastHeartbeatAt;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private Instant updatedAt;

    public Long getId() { return id; }
    public String getBusinessId() { return businessId; }
    public void setBusinessId(String businessId) { this.businessId = businessId; }
    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }
    public EngineType getEngineType() { return engineType; }
    public void setEngineType(EngineType engineType) { this.engineType = engineType; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public DeploymentType getDeploymentType() { return deploymentType; }
    public void setDeploymentType(DeploymentType deploymentType) { this.deploymentType = deploymentType; }
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public String getFrameworkPath() { return frameworkPath; }
    public void setFrameworkPath(String frameworkPath) { this.frameworkPath = frameworkPath; }
    public String getReportPath() { return reportPath; }
    public void setReportPath(String reportPath) { this.reportPath = reportPath; }
    public EngineStatus getStatus() { return status; }
    public void setStatus(EngineStatus status) { this.status = status; }
    public Instant getLastHeartbeatAt() { return lastHeartbeatAt; }
    public void setLastHeartbeatAt(Instant lastHeartbeatAt) { this.lastHeartbeatAt = lastHeartbeatAt; }
    public Long getCreatedByUserId() { return createdByUserId; }
    public void setCreatedByUserId(Long createdByUserId) { this.createdByUserId = createdByUserId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
