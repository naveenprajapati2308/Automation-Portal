package com.automationportal.perftesting.schedule;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PerfTestScheduleDto {
    private Long id;
    private String name;
    private String type; // "PERF", "LOAD", "GROUP"
    private Long refId;
    private String cronExpression;
    private String timezone;
    private Boolean isActive; // Mapped to frontend expected key
    private LocalDateTime lastRunAt;
    private LocalDateTime nextRunAt;
    private String lastRunStatus;
}
