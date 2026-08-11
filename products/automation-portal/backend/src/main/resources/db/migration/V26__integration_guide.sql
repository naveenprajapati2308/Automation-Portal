-- User-facing "Integration Guide" — visible to every workspace user, editable only by Super
-- Admin. Answers: what is Testrix, what does this workspace get, and how does connecting an
-- automation framework actually work (the same ground covered by docs/automation-framework-
-- connection.md and docs/test-engine-integration-architecture.md, rewritten for a Project Admin
-- audience rather than developers).

CREATE TABLE integration_guide_sections (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sort_order INT NOT NULL DEFAULT 0,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by_user_id BIGINT NULL
);

INSERT INTO integration_guide_sections (sort_order, title, body) VALUES
(1, 'What is Testrix',
'Testrix is a unified testing platform that brings Automation (Selenium/Playwright), API Testing, and Performance Testing together under one login, one dashboard, and one set of workspaces. Each workspace is an isolated project — your users, executions, reports, and settings never mix with any other workspace on the platform.'),

(2, 'Your Workspace',
'Every workspace has its own Project Admin (that''s you, if you can edit this page from your side), team members with different roles (QA Lead, Tech Lead, Automation Engineer, Viewer), and its own set of enabled products. API Testing and Performance Testing work immediately — just start creating collections, environments, and load plans from their respective sections. Automation is the one product that needs an extra step, covered below, because the thing that actually runs your tests is your own external Selenium/TestNG or Playwright codebase, not something Testrix hosts for you.'),

(3, 'How Automation Framework Integration Works',
'When you trigger a run from Execution Center, Testrix queues it, dispatches it to a Test Engine, and the Test Engine shells out to your real test process (Maven for Selenium/TestNG, or npx playwright for Playwright). As your tests run, your framework pushes live results back to Testrix — started, passed, failed, skipped, screenshots — so your dashboard updates in real time instead of waiting for the whole suite to finish. None of your test source code is ever uploaded into Testrix; only the results are.'),

(4, 'Steps to Connect Your Automation Framework',
'1. Go to Workspace Settings → Framework Connection → Register Test Engine. Choose Selenium or Playwright and give it a name.\n2. Copy the API key shown — it is shown only once. This key is unique to your workspace; no other workspace can use it.\n3. Paste that key into your framework''s own config (Selenium: config-v2.properties''s portal.api.key; Playwright: your .env file''s PORTAL_API_KEY).\n4. Ask your Testrix platform admin to register your test suites as Modules against your new Test Engine, so Execution Center knows what it can run.\n5. Trigger a run — your Test Engine''s status will flip to Active the first time it successfully reports back.'),

(5, 'Security & Credentials',
'Every Test Engine gets its own private key — it is never shared between workspaces, and Testrix only ever stores a one-way hash of it, never the key itself. If a key is ever compromised, rotate it from the same Framework Connection panel; the old key stops working immediately. You can also disable a Test Engine entirely, which blocks any new runs through it until it''s re-enabled.'),

(6, 'Need Help?',
'If a step above doesn''t match what you see in your workspace, or your Test Engine won''t connect, contact your Testrix platform admin — they can see engine status, health, and registered modules from their side and help diagnose the issue.');
