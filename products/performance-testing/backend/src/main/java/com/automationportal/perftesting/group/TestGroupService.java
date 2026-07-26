package com.automationportal.perftesting.group;

import com.automationportal.perftesting.common.ApiException;
import com.automationportal.perftesting.results.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TestGroupService {
    private static final Logger log = LoggerFactory.getLogger(TestGroupService.class);

    private final TestGroupRepository repository;
    private final ResultService resultService;
    private final PerfTestRunRepository runRepository;

    // Calling executeGroupAsync() on `this` bypasses Spring's @Async proxy entirely
    // (self-invocation never goes through a bean's own AOP proxy) — it actually ran
    // synchronously, still nested inside the outer transaction's commit-teardown
    // phase, where a freshly-opened nested transaction can see stale/undefined state.
    // Routing the call through this self-injected proxy reference instead makes
    // @Async genuinely apply, so it truly runs on a new thread after commit has
    // fully finished. @Lazy avoids a circular-construction error (Spring can't
    // build this bean's own proxy while still constructing the bean itself).
    @Autowired
    @Lazy
    private TestGroupService self;

    @Transactional(readOnly = true)
    public List<TestGroup> getAll() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public TestGroup getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Test Group not found with ID: " + id));
    }

    @Transactional
    public TestGroup create(TestGroup dto) {
        TestGroup group = TestGroup.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .runStrategy(dto.getRunStrategy() != null ? dto.getRunStrategy() : RunStrategy.SEQUENTIAL)
                .stopOnFailure(dto.getStopOnFailure() != null ? dto.getStopOnFailure() : false)
                .scheduleCron(dto.getScheduleCron())
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .build();

        // Must save first — group.getId() is null until this insert runs (IDENTITY
        // generation), and TestGroupMember.groupId is a plain FK column (no @ManyToOne
        // for Hibernate to backfill via cascade), so assigning it beforehand always
        // persisted a NULL group_id and violated the NOT NULL constraint.
        group = repository.save(group);

        if (dto.getMembers() != null) {
            for (TestGroupMember m : dto.getMembers()) {
                m.setGroupId(group.getId());
                group.getMembers().add(m);
            }
        }

        return repository.save(group);
    }

    @Transactional
    public TestGroup update(Long id, TestGroup dto) {
        TestGroup existing = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Test Group not found with ID: " + id));

        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setRunStrategy(dto.getRunStrategy() != null ? dto.getRunStrategy() : RunStrategy.SEQUENTIAL);
        existing.setStopOnFailure(dto.getStopOnFailure() != null ? dto.getStopOnFailure() : false);
        existing.setScheduleCron(dto.getScheduleCron());
        existing.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);

        existing.getMembers().clear();
        if (dto.getMembers() != null) {
            for (TestGroupMember m : dto.getMembers()) {
                m.setGroupId(existing.getId());
                existing.getMembers().add(m);
            }
        }

        return repository.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        TestGroup existing = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Test Group not found with ID: " + id));
        repository.delete(existing);
    }

    @Transactional
    public PerfTestRun triggerGroupRun(Long id) {
        return triggerGroupRun(id, RunTrigger.MANUAL);
    }

    @Transactional
    public PerfTestRun triggerGroupRun(Long id, RunTrigger trigger) {
        TestGroup group = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Test Group not found with ID: " + id));

        if (!group.getIsActive()) {
            throw ApiException.badRequest("Cannot execute an inactive test group");
        }

        // Create main GROUP run record
        PerfTestRun groupRun = PerfTestRun.builder()
                .testType(TestType.GROUP)
                .testId(id)
                .testName(group.getName())
                .runTrigger(trigger)
                .status(RunStatus.RUNNING)
                .startedAt(LocalDateTime.now())
                .build();

        groupRun = runRepository.save(groupRun);

        // Dispatch only after commit — same race as ResultService.startPerformanceTest:
        // an @Async thread saving this row before the enclosing transaction commits
        // makes Hibernate insert a second row instead of updating this one.
        Long groupId = id;
        Long groupRunId = groupRun.getId();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                self.executeGroupAsync(groupId, groupRunId);
            }
        });

        return groupRun;
    }

    @Async
    public void executeGroupAsync(Long groupId, Long groupRunId) {
        TestGroup group = repository.findById(groupId)
                .orElseThrow(() -> ApiException.notFound("Test Group not found with ID: " + groupId));
        PerfTestRun groupRun = runRepository.findById(groupRunId)
                .orElseThrow(() -> new IllegalStateException("Group Test Run not found with ID: " + groupRunId));

        List<TestGroupMember> members = group.getMembers().stream()
                .sorted(Comparator.comparingInt(TestGroupMember::getSequenceOrder))
                .collect(Collectors.toList());

        List<PerfTestRun> memberRuns = new ArrayList<>();
        boolean failed = false;

        try {
            if (group.getRunStrategy() == RunStrategy.SEQUENTIAL) {
                for (TestGroupMember member : members) {
                    if (failed && group.getStopOnFailure()) {
                        log.info("Sequential group execution {} stopped early due to previous failure", groupRun.getId());
                        break;
                    }

                    PerfTestRun run = executeMember(member, groupRun.getRunTrigger());
                    if (run != null) {
                        memberRuns.add(run);
                        // Poll until this run completes
                        RunStatus finalStatus = pollUntilFinished(run.getId());
                        if (finalStatus == RunStatus.FAILED || finalStatus == RunStatus.ERROR) {
                            failed = true;
                        }
                    }
                }
            } else {
                // Parallel Strategy
                for (TestGroupMember member : members) {
                    PerfTestRun run = executeMember(member, groupRun.getRunTrigger());
                    if (run != null) {
                        memberRuns.add(run);
                    }
                }

                // Wait for all to finish
                for (PerfTestRun run : memberRuns) {
                    RunStatus finalStatus = pollUntilFinished(run.getId());
                    if (finalStatus == RunStatus.FAILED || finalStatus == RunStatus.ERROR) {
                        failed = true;
                    }
                }
            }

            // Aggregate metrics from all member runs
            long totalRequests = 0;
            long errorCount = 0;
            double sumAvg = 0;
            double sumP95 = 0;
            double maxP95 = 0;
            int count = 0;

            for (PerfTestRun r : memberRuns) {
                // reload from DB to get completed metrics
                PerfTestRun completed = runRepository.findById(r.getId()).orElse(r);
                totalRequests += completed.getTotalRequests();
                errorCount += completed.getErrorCount();
                if (completed.getAvgMs() != null) {
                    sumAvg += completed.getAvgMs();
                }
                if (completed.getP95Ms() != null) {
                    sumP95 += completed.getP95Ms();
                    if (completed.getP95Ms() > maxP95) {
                        maxP95 = completed.getP95Ms();
                    }
                }
                count++;
            }

            groupRun.setStatus(failed ? RunStatus.FAILED : RunStatus.PASSED);
            groupRun.setTotalRequests(totalRequests);
            groupRun.setErrorCount(errorCount);
            groupRun.setErrorRatePct(totalRequests > 0 ? ((double) errorCount / totalRequests) * 100.0 : 0.0);
            if (count > 0) {
                groupRun.setAvgMs(sumAvg / count);
                groupRun.setP95Ms(maxP95); // use max P95 of endpoints as group bottleneck indicator
            }
            groupRun.setEndedAt(LocalDateTime.now());
            runRepository.save(groupRun);

        } catch (Exception e) {
            log.error("Error executing group campaign {}", groupRun.getId(), e);
            groupRun.setStatus(RunStatus.ERROR);
            groupRun.setErrorMessage(e.getMessage());
            groupRun.setEndedAt(LocalDateTime.now());
            runRepository.save(groupRun);
        }
    }

    private PerfTestRun executeMember(TestGroupMember member, RunTrigger trigger) {
        try {
            if (member.getTestType() == MemberTestType.PERF) {
                return resultService.startPerformanceTest(member.getTestId(), trigger);
            } else if (member.getTestType() == MemberTestType.LOAD) {
                return resultService.startLoadTest(member.getTestId(), trigger);
            }
        } catch (Exception e) {
            log.error("Failed to start member test type: {} ID: {}", member.getTestType(), member.getTestId(), e);
        }
        return null;
    }

    private RunStatus pollUntilFinished(Long runId) {
        int maxRetries = 900; // 30 minutes max execution time (900 * 2 seconds)
        for (int i = 0; i < maxRetries; i++) {
            try {
                Thread.sleep(2000L);
                PerfTestRun run = runRepository.findById(runId).orElse(null);
                if (run != null && run.getStatus() != RunStatus.RUNNING) {
                    return run.getStatus();
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return RunStatus.ERROR;
            }
        }
        return RunStatus.ERROR;
    }
}
