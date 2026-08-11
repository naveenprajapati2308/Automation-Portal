============================================================
TESTRIX — PLAN 2
SECURE AUTOMATION TEST ENGINE INTEGRATION
ARCHITECTURE, REGISTRATION, DEPLOYMENT & EXECUTION
MASTER IMPLEMENTATION COMMAND
============================================================

ROLE

Act as a Senior Solution Architect, Distributed Systems Architect,
Security Architect, DevOps Architect, and Automation Framework Architect.

You are working on Testrix, an enterprise-grade testing platform.

This task is PLAN 2 of the Testrix architecture.

Do not confuse this task with Plan 1 or Plan 3.

------------------------------------------------------------
PLAN 1 CONTEXT
------------------------------------------------------------

Testrix follows a multi-tenant Workspace architecture.

There is a strict separation between:

1. Testrix Platform
2. Project Workspace

Super Admin manages the Testrix Platform.

Project Admin manages an individual Workspace.

Each Workspace is isolated from every other Workspace.

Every Workspace has its own:

- Users
- Projects
- Automation
- API Testing
- Performance Testing
- Executions
- Reports
- Configurations
- Test assets

Workspace isolation is mandatory.

------------------------------------------------------------
PLAN 2 OBJECTIVE
------------------------------------------------------------

Design and implement a secure, scalable, production-ready architecture
for connecting Testrix Automation with external Automation Test Engines.

The initial supported Test Engines are:

1. Selenium
2. Playwright

Selenium and Playwright currently exist in separate repositories and
must remain independently maintainable and deployable.

Testrix must NOT assume that:

- Selenium and Playwright exist in the Testrix repository.
- They exist on the same machine.
- They use the same technology internally.
- They use the same folder structure.
- They use the same deployment environment.
- They use the same execution mechanism.

The architecture must provide a common integration contract while allowing
each Test Engine to keep its own implementation.

------------------------------------------------------------
CORE ARCHITECTURAL PRINCIPLE
------------------------------------------------------------

Testrix must act as the CONTROL PLANE.

The Automation Test Engine must act as the EXECUTION PLANE.

The relationship must conceptually be:

Testrix
   |
   | Secure Integration Contract
   |
Test Engine
   |
   | Executes
   |
Selenium / Playwright Framework
   |
Automation Tests

Do NOT tightly couple Testrix to the internal source code of Selenium
or Playwright.

Do NOT merge the automation repositories into Testrix merely to simplify
execution.

Do NOT make Testrix dependent on local filesystem paths in production.

------------------------------------------------------------
1. CURRENT PROBLEM
------------------------------------------------------------

The current development setup can execute automation through local
repository paths.

For example:

Testrix
   |
   | Local backend / runner
   |
Local filesystem path
   |
Selenium repository

or:

Testrix
   |
Local filesystem path
   |
Playwright repository

This may work during local development.

However, this architecture is NOT acceptable as the final production
architecture.

The architecture must solve:

- Where Selenium will run.
- Where Playwright will run.
- How Testrix will communicate with them.
- How an individual Workspace will register its Test Engine.
- How multiple Workspaces can use separate Test Engines.
- How multiple Projects can use separate Test Engines.
- How simultaneous executions are isolated.
- How execution results are mapped back to the correct Workspace.
- How authentication works.
- How Test Engine identity is established.
- How Test Engine health is monitored.
- How credentials are rotated/revoked.
- How local and production environments differ.
- How deployment responsibility is defined.
- How future distributed runners can be introduced.

------------------------------------------------------------
2. DO NOT USE A GLOBAL SHARED SECRET
------------------------------------------------------------

The existing shared-secret approach must be considered insufficient.

Do NOT retain one global secret for the entire Testrix platform.

Do NOT allow:

Workspace A Engine
and
Workspace B Engine

to authenticate using the same credential.

Each registered Test Engine must have an independent identity and
independent authentication credential/reference.

Example:

Workspace A
   |
   +-- Selenium Engine A
   |       |
   |       +-- Credential A
   |
   +-- Playwright Engine A
           |
           +-- Credential B


Workspace B
   |
   +-- Selenium Engine B
           |
           +-- Credential C

Credential A must never authenticate Engine B.

------------------------------------------------------------
3. TEST ENGINE REGISTRY
------------------------------------------------------------

Introduce a conceptual Test Engine Registry inside Testrix.

The registry is the authoritative source for determining:

- Which Test Engine exists.
- Which Workspace owns it.
- Which Project it belongs to.
- Which framework it represents.
- Where it is deployed.
- Whether it is active.
- Whether it is healthy.
- Which capabilities it supports.
- How Testrix authenticates with it.

Every Test Engine must have a unique immutable Test Engine ID.

Example:

Workspace ID:
WS-001

Project ID:
PRJ-001

Test Engine ID:
ENG-SEL-001

Engine Type:
SELENIUM

Engine Name:
Checkout Selenium Engine

Deployment Type:
DOCKER

Status:
ACTIVE

------------------------------------------------------------
4. REQUIRED TEST ENGINE OWNERSHIP MODEL
------------------------------------------------------------

Every Test Engine must be explicitly mapped to a Workspace.

Prefer the following logical ownership:

Workspace
    |
    +-- Project
          |
          +-- Test Engine

At minimum, the system must know:

workspaceId
projectId
testEngineId

Do not identify Test Engines only using:

- Name
- URL
- IP address
- Repository path
- Secret

------------------------------------------------------------
5. TEST ENGINE REGISTRATION FLOW
------------------------------------------------------------

Design a complete Test Engine registration workflow.

Expected conceptual flow:

Project Admin
    |
    | Add Test Engine
    ↓
Select Engine Type
    |
    +-- Selenium
    |
    +-- Playwright
    ↓
Enter Engine Details
    ↓
Generate/Register Engine Identity
    ↓
Configure Authentication
    ↓
Test Connection
    ↓
Engine Handshake
    ↓
Capability Discovery
    ↓
Health Check
    ↓
Engine Activated
    ↓
Ready for Execution

Only authorized Workspace users should be allowed to register or manage
Test Engines.

Viewer must NOT be allowed to register a Test Engine.

------------------------------------------------------------
6. TEST ENGINE REGISTRATION DATA
------------------------------------------------------------

Define what information is required to register a Test Engine.

Potential fields:

- Test Engine ID
- Workspace ID
- Project ID
- Engine Type
- Engine Name
- Description
- Deployment Type
- Endpoint
- Version
- Environment
- Capabilities
- Status
- Authentication Reference
- Last Heartbeat
- Created At
- Updated At

Do not blindly implement every field.

First inspect the existing Testrix data model and determine the minimum
correct production-ready model.

------------------------------------------------------------
7. TEST ENGINE IDENTITY
------------------------------------------------------------

Every Test Engine must have a stable identity.

Example:

ENG-SEL-0001
ENG-PW-0001

The identity must NOT change because:

- Endpoint changes.
- Deployment changes.
- Repository is updated.
- Docker container is recreated.
- Engine version changes.

If a Test Engine is redeployed, it should be able to reconnect to its
existing identity securely.

------------------------------------------------------------
8. EXECUTION IDENTITY
------------------------------------------------------------

Every automation execution must receive a unique Execution ID.

The minimum execution identity should contain:

- Workspace ID
- Project ID
- Test Engine ID
- Execution ID
- Request ID / Correlation ID

Example:

Workspace:
WS-001

Project:
PRJ-001

Test Engine:
ENG-SEL-001

Execution:
EXE-20260808-000123

Request:
REQ-8F72A1

This identity must remain attached throughout the complete execution
lifecycle.

------------------------------------------------------------
9. WHY THIS IDENTITY MODEL IS REQUIRED
------------------------------------------------------------

Consider:

Workspace A
   |
   +-- Selenium Engine A

Workspace B
   |
   +-- Selenium Engine B

Both execute at exactly the same time.

The system must never mix:

- Execution status
- Logs
- Screenshots
- Videos
- Reports
- Test results
- Failure details
- Artifacts

Execution A must always belong to:

Workspace A
Project A
Engine A

Execution B must always belong to:

Workspace B
Project B
Engine B

Never rely on timing or in-memory state to determine ownership.

------------------------------------------------------------
10. EXECUTION FLOW
------------------------------------------------------------

Design the execution flow as:

Testrix UI
    ↓
Automation Backend
    ↓
Execution Request
    ↓
Validate Authentication
    ↓
Validate Workspace
    ↓
Validate Project
    ↓
Validate Test Engine
    ↓
Check Engine Status
    ↓
Create Execution ID
    ↓
Dispatch Execution
    ↓
Test Engine
    ↓
Automation Framework
    ↓
Execution
    ↓
Status / Events
    ↓
Testrix Backend
    ↓
Validate Execution Identity
    ↓
Persist Result
    ↓
Dashboard
    ↓
Reports / Analytics

Do not allow the UI to communicate directly with the Test Engine
unless there is a clearly justified and secured architectural reason.

Prefer Testrix Backend / Execution Gateway as the control boundary.

------------------------------------------------------------
11. EXECUTION GATEWAY
------------------------------------------------------------

Design an Execution Gateway / service boundary between Testrix and
external Test Engines.

Its responsibilities may include:

- Authentication
- Authorization
- Engine lookup
- Workspace validation
- Project validation
- Execution creation
- Request correlation
- Dispatch
- Timeout handling
- Retry handling
- Response validation
- Result ingestion

Do not duplicate this logic separately inside every controller.

------------------------------------------------------------
12. COMMON TEST ENGINE CONTRACT
------------------------------------------------------------

Selenium and Playwright are different frameworks internally.

However, Testrix should communicate with them using a common contract.

The common contract should define:

1. Registration
2. Authentication
3. Health Check
4. Heartbeat
5. Capability Discovery
6. Execute
7. Execution Status
8. Execution Event
9. Logs
10. Screenshots
11. Artifacts
12. Final Result
13. Failure
14. Cancellation
15. Optional Retry

The internal framework implementation may remain completely different.

------------------------------------------------------------
13. TEST ENGINE AGENT / ADAPTER
------------------------------------------------------------

Evaluate the need for a lightweight Testrix Agent / Adapter.

The preferred architecture should avoid rewriting the existing
Selenium and Playwright repositories.

The Agent/Adapter can provide:

- Testrix authentication
- Execution endpoint
- Request validation
- Framework invocation
- Result transformation
- Event publishing
- Artifact handling
- Heartbeat
- Health reporting

Conceptually:

Selenium Repository
       +
Testrix Selenium Adapter
       ↓
Selenium Test Engine


Playwright Repository
       +
Testrix Playwright Adapter
       ↓
Playwright Test Engine

Use adapters where they reduce coupling.

------------------------------------------------------------
14. LOCAL DEVELOPMENT ARCHITECTURE
------------------------------------------------------------

Local development must remain easy.

Possible architecture:

Testrix
   |
   ↓
Local Test Engine Agent
   |
   ↓
Local Repository
   |
   ↓
Selenium / Playwright

Local filesystem paths may be used during development.

However:

IMPORTANT:

A local path is configuration for local development.

It must NOT become the production architecture.

Do not design the database around permanent local paths.

Do not make production execution dependent on:

D:\...
C:\...
/home/...
developer laptop paths
shared local folders

------------------------------------------------------------
15. PRODUCTION ARCHITECTURE
------------------------------------------------------------

In production:

Testrix
   |
   ↓
Secure Execution Gateway
   |
   ↓
Registered Test Engine
   |
   ↓
Automation Framework

The Test Engine may run on:

- Docker
- VM
- Dedicated Server
- Kubernetes
- Future Runner Infrastructure

Do not assume that Testrix and the Test Engine are deployed on the same
machine.

The Test Engine must expose a secure service interface.

------------------------------------------------------------
16. DEPLOYMENT RESPONSIBILITY
------------------------------------------------------------

Clearly define deployment ownership.

Testrix should NOT be forced to host every customer's automation
repository.

A project/team may deploy its own Test Engine infrastructure.

For example:

Project Team
    |
    ↓
Deploy Selenium Engine
    |
    ↓
Register Engine with Testrix
    |
    ↓
Testrix verifies connection
    |
    ↓
Engine becomes available

Testrix acts as the CONTROL PLANE.

Project infrastructure acts as the EXECUTION PLANE.

------------------------------------------------------------
17. DO NOT REQUIRE SOURCE CODE UPLOAD TO TEStRIX
------------------------------------------------------------

Testrix should not require users to upload their complete Selenium or
Playwright source code into Testrix.

Testrix should not become the source-code hosting platform.

The automation repository can remain in:

- GitHub
- GitLab
- Bitbucket
- Internal Git
- Project server
- Other supported infrastructure

The deployed Test Engine executes the repository.

------------------------------------------------------------
18. FRAMEWORK CONFIGURATION
------------------------------------------------------------

When a Project Admin connects an Automation Framework, provide a
configuration experience that asks for the information actually required
for the selected deployment model.

For local development:

- Local endpoint
- Runner configuration
- Required path/configuration

For production:

- Engine endpoint
- Authentication
- Deployment metadata
- Health endpoint
- Capabilities

Do not ask users to provide unnecessary internal Testrix paths.

Do not expose Testrix internal filesystem structure.

------------------------------------------------------------
19. CREDENTIAL MANAGEMENT
------------------------------------------------------------

Design a secure credential lifecycle:

Generate
    ↓
Store Securely
    ↓
Use
    ↓
Rotate
    ↓
Revoke
    ↓
Regenerate

Credentials should not be displayed in plaintext after initial generation
unless absolutely required.

Never log credentials.

Never include credentials in:

- Execution logs
- Error messages
- Reports
- Browser logs
- Application logs
- API response payloads

------------------------------------------------------------
20. TEST ENGINE HEARTBEAT
------------------------------------------------------------

Every active Test Engine should periodically report health.

Example:

Engine
    ↓
Heartbeat
    ↓
Testrix

Testrix tracks:

- Last heartbeat
- Connection state
- Engine version
- Status
- Capabilities

Possible states:

ACTIVE
IDLE
BUSY
OFFLINE
UNHEALTHY
DISABLED

Define sensible heartbeat timeout behavior.

------------------------------------------------------------
21. CAPABILITY DISCOVERY
------------------------------------------------------------

A Test Engine may expose capabilities.

Selenium example:

- Chrome
- Firefox
- Edge
- Parallel execution
- Screenshot
- Video

Playwright example:

- Chromium
- Firefox
- WebKit
- Trace
- Screenshot
- Video

Testrix should be able to determine whether an Engine supports the
requested execution configuration before dispatching the job.

Do not hardcode all framework capabilities inside Testrix if they can
be discovered dynamically.

------------------------------------------------------------
22. RESULT CALLBACK
------------------------------------------------------------

The Test Engine must be able to send:

- Started
- Running
- Passed
- Failed
- Skipped
- Cancelled
- Timeout

and relevant execution events.

Final result may include:

- Test count
- Passed
- Failed
- Skipped
- Duration
- Error information
- Logs
- Screenshots
- Videos
- Reports
- Artifacts

Every event/result must contain sufficient execution identity.

------------------------------------------------------------
23. RESULT SECURITY
------------------------------------------------------------

Never trust an incoming result simply because it contains a valid
execution ID.

Validate:

1. Authentication
2. Test Engine identity
3. Workspace ownership
4. Project ownership
5. Execution ownership
6. Execution state
7. Request correlation

Reject invalid or mismatched results.

Example:

Engine A attempts:

Execution A → Workspace B

This must be rejected.

------------------------------------------------------------
24. CALLBACK SECURITY
------------------------------------------------------------

Do NOT expose an unrestricted callback endpoint such as:

POST /api/results

without identity validation.

Design a secure callback/event ingestion mechanism.

The system should be able to determine:

"Which registered Test Engine is sending this event?"

before accepting the event.

------------------------------------------------------------
25. DATABASE DESIGN
------------------------------------------------------------

Design the required database entities.

At minimum evaluate:

Test Engine
Test Engine Credential Reference
Test Engine Capability
Test Engine Health
Execution
Execution Event
Execution Artifact

Every entity must have correct ownership relationships.

At minimum, relevant records must be traceable through:

Workspace ID
Project ID
Test Engine ID
Execution ID

Define:

- Primary keys
- Foreign keys
- Unique constraints
- Indexes
- Status fields
- Timestamps
- Soft delete where appropriate

Do not blindly create tables.

First inspect the existing database and reuse compatible structures.

------------------------------------------------------------
26. API DESIGN
------------------------------------------------------------

Design APIs for:

TEST ENGINE MANAGEMENT

POST   Register Test Engine
GET    List Test Engines
GET    Get Test Engine
PUT    Update Test Engine
DELETE Disable/Delete Test Engine

SECURITY

POST   Generate Credential
POST   Rotate Credential
POST   Revoke Credential

CONNECTION

POST   Test Connection
GET    Health
POST   Heartbeat

EXECUTION

POST   Create Execution
POST   Dispatch Execution
GET    Execution Status
POST   Execution Event
POST   Execution Result
POST   Execution Artifact

Every API must enforce authorization.

No API should accidentally become cross-workspace.

------------------------------------------------------------
27. API IDEMPOTENCY
------------------------------------------------------------

Execution requests may be retried because of:

- Network failures
- Timeouts
- Gateway retries
- Client retries

Design idempotency using Request ID / Idempotency Key where required.

The same request must not accidentally create duplicate executions.

------------------------------------------------------------
28. TIMEOUTS
------------------------------------------------------------

Define timeout layers:

- Connection timeout
- Dispatch timeout
- Execution timeout
- Callback timeout
- Heartbeat timeout

Do not allow a permanently hanging Test Engine to block Testrix.

------------------------------------------------------------
29. FAILURE SCENARIOS
------------------------------------------------------------

Explicitly design behavior for:

1. Engine offline
2. Engine busy
3. Engine timeout
4. Authentication failure
5. Invalid Workspace
6. Invalid Project
7. Invalid Engine
8. Engine crashes
9. Network interruption
10. Result callback failure
11. Duplicate callback
12. Duplicate execution request
13. Partial artifact upload
14. Testrix restart
15. Engine restart
16. Workspace disabled
17. Project disabled
18. Credential revoked during execution

Document expected behavior for each.

------------------------------------------------------------
30. OBSERVABILITY
------------------------------------------------------------

Every execution must be traceable across the entire system.

Use:

- Execution ID
- Request ID
- Correlation ID
- Test Engine ID
- Workspace ID
- Project ID

A developer should be able to search one Execution ID and understand:

Testrix Request
→ Backend
→ Gateway
→ Engine
→ Framework
→ Result
→ Database
→ Report

------------------------------------------------------------
31. SECURITY BOUNDARIES
------------------------------------------------------------

Strictly enforce:

NO global shared secret.

NO trust based only on IP.

NO trust based only on endpoint URL.

NO trust based only on engine name.

NO unrestricted callbacks.

NO cross-workspace execution.

NO cross-workspace result ingestion.

NO direct database access from Test Engines.

NO browser-to-Test-Engine direct communication unless explicitly
justified and secured.

NO plaintext secrets in logs.

NO permanent local filesystem dependency in production.

------------------------------------------------------------
32. WORKSPACE LIFECYCLE
------------------------------------------------------------

Define what happens to connected Test Engines when a Workspace is:

- Active
- Suspended
- Disabled
- Deleted

For example:

Workspace Suspended
    ↓
Test Engine access disabled
    ↓
New executions rejected
    ↓
Existing execution handled according to policy

Do not allow a suspended Workspace to continue creating executions.

------------------------------------------------------------
33. TEST ENGINE LIFECYCLE
------------------------------------------------------------

Define:

REGISTERED
    ↓
CONNECTING
    ↓
ACTIVE
    ↓
BUSY
    ↓
IDLE
    ↓
OFFLINE
    ↓
DISABLED
    ↓
DELETED

The exact states may be adjusted after reviewing the existing system.

------------------------------------------------------------
34. SELENIUM INTEGRATION
------------------------------------------------------------

Inspect the existing Selenium repository.

Do NOT rewrite it blindly.

Determine:

- Existing runner
- Existing TestNG configuration
- Existing Maven structure
- Suite XML
- Report generation
- Screenshot handling
- Logging
- Result generation
- Existing local runner
- Existing API/event communication

Then design the minimum adapter/agent changes required to make it a
Testrix-compatible Test Engine.

Preserve existing automation functionality.

------------------------------------------------------------
35. PLAYWRIGHT INTEGRATION
------------------------------------------------------------

Inspect the existing Playwright repository.

Determine:

- Runner
- Test configuration
- Test discovery
- Reports
- Screenshots
- Videos
- Traces
- Result handling
- Existing execution mechanism

Create a compatible Testrix integration contract without forcing
Playwright to behave internally like Selenium.

------------------------------------------------------------
36. COMMON RESULT MODEL
------------------------------------------------------------

Even though Selenium and Playwright produce different reports, Testrix
should normalize their high-level execution result.

For example:

Execution
    |
    +-- Total
    +-- Passed
    +-- Failed
    +-- Skipped
    +-- Duration
    +-- Status
    +-- Errors
    +-- Artifacts

Framework-specific raw reports may also be retained separately.

------------------------------------------------------------
37. REPORT HANDLING
------------------------------------------------------------

Do not force every framework to generate exactly the same internal report.

Instead:

Test Engine
    |
    +-- Raw Framework Report
    |
    +-- Normalized Testrix Result
    |
    +-- Artifacts

Testrix dashboard uses the normalized result.

Framework-specific report can remain available as an artifact.

------------------------------------------------------------
38. FUTURE SCALABILITY
------------------------------------------------------------

Plan 2 must be compatible with future distributed execution.

Do NOT implement Plan 3 in this task.

However, the architecture must allow:

Testrix
    ↓
Scheduler
    ↓
Queue
    ↓
Runner Pool
    ↓
Test Engines
    ↓
Execution

The Test Engine Registry must therefore support multiple Engines.

The Execution ID model must support concurrent execution.

------------------------------------------------------------
39. FUTURE ENGINE SUPPORT
------------------------------------------------------------

Do not architect only for Selenium and Playwright.

The contract should make future support possible for:

- Cypress
- Appium
- WebdriverIO
- Mobile automation
- Custom automation frameworks

Adding a new engine should require implementing the integration contract,
not redesigning Testrix.

------------------------------------------------------------
40. DOCUMENTATION REQUIREMENT
------------------------------------------------------------

Create a complete document:

"TESTRIX TEST ENGINE INTEGRATION GUIDE"

It must clearly explain:

1. What is Testrix?
2. What is a Test Engine?
3. Control Plane vs Execution Plane
4. Supported Engines
5. Architecture
6. Registration
7. Authentication
8. Local Setup
9. Production Setup
10. Selenium Setup
11. Playwright Setup
12. Agent/Adapter
13. Environment Variables
14. API Contract
15. Execution Flow
16. Result Flow
17. Artifacts
18. Health Monitoring
19. Credential Rotation
20. Troubleshooting
21. Security
22. Deployment
23. Scaling
24. Future Extensions

The guide must clearly identify:

WHAT BELONGS TO TESTRIX

WHAT BELONGS TO THE TEST ENGINE

WHAT BELONGS TO THE AUTOMATION REPOSITORY

WHAT BELONGS TO THE AGENT/ADAPTER

------------------------------------------------------------
41. REQUIRED ARCHITECTURE DOCUMENTATION
------------------------------------------------------------

Before implementation, generate:

A. System Architecture Diagram
B. Component Diagram
C. Deployment Diagram
D. Test Engine Registration Sequence
E. Authentication Sequence
F. Execution Sequence
G. Result Ingestion Sequence
H. Heartbeat Sequence
I. Failure/Retry Flow
J. Workspace Isolation Diagram
K. Database ER Diagram
L. API Contract
M. Credential Lifecycle
N. Local Architecture
O. Production Architecture
P. Selenium Architecture
Q. Playwright Architecture

------------------------------------------------------------
42. REQUIRED ANALYSIS OF EXISTING CODE
------------------------------------------------------------

Before modifying anything, inspect the existing implementation.

Identify:

- Current runner
- Current APIs
- Current authentication
- Current shared secret
- Current execution tables
- Current report mechanism
- Current local path configuration
- Current Docker setup
- Current repository boundaries
- Existing result/event APIs
- Existing Workspace ID handling

Create:

CURRENT STATE
        ↓
GAPS
        ↓
TARGET STATE
        ↓
MIGRATION PLAN

Do not destroy working functionality without justification.

------------------------------------------------------------
43. IMPLEMENTATION STRATEGY
------------------------------------------------------------

Follow this order:

PHASE 1
Architecture discovery.

PHASE 2
Current implementation analysis.

PHASE 3
Target architecture.

PHASE 4
Database contract.

PHASE 5
API contract.

PHASE 6
Authentication/security contract.

PHASE 7
Selenium adapter integration.

PHASE 8
Playwright adapter integration.

PHASE 9
Local development validation.

PHASE 10
Production deployment validation.

PHASE 11
Concurrent Workspace testing.

PHASE 12
Failure and security testing.

Do not skip directly to code.

------------------------------------------------------------
44. ACCEPTANCE CRITERIA
------------------------------------------------------------

The architecture is considered successful only when all of the following
are true:

1. Selenium can connect to Testrix.
2. Playwright can connect to Testrix.
3. Each Test Engine has a unique identity.
4. Each Test Engine has independent credentials.
5. Global shared secret is removed/replaced.
6. Local development remains possible.
7. Production deployment does not depend on local paths.
8. Multiple Workspaces can register separate Engines.
9. Multiple Projects can use separate Engines.
10. Multiple executions can run simultaneously.
11. Results cannot cross Workspace boundaries.
12. Results cannot cross Project boundaries.
13. Test Engine health is visible.
14. Credentials can be rotated/revoked.
15. Failed connections are handled correctly.
16. Duplicate execution requests are handled safely.
17. Duplicate result events do not corrupt execution state.
18. Existing Selenium functionality is preserved.
19. Existing Playwright functionality is preserved.
20. Future scheduler/runner architecture can reuse this system.

------------------------------------------------------------
45. FINAL ARCHITECTURAL RULE
------------------------------------------------------------

Do not choose the easiest implementation.

Choose the architecture that is:

- Secure
- Multi-tenant
- Workspace-isolated
- Production-ready
- Independently deployable
- Horizontally scalable
- Observable
- Maintainable
- Framework-independent
- Future-ready

Do not optimize only for the current Selenium implementation.

Do not optimize only for local development.

Do not optimize only for the current number of users.

Design Testrix so that the same architecture can support hundreds of
Workspaces, multiple Projects, multiple Test Engines, concurrent
executions, and future distributed runners.

MOST IMPORTANT:

FIRST UNDERSTAND THE EXISTING SYSTEM.

THEN DESIGN THE TARGET ARCHITECTURE.

THEN IDENTIFY GAPS.

THEN FINALIZE DATABASE AND API CONTRACTS.

THEN IMPLEMENT.

DO NOT START BY RANDOMLY MODIFYING FILES.

DO NOT REWRITE EXISTING FRAMEWORKS WITHOUT NECESSITY.

DO NOT BREAK EXISTING WORKING AUTOMATION.

EVERY ARCHITECTURAL DECISION MUST PRESERVE WORKSPACE ISOLATION
AND FUTURE COMPATIBILITY WITH DISTRIBUTED EXECUTION.
============================================================
END OF PLAN 2 MASTER COMMAND
============================================================