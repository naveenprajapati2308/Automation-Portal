-- V14: A module's code is no longer unique on its own — the same business module (e.g. "LAND")
-- can now exist once per framework (Selenium's Maven/TestNG version and Playwright's version
-- are different run targets under the same business name). Widen the constraint to
-- (code, runner_type) so both can coexist; verified the existing single-column index is
-- literally named "code" (MySQL's default for an inline UNIQUE column) via
-- `SHOW INDEX FROM modules`, so drop it by that exact name.
ALTER TABLE modules
    DROP INDEX code,
    ADD UNIQUE KEY uq_modules_code_runner_type (code, runner_type);
