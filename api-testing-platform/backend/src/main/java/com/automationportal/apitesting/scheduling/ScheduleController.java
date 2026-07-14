package com.automationportal.apitesting.scheduling;

import com.automationportal.apitesting.regularapi.RegularApi;
import com.automationportal.apitesting.regularapi.RegularApiRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleRepository repository;
    private final RegularApiRepository regularApiRepository;
    private final com.automationportal.apitesting.group.ApiGroupRepository groupRepository;
    private final com.automationportal.apitesting.audit.AuditService auditService;

    @Data
    public static class SchedulePayload {
        @NotBlank private String name;
        /** API (default) or GROUP. */
        private Schedule.TargetType targetType = Schedule.TargetType.API;
        private Long regularApiId;
        private Long groupId;
        @NotNull private Schedule.FrequencyType frequencyType;
        private String frequencyValue;
        private Integer maxRetries;
    }

    @Data
    public static class ScheduleView {
        private Schedule schedule;
        private String apiName;
        private String groupName;
        private Long moduleId;
    }

    /** List with API/group/module info; groupBy is rendered client-side from these fields. */
    @GetMapping
    public List<ScheduleView> list(@RequestParam(required = false) Long moduleId) {
        Map<Long, RegularApi> apis = regularApiRepository.findAll().stream()
                .collect(Collectors.toMap(RegularApi::getId, a -> a));
        Map<Long, String> groupNames = groupRepository.findAll().stream()
                .collect(Collectors.toMap(g -> g.getId(), g -> g.getName()));
        return repository.findAll().stream()
                .map(s -> {
                    ScheduleView v = new ScheduleView();
                    v.setSchedule(s);
                    if (s.getTargetType() == Schedule.TargetType.GROUP) {
                        v.setGroupName(groupNames.getOrDefault(s.getGroupId(), "(deleted)"));
                        v.setApiName(null);
                    } else {
                        RegularApi api = apis.get(s.getRegularApiId());
                        v.setApiName(api == null ? "(deleted)" : api.getName());
                        v.setModuleId(api == null ? null : api.getModuleId());
                    }
                    return v;
                })
                .filter(v -> moduleId == null || Objects.equals(v.getModuleId(), moduleId))
                .toList();
    }

    @PostMapping
    public Schedule create(@Valid @RequestBody SchedulePayload payload) {
        Schedule.TargetType target = payload.getTargetType() == null
                ? Schedule.TargetType.API : payload.getTargetType();
        if (target == Schedule.TargetType.API) {
            if (payload.getRegularApiId() == null || !regularApiRepository.existsById(payload.getRegularApiId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Regular API does not exist");
            }
        } else {
            if (payload.getGroupId() == null || !groupRepository.existsById(payload.getGroupId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Group does not exist");
            }
        }
        validateFrequency(payload);
        Schedule s = new Schedule();
        s.setName(payload.getName());
        s.setTargetType(target);
        s.setRegularApiId(target == Schedule.TargetType.API ? payload.getRegularApiId() : null);
        s.setGroupId(target == Schedule.TargetType.GROUP ? payload.getGroupId() : null);
        s.setFrequencyType(payload.getFrequencyType());
        s.setFrequencyValue(payload.getFrequencyValue());
        if (payload.getMaxRetries() != null) s.setMaxRetries(Math.max(0, payload.getMaxRetries()));
        s.setNextRunAt(Instant.now()); // first run on the next poll tick
        s = repository.save(s);
        auditService.record(com.automationportal.apitesting.audit.AuditLog.EntityType.SCHEDULE, s.getId(),
                com.automationportal.apitesting.audit.AuditLog.Action.CREATE,
                "Created schedule '" + s.getName() + "' (" + s.getFrequencyType() + ", target " + target + ")");
        return s;
    }

    @PatchMapping("/{id}/pause")
    public Schedule pause(@PathVariable Long id) {
        Schedule s = find(id);
        s.setStatus(Schedule.Status.PAUSED);
        s = repository.save(s);
        auditService.record(com.automationportal.apitesting.audit.AuditLog.EntityType.SCHEDULE, id,
                com.automationportal.apitesting.audit.AuditLog.Action.PAUSE, "Paused schedule '" + s.getName() + "'");
        return s;
    }

    @PatchMapping("/{id}/resume")
    public Schedule resume(@PathVariable Long id) {
        Schedule s = find(id);
        s.setStatus(Schedule.Status.ACTIVE);
        if (s.getNextRunAt() == null || s.getNextRunAt().isBefore(Instant.now())) {
            s.setNextRunAt(Instant.now());
        }
        s = repository.save(s);
        auditService.record(com.automationportal.apitesting.audit.AuditLog.EntityType.SCHEDULE, id,
                com.automationportal.apitesting.audit.AuditLog.Action.RESUME, "Resumed schedule '" + s.getName() + "'");
        return s;
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repository.findById(id).ifPresent(s ->
                auditService.record(com.automationportal.apitesting.audit.AuditLog.EntityType.SCHEDULE, id,
                        com.automationportal.apitesting.audit.AuditLog.Action.DELETE,
                        "Deleted schedule '" + s.getName() + "'"));
        repository.deleteById(id);
    }

    private Schedule find(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schedule not found"));
    }

    private void validateFrequency(SchedulePayload p) {
        switch (p.getFrequencyType()) {
            case EVERY_X_MIN -> {
                try {
                    if (Long.parseLong(p.getFrequencyValue().trim()) < 1) throw new NumberFormatException();
                } catch (Exception e) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "frequencyValue must be a positive number of minutes");
                }
            }
            case CRON -> {
                if (p.getFrequencyValue() == null || !CronExpression.isValidExpression(p.getFrequencyValue().trim())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "frequencyValue must be a valid cron expression (6 fields, Spring format)");
                }
            }
            default -> { /* HOURLY / DAILY / WEEKLY need no value */ }
        }
    }
}
