-- Backs ExecutionIdGeneratorService: one row per (framework short code, calendar date), holding
-- the last sequence number issued for that combination. Execution IDs now read
-- AUTO-<shortCode>-<yyyyMMdd>-<seq> (e.g. AUTO-SL-20260802-0001) instead of the old
-- "AUTO-<timestamp>-<random>" format — a shared row + atomic upsert (see the service) is what
-- keeps the sequence gap-free and collision-free even when two executions are queued in the
-- same instant across different frameworks.
CREATE TABLE execution_id_sequence (
    framework_code VARCHAR(10) NOT NULL,
    seq_date       DATE NOT NULL,
    last_seq       INT NOT NULL DEFAULT 0,
    PRIMARY KEY (framework_code, seq_date)
);
