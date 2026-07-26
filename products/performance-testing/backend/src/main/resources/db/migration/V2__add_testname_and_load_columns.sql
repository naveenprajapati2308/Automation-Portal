-- V2: Add test_name to perf_test_run for denormalized display in history/dashboard
ALTER TABLE perf_test_run
    ADD COLUMN test_name VARCHAR(255) AFTER test_id;

-- V2: Add virtual_user_count / ramp-up config columns to perf_load_test for UI fields
ALTER TABLE perf_load_test
    ADD COLUMN virtual_user_count   INT             NOT NULL DEFAULT 10    COMMENT 'Initial / baseline VU count'    AFTER vu_assignments,
    ADD COLUMN ramp_up_seconds      INT             NOT NULL DEFAULT 30    COMMENT 'Time to ramp from 0 to max VUs' AFTER virtual_user_count,
    ADD COLUMN steady_duration_seconds INT           NOT NULL DEFAULT 60    COMMENT 'Time to hold at peak VUs'       AFTER ramp_up_seconds,
    ADD COLUMN ramp_down_seconds    INT             NOT NULL DEFAULT 15    COMMENT 'Time to ramp back to 0'         AFTER steady_duration_seconds,
    ADD COLUMN max_virtual_users    INT             NOT NULL DEFAULT 100   COMMENT 'Peak concurrent VU count'       AFTER ramp_down_seconds;
