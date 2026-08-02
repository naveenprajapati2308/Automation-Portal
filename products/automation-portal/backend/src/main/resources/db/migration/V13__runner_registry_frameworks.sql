-- V13: Add supported_frameworks to runner_registry so a future CPU-bound framework (JMeter,
-- k6) can register its own runner instead of sharing the browser-bound one, without any
-- change to today's dispatch behavior (null/empty = supports everything, the current default).
ALTER TABLE runner_registry ADD COLUMN supported_frameworks VARCHAR(255) NULL;
