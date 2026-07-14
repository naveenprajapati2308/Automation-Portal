package com.automationportal.apitesting.scheduling;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "apitesting.scheduler")
public class SchedulerProperties {

    private long pollIntervalMs = 15000;
    private int claimBatchSize = 200;
    private int maxConcurrentExecutions = 20;
    private int lockLeaseSeconds = 60;
    private int defaultMaxRetries = 3;
    private String instanceId = "local";
}
