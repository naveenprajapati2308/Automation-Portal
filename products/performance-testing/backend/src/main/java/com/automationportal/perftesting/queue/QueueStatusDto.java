package com.automationportal.perftesting.queue;

import lombok.*;

/**
 * Summary DTO returned by {@code GET /api/v1/queue/status}.
 * The frontend Scheduler page polls this to display the Queue Status Panel.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QueueStatusDto {
    private long pendingCount;
    private long runningCount;
    private long failedCount;
    private long completedCount;
    private int  maxConcurrentRuns;
    private boolean isAtCapacity;
}
