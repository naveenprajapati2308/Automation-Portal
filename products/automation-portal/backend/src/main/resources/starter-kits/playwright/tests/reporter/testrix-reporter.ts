import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

/**
 * Pushes execution lifecycle events to Testrix. Every call is fire-and-forget — a Testrix outage
 * must never fail or block the actual test run, so failures are only logged, never thrown.
 */
function sendEvent(eventType: string, data: Record<string, unknown>): void {
  const portalUrl = process.env.PORTAL_URL;
  const apiKey = process.env.PORTAL_API_KEY;
  const executionId = process.env.EXECUTION_ID;
  if (!portalUrl || !apiKey || !executionId) {
    console.error(`[Testrix] Skipping ${eventType} — PORTAL_URL / PORTAL_API_KEY / EXECUTION_ID not set`);
    return;
  }

  fetch(`${portalUrl}/api/events/execution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({ executionId, eventType, timestamp: new Date().toISOString(), data }),
  }).catch((err) => {
    console.error(`[Testrix] Failed to send ${eventType}:`, err instanceof Error ? err.message : err);
  });
}

export default class TestrixReporter implements Reporter {
  onBegin(): void {
    sendEvent('SUITE_STARTED', {});
  }

  onTestBegin(test: TestCase): void {
    sendEvent('TEST_STARTED', { testName: test.title });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const eventType = result.status === 'passed' ? 'TEST_PASSED'
      : result.status === 'skipped' ? 'TEST_SKIPPED'
      : 'TEST_FAILED';
    sendEvent(eventType, { testName: test.title, status: result.status, duration: result.duration });
  }

  onEnd(result: FullResult): void {
    sendEvent('SUITE_COMPLETED', { status: result.status });
  }
}
