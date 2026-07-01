# MPHIDB Framework — v1 Integration Plan
# (Automation Portal Contract Document)

This document defines every change required in the MPHIDB automation framework
(`D:\New folder\MPHIDB`) to fully integrate with the Automation Portal v1.2.0.

This is the reference document for the **dedicated framework sprint**.
Do NOT start framework changes until the portal v1.2.0 core is stable.

---

## Why This Document Exists

The Automation Portal v1.2.0 is being built as an event-driven platform.
The portal backend exposes APIs that the framework must call during execution.
Without these framework changes, the portal will only show historical data
loaded from the XML reports after execution finishes.

With these changes, the portal will receive live data during execution:
- Every test pass/fail
- Every screenshot captured
- Every log entry
- Real-time progress visible on the Execution Center and Dashboard

---

## Current Framework Structure (As-Is)

```
D:\New folder\MPHIDB\
  ├── MPHIDB.xml                        ← Master suite (all modules)
  ├── land.xml                          ← Land Management Suite
  ├── Emp_Arch.xml                      ← Architect Empanelment Suite
  ├── test.xml                          ← (test/dev suite)
  ├── pom.xml                           ← Maven build config
  ├── run-dashboard.bat                 ← Batch launcher for runner
  ├── RUNNER_SETUP.md                   ← Runner documentation
  ├── reports/                          ← Extent HTML reports (generated)
  ├── screenShots/                      ← Screenshots per module/test
  ├── test-output/                      ← TestNG output (XML, HTML)
  ├── logs/                             ← (currently empty / unused)
  ├── testData/
  │   └── config.properties             ← URLs, credentials
  └── src/
      ├── main/java/runner/
      │   └── ModuleRunnerServer.java   ← Current dummy HTTP runner (port 9090)
      └── test/java/
          ├── testBase/
          │   ├── BaseTest.java         ← Main base class (ChromeDriver setup)
          │   └── AuthorityLogin.java   ← Alt base class (Authority URL)
          ├── ReportManager/
          │   ├── ExtentReportManager.java     ← TestNG listener (Suite-level)
          │   └── Master_extent_report.java    ← TestNG listener (alt/master)
          ├── utilities/
          │   ├── ScreenShotUtil.java   ← Screenshot capture + save
          │   ├── ConfigUtils.java      ← Reads config.properties
          │   ├── WaitUtils.java        ← Selenium wait helpers
          │   ├── ElementUtils.java     ← Element interaction helpers
          │   ├── AlertUtils.java       ← Alert handling
          │   ├── ClickUtils.java       ← Click helpers
          │   ├── DateUtils.java        ← Date formatting
          │   ├── DropdownUtils.java    ← Dropdown helpers
          │   ├── ErrorMszUtil.java     ← Error message utils
          │   ├── FileUtils.java        ← File helpers
          │   ├── OtpUtils.java         ← OTP utilities
          │   ├── RandomUtils.java      ← Random data
          │   ├── TestContext.java      ← Test context holder
          │   └── testData.java         ← Test data provider
          ├── pageObjects/              ← Page Object Model classes
          └── testCases/               ← Test case classes
```

---

## Rule: What Must NOT Be Changed

These files must remain exactly as they are.
Do not modify, merge, or delete them:

| File | Reason |
|---|---|
| `ExtentReportManager.java` | Extent report generation — works correctly as-is |
| `Master_extent_report.java` | Alternate Extent report listener — works correctly as-is |
| All existing `utilities/*.java` | Stable helper classes — only add new files |
| All existing `testCases/**/*.java` | Test logic — must not be disrupted |
| All existing `pageObjects/**/*.java` | Page objects — must not be disrupted |
| All existing XML suite files | Suite definitions — only add new ones |
| `pom.xml` dependencies | Only add new dependencies, never remove existing |

---

## What the Portal Expects from the Framework

### 1. Framework Runner Service

The portal backend calls the Framework Runner Service to start an execution.
Currently `ModuleRunnerServer.java` handles this but it is too basic.

**What the portal sends (POST /runner/run):**
```json
{
  "executionId": "EXE_20260625_143200",
  "suiteXml": "Emp_Arch.xml",
  "portalUrl": "http://localhost:8080",
  "openReport": false
}
```

**What the portal expects back (GET /runner/status):**
```json
{
  "running": true,
  "executionId": "EXE_20260625_143200",
  "suiteXml": "Emp_Arch.xml",
  "startedAt": "2026-06-25T14:32:00",
  "status": "RUNNING"
}
```

**What the portal expects (GET /runner/suites):**
```json
[
  { "key": "all",       "name": "Master Automation Suite",    "xml": "MPHIDB.xml" },
  { "key": "land",      "name": "Land Management Suite",      "xml": "land.xml" },
  { "key": "architect", "name": "Architect Empanelment Suite", "xml": "Emp_Arch.xml" }
]
```

**What the portal sends to cancel (POST /runner/cancel):**
```json
{ "executionId": "EXE_20260625_143200" }
```

**Health check (GET /runner/health):**
```json
{ "status": "UP", "port": 9090, "mavenAvailable": true }
```

---

### 2. Live Event Publishing

The portal backend exposes this API to receive live events:

```
POST http://localhost:8080/api/events/execution
Content-Type: application/json
X-API-Key: {shared-api-key}
```

The framework must call this URL on every TestNG listener event.

**CRITICAL RULE:** Calling this API must NEVER block test execution.
If the portal is down, the test must continue normally.
Use async HTTP calls with a short timeout (5 seconds max).

---

## Event Payload Contract

Every event sent from framework to portal follows this structure:

```json
{
  "executionId": "EXE_20260625_143200",
  "eventType": "EVENT_TYPE_HERE",
  "timestamp": "2026-06-25T14:32:05.123",
  "data": { }
}
```

### Event Types and Their Payloads

---

#### SUITE_STARTED
Fired when: `ISuiteListener.onStart(ISuite suite)` or
            `ExtentReportManager.onStart(ISuite suite)`

```json
{
  "executionId": "EXE_20260625_143200",
  "eventType": "SUITE_STARTED",
  "timestamp": "2026-06-25T14:32:00.000",
  "data": {
    "suiteName": "MPHIDB Master Suite",
    "suiteXml": "MPHIDB.xml",
    "browser": "Chrome",
    "browserVersion": "126.0.6478.127",
    "os": "Windows 11",
    "osVersion": "10.0",
    "javaVersion": "17.0.11",
    "hostname": "DESKTOP-ABC123",
    "tester": "Naveen Prajapati",
    "environment": "QA",
    "baseUrl": "https://mphidb.example.com",
    "totalExpectedTests": 45
  }
}
```

Portal action: Set execution status = RUNNING, record start time, store system info.

---

#### MODULE_STARTED
Fired when: `ITestListener.onStart(ITestContext context)` or
            `ISuiteListener.onStart()` per `<test>` block

```json
{
  "executionId": "EXE_20260625_143200",
  "eventType": "MODULE_STARTED",
  "timestamp": "2026-06-25T14:32:05.000",
  "data": {
    "moduleName": "Architect Empanelment Tests",
    "suiteXml": "Emp_Arch.xml"
  }
}
```

Portal action: Create or update module run record, set module status = RUNNING.

---

#### TEST_STARTED
Fired when: `ITestListener.onTestStart(ITestResult result)`

```json
{
  "executionId": "EXE_20260625_143200",
  "eventType": "TEST_STARTED",
  "timestamp": "2026-06-25T14:32:10.123",
  "data": {
    "testName": "verifyWebsiteLaunch",
    "displayName": "TC_001_LaunchUrl",
    "moduleName": "Architect Empanelment Tests",
    "className": "testCases.ArchitectEmpanelment.TC_001_LaunchUrl",
    "methodName": "verifyWebsiteLaunch"
  }
}
```

Portal action: Create test case record with status = RUNNING.

---

#### TEST_PASSED
Fired when: `ITestListener.onTestSuccess(ITestResult result)`

```json
{
  "executionId": "EXE_20260625_143200",
  "eventType": "TEST_PASSED",
  "timestamp": "2026-06-25T14:32:14.500",
  "data": {
    "testName": "verifyWebsiteLaunch",
    "displayName": "TC_001_LaunchUrl",
    "moduleName": "Architect Empanelment Tests",
    "className": "testCases.ArchitectEmpanelment.TC_001_LaunchUrl",
    "methodName": "verifyWebsiteLaunch",
    "durationMs": 4377,
    "retryCount": 0
  }
}
```

Portal action: Update test case status = PASS, record duration.

---

#### TEST_FAILED
Fired when: `ITestListener.onTestFailure(ITestResult result)`

```json
{
  "executionId": "EXE_20260625_143200",
  "eventType": "TEST_FAILED",
  "timestamp": "2026-06-25T14:35:12.456",
  "data": {
    "testName": "verifySignUp",
    "displayName": "TC_002_SignUp",
    "moduleName": "Architect Empanelment Tests",
    "className": "testCases.ArchitectEmpanelment.TC_002_SignUp",
    "methodName": "verifySignUp",
    "durationMs": 8450,
    "retryCount": 0,
    "exceptionType": "org.openqa.selenium.TimeoutException",
    "exceptionMessage": "Expected condition failed: waiting for element to be visible",
    "stackTrace": "org.openqa.selenium.TimeoutException: Expected condition failed...\n\tat org.openqa.selenium.support.ui.FluentWait.timeoutException(FluentWait.java:171)\n\tat ...",
    "screenshotPath": "screenShots/Architect Empanelment Tests/verifySignUp_20260625143512.png"
  }
}
```

Portal action: Update test case status = FAIL, store exception and stack trace.

---

#### TEST_SKIPPED
Fired when: `ITestListener.onTestSkipped(ITestResult result)`

```json
{
  "executionId": "EXE_20260625_143200",
  "eventType": "TEST_SKIPPED",
  "timestamp": "2026-06-25T14:36:00.000",
  "data": {
    "testName": "verifyProfile",
    "displayName": "TC_005_Profile",
    "moduleName": "Architect Empanelment Tests",
    "className": "testCases.ArchitectEmpanelment.TC_005_Profile",
    "methodName": "verifyProfile",
    "skipReason": "Dependency method failed"
  }
}
```

Portal action: Update test case status = SKIP.

---

#### SCREENSHOT_CAPTURED
Fired when: Inside `ScreenShotUtil.captureScreenshot()` after file is saved.

```json
{
  "executionId": "EXE_20260625_143200",
  "eventType": "SCREENSHOT_CAPTURED",
  "timestamp": "2026-06-25T14:35:13.100",
  "data": {
    "testName": "verifySignUp",
    "moduleName": "Architect Empanelment Tests",
    "filePath": "screenShots/Architect Empanelment Tests/verifySignUp_20260625143512.png",
    "filePathRelative": "screenShots/Architect Empanelment Tests/verifySignUp_20260625143512.png",
    "timestamp": "20260625143512"
  }
}
```

Portal action: Save artifact record linked to test case. Report Artifact Service will serve it.

---

#### LOG_ENTRY
Fired when: Any custom step log is written inside a test.
Optional but highly recommended for step-level visibility.

```json
{
  "executionId": "EXE_20260625_143200",
  "eventType": "LOG_ENTRY",
  "timestamp": "2026-06-25T14:32:11.200",
  "data": {
    "testName": "verifyWebsiteLaunch",
    "moduleName": "Architect Empanelment Tests",
    "level": "INFO",
    "message": "Step: Clicked Login Button successfully",
    "source": "FRAMEWORK"
  }
}
```

Portal action: Append to execution_logs table. Shown in live log terminal during execution.

---

#### MODULE_COMPLETED
Fired when: `ITestListener.onFinish(ITestContext context)`

```json
{
  "executionId": "EXE_20260625_143200",
  "eventType": "MODULE_COMPLETED",
  "timestamp": "2026-06-25T14:40:00.000",
  "data": {
    "moduleName": "Architect Empanelment Tests",
    "totalTests": 10,
    "passed": 7,
    "failed": 2,
    "skipped": 1,
    "passRate": 70.0,
    "durationMs": 480000
  }
}
```

Portal action: Finalize module stats. Update module health on dashboard.

---

#### SUITE_COMPLETED
Fired when: `ISuiteListener.onFinish(ISuite suite)`
This is the last event. Portal finalizes everything after receiving this.

```json
{
  "executionId": "EXE_20260625_143200",
  "eventType": "SUITE_COMPLETED",
  "timestamp": "2026-06-25T14:45:30.000",
  "data": {
    "suiteName": "MPHIDB Master Suite",
    "totalTests": 45,
    "passed": 38,
    "failed": 5,
    "skipped": 2,
    "passRate": 84.4,
    "durationMs": 2730000,
    "durationSeconds": 2730,
    "exitStatus": "PARTIAL",
    "reportPath": "reports/MasterReport2.html",
    "xmlPath": "test-output/testng-results.xml"
  }
}
```

Portal action: Finalize execution record. Trigger supplementary parser for gap-fill.
Dashboard shows final summary. SSE stream closes on frontend.

---

## Files to CREATE (New Additions Only)

### 1. `src/test/java/utilities/PortalApiClient.java`

Purpose: Fire-and-forget HTTP client. Sends events to portal backend.
Never blocks test execution. Silent on any failure.

Key behaviors:
- Reads `portalUrl` from System property: `System.getProperty("portalUrl", "")`
- Reads `executionId` from System property: `System.getProperty("executionId", "")`
- Reads `apiKey` from System property: `System.getProperty("portalApiKey", "")`
- If any of these are empty/blank → skip silently (framework running standalone)
- Uses Java 11+ `HttpClient` with async `sendAsync()`
- Timeout: 5 seconds connect, 5 seconds request
- On any exception: log to `System.err` quietly, never rethrow
- Never uses external libraries — only JDK `java.net.http.*`

Methods needed:
```
+ pushEvent(String eventType, String jsonDataObject) : void
+ pushSuiteStarted(ISuite suite) : void
+ pushSuiteCompleted(ISuite suite, int passed, int failed, int skipped) : void
+ pushModuleStarted(ITestContext context) : void
+ pushModuleCompleted(ITestContext context) : void
+ pushTestStarted(ITestResult result) : void
+ pushTestPassed(ITestResult result) : void
+ pushTestFailed(ITestResult result, String screenshotPath) : void
+ pushTestSkipped(ITestResult result) : void
+ pushScreenshotCaptured(String testName, String moduleName, String filePath) : void
+ pushLogEntry(String testName, String moduleName, String level, String message) : void
- buildBody(String eventType, String data) : String     [private]
- escapeJson(String value) : String                     [private]
- getBrowserVersion() : String                          [private]
```

Placement in package: `utilities` (same package as `ConfigUtils`, `WaitUtils`, etc.)

---

### 2. `src/main/java/runner/FrameworkRunnerService.java`

Purpose: Replaces `ModuleRunnerServer.java` as the proper HTTP runner.
Runs as a Docker service (port 9090). Can also run manually.

Key behaviors:
- Reads suite list dynamically by scanning `*.xml` files in project root
- Accepts JSON body on `POST /runner/run` (not query params)
- Passes `-DexecutionId`, `-DportalUrl`, `-DportalApiKey`, `-DopenReport=false`
  to Maven as system properties
- Returns structured JSON on all endpoints (not plain text)
- Stores active `Process` reference for cancel support
- `POST /runner/cancel` calls `process.destroyForcibly()`

Endpoints:
```
GET  /runner/health    → { "status": "UP", "port": 9090, "mavenAvailable": true }
GET  /runner/status    → { "running": true/false, "executionId": "...", "status": "..." }
GET  /runner/suites    → [ { "key": "...", "name": "...", "xml": "..." }, ... ]
POST /runner/run       → 202 Accepted / 409 Already Running
POST /runner/cancel    → 200 OK / 404 Not Running
```

Docker entry point: `main()` method, port from `System.getProperty("runner.port", "9090")`

Important: This file replaces `ModuleRunnerServer.java`.
The old file is kept as a reference / backup. New file is the active runner.

---

### 3. `src/test/java/utilities/RetryAnalyzer.java`

Purpose: Retry failed tests automatically (configurable count).
Tracks retry count per test for sending in `TEST_FAILED` event.

```java
// Implements: org.testng.IRetryAnalyzer
// Reads retry count from: System.getProperty("retryCount", "0")
// Default: 0 retries (no retry unless configured)
```

Usage: Add `@Test(retryAnalyzer = RetryAnalyzer.class)` to test methods
or configure in testng-listeners.

---

## Files to MODIFY (Additive Changes Only)

### 4. Modify: `ExtentReportManager.java`

Current file is 8882 bytes. DO NOT change any existing logic.
Only ADD calls to `PortalApiClient` after the existing code in each method.

Changes to add (insertions only, no deletions):

```
onStart(ISuite suite):
  → ADD after extent.attachReporter(): PortalApiClient.pushSuiteStarted(suite)

onTestStart(ITestResult result):
  → ADD after test creation: PortalApiClient.pushTestStarted(result)

onTestSuccess(ITestResult result):
  → ADD at end of method: PortalApiClient.pushTestPassed(result)

onTestFailure(ITestResult result):
  → After screenshot is captured, get the path
  → ADD: PortalApiClient.pushTestFailed(result, screenshotPath)

onTestSkipped(ITestResult result):
  → ADD at end of method: PortalApiClient.pushTestSkipped(result)

onStart(ITestContext context):
  → ADD: PortalApiClient.pushModuleStarted(context)

onFinish(ITestContext context):
  → ADD: PortalApiClient.pushModuleCompleted(context)

onFinish(ISuite suite):
  → ADD before return: PortalApiClient.pushSuiteCompleted(suite, passed, failed, skipped)
```

Also ADD (to remove hardcoded values):
```
onStart(ISuite suite):
  → Instead of: customJs.replace("__TESTER__", "Naveen Prajapati")
  → Change to:  customJs.replace("__TESTER__", System.getProperty("tester",
                    ConfigUtils.getPropertyData("tester_name")))

  → Instead of: customJs.replace("__VERSION__", "v1.2.0")
  → Change to:  customJs.replace("__VERSION__", System.getProperty("frameworkVersion",
                    ConfigUtils.getPropertyData("framework_version")))
```

---

### 5. Modify: `Master_extent_report.java`

Exact same additions as `ExtentReportManager.java` above.
Same pattern — add `PortalApiClient` calls after existing code, never replace.

Also remove hardcoded values in the same way.

---

### 6. Modify: `ScreenShotUtil.java`

Current file is 1117 bytes. Adds only one line.

```java
// Current line 49:
FileHandler.copy(source, target);

// ADD after line 49:
PortalApiClient.pushScreenshotCaptured(testName, moduleName, filePath);
```

The method signature already passes `testName` and `moduleName` as parameters.
`filePath` is already computed above. This is a one-line addition.

---

### 7. Modify: `BaseTest.java`

Current file is 1974 bytes. Adds browser version detection.

```java
// Current line 47:
driver = new ChromeDriver(options);

// ADD after line 47:
try {
    Capabilities cap = ((ChromeDriver) driver).getCapabilities();
    System.setProperty("browserVersion", cap.getBrowserVersion());
    System.setProperty("browserName", cap.getBrowserName());
} catch (Exception ignored) { }
```

This allows `PortalApiClient.pushSuiteStarted()` to read the browser version
from system properties and include it in the SUITE_STARTED event.

---

### 8. Modify: `testData/config.properties`

ADD these new keys (do not remove any existing keys):

```properties
# Portal Integration (used by PortalApiClient)
# These are overridden by Maven system properties when run from portal
# When running standalone (not from portal), leave these empty
portal.url=
portal.api.key=
execution.id=

# Framework metadata (used in Extent reports)
tester.name=Naveen Prajapati
framework.version=v1.2.0
environment.name=QA
```

---

### 9. Modify: `pom.xml`

ADD only — no existing dependency should be removed.

Currently has: Selenium, TestNG, ExtentReports, Maven plugins.

ADD for `PortalApiClient` (only if Java < 11 is being used, otherwise JDK HttpClient is built-in):
```xml
<!-- Only needed if Java version < 11 -->
<!-- If Java 17+ is used, nothing to add — java.net.http.* is built-in -->
```

ADD for JSON building (lightweight, no external lib required — use String building):
```xml
<!-- No JSON library needed — PortalApiClient builds JSON strings manually -->
<!-- This keeps the framework lightweight and dependency-free -->
```

ADD exec plugin entry for FrameworkRunnerService:
```xml
<plugin>
    <groupId>org.codehaus.mojo</groupId>
    <artifactId>exec-maven-plugin</artifactId>
    <version>3.1.0</version>
    <configuration>
        <mainClass>runner.FrameworkRunnerService</mainClass>
    </configuration>
</plugin>
```

---

## Docker Setup for Framework Runner Service

A new Dockerfile is needed in a `framework-runner/` subdirectory
inside the Automation Portal project (not inside MPHIDB).

```
D:\Automation Portal\
  ├── backend/
  ├── frontend/
  ├── framework-runner/          ← NEW Docker service
  │   ├── Dockerfile
  │   └── runner-config.properties
  └── docker-compose.yml
```

### `framework-runner/Dockerfile`

```dockerfile
FROM eclipse-temurin:17-jdk-alpine

# Install Maven
RUN apk add --no-cache maven

WORKDIR /app

# The framework is mounted as a volume at runtime
# This image just provides Java + Maven environment

EXPOSE 9090

# The MPHIDB project is mounted at /app/framework via docker-compose volume
# Runner compiles and starts from there
ENTRYPOINT ["mvn", "-f", "/app/framework/pom.xml",
            "-DskipTests", "compile", "exec:java",
            "-Drunner.port=9090"]
```

### `docker-compose.yml` additions

```yaml
services:
  # ... existing services (mysql, backend, frontend) ...

  framework-runner:
    build:
      context: ./framework-runner
    container_name: automation-framework-runner
    ports:
      - "9090:9090"
    volumes:
      - "D:/New folder/MPHIDB:/app/framework"
    environment:
      - RUNNER_PORT=9090
      - MAVEN_CMD=mvn
    networks:
      - automation-network
    depends_on:
      - backend
    restart: unless-stopped

  report-artifact-service:
    build:
      context: ./report-artifact-service
    container_name: automation-report-artifacts
    ports:
      - "9091:9091"
    volumes:
      - ./backend/artifacts:/app/artifacts:ro
    networks:
      - automation-network
    restart: unless-stopped
```

### Manual Run (Without Docker)

Developers can still run the framework runner manually:

```bat
# From D:\New folder\MPHIDB directory:
run-dashboard.bat

# Or directly:
mvn -DskipTests compile exec:java -Drunner.port=9090

# With portal integration enabled:
mvn -DskipTests compile exec:java ^
    -Drunner.port=9090
```

When running from the portal UI, Maven is invoked with:
```
mvn test -DsuiteXmlFile=Emp_Arch.xml
         -DexecutionId=EXE_20260625_143200
         -DportalUrl=http://localhost:8080
         -DportalApiKey=your-shared-api-key
         -DopenReport=false
```

---

## How the Execution Works (Full Flow)

> [!IMPORTANT]
> **The Framework Runner is NEVER called directly by the Portal Backend.**
> All execution control goes through the **Execution Manager Service** (port 8090).

```
User clicks Run
  ↓
Portal Frontend
  ↓ POST /api/executions/run
Portal Backend
  ↓ POST /em/executions  (submit job to queue)
Execution Manager
  ↓ Checks concurrency slot
  ↓ POST /runner/run  (when slot available)
Framework Runner Service
  ↓ mvn test -DsuiteXmlFile=Emp_Arch.xml
              -DexecutionId=EXE_001
              -DportalUrl=http://backend:8080
              -DportalApiKey=...
TestNG Framework executes tests
  ↓ Every listener event → PortalApiClient
  ↓ POST /api/events/execution  (direct to Portal Backend)
Portal Backend Event Engine
  ↓ Stores in DB immediately
  ↓ SSE broadcast to Frontend
Frontend updates Execution Center + Dashboard live

On SUITE_COMPLETED:
  Framework → Portal Backend (SUITE_COMPLETED event)
  Portal Backend → Execution Manager (POST /em/executions/{id}/completed)
  Execution Manager releases concurrency slot
  Execution Manager starts next queued job (if any)
  Portal Backend triggers supplementary parser (gap-fill)
  Frontend SSE closes, shows "View Report" button
  User clicks View Report:
    Portal Backend → Report Artifact Service
    GET http://report-artifact-service:9091/artifacts/EXE_001/report
```

---

## System Properties Contract

When the **Execution Manager** triggers execution via the Framework Runner, Maven is called with:

| Property | Example Value | Who Passes It | Where Used |
|---|---|---|---|
| `executionId` | `EXE_20260625_143200` | Execution Manager → Runner → Maven | `PortalApiClient` — in every event |
| `portalUrl` | `http://backend:8080` | Execution Manager → Runner → Maven | `PortalApiClient` — event POST URL |
| `portalApiKey` | `my-shared-secret` | Execution Manager → Runner → Maven | `PortalApiClient` — `X-API-Key` header |
| `openReport` | `false` | Execution Manager → Runner → Maven | Prevents browser auto-open |
| `tester` | `Naveen Prajapati` | Portal → Execution Manager → Runner | `ExtentReportManager` replaces hardcode |
| `frameworkVersion` | `v1.2.0` | Portal → Execution Manager → Runner | `ExtentReportManager` replaces hardcode |

When running standalone (not from portal), none of these are set.
`PortalApiClient` detects empty `portalUrl`/`executionId` and skips all events silently.
The framework runs exactly as today with no change in behavior.

---

## Backend APIs the Framework Calls

Only ONE endpoint is called by the framework (directly to Portal Backend, bypassing Execution Manager):

```
POST http://{portalUrl}/api/events/execution
Content-Type: application/json
X-API-Key: {portalApiKey}

Body: ExecutionEventPayload (see Event Payloads section above)
```

Everything else (SSE streaming to frontend, DB storage, dashboard updates,
queue slot release) is handled inside the portal backend and execution manager.

---

## APIs the Execution Manager Calls on Framework Runner

> [!IMPORTANT]
> The Portal Backend NEVER calls these. Only the Execution Manager does.

```
POST {runnerUrl}/runner/run        → Start execution
POST {runnerUrl}/runner/cancel     → Cancel/kill active execution
POST {runnerUrl}/runner/pause      → Pause active execution
POST {runnerUrl}/runner/resume     → Resume paused execution
GET  {runnerUrl}/runner/status     → Current runner state
GET  {runnerUrl}/runner/health     → Health check
GET  {runnerUrl}/runner/suites     → Available suites (for Execution Center dropdown)
```

`runnerUrl` is configured in the **Execution Manager** environment:
```yaml
# In execution-manager docker-compose environment:
EM_RUNNER_URL: http://framework-runner:9090
```

## APIs the Portal Backend Calls on Execution Manager

```
POST {emUrl}/em/executions              → Submit execution to queue
POST {emUrl}/em/executions/{id}/cancel  → Request cancellation
POST {emUrl}/em/executions/{id}/pause   → Request pause
POST {emUrl}/em/executions/{id}/resume  → Request resume
GET  {emUrl}/em/queue                   → Queue snapshot
GET  {emUrl}/em/executions/{id}/status  → Job state
GET  {emUrl}/em/runners                 → Runner health overview
GET  {emUrl}/em/config                  → Current settings
PUT  {emUrl}/em/config                  → Update concurrency/timeout at runtime
```

`emUrl` configured in Portal Backend `application.yml`:
```yaml
portal:
  execution-manager:
    url: http://execution-manager:8090
```

---

## Report Artifact Service APIs (Separate Service)

This is a new separate service — does NOT touch framework files.
It simply reads the artifact folders that already exist.

```
GET  /artifacts/{executionCode}/report          → Serve Extent HTML report
GET  /artifacts/{executionCode}/emailable       → Serve emailable-report.html
GET  /artifacts/{executionCode}/xml             → Serve testng-results.xml
GET  /artifacts/{executionCode}/screenshots     → JSON list of screenshots
GET  /artifacts/{executionCode}/screenshots/{filename} → Serve PNG file
GET  /artifacts/{executionCode}/logs/console    → Serve console.log
GET  /artifacts/list                            → List all execution artifact codes
```

These are read-only endpoints. No framework files are touched.

---

## Database Changes Required in Portal (For Event Engine)

New tables needed in portal MySQL database to support live events:

| Table | Purpose |
|---|---|
| `execution_events` | Optional: raw event log for debugging |
| `execution_test_cases` | Already exists — will be populated by events |
| `execution_logs` | Store LOG_ENTRY events |
| `execution_artifacts` | Store SCREENSHOT_CAPTURED events |
| `execution_module_stats` | Store per-module pass/fail counts |

Columns to add to existing `executions` table:
| Column | Type | Purpose |
|---|---|---|
| `browser_version` | VARCHAR(50) | From SUITE_STARTED event |
| `hostname` | VARCHAR(100) | From SUITE_STARTED event |
| `os_info` | VARCHAR(100) | From SUITE_STARTED event |
| `tester_name` | VARCHAR(100) | From SUITE_STARTED event |
| `environment_name` | VARCHAR(50) | From SUITE_STARTED event |

---

## Implementation Order for Framework Sprint

When the framework sprint begins, implement in this order:

1. `PortalApiClient.java` — create first, test it standalone
2. Modify `ScreenShotUtil.java` — simplest change (one line)
3. Modify `BaseTest.java` — browser version detection
4. Modify `ExtentReportManager.java` — add event calls
5. Modify `Master_extent_report.java` — same additions
6. Update `config.properties` — add new keys
7. Update `pom.xml` — add exec plugin
8. Create `FrameworkRunnerService.java` — redesign the runner
9. Create `RetryAnalyzer.java` — optional, add last
10. Test end-to-end with portal running locally
11. Test with Docker (framework-runner container)

---

## Testing the Integration

### Standalone Test (No Portal)

Run any suite without portal system properties:
```bat
mvn test -DsuiteXmlFile=Emp_Arch.xml
```
Expected: Tests run normally. No events sent. Report generated as usual.
No errors. Framework behavior unchanged.

### Integration Test (With Portal)

Portal must be running. Then trigger from portal UI or manually:
```bat
mvn test -DsuiteXmlFile=Emp_Arch.xml ^
         -DexecutionId=EXE_TEST_001 ^
         -DportalUrl=http://localhost:8080 ^
         -DportalApiKey=test-key ^
         -DopenReport=false
```
Expected:
- Portal Execution Center shows RUNNING status
- Tests appear in live log as they execute
- Pass/fail counters update in real time
- Screenshots appear on failure
- Suite completion triggers SUITE_COMPLETED event
- Portal shows final summary
- View Report button opens Extent HTML from artifact service

---

## Summary of New Files

| File | Type | Location |
|---|---|---|
| `PortalApiClient.java` | NEW | `src/test/java/utilities/` |
| `FrameworkRunnerService.java` | NEW (replaces dummy runner) | `src/main/java/runner/` |
| `RetryAnalyzer.java` | NEW | `src/test/java/utilities/` |

## Summary of Modified Files

| File | Change Type | What Changes |
|---|---|---|
| `ExtentReportManager.java` | Addition only | Add `PortalApiClient` calls + read config instead of hardcode |
| `Master_extent_report.java` | Addition only | Same as above |
| `ScreenShotUtil.java` | Addition only | One line after `FileHandler.copy()` |
| `BaseTest.java` | Addition only | Browser version detection after `new ChromeDriver()` |
| `testData/config.properties` | Addition only | New portal integration keys |
| `pom.xml` | Addition only | exec-maven-plugin entry |

## Files That Must NEVER Change

| File | Reason |
|---|---|
| `ExtentReportManager.java` (core logic) | Only event calls added |
| `Master_extent_report.java` (core logic) | Only event calls added |
| All test case files | Never touch |
| All page object files | Never touch |
| All XML suite files | Only add new ones |
| All other utility files | Only add new utils |
