-- Per-environment framework configuration (base URL is already a dedicated column).
-- Stored as a JSON object of key/value pairs (e.g. login credentials, captcha keys)
-- managed from the Environments page; injected into runs as -D system properties
-- once the framework-side contract is wired up.
ALTER TABLE environments ADD COLUMN config_json TEXT NULL;
