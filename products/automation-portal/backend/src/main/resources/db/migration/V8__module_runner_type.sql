-- V8: Add runner_type to modules table so future frameworks (beyond Maven/TestNG)
-- can be registered without a schema change to how a module is executed.
ALTER TABLE modules
    ADD COLUMN runner_type VARCHAR(50) NOT NULL DEFAULT 'MAVEN_TESTNG';
