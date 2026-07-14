package com.automationportal.apitesting.group;

import com.automationportal.apitesting.execution.dto.ExecutionContext;
import com.automationportal.apitesting.execution.dto.ExecutionResponse;
import com.automationportal.apitesting.history.ExecutionHistory;
import com.automationportal.apitesting.regularapi.DependencyExecutionService;
import com.automationportal.apitesting.regularapi.RegularApi;
import com.automationportal.apitesting.regularapi.RegularApiRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Runs a group: Group → API 1 (Base → Regular) → API 2 (Base → Regular) → …
 * → group result → history → dashboard. Reuses the existing dependency
 * execution pipeline — scheduled, manual and group execution share one path.
 * Manual triggers run on the bounded worker pool so the API thread returns
 * immediately with the RUNNING execution row.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GroupExecutionService {

    private final ApiGroupMemberRepository memberRepository;
    private final ApiGroupExecutionRepository executionRepository;
    private final RegularApiRepository regularApiRepository;
    private final DependencyExecutionService dependencyExecutionService;
    @Qualifier("scheduleWorkerExecutor")
    private final ThreadPoolTaskExecutor executor;

    /** Manual trigger: creates the RUNNING record and executes asynchronously. */
    public ApiGroupExecution executeAsync(ApiGroup group) {
        ApiGroupExecution execution = start(group, ApiGroupExecution.TriggeredBy.MANUAL, null);
        executor.execute(() -> runMembers(group, execution));
        return execution;
    }

    /** Scheduled trigger: runs inline on the schedule worker thread. */
    public ApiGroupExecution executeSync(ApiGroup group, Long scheduleId) {
        ApiGroupExecution execution = start(group, ApiGroupExecution.TriggeredBy.SCHEDULE, scheduleId);
        runMembers(group, execution);
        return executionRepository.findById(execution.getId()).orElse(execution);
    }

    private ApiGroupExecution start(ApiGroup group, ApiGroupExecution.TriggeredBy trigger, Long scheduleId) {
        List<ApiGroupMember> members = memberRepository.findByGroupIdOrderBySeqAsc(group.getId());
        ApiGroupExecution execution = new ApiGroupExecution();
        execution.setGroupId(group.getId());
        execution.setCorrelationId(UUID.randomUUID().toString());
        execution.setTriggeredBy(trigger);
        execution.setScheduleId(scheduleId);
        execution.setTotalApis(members.size());
        return executionRepository.save(execution);
    }

    private void runMembers(ApiGroup group, ApiGroupExecution execution) {
        List<ApiGroupMember> members = memberRepository.findByGroupIdOrderBySeqAsc(group.getId());
        int passed = 0;
        int failed = 0;
        ExecutionHistory.TriggeredBy trigger = execution.getTriggeredBy() == ApiGroupExecution.TriggeredBy.SCHEDULE
                ? ExecutionHistory.TriggeredBy.SCHEDULE
                : ExecutionHistory.TriggeredBy.MANUAL;

        log.info("group execution started groupId={} executionId={} correlationId={} members={}",
                group.getId(), execution.getId(), execution.getCorrelationId(), members.size());

        for (ApiGroupMember member : members) {
            ExecutionContext context = ExecutionContext.builder()
                    .groupId(group.getId())
                    .groupExecutionId(execution.getId())
                    .correlationId(execution.getCorrelationId())
                    .build();
            try {
                RegularApi api = regularApiRepository.findById(member.getRegularApiId()).orElse(null);
                if (api == null) {
                    log.warn("group member api {} no longer exists — counted as failed", member.getRegularApiId());
                    failed++;
                    continue;
                }
                var result = dependencyExecutionService.execute(api, trigger, execution.getScheduleId(), context);
                ExecutionResponse response = result.getResponse();
                boolean httpOk = response.isSuccess()
                        && response.getStatusCode() != null && response.getStatusCode() < 400;
                boolean validationOk = result.getValidationPassed() == null || result.getValidationPassed();
                if (httpOk && validationOk) {
                    passed++;
                } else {
                    failed++;
                }
            } catch (Exception ex) {
                log.error("group member {} crashed: {}", member.getRegularApiId(), ex.getMessage(), ex);
                failed++;
            }
        }

        execution.setPassedApis(passed);
        execution.setFailedApis(failed);
        int total = Math.max(execution.getTotalApis(), passed + failed);
        execution.setHealthPercent(total == 0 ? 100.0 : Math.round(passed * 1000.0 / total) / 10.0);
        execution.setStatus(failed == 0 ? ApiGroupExecution.Status.SUCCESS
                : passed == 0 ? ApiGroupExecution.Status.FAILED
                : ApiGroupExecution.Status.PARTIAL);
        execution.setFinishedAt(Instant.now());
        executionRepository.save(execution);

        log.info("group execution finished groupId={} executionId={} status={} passed={} failed={} health={}%",
                group.getId(), execution.getId(), execution.getStatus(), passed, failed, execution.getHealthPercent());
    }
}
