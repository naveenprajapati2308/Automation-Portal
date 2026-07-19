package com.automationportal.apitesting.scheduling;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Claims due schedules in one short transaction (pessimistic locks + SKIP
 * LOCKED). Separate bean so the poller's call goes through the Spring proxy.
 */
@Service
@RequiredArgsConstructor
public class ScheduleClaimService {

    private final ScheduleRepository repository;
    private final SchedulerProperties properties;

    @Transactional
    public List<Long> claimDueSchedules() {
        Instant now = Instant.now();
        List<Schedule> due = repository.findDueForClaim(Schedule.Status.ACTIVE, now,
                PageRequest.of(0, properties.getClaimBatchSize()));
        Instant lease = now.plus(Duration.ofSeconds(properties.getLockLeaseSeconds()));
        for (Schedule s : due) {
            s.setLockedBy(properties.getInstanceId());
            s.setLockedUntil(lease);
        }
        repository.saveAll(due);
        return due.stream().map(Schedule::getId).toList();
    }
}
