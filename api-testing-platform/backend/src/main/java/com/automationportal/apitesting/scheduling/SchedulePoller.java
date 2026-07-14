package com.automationportal.apitesting.scheduling;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Claim-then-dispatch poller. Claiming is a short transaction in
 * ScheduleClaimService (SKIP LOCKED semantics — multiple instances never
 * double-claim); execution happens on the bounded worker pool, never on this
 * thread, so one slow target API cannot stall the loop.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SchedulePoller {

    private final ScheduleClaimService claimService;
    private final ScheduleWorker worker;
    private final SchedulerProperties properties;
    @Qualifier("scheduleWorkerExecutor")
    private final ThreadPoolTaskExecutor executor;

    @Scheduled(fixedDelayString = "${apitesting.scheduler.poll-interval-ms}", initialDelay = 10_000)
    public void pollAndDispatch() {
        List<Long> claimed = claimService.claimDueSchedules();
        for (Long scheduleId : claimed) {
            executor.execute(() -> worker.run(scheduleId));
        }
        if (!claimed.isEmpty()) {
            log.info("Claimed {} due schedule(s) as instance '{}'", claimed.size(), properties.getInstanceId());
        }
    }
}
