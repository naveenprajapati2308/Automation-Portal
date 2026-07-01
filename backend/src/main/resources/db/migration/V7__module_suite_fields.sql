-- V7: Add xml_file and report_path to modules table for DB-driven suite resolution
ALTER TABLE modules
    ADD COLUMN xml_file    VARCHAR(500) NULL,
    ADD COLUMN report_path VARCHAR(500) NULL;

-- Remove incorrectly seeded placeholder modules
DELETE FROM modules WHERE code IN ('SURVEY', 'GIS');

-- Backfill existing LAND module with correct suite info
UPDATE modules SET xml_file = 'land.xml', report_path = 'reports/MasterReport2.html' WHERE code = 'LAND';
