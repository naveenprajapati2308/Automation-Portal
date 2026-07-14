package com.automationportal.apitesting.history;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Daily cleanup: deletes execution history (and offloaded bodies) older than
 * the retention window.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class HistoryRetentionJob {

    private final ExecutionHistoryRepository repository;
    private final BodyStore bodyStore;

    @Value("${apitesting.history.retention-days}")
    private int retentionDays;

    @Scheduled(cron = "0 30 2 * * *")
    @Transactional
    public void purgeOldHistory() {
        Instant cutoff = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
        List<String> keys = repository.findObjectKeysOlderThan(cutoff);
        keys.forEach(bodyStore::delete);
        int deleted = repository.deleteOlderThan(cutoff);
        if (deleted > 0 || !keys.isEmpty()) {
            log.info("History retention: deleted {} rows and {} offloaded bodies older than {} days",
                    deleted, keys.size(), retentionDays);
        }
    }
}
