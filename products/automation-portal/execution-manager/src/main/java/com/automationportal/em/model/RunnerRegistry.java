package com.automationportal.em.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "runner_registry")
public class RunnerRegistry {
    @Id
    @Column(name = "runner_id", length = 100)
    private String runnerId;

    @Column(name = "runner_name", nullable = false, length = 255)
    private String runnerName;

    @Column(name = "runner_url", nullable = false, length = 255)
    private String runnerUrl;

    @Column(name = "status", nullable = false, length = 50)
    private String status = "OFFLINE";

    @Column(name = "last_heartbeat", nullable = false)
    private Instant lastHeartbeat = Instant.now();

    // Getters and Setters
    public String getRunnerId() { return runnerId; }
    public void setRunnerId(String runnerId) { this.runnerId = runnerId; }

    public String getRunnerName() { return runnerName; }
    public void setRunnerName(String runnerName) { this.runnerName = runnerName; }

    public String getRunnerUrl() { return runnerUrl; }
    public void setRunnerUrl(String runnerUrl) { this.runnerUrl = runnerUrl; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getLastHeartbeat() { return lastHeartbeat; }
    public void setLastHeartbeat(Instant lastHeartbeat) { this.lastHeartbeat = lastHeartbeat; }
}
