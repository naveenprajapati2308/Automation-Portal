-- A "workflow" module can have several sub-type variants (e.g. Architect Empanelment's
-- Individual/Proprietorship/Partnership/... org types) that each need their own suite XML /
-- spec file. Rather than letting every (workflow x sub-type x framework) combination become
-- its own top-level module row indefinitely, sub-type rows now point back at one parent
-- workflow row via parent_module_id — the Execution Center's Module picker only lists
-- top-level rows, and shows a module's own children as a second, dependent picker.
ALTER TABLE modules
    ADD COLUMN parent_module_id BIGINT NULL,
    ADD CONSTRAINT fk_modules_parent FOREIGN KEY (parent_module_id) REFERENCES modules(id) ON DELETE CASCADE;
