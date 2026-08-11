-- Optional local-reference fields a Project Admin fills in at registration time, so the
-- downloadable starter kit (StarterKitService) can pre-fill config-v2.properties / .env with
-- where their framework checkout and local report output actually live.

ALTER TABLE test_engines
    ADD COLUMN framework_path VARCHAR(500) NULL,
    ADD COLUMN report_path VARCHAR(500) NULL;
