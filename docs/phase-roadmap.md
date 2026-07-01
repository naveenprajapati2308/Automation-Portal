# Phased Implementation Roadmap

## Phase 1: Portal Foundation

Status: started.

Build:

- React app shell
- Spring Boot app shell
- MySQL schema
- Login foundation
- Profile foundation
- Environments
- Modules
- Execution queue records
- Dashboard summary
- Report/log/screenshot placeholders

## Phase 2: Existing Framework Discovery

No framework changes.

Inspect:

- TestNG XML locations
- Maven command variants
- Extent report output folders
- Consolidated final report path
- Module-wise report folders
- Screenshot paths
- Log paths
- Existing local runner code

Output:

- Concrete integration map
- Configuration file for suite/module/report paths

## Phase 3: Local Runner Integration

Build:

- Execution worker service
- Maven command execution
- Queue status transitions
- Console log capture
- Artifact collector
- Execution cancel support where possible

## Phase 4: Structured Result Ingestion

Build:

- TestNG XML parser
- Test case history
- Failure reason extraction
- Screenshot/log linking
- Dashboard analytics

Preferred next enhancement:

- Add a custom TestNG listener JSON output with minimal framework change and your approval.

## Phase 5: Reports Center

Build:

- Final consolidated Extent report viewer
- Module-wise report viewer
- Historical report search
- Execution comparison
- Historical analysis

## Phase 6: Live Monitoring

Build:

- WebSocket execution updates
- Live logs
- Module/suite/test progress
- Runner heartbeat

## Phase 7: Enterprise Features

Build:

- Jenkins integration
- Docker support
- Distributed runners
- Cloud execution
- Jira/Azure DevOps defects
- AI failure analysis
- Flaky test detection
- Test stability metrics
- Self-healing locator insights
