-- Full rewrite of the Documentation page content (formerly a thin 6-section "Integration Guide"),
-- plus an optional screenshot per section. Requested directly: a new workspace should be able to
-- read this page start to finish and connect their automation framework without needing to ask
-- anyone anything. Content is sourced from docs/automation-framework-connection.md and
-- docs/test-engine-integration-architecture.md (the Test Engine Registry / Plan 2 design, the
-- current, accurate mechanism — automation-framework-connection.md's "target design" section
-- describes what Plan 2 then implemented the next day) plus the live Workspace Settings ->
-- Framework Connection panel and FrameworkRunnerService.java's actual reserved -D flags.

ALTER TABLE integration_guide_sections ADD COLUMN image_path VARCHAR(500) NULL AFTER body;

DELETE FROM integration_guide_sections;
ALTER TABLE integration_guide_sections AUTO_INCREMENT = 1;

INSERT INTO integration_guide_sections (sort_order, title, body) VALUES

(1, 'What is Testrix',
'Testrix is a unified testing platform built to bring Automation (Selenium/TestNG and Playwright), API Testing, and Performance Testing together under one login, one dashboard, and one workspace model — so a QA team doesn''t have to stitch together three separate tools with three separate logins and three separate report formats.

Goal: give every team a single place to trigger tests, watch them run live, and see results, regardless of which of the three testing disciplines the run belongs to.

What you get as a workspace: your own isolated project. Your users, executions, reports, environments, and settings never mix with any other workspace on the platform, even though everyone shares the same Testrix installation. Your Project Admin controls who''s on your team and what they can do; nobody outside your workspace can see your data, and you can''t see theirs.

What delivery looks like day to day: API Testing and Performance Testing are ready the moment your workspace is approved — you just start creating collections, environments, and load plans from inside those products. Automation needs one extra step because the thing that actually runs your tests is your own external codebase, not something Testrix hosts — covered in detail below.'),

(2, 'Your Workspace',
'Every workspace has its own Project Admin (that''s you, if you can edit this page from your side), team members with different roles (QA Lead, Tech Lead, Automation Engineer, Viewer), and its own set of enabled products. Roles decide what a team member can see and do — a Viewer can watch dashboards and reports but can''t trigger runs or change settings; QA Lead, Tech Lead, and Automation Engineer can operate their assigned products; Project Admin has full control over the workspace, including Team Management and Workspace Settings.

API Testing and Performance Testing work immediately — start creating collections, environments, and load plans from their respective sections in the sidebar. Automation is the one product that needs an extra step, covered in the sections below, because the thing that actually runs your tests is your own external Selenium/TestNG or Playwright codebase, not something Testrix hosts for you.'),

(3, 'How Automation Framework Integration Works',
'When you trigger a run from Execution Center, here is exactly what happens, in order:

1. Execution Center sends the run request to the Testrix backend, which queues it.
2. The Execution Manager picks the queued job up and dispatches it to a Framework Runner.
3. The Framework Runner shells out to your real test process: mvn test for Selenium/TestNG, or npx playwright test for Playwright.
4. As your tests execute, your framework''s own code pushes live lifecycle events back to Testrix over the network — test started, passed, failed, skipped, a screenshot captured, a video captured — so your dashboard updates in real time instead of waiting for the entire suite to finish.
5. When the suite finishes, Testrix marks the execution complete and builds the final report from the events it received.

Two things worth understanding clearly. First, none of your test source code is ever uploaded into Testrix — only the results (pass/fail counts, screenshots, logs, timestamps) travel over the network, in the direction of your framework pushing to Testrix, not the other way around. Second, Testrix does not run your tests directly — it runs a Framework Runner that in turn runs your own Maven or Playwright process exactly as you would from a terminal, and simply listens for what that process reports back.'),

(4, 'Test Engines — Your Per-Workspace Identity & Credential',
'A "Test Engine" is Testrix''s name for a registered connection between your workspace and a real Selenium or Playwright process. Registering one gives your workspace its own private credential (an API key), separate from every other workspace''s, so that when your framework reports results back to Testrix, Testrix knows with certainty which workspace those results belong to.

Why this exists: before Test Engines existed, every workspace on the platform shared one single API key. That worked for a single pilot workspace, but it meant any framework anywhere that knew the key could technically post results against any execution — no real isolation between workspaces. Registering your own Test Engine replaces that shared key with one that belongs to you alone, and Testrix rejects any attempt to use your engine''s key against another workspace''s execution.

Two engine types: SELENIUM (for Maven/TestNG-based Selenium suites) and PLAYWRIGHT (for Playwright suites). You can register as many engines as you need — for example, one for your Selenium regression suite and a separate one for a Playwright smoke suite — each gets its own independent credential, and each can be rotated, revoked, or disabled without touching the others.

Deployment type is informational — Local, Docker, VM, Kubernetes, or Other. It records where your engine physically runs so your team has that context later; it doesn''t change how the connection works.'),

(5, 'Step-by-Step: Register Your First Test Engine',
'1. Go to Workspace Settings, then the Framework Connection panel — only visible once Automation (Selenium or Playwright) is enabled for your workspace.
2. Click "Register Test Engine".
3. Choose the Engine Type — Selenium or Playwright — matching the framework you''re connecting.
4. Give it a Name (for example, "Regression Suite - Selenium") and, optionally, a Description and Deployment Type.
5. Submit. Testrix generates your credential immediately and shows it to you exactly once, in a "Test Engine Credential" dialog.
6. Copy that key right away — click the copy icon, or select the text manually. Once you close this dialog, Testrix cannot show you the plaintext key again; from that point on it only ever stores a one-way hash of it.
7. Paste the key into your framework''s own config: for Selenium, config-v2.properties''s portal.api.key; for Playwright, your .env file''s PORTAL_API_KEY.

That is the entire credential side. Your new engine appears in the "Your Test Engines" list with a health indicator; it flips from its initial registered state to Active the first time it successfully sends Testrix a real event from an actual run.'),

(6, 'Connecting Your Framework Code — Today''s Reality',
'This is the part worth being precise about, because it is easy to assume registering a Test Engine also connects your actual test code. It doesn''t, not yet — and this page would rather tell you that plainly than leave you to discover it.

What Test Engine registration gives you today: an isolated credential (see the sections above) so your results are provably yours, plus a place to track that engine''s health and rotate or revoke its key.

What it does not give you yet: a private, isolated location for your test code to live. Today, the Framework Runner reads Selenium/TestNG code from one shared location, and Playwright code from a separate shared location, both configured once for the whole platform, not per workspace. If your workspace is bringing a brand-new automation codebase, getting it running today requires your platform admin to add your test suites into that shared location and register them as Modules pointed at your Test Engine (see "Registering Modules Against Your Engine" below) — a short, one-time, admin-mediated step, not something you can currently do end-to-end yourself from this page.

Per-workspace isolated code, so every workspace can bring its own repository with zero admin involvement, is on the platform''s roadmap but not built yet. This page will be updated the moment that changes. If your workspace already has code running today, it was almost certainly onboarded this same way — talk to your platform admin if you''re setting up a new suite.'),

(7, 'Writing Your Framework''s Integration Code — And Where the API Key Fits In',
'A common question: do you need to finish writing your framework''s integration code before you can generate an API key, or the other way around? Neither — the two are independent, and you can do them in either order.

Registering a Test Engine and getting your API key does not require any code to exist yet. You can register the engine, copy the key, and hold onto it while you write or adapt your framework. Writing the integration code does not require a "real" key to develop against either — you can write it first and paste in the real key right before your first live run.

What your framework''s code actually needs to do, at a minimum, to work with Testrix:

1. At process start, read the execution ID, the callback URL, and your API key. Maven/TestNG receives these as system properties (-DexecutionId, -DportalUrl, -DportalApiKey); Playwright receives them as environment variables (EXECUTION_ID, PORTAL_URL, PORTAL_API_KEY).
2. As the suite runs, POST each lifecycle event (suite started, module started, test started, test passed, test failed, test skipped, screenshot captured, video captured, log entry, module completed, suite completed) to {portalUrl}/api/events/execution, with your API key in the X-API-Key header.
3. Make every one of those POSTs fire-and-forget — if Testrix is briefly unreachable, your test run must keep going and finish normally. A reporting outage should never fail your actual tests.
4. Read any environment-specific values (base URLs, credentials, and so on) from the config Testrix passes in for whichever Environment the run was launched against, instead of hardcoding them in your suite.

You do not have to build this from scratch. The platform''s own reference implementations already do exactly this: for Selenium, PortalApiClient.java (the event pusher) plus ExtentReportManagerV2.java / Master_extent_report_v2.java (the TestNG listeners that call it) and config-v2.properties (where the key lives); for Playwright, tests/reporter/testrix-reporter.ts plus your .env file. Copying that pattern into your own suite is the fastest path to a working connection.'),

(8, 'Reports — How Results Actually Reach Testrix',
'If you are looking for a setting called something like "report path" or "output folder" to point Testrix at, there isn''t one — and that is intentional, not a missing feature.

Testrix does not read a report file off disk after your suite finishes. Instead, your framework pushes structured events to Testrix live, while the suite is still running (see "Writing Your Framework''s Integration Code" above) — every test start, pass, fail, skip, screenshot, and video arrives as its own event, in real time. Testrix assembles the dashboard, the live execution monitor, and the final report entirely from that stream of events. That is also why your dashboard updates test-by-test instead of only appearing once the whole suite is done.

Your framework can still generate its own local report too — Selenium/TestNG via ExtentReports (test-output/testng-results.xml and friends), Playwright via its own built-in HTML reporter. Testrix doesn''t need or read either of those; they are purely for your own local debugging, and there is nothing to configure or point at Testrix for them to keep working.'),

(9, 'Managing Your Test Engines — Rotate, Revoke, Disable',
'From the Framework Connection panel, each registered Test Engine has three controls.

Rotate generates a brand-new key and immediately invalidates the old one, in a single atomic step. Use this if you suspect a key may have leaked, or as routine hygiene. You will see the new plaintext key exactly once, the same as at registration — update your framework''s config with it right away, or that engine stops being able to report results until you do.

Revoke invalidates the current key without issuing a replacement. The engine goes dark (any events it sends will be rejected) until you rotate a new key for it. Use this if you need to shut an engine off immediately and aren''t ready to reconnect it yet.

Disable stops new executions from being dispatched to modules linked to this engine at all, before they even start. Executions already in progress aren''t affected. Re-enable by rotating a new credential for it.

Testrix never stores your key in a form it could show you again or that could leak in plaintext from a database breach — only a one-way hash is kept after the moment you first see it, the same approach used by services like GitHub and Stripe for their own tokens.'),

(10, 'Registering Modules Against Your Engine',
'A Test Engine on its own doesn''t run anything — it is the credential, not the test suite. To actually run tests through Execution Center, your platform admin registers your test suite as a Module (Manage Modules, an admin-only screen) and, in that Module''s settings, links it to your Test Engine through a "Test Engine (optional)" dropdown — filtered automatically to engines of the matching type, so a Playwright module can only be linked to a Playwright engine, and the same for Selenium.

Once a Module is linked to your engine, every run of that Module authenticates using your engine''s own credential instead of the platform''s older shared one, so its results are unambiguously tied to your workspace, and its health and activity show up against your engine specifically.

If you don''t yet see your test suite as a runnable Module in Execution Center, this linking step is very likely what''s missing — contact your platform admin with your Test Engine''s name (shown in Workspace Settings, Framework Connection) so they can complete it.'),

(11, 'Need Help?',
'If a step above doesn''t match what you see in your workspace, if your Test Engine''s health never moves past its initial state, or if a run isn''t authenticating the way this page describes, contact your Testrix platform admin. They can see every engine''s status, health, credential history, and linked modules from their side, and are best placed to diagnose exactly where the connection is breaking.');
