-- V12: Add framework column so an execution's run engine (Selenium/Maven-TestNG,
-- Playwright, ...) is selectable per run instead of always being Maven/TestNG.
-- Free-text (not an enum) so a future framework doesn't need a schema change to introduce.
ALTER TABLE executions ADD COLUMN framework VARCHAR(50) NOT NULL DEFAULT 'MAVEN_TESTNG';
ALTER TABLE execution_jobs ADD COLUMN framework VARCHAR(50) NOT NULL DEFAULT 'MAVEN_TESTNG';
