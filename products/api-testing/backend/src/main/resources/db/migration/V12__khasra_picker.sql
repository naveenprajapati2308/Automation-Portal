-- Generic, name-driven hook so the execution engine can trigger a dedicated
-- server-side resolver for a specific Regular API (e.g. multi-step "find a
-- real, non-duplicate value" logic that plain variable bindings can't express)
-- without hardcoding that API's id anywhere in shared engine code.
ALTER TABLE API_MASTER ADD COLUMN special_resolver VARCHAR(30) NULL;

-- Master-data lookup APIs the khasra picker walks through (district -> tehsil
-- -> village -> parcel/khasra candidates -> duplicate check), also usable
-- standalone for manual testing. No auth required (confirmed live).
INSERT INTO API_MASTER (module_id, project_id, name, method, url_template, is_dynamic, timeout_ms, follow_redirects, verify_ssl)
VALUES
    (26, 1, 'Get Districts', 'GET', 'https://godavari.mp.gov.in/mphb_qa/backend/api/master/district', 0, 15000, 1, 1),
    (26, 1, 'Get Tehsils by District', 'GET', 'https://godavari.mp.gov.in/mphb_qa/backend/api/master/tehsil/districtCode/{{district_id}}', 0, 15000, 1, 1),
    (26, 1, 'Get Villages by District & Tehsil', 'GET', 'https://godavari.mp.gov.in/mphb_qa/backend/api/master/village/villagename-by-district-division?district_code={{district_id}}&tehsil_code={{tehsil_code}}', 0, 15000, 1, 1),
    (26, 1, 'Get District GeoJSON', 'GET', 'https://godavari.mp.gov.in/mphb_qa/backend/api/geojson/district/{{district_id}}', 0, 15000, 1, 1),
    (26, 1, 'Khasra Duplicate Check', 'GET', 'https://godavari.mp.gov.in/mphb_qa/backend/api/land/khasra/duplicate-check?village_ward_id={{village_ward_id}}&khasra_no={{khasra_no}}&is_old_new={{is_old_new}}', 0, 15000, 1, 1);

INSERT INTO API_MASTER (module_id, project_id, name, method, url_template, body_type, body_template, is_dynamic, timeout_ms, follow_redirects, verify_ssl)
VALUES
    (26, 1, 'Bhulekh Parcels by LGD Code', 'POST', 'https://godavari.mp.gov.in/mphb_qa/backend/api/cheif-architect/bhulekh/parcels', 'JSON', '{"lgd_code":"{{lgd_code}}"}', 0, 15000, 1, 1);

-- Fill the missing EE_token binding on the Regular APIs whose headers_template
-- already references {{EE_token}} but had no BASE_API_MAPPING row supplying it
-- (only regular_api_id 399 had one before this). Mirrors that existing row.
INSERT INTO BASE_API_MAPPING (regular_api_id, base_api_id, source_json_path, variable_name, target_location, target_key)
VALUES
    (400, 115, '$.data.token', 'EE_token', 'TEMPLATE', ''),
    (401, 115, '$.data.token', 'EE_token', 'TEMPLATE', ''),
    (402, 115, '$.data.token', 'EE_token', 'TEMPLATE', ''),
    (403, 115, '$.data.token', 'EE_token', 'TEMPLATE', ''),
    (405, 115, '$.data.token', 'EE_token', 'TEMPLATE', '');

-- API 400 "Govt. Add khasra": the seeded district_id (25/Khandwa) + tehsil_id
-- (339) never actually matched each other in the real master data, and
-- village_ward_id/khasra_no were static dummy values. Fixed the district to
-- Narsinghpur (34), the one with real digitized Bhulekh parcel data in this
-- QA env, and turned tehsil_id/village_ward_id/khasra_no into placeholders
-- the new KHASRA_PICKER resolver fills in with a real, non-duplicate
-- combination on every run.
UPDATE API_MASTER
SET form_data_template = '[{"key":"is_old_new","type":"TEXT","value":"New","enabled":true},{"key":"district_id","type":"TEXT","value":"34","enabled":true},{"key":"tehsil_id","type":"TEXT","value":"{{tehsil_id}}","enabled":true},{"key":"area_id","type":"TEXT","value":"Urban","enabled":true},{"key":"village_ward_id","type":"TEXT","value":"{{village_ward_id}}","enabled":true},{"key":"khasra_no","type":"TEXT","value":"{{khasra_no}}","enabled":true},{"key":"area_hectare","type":"TEXT","value":"1.5","enabled":true},{"key":"lat","type":"TEXT","value":"22.7196","enabled":true},{"key":"lng","type":"TEXT","value":"75.8577","enabled":true},{"key":"purchase_date","type":"TEXT","value":"2026-08-01","enabled":true},{"value":"","fileName":null,"fileId":null,"type":"FILE","key":"demarcation_doc","enabled":true},{"value":"","fileName":null,"fileId":null,"type":"FILE","key":"possession_doc","enabled":true},{"value":"","fileName":null,"fileId":null,"type":"FILE","key":"field_book_doc","enabled":true},{"value":"","fileName":null,"fileId":null,"type":"FILE","key":"map_layout_doc","enabled":true},{"value":"","fileName":null,"fileId":null,"type":"FILE","key":"khasra_copy_doc","enabled":true}]',
    special_resolver = 'KHASRA_PICKER'
WHERE id = 400;
