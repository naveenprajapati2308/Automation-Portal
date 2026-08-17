-- Rewrites the Integration Guide to describe the finished Automation Setup Wizard (previously
-- an admin-mediated, shared-checkout process — see V27's section 6, "Today's Reality") and adds
-- sections for Modules/Environments self-service, Team creation & roles, and how concurrent
-- execution now works across projects. Same full-rewrite pattern V27 used, for the same reason:
-- a new workspace should be able to read this page start to finish and get Automation running
-- without asking anyone anything.

DELETE FROM integration_guide_sections;
ALTER TABLE integration_guide_sections AUTO_INCREMENT = 1;

INSERT INTO integration_guide_sections (sort_order, title, body) VALUES

(1, 'What is Testrix',
'Testrix is a unified testing platform built to bring Automation (Selenium/TestNG and Playwright), API Testing, and Performance Testing together under one login, one dashboard, and one workspace model — so a QA team doesn''t have to stitch together three separate tools with three separate logins and three separate report formats.

What you get as a workspace: your own isolated project. Your users, executions, reports, environments, and settings never mix with any other workspace on the platform, even though everyone shares the same Testrix installation. Your Project Admin controls who''s on your team and what they can do; nobody outside your workspace can see your data, and you can''t see theirs.

What delivery looks like day to day: API Testing and Performance Testing are ready the moment your workspace is approved — you just start creating collections, environments, and load plans from inside those products. Automation opens straight into a short one-time Setup Wizard instead, because the thing that actually runs your tests is your own codebase, not something Testrix hosts — covered in detail below.'),

(2, 'Your Workspace & Team',
'Every workspace has its own Project Admin (that''s you, if you can edit this page or reach Team Management from your sidebar), and up to four other roles for the rest of your team: QA Lead, Tech Lead, Automation Engineer, and Viewer. Roles decide what a team member can see and do — a Viewer can watch dashboards and reports but can''t trigger runs or change settings; QA Lead, Tech Lead, and Automation Engineer can operate their assigned products; Project Admin has full control over the workspace, including Team Management and Workspace Settings.

Adding a teammate is fully self-service: open Team Management from the sidebar, add them by email, and pick a role. If they don''t have a Testrix account yet, one is created for them automatically and a welcome email goes out with a temporary password; if they already have an account, they''re simply attached to your workspace with the role you chose. You can change anyone''s role, deactivate them, or transfer workspace ownership from the same page, any time — no platform admin involvement needed for any of it.'),

(3, 'The Automation Setup Wizard',
'The first time a Project Admin opens Automation, it opens into a short Setup Wizard instead of an empty dashboard — there is nothing meaningful to show until at least one framework, module, and environment exist for your project, so the wizard walks you through creating all three, in order:

1. Get your framework code — pick Selenium or Playwright; Testrix registers a Test Engine for your project and hands you a ready-to-run starter kit as a zip download in the same step.
2. Tell us where you put it — unzip the starter kit, add your own test scripts, place the folder under the project frameworks location the wizard shows you, and tell Testrix the folder name you chose.
3. Create your first Module — point at one suite/spec file inside that folder. You can add more later.
4. Add an Environment — where should tests actually run against (a base URL, plus any per-environment config you add afterward).

Once all four exist, the wizard steps aside permanently and the normal Dashboard takes over for everyone in your workspace. Anyone who isn''t a Project Admin sees a short "ask your Project Admin" message instead of the wizard while setup is still pending, since only a Project Admin can complete it.

Bringing a second framework later (say, Selenium first, Playwright afterward) doesn''t require redoing any of this — "Add Framework" in the sidebar re-opens the same four steps for the new framework, independent of the one you already finished.'),

(4, 'Your Framework Code Lives in Its Own Folder',
'This used to be a real limitation worth calling out plainly, so it still is now that it''s fixed: earlier, every workspace''s Selenium code ran from one shared checkout, and every workspace''s Playwright code ran from a separate shared checkout — a brand-new workspace had nowhere isolated to put its own code without a platform admin hand-editing that shared location.

That is no longer how it works. The folder name you register in Setup Wizard Step 2 becomes your project''s own, physically separate subfolder — nothing another project does to its subfolder can ever touch yours, the same way two different folders on a hard drive don''t interfere with each other just because they sit under the same parent directory. This is also what makes it safe for two different projects to run tests at the exact same time (see "Running Tests at the Same Time as Other Projects" below).

One exception, for transparency: the original pilot workspace''s Selenium and Playwright engines were connected before this per-project model existed and, unless a platform admin has since migrated them, still run from that original shared location. If that ever applies to your workspace, your platform admin can tell you — for every workspace onboarded through the Setup Wizard, it simply doesn''t come up.'),

(5, 'Test Engines — Your Per-Workspace Identity & Credential',
'A "Test Engine" is Testrix''s name for a registered connection between your workspace and a real Selenium or Playwright process. Registering one (Setup Wizard Step 1, or later from Workspace Settings → Framework Connection) gives your workspace its own private credential (an API key) and, since the change described above, its own private code folder — both separate from every other workspace''s.

Two engine types: SELENIUM (for Maven/TestNG-based Selenium suites) and PLAYWRIGHT (for Playwright suites). You can register as many engines as you need — for example, one for your Selenium regression suite and a separate one for a Playwright smoke suite — each gets its own independent credential and folder, and each can be rotated, revoked, or disabled without touching the others.

Deployment type is informational — Local, Docker, VM, Kubernetes, or Other. It records where your engine physically runs so your team has that context later; it doesn''t change how the connection works.'),

(6, 'Writing Your Framework''s Integration Code — And Where the API Key Fits In',
'A common question: do you need to finish writing your framework''s integration code before you can generate an API key, or the other way around? Neither — the two are independent, and you can do them in either order.

Registering a Test Engine and getting your API key does not require any code to exist yet. You can register the engine, copy the key, and hold onto it while you write or adapt your framework. Writing the integration code does not require a "real" key to develop against either — you can write it first and paste in the real key right before your first live run. The starter kit you download in Setup Wizard Step 1 already has your portal URL and API key filled in, so most workspaces never need to think about this at all.

What your framework''s code actually needs to do, at a minimum, to work with Testrix:

1. At process start, read the execution ID, the callback URL, and your API key. Maven/TestNG receives these as system properties (-DexecutionId, -DportalUrl, -DportalApiKey); Playwright receives them as environment variables (EXECUTION_ID, PORTAL_URL, PORTAL_API_KEY).
2. As the suite runs, POST each lifecycle event (suite started, module started, test started, test passed, test failed, test skipped, screenshot captured, video captured, log entry, module completed, suite completed) to {portalUrl}/api/events/execution, with your API key in the X-API-Key header.
3. Make every one of those POSTs fire-and-forget — if Testrix is briefly unreachable, your test run must keep going and finish normally. A reporting outage should never fail your actual tests.
4. Read any environment-specific values (base URLs, credentials, and so on) from the config Testrix passes in for whichever Environment the run was launched against, instead of hardcoding them in your suite.

You do not have to build this from scratch. The starter kit already includes it: for Selenium, PortalApiClient.java (the event pusher) plus ExtentReportManagerV2.java / Master_extent_report_v2.java (the TestNG listeners that call it) and config-v2.properties (where the key lives); for Playwright, tests/reporter/testrix-reporter.ts plus your .env file.'),

(7, 'Reports — How Results Actually Reach Testrix',
'If you are looking for a setting called something like "report path" or "output folder" to point Testrix at, there isn''t one — and that is intentional, not a missing feature.

Testrix does not read a report file off disk after your suite finishes. Instead, your framework pushes structured events to Testrix live, while the suite is still running (see "Writing Your Framework''s Integration Code" above) — every test start, pass, fail, skip, screenshot, and video arrives as its own event, in real time. Testrix assembles the dashboard, the live execution monitor, and the final report entirely from that stream of events. That is also why your dashboard updates test-by-test instead of only appearing once the whole suite is done.

Your framework can still generate its own local report too — Selenium/TestNG via ExtentReports (test-output/testng-results.xml and friends), Playwright via its own built-in HTML reporter. Testrix doesn''t need or read either of those; they are purely for your own local debugging, and there is nothing to configure or point at Testrix for them to keep working.'),

(8, 'Managing Your Test Engines — Rotate, Revoke, Disable',
'From Workspace Settings → Framework Connection, each registered Test Engine has three controls.

Rotate generates a brand-new key and immediately invalidates the old one, in a single atomic step. Use this if you suspect a key may have leaked, or as routine hygiene. You will see the new plaintext key exactly once, the same as at registration — update your framework''s config with it right away, or that engine stops being able to report results until you do.

Revoke invalidates the current key without issuing a replacement. The engine goes dark (any events it sends will be rejected) until you rotate a new key for it. Use this if you need to shut an engine off immediately and aren''t ready to reconnect it yet.

Disable stops new executions from being dispatched to modules linked to this engine at all, before they even start. Executions already in progress aren''t affected. Re-enable by rotating a new credential for it.

Testrix never stores your key in a form it could show you again or that could leak in plaintext from a database breach — only a one-way hash is kept after the moment you first see it, the same approach used by services like GitHub and Stripe for their own tokens.'),

(9, 'Modules & Environments',
'A Module points Execution Center at one suite or spec file inside your framework folder, plus which Test Engine should run it. The Setup Wizard creates your first one for you; from then on it stays visible (and runnable) in Execution Center and Reports Center, and you can add more test scripts to that same folder any time without registering anything new — only a genuinely new, separately-runnable suite needs its own Module.

An Environment is where tests actually run against — a base URL plus any per-environment config (credentials, feature flags, and so on) your framework needs. Add, edit, or deactivate environments any time from the Environments tab; a Module can be enabled for more than one Environment.

Adding a second Module yourself, beyond the one the wizard creates, isn''t self-service yet the way Team Management and Environments are — for now, ask your platform admin to add it via Manage Modules, giving them your Test Engine''s name (Workspace Settings → Framework Connection) so they link it correctly. This is a known near-term gap, not an oversight, and this page will be updated the moment it becomes self-service too.'),

(10, 'Running Tests at the Same Time as Other Projects',
'Two different projects'' executions can now genuinely run at the same time — one project''s test run is never blocked behind another project''s just because they both happened to click Run around the same moment. This is the direct payoff of every workspace having its own isolated code folder (see above): there''s nothing shared between two different projects'' runs for them to collide over, so Testrix is free to execute them in parallel.

The one case that still queues, deliberately: two runs of your own project''s own framework, close together. That''s not a limitation being worked around — it''s correct behavior, because both runs would otherwise write into the exact same folder at the exact same time (test output, temporary files, and so on), which would corrupt both runs'' results. If you see an execution sitting in QUEUED status, it almost always means one of your own team just started another run a moment earlier, not that the platform is overloaded — it will pick up automatically the moment the first one finishes.'),

(11, 'Need Help?',
'If a step above doesn''t match what you see in your workspace, if your Test Engine''s health never moves past its initial state, or if a run isn''t authenticating the way this page describes, contact your Testrix platform admin. They can see every engine''s status, health, credential history, and linked modules from their side, and are best placed to diagnose exactly where the connection is breaking.');
