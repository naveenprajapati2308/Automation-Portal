-- Which environments a module is available in, as a comma-separated list of
-- environment codes (e.g. "QA,UAT"). NULL/empty means available in ALL
-- environments (the default for existing modules). Kept as a simple CSV for the
-- current one-project deployment; can graduate to a join table if per-project
-- support (docs/version2.1.md) ever needs it.
ALTER TABLE modules ADD COLUMN env_codes VARCHAR(255) NULL;
