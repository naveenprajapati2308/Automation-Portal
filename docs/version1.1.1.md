# Automation Portal and Framework Integration Plan

## Goal

Build Automation Portal as the main reporting and analytics system for the hybrid Selenium, TestNG, and Extent automation framework located at:

```text
D:\New folder\MPHIDB
```

The Extent report should remain available as a full report viewer, but the portal dashboard should use structured database data parsed from framework outputs.

## Target Flow

```text
User clicks Run in Portal
-> Portal creates execution record
-> Backend runs Maven/TestNG suite
-> Framework generates reports, screenshots, logs, and XML
-> Portal copies artifacts
-> Portal parses structured results
-> Portal stores execution/test data in DB
-> APIs expose dashboard/report/comparison data
-> Frontend shows analytics, trends, filters, history
```

## Phase 1: Framework Integration Configuration

Create backend configuration for the automation framework path and suite mapping.

Initial configuration can live in `application.yml`. Later it can be editable from Admin UI.

```yaml
portal:
  automation:
    repository-path: "D:/New folder/MPHIDB"
    maven-command: "mvn test -DsuiteXmlFile={suiteXml} -DopenReport=false"
    artifacts-root: "artifacts"
    suites:
      all:
        name: "Master Automation Suite"
        xml: "MPHIDB.xml"
        report: "reports/MasterReport2.html"
      land:
        name: "Land Management Suite"
        xml: "land.xml"
        report: "reports/MasterReport2.html"
      architect:
        name: "Architect Empanelment Suite"
        xml: "Emp_Arch.xml"
        report: "reports/MasterReport.html"
    result-files:
      testng-results: "test-output/testng-results.xml"
      testng-failed: "test-output/testng-failed.xml"
      emailable-report: "test-output/emailable-report.html"
      index-report: "test-output/index.html"
      screenshots: "screenShots"
      logs: "logs"
```

Purpose:

- Avoid hardcoded paths in frontend.
- Map portal run actions to actual TestNG XML suites.
- Let the backend copy the correct reports after execution.
- Keep framework path details out of React code.

## Phase 2: Execution Worker

Current portal behavior only queues executions. Add a backend worker that actually runs Maven/TestNG.

Execution states:

```text
QUEUED
RUNNING
PASSED
FAILED
PARTIAL
CANCELLED
ERROR
```

Worker responsibilities:

1. Pick queued execution.
2. Resolve suite XML.
3. Build Maven command.
4. Start process.
5. Capture console logs.
6. Update execution status.
7. Wait for completion.
8. Trigger artifact collection.
9. Trigger result parsing.
10. Update dashboard-ready database records.

Example commands:

```text
Run All:
mvn test -DsuiteXmlFile=MPHIDB.xml -DopenReport=false

Run Land:
mvn test -DsuiteXmlFile=land.xml -DopenReport=false

Run Architect:
mvn test -DsuiteXmlFile=Emp_Arch.xml -DopenReport=false
```

## Phase 3: Artifact Storage

Each execution must have its own artifact folder so reports and screenshots are not overwritten by the next framework run.

Example folder:

```text
D:\Automation Portal\artifacts\executions\AUTO-20260623120001\
  reports\
    MasterReport2.html
    emailable-report.html
    index.html
  xml\
    testng-results.xml
    testng-failed.xml
  screenshots\
    Architect Empanelment Tests\
      verifySignup_20260622104849.png
  logs\
    console.log
    framework.log
```

Why this matters:

- Framework report files are overwritten on later runs.
- Historical analysis needs old reports.
- Comparison needs stored previous execution data.
- Screenshots must remain linked to the correct run.

## Phase 4: Database Design

Use and extend the existing portal schema.

### `executions`

Store execution-level data:

```text
id
execution_code
execution_type
suite_name
suite_xml_path
module_code
environment_id
status
total_tests
passed_tests
failed_tests
skipped_tests
pass_rate
fail_rate
start_time
end_time
duration_seconds
triggered_by
final_report_path
created_at
updated_at
```

### `execution_test_cases`

Store test-method-level data:

```text
id
execution_id
suite_name
test_name
module_code
class_name
method_name
display_name
status
start_time
end_time
duration_ms
parameters
exception_type
failure_message
stack_trace
screenshot_path
log_path
is_config_method
created_at
```

### `execution_artifacts`

Store report, XML, screenshot, and log file references:

```text
id
execution_id
artifact_type
file_name
file_path
mime_type
size_bytes
created_at
```

Artifact types:

```text
EXTENT_REPORT
TESTNG_RESULTS_XML
TESTNG_FAILED_XML
TESTNG_HTML_REPORT
EMAILABLE_REPORT
SCREENSHOT
CONSOLE_LOG
FRAMEWORK_LOG
```

### `execution_logs`

Store command and framework logs:

```text
id
execution_id
level
message
source
created_at
```

### Optional Future Table: `execution_failure_groups`

Useful for faster analytics:

```text
id
execution_id
exception_type
normalized_message
failure_count
first_seen_test
created_at
```

## Phase 5: TestNG XML Parser

Primary parser should read:

```text
test-output/testng-results.xml
```

Extract:

- total tests
- passed tests
- failed tests
- skipped tests
- ignored tests
- suite name
- test/module name
- class name
- method name
- status
- duration
- start/end time
- parameters
- exception class
- exception message
- full stack trace

Example from current framework output:

```text
Total: 18
Passed: 7
Failed: 8
Skipped: 3
Suite: Master Automation Suite
Modules:
- Land Management Suite
- Architect Empanelment Tests
Top failure:
- verifySignup
- org.openqa.selenium.TimeoutException
- unable to locate email field
```

Parser rules:

- Ignore config methods in test totals unless setup/teardown analytics are needed.
- Store config methods with `is_config_method = true`.
- Map TestNG `<test name="">` to portal module where possible.
- Match screenshots using method name, suite folder, timestamp proximity, and filename pattern.

## Phase 6: Extent Report Handling

Extent report should not be the primary analytics source.

Use Extent HTML for:

- Open Full Report
- historical report archive
- download/view from Reports Center

Store it as:

```text
execution_artifacts.artifact_type = EXTENT_REPORT
```

Frontend should offer:

```text
Open Extent Report
Download Report
Open TestNG Report
Download XML
```

## Phase 7: Dashboard APIs

Create dashboard APIs backed by database records.

Recommended APIs:

```text
GET /api/dashboard/summary
GET /api/dashboard/trends?range=7d
GET /api/dashboard/module-health?range=30d
GET /api/dashboard/recent-activity
GET /api/dashboard/failure-analysis?range=30d
GET /api/dashboard/slow-tests?range=30d
GET /api/dashboard/flaky-tests?range=30d
```

Example summary response:

```json
{
  "totalExecutions": 25,
  "totalTests": 450,
  "passedTests": 390,
  "failedTests": 45,
  "skippedTests": 15,
  "passRate": 86.6,
  "failRate": 10,
  "averageDuration": 240,
  "lastExecutionStatus": "FAILED"
}
```

Example trends response:

```json
[
  {
    "date": "2026-06-23",
    "executions": 3,
    "totalTests": 54,
    "passed": 45,
    "failed": 6,
    "skipped": 3,
    "passRate": 83.3
  }
]
```

Example failure analysis response:

```json
[
  {
    "exceptionType": "org.openqa.selenium.TimeoutException",
    "count": 8,
    "topTest": "verifySignup",
    "latestExecution": "AUTO-20260623120001"
  }
]
```

## Phase 8: Execution APIs

Enhance current APIs.

Existing:

```text
POST /api/executions/run
GET /api/executions
GET /api/executions/{id}
```

Add:

```text
GET /api/executions/{id}/test-cases
GET /api/executions/{id}/artifacts
GET /api/executions/{id}/logs
GET /api/executions/{id}/summary
POST /api/executions/{id}/cancel
POST /api/executions/{id}/rerun-failed
POST /api/executions/{id}/rerun
```

Filters:

```text
GET /api/executions?status=FAILED&module=LAND&from=2026-06-01&to=2026-06-23
```

## Phase 9: Reports APIs

Create real Reports Center APIs.

```text
GET /api/reports
GET /api/reports/{executionId}
GET /api/reports/{executionId}/view
GET /api/reports/{executionId}/download
GET /api/reports/{executionId}/testng-results
GET /api/reports/{executionId}/failed-tests
```

Report list filters:

- date range
- module
- status
- environment
- search by execution code
- report type

## Phase 10: Screenshots APIs

Create screenshot APIs:

```text
GET /api/screenshots
GET /api/screenshots?executionId=1
GET /api/screenshots?status=FAILED
GET /api/screenshots/{artifactId}
```

Frontend should show:

- failed test name
- module
- screenshot thumbnail
- open full image
- linked error message
- linked execution

## Phase 11: Comparison APIs

Support previous version and historical execution comparison.

Main API:

```text
GET /api/compare/executions?baseExecutionId=10&targetExecutionId=15
```

Example response:

```json
{
  "base": {
    "executionCode": "AUTO-OLD",
    "passRate": 92,
    "failed": 3
  },
  "target": {
    "executionCode": "AUTO-NEW",
    "passRate": 84,
    "failed": 8
  },
  "delta": {
    "passRateChange": -8,
    "newFailures": 5,
    "fixedFailures": 2,
    "stillFailing": 3
  },
  "newFailures": [],
  "fixedTests": [],
  "statusChangedTests": []
}
```

Comparison types:

```text
Execution vs Execution
Current vs Previous
Module vs Module
Version vs Version
Date Range vs Date Range
Environment vs Environment
```

Additional APIs:

```text
GET /api/compare/latest?module=LAND
GET /api/compare/range?from=2026-06-01&to=2026-06-23&compareToPrevious=true
GET /api/compare/modules?executionId=10
```

Comparison logic:

- Match test cases by class name, method name, and parameters.
- Detect newly failed tests.
- Detect fixed tests.
- Detect still failing tests.
- Detect newly skipped tests.
- Detect duration increase.
- Detect pass rate change.
- Detect module health change.

## Phase 12: Frontend Dashboard Plan

Dashboard sections:

1. KPI cards:
   - Total executions
   - Total tests
   - Pass rate
   - Fail rate
   - Failed tests
   - Skipped tests
   - Average duration
   - Last run status

2. Execution trend:
   - Today
   - Last 7 days
   - Last 30 days
   - Custom range
   - pass/fail/skipped stacked chart
   - pass rate line

3. Module health:
   - Land
   - Architect Empanelment
   - Survey/GIS later
   - module pass rate
   - last run status
   - failure count

4. Recent executions:
   - execution code
   - suite
   - module
   - status
   - duration
   - report link

5. Failure analytics:
   - top exception types
   - top failing test methods
   - repeated failures
   - latest failure message

6. Slow tests:
   - method name
   - duration
   - module
   - trend vs previous

7. Last activity:
   - runs triggered
   - report imported
   - failures detected
   - user activity

8. Filters:
   - Today
   - Last 7 days
   - Last 30 days
   - Custom range
   - Module
   - Environment
   - Status
   - Suite

## Phase 13: Reports Center Frontend

Reports Center should show:

- Historical report table
- Open Extent Report
- Open TestNG Report
- Download XML
- View failed tests
- View screenshots
- Compare with previous
- Compare with selected execution

Columns:

```text
Execution Code
Suite
Module
Environment
Status
Total
Passed
Failed
Skipped
Pass %
Duration
Started At
Actions
```

## Phase 14: Execution Detail Page

Each execution should have a full detail page.

Tabs:

```text
Summary
Test Cases
Failures
Screenshots
Logs
Artifacts
Comparison
```

Test case table filters:

```text
Status
Class
Method
Module
Exception Type
Duration
Search
```

## Phase 15: Framework Improvements

Later, add a minimal listener to the automation framework:

```text
PortalResultListener.java
```

Generate:

```text
reports/portal-results.json
```

Suggested JSON structure:

```json
{
  "suite": {},
  "environment": {},
  "summary": {},
  "tests": [],
  "artifacts": []
}
```

Why:

- Easier than XML parsing.
- Cleaner screenshot linking.
- Better future analytics.
- Less fragile than Extent HTML.

Initial implementation can use `testng-results.xml`; JSON listener can come later.

## Phase 16: System Information

Capture execution environment details for each run and store them in the database.

Store:

* Machine Name
* OS Name
* Java Version
* Browser Name
* Environment (DEV/UAT/SIT/PROD)(optional )
* Triggered By

Purpose:

* Debug environment-specific failures
* Compare executions across environments
* Track browser and Java compatibility issues
* Display execution environment in dashboard and execution details page

UI:

* Add "System Information" card in Dashboard
* Add "System Information" tab in Execution Details page
* can choose card or tab as you want 


## Implementation Order

1. Add backend automation configuration.
2. Add execution worker service.
3. Add Maven command runner.
4. Add execution status transitions.
5. Save console logs.
6. Add artifact collector.
7. Copy Extent/TestNG/screenshot artifacts per execution.
8. Add TestNG XML parser.
9. Store parsed test cases in DB.
10. Update execution totals from parsed XML.
11. Build dashboard summary API from DB.
12. Build execution detail APIs.
13. Build report listing/view/download APIs.
14. Build screenshot APIs.
15. Build comparison APIs.
16. Update dashboard frontend to consume real APIs.
17. Update Reports Center frontend.
18. Add Execution Detail page.
19. Add historical comparison UI.
20. Later add custom JSON listener in framework.

## What Should Not Be Done First

- Do not redesign dashboard UI again before real data exists.
- Do not parse Extent HTML as the primary data source.
- Do not directly display files from `D:\New folder\MPHIDB` without copying them.
- Do not depend permanently on `ModuleRunnerServer`.
- Do not store only final summary counts. Store individual test case results.

## Best First Milestone

```text
Run suite from portal
-> Maven executes
-> artifacts copied
-> testng-results.xml parsed
-> executions table updated
-> execution_test_cases populated
-> dashboard shows real pass/fail numbers
```

This milestone will make the portal truly connected to the automation framework.
