-- ─── Execution Job Queue ─────────────────────────────────────────────────────
-- Durable queue that decouples schedule-firing from k6 process launch.
-- PerfJobWorker drains this table at a configurable concurrency cap so the
-- portal never spawns unbounded k6 processes when many schedules fire at once.
CREATE TABLE perf_job_queue (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    job_type        ENUM('PERF_TEST','LOAD_TEST','GROUP') NOT NULL,
    target_id       BIGINT          NOT NULL  COMMENT 'FK to perf_performance_test, perf_load_test, or perf_test_group',
    run_trigger     ENUM('MANUAL','SCHEDULED') NOT NULL DEFAULT 'MANUAL',
    status          ENUM('PENDING','RUNNING','COMPLETED','FAILED','CANCELLED')
                    NOT NULL DEFAULT 'PENDING',
    priority        INT             NOT NULL DEFAULT 5 COMMENT '1=highest, 10=lowest; scheduler uses 5',
    run_id          BIGINT          COMMENT 'Set to perf_test_run.id once the worker dispatches the job',
    schedule_id     BIGINT          COMMENT 'Set to perf_test_schedule.id if triggered by the scheduler',
    retry_count     INT             NOT NULL DEFAULT 0,
    max_retries     INT             NOT NULL DEFAULT 2,
    error_message   TEXT,
    enqueued_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,
    PRIMARY KEY (id),
    -- Worker claims: status=PENDING ordered by priority then FIFO
    INDEX idx_status_priority_enqueued (status, priority, enqueued_at),
    -- Lookup by linked run for completion callback
    INDEX idx_run_id (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Extend perf_test_schedule.last_status to include QUEUED ─────────────────
-- QUEUED = schedule was claimed and a job was enqueued, but k6 not yet started.
-- RUNNING = the PerfJobWorker has dispatched the job and k6 is active.
ALTER TABLE perf_test_schedule
    MODIFY COLUMN last_status
        ENUM('PASSED','FAILED','RUNNING','ABORTED','NEVER_RUN','QUEUED','ERROR')
        NOT NULL DEFAULT 'NEVER_RUN';
