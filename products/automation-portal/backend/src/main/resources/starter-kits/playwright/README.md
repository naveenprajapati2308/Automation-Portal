# Testrix Playwright Starter Kit

This is a minimal, working Playwright project pre-wired to report results to your Testrix
workspace. `.env` already has your Test Engine's portal URL and API key filled in.

## Run it by hand (to test the connection)

    npm install
    npx playwright install
    EXECUTION_ID=<any-execution-code-from-testrix> npx playwright test

Testrix's own Execution Center sets `EXECUTION_ID`, `PORTAL_URL`, `PORTAL_API_KEY`, and
`PORTAL_REQUESTED_BROWSER` automatically for real runs dispatched through Execution Center — the
command above is only for testing this connection yourself, ahead of that (`.env` already covers
`PORTAL_URL` and `PORTAL_API_KEY`).

## Files

- `.env` — your workspace's portal URL, API key, framework path, and report path.
- `tests/reporter/testrix-reporter.ts` — a Playwright Reporter that pushes lifecycle events to
  Testrix. Fire-and-forget: a Testrix outage never fails your test run.
- `tests/example.spec.ts` — replace with your real tests.
- `playwright.config.ts` — already wires the Testrix reporter in alongside the default list reporter.

## Next step

Move this project's contents into wherever your workspace's actual Playwright checkout lives, or
build your real suite around `testrix-reporter.ts` directly. See the "Documentation" page in
Testrix (Connecting Your Framework Code) for how your platform admin registers this as a runnable
Module.
