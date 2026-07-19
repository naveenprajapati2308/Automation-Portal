package com.automationportal.apitesting.scheduling;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.ThreadPoolExecutor;

@Configuration
@RequiredArgsConstructor
public class SchedulerExecutorConfig {

    private final SchedulerProperties properties;

    /**
     * Bounded worker pool: due schedules queue and drain at a controlled rate
     * instead of firing simultaneously. CallerRunsPolicy applies natural
     * backpressure — an overloaded pool slows the poller down rather than
     * dropping work.
     */
    @Bean(name = "scheduleWorkerExecutor")
    public ThreadPoolTaskExecutor scheduleWorkerExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(properties.getMaxConcurrentExecutions());
        executor.setMaxPoolSize(properties.getMaxConcurrentExecutions());
        executor.setQueueCapacity(properties.getClaimBatchSize() * 2);
        executor.setThreadNamePrefix("sched-worker-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
